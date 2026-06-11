const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// 生成出库单号 CK + 8位随机数字（不重复）
function generateOrderNo(db) {
  let orderNo;
  let exists = true;
  const chars = '0123456789';
  while (exists) {
    let digits = '';
    for (let i = 0; i < 8; i++) {
      digits += chars[Math.floor(Math.random() * chars.length)];
    }
    orderNo = 'CK' + digits;
    const row = db.prepare('SELECT id FROM stock_out WHERE order_no = ? LIMIT 1').get(orderNo);
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

// 获取出库单列表（按单号分组）
router.get('/', (req, res) => {
  const db = getDb();
  const { keyword = '', page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  let where = '';
  const params = [];
  if (keyword) {
    where = 'WHERE cl.name LIKE ? OR so.operator LIKE ? OR so.order_no LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(`
    SELECT COUNT(DISTINCT so.order_no) as count
    FROM stock_out so
    LEFT JOIN clients cl ON so.client_id = cl.id
    ${where}
  `).get(...params).count;
  const list = db.prepare(`
    SELECT so.order_no, cl.name as client_name,
      SUM(so.quantity) as total_qty, SUM(so.total_amount) as total_amount,
      COUNT(*) as item_count, so.operator, MIN(so.created_at) as created_at
    FROM stock_out so
    LEFT JOIN clients cl ON so.client_id = cl.id
    ${where}
    GROUP BY so.order_no
    ORDER BY MIN(so.id) DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

// 获取某个出库单的所有商品明细
router.get('/order/:orderNo', (req, res) => {
  const db = getDb();
  const { orderNo } = req.params;
  const list = db.prepare(`
    SELECT so.*, p.name as product_name, cl.name as client_name
    FROM stock_out so
    LEFT JOIN products p ON so.product_id = p.id
    LEFT JOIN clients cl ON so.client_id = cl.id
    WHERE so.order_no = ?
    ORDER BY so.id ASC
  `).all(orderNo);
  res.json({ code: 0, data: list });
});

// 获取出库明细列表（保留兼容旧接口用于搜索等）
router.get('/items', (req, res) => {
  const db = getDb();
  const { keyword = '', page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  let where = '';
  const params = [];
  if (keyword) {
    where = 'WHERE p.name LIKE ? OR cl.name LIKE ? OR so.operator LIKE ? OR so.order_no LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(`
    SELECT COUNT(*) as count FROM stock_out so
    LEFT JOIN products p ON so.product_id = p.id
    LEFT JOIN clients cl ON so.client_id = cl.id
    ${where}
  `).get(...params).count;
  const list = db.prepare(`
    SELECT so.*, p.name as product_name, cl.name as client_name
    FROM stock_out so
    LEFT JOIN products p ON so.product_id = p.id
    LEFT JOIN clients cl ON so.client_id = cl.id
    ${where}
    ORDER BY so.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

// 批量出库（同一出库单号下多条商品）
router.post('/', (req, res) => {
  const { order_no, client_id, items } = req.body;
  if (!order_no) {
    return res.json({ code: 400, message: '出库单号缺失' });
  }
  if (!client_id) {
    return res.json({ code: 400, message: '请选择客户单位' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({ code: 400, message: '请至少添加一条商品出库明细' });
  }

  const db = getDb();

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
      if (product.quantity < quantity) {
        throw new Error(`【${product.name}】库存不足，当前库存: ${product.quantity}`);
      }
      const before_qty = product.quantity;
      const after_qty = before_qty - quantity;
      const total_amount = price * quantity;

      db.prepare(`
        INSERT INTO stock_out (order_no, product_id, client_id, unit, price, quantity, before_qty, after_qty, total_amount, remark, operator)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(order_no, product_id, client_id, unit || product.unit, price || product.price, quantity, before_qty, after_qty, total_amount, remark || '', req.user.real_name);

      db.prepare('UPDATE products SET quantity = ? WHERE id = ?').run(after_qty, product_id);
    }
  });

  try {
    transaction();
    res.json({ code: 0, message: `出库成功，共 ${items.length} 条商品` });
  } catch (e) {
    res.json({ code: 500, message: e.message });
  }
});

module.exports = router;
