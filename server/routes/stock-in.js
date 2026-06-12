const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// 生成入库单号 RK + 8位随机数字（不重复）
function generateOrderNo(db) {
  let orderNo;
  let exists = true;
  const chars = '0123456789';
  while (exists) {
    let digits = '';
    for (let i = 0; i < 8; i++) {
      digits += chars[Math.floor(Math.random() * chars.length)];
    }
    orderNo = 'RK' + digits;
    const row = db.prepare('SELECT id FROM stock_in WHERE order_no = ? LIMIT 1').get(orderNo);
    exists = !!row;
  }
  return orderNo;
}

// 生成单号接口
router.get('/generate-order-no', (req, res) => {
  const db = getDb();
  const orderNo = generateOrderNo(db);
  res.json({ code: 0, data: { order_no: orderNo } });
});

// 获取入库单列表（按单号分组）
router.get('/', (req, res) => {
  const db = getDb();
  const { keyword = '', page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  let where = '';
  const params = [];
  if (keyword) {
    where = 'WHERE c.name LIKE ? OR si.operator LIKE ? OR si.order_no LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(`
    SELECT COUNT(DISTINCT si.order_no) as count 
    FROM stock_in si 
    LEFT JOIN companies c ON si.company_id = c.id 
    ${where}
  `).get(...params).count;
  const list = db.prepare(`
    SELECT si.order_no, c.name as company_name,
      w.name as warehouse_name,
      SUM(si.quantity) as total_qty, SUM(si.total_amount) as total_amount,
      COUNT(*) as item_count, si.operator, MIN(si.created_at) as created_at
    FROM stock_in si 
    LEFT JOIN companies c ON si.company_id = c.id 
    LEFT JOIN warehouses w ON si.warehouse_id = w.id
    ${where} 
    GROUP BY si.order_no
    ORDER BY MIN(si.id) DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

// 获取某个入库单的所有商品明细
router.get('/order/:orderNo', (req, res) => {
  const db = getDb();
  const { orderNo } = req.params;
  const list = db.prepare(`
    SELECT si.*, p.name as product_name, c.name as company_name,
      w.name as warehouse_name
    FROM stock_in si 
    LEFT JOIN products p ON si.product_id = p.id 
    LEFT JOIN companies c ON si.company_id = c.id 
    LEFT JOIN warehouses w ON si.warehouse_id = w.id
    WHERE si.order_no = ?
    ORDER BY si.id ASC
  `).all(orderNo);
  res.json({ code: 0, data: list });
});

// 获取入库明细列表（保留兼容旧接口用于搜索等）
router.get('/items', (req, res) => {
  const db = getDb();
  const { keyword = '', page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  let where = '';
  const params = [];
  if (keyword) {
    where = 'WHERE p.name LIKE ? OR c.name LIKE ? OR si.operator LIKE ? OR si.order_no LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(`
    SELECT COUNT(*) as count FROM stock_in si 
    LEFT JOIN products p ON si.product_id = p.id 
    LEFT JOIN companies c ON si.company_id = c.id 
    ${where}
  `).get(...params).count;
  const list = db.prepare(`
    SELECT si.*, p.name as product_name, c.name as company_name 
    FROM stock_in si 
    LEFT JOIN products p ON si.product_id = p.id 
    LEFT JOIN companies c ON si.company_id = c.id 
    ${where} 
    ORDER BY si.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

// 批量入库（同一入库单号下多条商品）
router.post('/', (req, res) => {
  const { order_no, company_id, warehouse_id, items } = req.body;
  if (!order_no) {
    return res.json({ code: 400, message: '入库单号缺失' });
  }
  if (!company_id) {
    return res.json({ code: 400, message: '请选择供货公司' });
  }
  if (!warehouse_id) {
    return res.json({ code: 400, message: '请选择入库库房' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({ code: 400, message: '请至少添加一条商品入库明细' });
  }

  const db = getDb();

  // 验证库房存在
  const warehouse = db.prepare('SELECT id FROM warehouses WHERE id = ?').get(warehouse_id);
  if (!warehouse) {
    return res.json({ code: 400, message: '选择的库房不存在' });
  }

  const transaction = db.transaction(() => {
    for (const item of items) {
      const { product_id, unit, price, quantity, remark } = item;
      if (!product_id || !quantity || quantity <= 0) {
        throw new Error('商品或数量无效');
      }
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
      if (!product) {
        throw new Error(`商品ID ${product_id} 不存在`);
      }
      const before_qty = product.quantity;
      const after_qty = before_qty + quantity;
      const total_amount = price * quantity;

      db.prepare(`
        INSERT INTO stock_in (order_no, product_id, company_id, warehouse_id, unit, price, quantity, before_qty, after_qty, total_amount, remark, operator)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(order_no, product_id, company_id, warehouse_id, unit || product.unit, price || product.price, quantity, before_qty, after_qty, total_amount, remark || '', req.user.real_name);

      // 更新总库存
      db.prepare('UPDATE products SET quantity = ? WHERE id = ?').run(after_qty, product_id);

      // 更新库房库存（upsert）
      db.prepare(`
        INSERT INTO product_warehouse_stock (product_id, warehouse_id, quantity)
        VALUES (?, ?, ?)
        ON CONFLICT(product_id, warehouse_id) DO UPDATE SET quantity = quantity + excluded.quantity
      `).run(product_id, warehouse_id, quantity);
    }
  });

  try {
    transaction();
    res.json({ code: 0, message: `入库成功，共 ${items.length} 条商品` });
  } catch (e) {
    res.json({ code: 500, message: e.message });
  }
});

module.exports = router;
