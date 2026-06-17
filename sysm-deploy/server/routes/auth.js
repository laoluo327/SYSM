const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ code: 400, message: '请输入账号和密码' });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.json({ code: 400, message: '账号或密码错误' });
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.json({ code: 400, message: '账号或密码错误' });
  }
  // 获取客户单位名称
  let client_name = null;
  if (user.role === 'client' && user.client_id) {
    const client = db.prepare('SELECT name FROM clients WHERE id = ?').get(user.client_id);
    client_name = client ? client.name : null;
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, real_name: user.real_name, role: user.role, client_id: user.client_id || null, client_name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({
    code: 0,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        real_name: user.real_name,
        phone: user.phone,
        role: user.role,
        client_id: user.client_id || null,
        client_name
      }
    }
  });
});

// 修改密码
router.post('/change-password', authMiddleware, (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    return res.json({ code: 400, message: '请输入原密码和新密码' });
  }
  if (new_password.length < 6) {
    return res.json({ code: 400, message: '新密码长度不能少于6位' });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(old_password, user.password)) {
    return res.json({ code: 400, message: '原密码错误' });
  }
  const hashedPassword = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);
  res.json({ code: 0, message: '密码修改成功' });
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, real_name, phone, role, client_id FROM users WHERE id = ?').get(req.user.id);
  let client_name = null;
  if (user.role === 'client' && user.client_id) {
    const client = db.prepare('SELECT name FROM clients WHERE id = ?').get(user.client_id);
    client_name = client ? client.name : null;
  }
  res.json({ code: 0, data: { ...user, client_name } });
});

module.exports = router;
