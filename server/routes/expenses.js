const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// 获取开销列表
router.get('/', (req, res) => {
  const db = getDb();
  const { keyword = '', page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  let where = '';
  const params = [];
  if (keyword) {
    where = 'WHERE name LIKE ? OR pay_method LIKE ? OR payer LIKE ? OR recipient LIKE ? OR category LIKE ? OR created_by LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM expenses ${where}`).get(...params).count;
  const list = db.prepare(`SELECT * FROM expenses ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

// 添加开销
router.post('/', (req, res) => {
  const { name, category, pay_method, amount, payer, recipient, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '开销名称不能为空' });
  }
  if (!amount || amount <= 0) {
    return res.json({ code: 400, message: '请填写有效的支付金额' });
  }
  const db = getDb();
  db.prepare('INSERT INTO expenses (name, category, pay_method, amount, payer, recipient, remark, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(name.trim(), category || '', pay_method || '', amount, payer || '', recipient || '', remark || '', req.user.real_name);
  res.json({ code: 0, message: '添加成功' });
});

// 修改开销
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, pay_method, amount, payer, recipient, remark } = req.body;
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '开销名称不能为空' });
  }
  if (!amount || amount <= 0) {
    return res.json({ code: 400, message: '请填写有效的支付金额' });
  }
  const db = getDb();
  const expense = db.prepare('SELECT id FROM expenses WHERE id = ?').get(id);
  if (!expense) {
    return res.json({ code: 400, message: '开销记录不存在' });
  }
  db.prepare('UPDATE expenses SET name=?, category=?, pay_method=?, amount=?, payer=?, recipient=?, remark=? WHERE id=?')
    .run(name.trim(), category || '', pay_method || '', amount, payer || '', recipient || '', remark || '', id);
  res.json({ code: 0, message: '修改成功' });
});

// 删除开销
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const expense = db.prepare('SELECT id FROM expenses WHERE id = ?').get(id);
  if (!expense) {
    return res.json({ code: 400, message: '开销记录不存在' });
  }
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
