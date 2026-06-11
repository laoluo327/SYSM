const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware, adminMiddleware);

// 获取用户列表
router.get('/', (req, res) => {
  const db = getDb();
  const { keyword = '', page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  let where = '';
  const params = [];
  if (keyword) {
    where = 'WHERE username LIKE ? OR real_name LIKE ? OR phone LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params).count;
  const list = db.prepare(`SELECT id, username, real_name, phone, role, is_default, created_at FROM users ${where} ORDER BY id ASC LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

// 添加用户
router.post('/', (req, res) => {
  const { username, password, real_name, phone, role } = req.body;
  if (!username || !password || !real_name) {
    return res.json({ code: 400, message: '请填写必要信息' });
  }
  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.json({ code: 400, message: '账号已存在' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (username, password, real_name, phone, role) VALUES (?, ?, ?, ?, ?)')
    .run(username, hashedPassword, real_name, phone || '', role || 'user');
  res.json({ code: 0, message: '添加成功' });
});

// 修改用户
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { username, real_name, phone, role, password } = req.body;
  if (!username || !real_name) {
    return res.json({ code: 400, message: '请填写必要信息' });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.json({ code: 400, message: '用户不存在' });
  }
  // 查重
  const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
  if (dup) {
    return res.json({ code: 400, message: '账号已存在' });
  }
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET username=?, real_name=?, phone=?, role=?, password=? WHERE id=?')
      .run(username, real_name, phone || '', role || 'user', hashedPassword, id);
  } else {
    db.prepare('UPDATE users SET username=?, real_name=?, phone=?, role=? WHERE id=?')
      .run(username, real_name, phone || '', role || 'user', id);
  }
  res.json({ code: 0, message: '修改成功' });
});

// 删除用户（默认管理员不能删除）
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.json({ code: 400, message: '用户不存在' });
  }
  if (user.is_default === 1) {
    return res.json({ code: 400, message: '默认管理员账号不能删除' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
