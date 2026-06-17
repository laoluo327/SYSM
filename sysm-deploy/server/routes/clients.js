const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', adminMiddleware, (req, res) => {
  const db = getDb();
  const { keyword = '', page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  let where = '';
  const params = [];
  if (keyword) {
    where = 'WHERE name LIKE ? OR contact LIKE ? OR phone LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM clients ${where}`).get(...params).count;
  const list = db.prepare(`SELECT * FROM clients ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

router.get('/all', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT id, name FROM clients ORDER BY name ASC').all();
  res.json({ code: 0, data: list });
});

// 查找或创建客户单位（出库时按名称自动创建，查重）
router.post('/find-or-create', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '客户单位名称不能为空' });
  }
  const db = getDb();
  const exists = db.prepare('SELECT id, name FROM clients WHERE name = ?').get(name.trim());
  if (exists) {
    return res.json({ code: 0, data: exists, message: '已存在' });
  }
  const result = db.prepare('INSERT INTO clients (name) VALUES (?)').run(name.trim());
  res.json({ code: 0, data: { id: result.lastInsertRowid, name: name.trim() }, message: '已自动创建' });
});

router.post('/', adminMiddleware, (req, res) => {
  const { name, credit_code, address, contact, phone, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '客户单位名称不能为空' });
  }
  const db = getDb();
  const exists = db.prepare('SELECT id FROM clients WHERE name = ?').get(name.trim());
  if (exists) {
    return res.json({ code: 400, message: '该客户单位已存在' });
  }
  db.prepare('INSERT INTO clients (name, credit_code, address, contact, phone, remark) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name.trim(), credit_code || '', address || '', contact || '', phone || '', remark || '');
  res.json({ code: 0, message: '添加成功' });
});

router.put('/:id', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, credit_code, address, contact, phone, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '客户单位名称不能为空' });
  }
  const db = getDb();
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
  if (!client) {
    return res.json({ code: 400, message: '客户单位不存在' });
  }
  const dup = db.prepare('SELECT id FROM clients WHERE name = ? AND id != ?').get(name.trim(), id);
  if (dup) {
    return res.json({ code: 400, message: '该客户单位已存在' });
  }
  db.prepare('UPDATE clients SET name=?, credit_code=?, address=?, contact=?, phone=?, remark=? WHERE id=?')
    .run(name.trim(), credit_code || '', address || '', contact || '', phone || '', remark || '', id);
  res.json({ code: 0, message: '修改成功' });
});

router.delete('/:id', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
  if (!client) {
    return res.json({ code: 400, message: '客户单位不存在' });
  }
  const hasOut = db.prepare('SELECT id FROM stock_out WHERE client_id = ? LIMIT 1').get(id);
  if (hasOut) {
    return res.json({ code: 400, message: '该客户下有出库记录，无法删除' });
  }
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
