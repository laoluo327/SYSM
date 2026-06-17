const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 获取系统名称（公开接口，无需登录）
router.get('/system-name', (req, res) => {
  const db = getDb();
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('system_name');
  res.json({ code: 0, data: { system_name: setting?.value || '做账管理系统' } });
});

// 获取系统设置
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings').all();
  const result = {};
  settings.forEach(s => { result[s.key] = s.value; });
  res.json({ code: 0, data: result });
});

// 更新系统名称
router.put('/system-name', authMiddleware, adminMiddleware, (req, res) => {
  const { system_name } = req.body;
  if (!system_name || !system_name.trim()) {
    return res.json({ code: 400, message: '系统名称不能为空' });
  }
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('system_name', system_name.trim());
  res.json({ code: 0, message: '修改成功' });
});

module.exports = router;
