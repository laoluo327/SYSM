const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// 获取商品列表
router.get('/', (req, res) => {
  const db = getDb();
  const { keyword = '', page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  let where = '';
  const params = [];
  if (keyword) {
    where = 'WHERE p.name LIKE ? OR p.spec LIKE ? OR p.created_by LIKE ? OR c.name LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM products p LEFT JOIN companies c ON p.company_id = c.id ${where}`).get(...params).count;
  const list = db.prepare(`
    SELECT p.*, c.name as company_name 
    FROM products p 
    LEFT JOIN companies c ON p.company_id = c.id 
    ${where} 
    ORDER BY p.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

// 添加商品
router.post('/', (req, res) => {
  const { name, company_id, spec, unit, quantity, price, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '商品名称不能为空' });
  }
  const db = getDb();
  // 查重：同名商品 + 同公司
  const exists = db.prepare('SELECT id FROM products WHERE name = ? AND company_id = ?').get(name.trim(), company_id || null);
  if (exists) {
    return res.json({ code: 400, message: '该商品名称已存在（同一公司下）' });
  }
  db.prepare('INSERT INTO products (name, company_id, spec, unit, quantity, price, remark, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(name.trim(), company_id || null, spec || '', unit || '', quantity || 0, price || 0, remark || '', req.user.real_name);
  res.json({ code: 0, message: '添加成功' });
});

// 修改商品
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, company_id, spec, unit, price, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '商品名称不能为空' });
  }
  const db = getDb();
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!product) {
    return res.json({ code: 400, message: '商品不存在' });
  }
  // 查重
  const dup = db.prepare('SELECT id FROM products WHERE name = ? AND company_id = ? AND id != ?')
    .get(name.trim(), company_id || null, id);
  if (dup) {
    return res.json({ code: 400, message: '该商品名称已存在（同一公司下）' });
  }
  db.prepare('UPDATE products SET name=?, company_id=?, spec=?, unit=?, price=?, remark=? WHERE id=?')
    .run(name.trim(), company_id || null, spec || '', unit || '', price || 0, remark || '', id);
  res.json({ code: 0, message: '修改成功' });
});

// 删除商品
router.delete('/:id', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json({ code: 403, message: '权限不足' });
  }
  const { id } = req.params;
  const db = getDb();
  const product = db.prepare('SELECT id, name FROM products WHERE id = ?').get(id);
  if (!product) {
    return res.json({ code: 400, message: '商品不存在' });
  }
  // 检查是否仍有库存（任意库房中库存 > 0）
  const stockRow = db.prepare(
    'SELECT SUM(quantity) as total FROM product_warehouse_stock WHERE product_id = ?'
  ).get(id);
  if (stockRow && stockRow.total > 0) {
    return res.json({ code: 400, message: `商品「${product.name}」库房中仍有库存 ${stockRow.total}，请先清空库存再删除` });
  }
  const hasStock = db.prepare('SELECT id FROM stock_in WHERE product_id = ? LIMIT 1').get(id);
  const hasOut = db.prepare('SELECT id FROM stock_out WHERE product_id = ? LIMIT 1').get(id);
  if (hasStock || hasOut) {
    return res.json({ code: 400, message: '该商品有入库/出库记录，无法删除' });
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
