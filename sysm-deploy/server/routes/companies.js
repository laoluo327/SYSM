const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// 获取公司列表
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
  const total = db.prepare(`SELECT COUNT(*) as count FROM companies ${where}`).get(...params).count;
  const list = db.prepare(`SELECT * FROM companies ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

// 获取所有公司（用于下拉选择，不分页）
router.get('/all', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT id, name FROM companies ORDER BY name ASC').all();
  res.json({ code: 0, data: list });
});

// 查找或创建公司（入库时按名称自动创建，查重）
router.post('/find-or-create', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '公司名称不能为空' });
  }
  const db = getDb();
  const exists = db.prepare('SELECT id, name FROM companies WHERE name = ?').get(name.trim());
  if (exists) {
    return res.json({ code: 0, data: exists, message: '已存在' });
  }
  const result = db.prepare('INSERT INTO companies (name) VALUES (?)').run(name.trim());
  res.json({ code: 0, data: { id: result.lastInsertRowid, name: name.trim() }, message: '已自动创建' });
});

// 添加公司
router.post('/', adminMiddleware, (req, res) => {
  const { name, credit_code, address, contact, phone, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '公司名称不能为空' });
  }
  const db = getDb();
  // 查重
  const exists = db.prepare('SELECT id FROM companies WHERE name = ?').get(name.trim());
  if (exists) {
    return res.json({ code: 400, message: '该公司名称已存在' });
  }
  db.prepare('INSERT INTO companies (name, credit_code, address, contact, phone, remark) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name.trim(), credit_code || '', address || '', contact || '', phone || '', remark || '');
  res.json({ code: 0, message: '添加成功' });
});

// 修改公司
router.put('/:id', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, credit_code, address, contact, phone, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '公司名称不能为空' });
  }
  const db = getDb();
  const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(id);
  if (!company) {
    return res.json({ code: 400, message: '公司不存在' });
  }
  // 查重
  const dup = db.prepare('SELECT id FROM companies WHERE name = ? AND id != ?').get(name.trim(), id);
  if (dup) {
    return res.json({ code: 400, message: '该公司名称已存在' });
  }
  db.prepare('UPDATE companies SET name=?, credit_code=?, address=?, contact=?, phone=?, remark=? WHERE id=?')
    .run(name.trim(), credit_code || '', address || '', contact || '', phone || '', remark || '', id);
  res.json({ code: 0, message: '修改成功' });
});

// 删除公司
router.delete('/:id', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(id);
  if (!company) {
    return res.json({ code: 400, message: '公司不存在' });
  }
  // 检查是否有关联商品
  const hasProducts = db.prepare('SELECT id FROM products WHERE company_id = ? LIMIT 1').get(id);
  if (hasProducts) {
    return res.json({ code: 400, message: '该公司下有关联商品，无法删除' });
  }
  db.prepare('DELETE FROM companies WHERE id = ?').run(id);
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
