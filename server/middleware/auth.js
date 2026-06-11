const jwt = require('jsonwebtoken');

const JWT_SECRET = 'sy-q-accounting-secret-key-2026';

function authMiddleware(req, res, next) {
  // 仅从 Authorization 头获取 token，禁止通过 URL 参数传递（防止日志泄露）
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '权限不足，需要管理员权限' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware, JWT_SECRET };
