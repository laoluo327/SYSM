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
    where = 'WHERE u.username LIKE ? OR u.real_name LIKE ? OR u.phone LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM users u ${where}`).get(...params).count;
  const list = db.prepare(`
    SELECT u.id, u.username, u.real_name, u.phone, u.role, u.client_id, u.is_default, u.created_at,
      c.name AS client_name
    FROM users u
    LEFT JOIN clients c ON u.client_id = c.id
    ${where}
    ORDER BY u.id ASC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
});

// 添加用户
router.post('/', (req, res) => {
  const { username, password, real_name, phone, role, client_id } = req.body;
  if (!username || !password || !real_name) {
    return res.json({ code: 400, message: '请填写必要信息' });
  }
  if (role === 'client' && !client_id) {
    return res.json({ code: 400, message: '客户权限必须指定客户单位' });
  }
  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.json({ code: 400, message: '账号已存在' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const cid = role === 'client' ? client_id : null;
  db.prepare('INSERT INTO users (username, password, real_name, phone, role, client_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(username, hashedPassword, real_name, phone || '', role || 'user', cid);
  res.json({ code: 0, message: '添加成功' });
});

// 修改用户
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { username, real_name, phone, role, password, client_id } = req.body;
  if (!username || !real_name) {
    return res.json({ code: 400, message: '请填写必要信息' });
  }
  if (role === 'client' && !client_id) {
    return res.json({ code: 400, message: '客户权限必须指定客户单位' });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.json({ code: 400, message: '用户不存在' });
  }
  const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
  if (dup) {
    return res.json({ code: 400, message: '账号已存在' });
  }
  const cid = role === 'client' ? client_id : null;
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET username=?, real_name=?, phone=?, role=?, client_id=?, password=? WHERE id=?')
      .run(username, real_name, phone || '', role || 'user', cid, hashedPassword, id);
  } else {
    db.prepare('UPDATE users SET username=?, real_name=?, phone=?, role=?, client_id=? WHERE id=?')
      .run(username, real_name, phone || '', role || 'user', cid, id);
  }
  res.json({ code: 0, message: '修改成功' });
});

// 重置密码（管理员操作，重置为默认密码123456）
router.post('/:id/reset-password', (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;
  const defaultPwd = new_password || '123456';
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.json({ code: 400, message: '用户不存在' });
  }
  const hashedPassword = bcrypt.hashSync(defaultPwd, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);
  res.json({ code: 0, message: `密码已重置为 ${defaultPwd}` });
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
