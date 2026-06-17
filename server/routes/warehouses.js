const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// 获取全部出货公司（下拉选择用）
router.get('/all', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT id, name, address FROM warehouses ORDER BY id ASC').all();
  res.json({ code: 0, data: list });
});

// 查找或创建出货公司（入库时按名称自动创建，查重）
router.post('/find-or-create', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '出货公司名称不能为空' });
  }
  const db = getDb();
  const exists = db.prepare('SELECT id, name FROM warehouses WHERE name = ?').get(name.trim());
  if (exists) {
    return res.json({ code: 0, data: exists, message: '已存在' });
  }
  const result = db.prepare('INSERT INTO warehouses (name) VALUES (?)').run(name.trim());
  res.json({ code: 0, data: { id: result.lastInsertRowid, name: name.trim() }, message: '已自动创建' });
});

// 获取某商品在各出货公司的库存分布
router.get('/stock/:productId', (req, res) => {
  const db = getDb();
  const { productId } = req.params;
  const list = db.prepare(`
    SELECT w.id, w.name, COALESCE(pws.quantity, 0) as quantity
    FROM warehouses w
    LEFT JOIN product_warehouse_stock pws ON pws.warehouse_id = w.id AND pws.product_id = ?
    ORDER BY w.id ASC
  `).all(Number(productId));
  res.json({ code: 0, data: list });
});

// 分页列表
router.get('/', (req, res) => {
  const db = getDb();
  const { keyword = '', page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  let where = '';
  const params = [];
  if (keyword) {
    where = 'WHERE name LIKE ? OR address LIKE ? OR credit_code LIKE ? OR phone LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM warehouses ${where}`).get(...params).count;
  const list = db.prepare(`SELECT * FROM warehouses ${where} ORDER BY id ASC LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

// 新增出货公司
router.post('/', (req, res) => {
  const { name, address, credit_code, bank_account, phone, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '出货公司名称不能为空' });
  }
  const db = getDb();
  const exists = db.prepare('SELECT id FROM warehouses WHERE name = ?').get(name.trim());
  if (exists) {
    return res.json({ code: 400, message: '出货公司名称已存在' });
  }
  db.prepare('INSERT INTO warehouses (name, address, credit_code, bank_account, phone, remark) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name.trim(), address || '', credit_code || '', bank_account || '', phone || '', remark || '');
  res.json({ code: 0, message: '添加成功' });
});

// 修改出货公司
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, address, credit_code, bank_account, phone, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '出货公司名称不能为空' });
  }
  const db = getDb();
  const wh = db.prepare('SELECT id FROM warehouses WHERE id = ?').get(id);
  if (!wh) return res.json({ code: 400, message: '出货公司不存在' });
  const dup = db.prepare('SELECT id FROM warehouses WHERE name = ? AND id != ?').get(name.trim(), id);
  if (dup) return res.json({ code: 400, message: '出货公司名称已存在' });
  db.prepare('UPDATE warehouses SET name=?, address=?, credit_code=?, bank_account=?, phone=?, remark=? WHERE id=?')
    .run(name.trim(), address || '', credit_code || '', bank_account || '', phone || '', remark || '', id);
  res.json({ code: 0, message: '修改成功' });
});

// 删除出货公司
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const wh = db.prepare('SELECT id, name FROM warehouses WHERE id = ?').get(id);
  if (!wh) return res.json({ code: 400, message: '出货公司不存在' });
  // 检查该出货公司是否仍有商品库存
  const stockRow = db.prepare(
    'SELECT SUM(quantity) as total FROM product_warehouse_stock WHERE warehouse_id = ?'
  ).get(id);
  if (stockRow && stockRow.total > 0) {
    return res.json({ code: 400, message: `出货公司「${wh.name}」中仍有商品库存 ${stockRow.total}，请先清空库存再删除` });
  }
  const hasIn = db.prepare('SELECT id FROM stock_in WHERE warehouse_id = ? LIMIT 1').get(id);
  const hasOut = db.prepare('SELECT id FROM stock_out WHERE warehouse_id = ? LIMIT 1').get(id);
  if (hasIn || hasOut) {
    return res.json({ code: 400, message: '该出货公司有入库/出库记录，无法删除' });
  }
  db.prepare('DELETE FROM product_warehouse_stock WHERE warehouse_id = ?').run(id);
  db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
