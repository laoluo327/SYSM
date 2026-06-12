const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// 获取全部库房（下拉选择用）
router.get('/all', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT id, name, address FROM warehouses ORDER BY id ASC').all();
  res.json({ code: 0, data: list });
});

// 获取某商品在各库房的库存分布
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
    where = 'WHERE name LIKE ? OR address LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM warehouses ${where}`).get(...params).count;
  const list = db.prepare(`SELECT * FROM warehouses ${where} ORDER BY id ASC LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

// 新增库房
router.post('/', (req, res) => {
  const { name, address, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '库房名称不能为空' });
  }
  const db = getDb();
  const exists = db.prepare('SELECT id FROM warehouses WHERE name = ?').get(name.trim());
  if (exists) {
    return res.json({ code: 400, message: '库房名称已存在' });
  }
  db.prepare('INSERT INTO warehouses (name, address, remark) VALUES (?, ?, ?)')
    .run(name.trim(), address || '', remark || '');
  res.json({ code: 0, message: '添加成功' });
});

// 修改库房
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, address, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '库房名称不能为空' });
  }
  const db = getDb();
  const wh = db.prepare('SELECT id FROM warehouses WHERE id = ?').get(id);
  if (!wh) return res.json({ code: 400, message: '库房不存在' });
  const dup = db.prepare('SELECT id FROM warehouses WHERE name = ? AND id != ?').get(name.trim(), id);
  if (dup) return res.json({ code: 400, message: '库房名称已存在' });
  db.prepare('UPDATE warehouses SET name=?, address=?, remark=? WHERE id=?')
    .run(name.trim(), address || '', remark || '', id);
  res.json({ code: 0, message: '修改成功' });
});

// 删除库房
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const wh = db.prepare('SELECT id FROM warehouses WHERE id = ?').get(id);
  if (!wh) return res.json({ code: 400, message: '库房不存在' });
  const hasIn = db.prepare('SELECT id FROM stock_in WHERE warehouse_id = ? LIMIT 1').get(id);
  const hasOut = db.prepare('SELECT id FROM stock_out WHERE warehouse_id = ? LIMIT 1').get(id);
  if (hasIn || hasOut) {
    return res.json({ code: 400, message: '该库房有入库/出库记录，无法删除' });
  }
  db.prepare('DELETE FROM product_warehouse_stock WHERE warehouse_id = ?').run(id);
  db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
