const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全响应头
app.use(helmet({
  contentSecurityPolicy: false,   // 前后端同域，不需要严格 CSP
  crossOriginEmbedderPolicy: false,
}));

// CORS：同源策略（前后端同域部署时浏览器不会触发 CORS，此处仅做安全兜底）
app.use(cors({
  origin: (requestOrigin, callback) => {
    // 同源请求、curl、Postman 等不带 origin，直接放行
    if (!requestOrigin) return callback(null, true);
    // 允许 Render 部署域名和自定义域名
    const extra = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    const allowed = [
      `http://localhost:${PORT}`,
      `http://127.0.0.1:${PORT}`,
      'https://sysm.onrender.com',
      ...extra,
    ];
    // 允许所有 .onrender.com 子域名
    if (requestOrigin && requestOrigin.includes('.onrender.com')) {
      return callback(null, true);
    }
    if (allowed.some(o => requestOrigin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('CORS 不允许该来源'));
    }
  },
  credentials: true,
}));

// 请求体大小限制
app.use(express.json({ limit: '2mb' }));

// 登录频率限制：每个 IP 每分钟最多 10 次
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { code: 429, message: '登录尝试过于频繁，请 1 分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 全局 API 频率限制：每个 IP 每分钟最多 120 次
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// 初始化数据库
initDb();

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const settingRoutes = require('./routes/settings');
const companyRoutes = require('./routes/companies');
const clientRoutes = require('./routes/clients');
const productRoutes = require('./routes/products');
const stockInRoutes = require('./routes/stock-in');
const stockOutRoutes = require('./routes/stock-out');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');
const dataCenterRoutes = require('./routes/data-center');

// 注册路由（登录接口单独加频率限制）
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock-in', stockInRoutes);
app.use('/api/stock-out', stockOutRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/data-center', dataCenterRoutes);

// 静态文件托管（生产环境）
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('/{*path}', (req, res) => {
  const filePath = path.join(__dirname, '..', 'dist', 'index.html');
  if (require('fs').existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Not found' });
  }
});

// 全局错误处理
app.use((err, req, res, next) => {
  if (err.message === 'CORS 不允许该来源') {
    return res.status(403).json({ code: 403, message: '不允许的来源' });
  }
  console.error('服务器错误:', err.message);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`服务器已启动: http://0.0.0.0:${PORT}`);
});
