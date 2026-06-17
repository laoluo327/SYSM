const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// 管理员仪表盘数据
router.get('/admin', (req, res) => {
  const db = getDb();
  // 北京时间 UTC+8
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const monthStr = `${year}-${month}`;

  // 商品总数
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  // 库存总金额
  const stockValue = db.prepare('SELECT COALESCE(SUM(quantity * price), 0) as total FROM products').get().total;
  // 本月入库总额
  const monthStockIn = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM stock_in WHERE created_at LIKE ?").get(`${monthStr}%`).total;
  // 本月入库数量
  const monthStockInQty = db.prepare("SELECT COALESCE(SUM(quantity), 0) as total FROM stock_in WHERE created_at LIKE ?").get(`${monthStr}%`).total;
  // 本月出库总额
  const monthStockOut = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM stock_out WHERE created_at LIKE ?").get(`${monthStr}%`).total;
  // 本月出库数量
  const monthStockOutQty = db.prepare("SELECT COALESCE(SUM(quantity), 0) as total FROM stock_out WHERE created_at LIKE ?").get(`${monthStr}%`).total;
  // 本月开销总额
  const monthExpense = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE created_at LIKE ?").get(`${monthStr}%`).total;

  // 近7天入库/出库趋势
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    const inTotal = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM stock_in WHERE date(created_at) = ?").get(dateStr).total;
    const outTotal = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM stock_out WHERE date(created_at) = ?").get(dateStr).total;
    trendData.push({ date: dateStr.substring(5), stockIn: inTotal, stockOut: outTotal });
  }

  // 近期操作
  const recentOps = [];
  const recentStockIn = db.prepare("SELECT si.*, p.name as product_name FROM stock_in si LEFT JOIN products p ON si.product_id = p.id ORDER BY si.id DESC LIMIT 5").all();
  recentStockIn.forEach(r => recentOps.push({ type: '入库', content: `${r.product_name} 入库`, time: r.created_at }));
  const recentStockOut = db.prepare("SELECT so.*, p.name as product_name FROM stock_out so LEFT JOIN products p ON so.product_id = p.id ORDER BY so.id DESC LIMIT 5").all();
  recentStockOut.forEach(r => recentOps.push({ type: '出库', content: `${r.product_name} 出库`, time: r.created_at }));
  const recentExpenses = db.prepare("SELECT * FROM expenses ORDER BY id DESC LIMIT 5").all();
  recentExpenses.forEach(r => recentOps.push({ type: '开销', content: `${r.name} ¥${r.amount}`, time: r.created_at }));
  recentOps.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

  res.json({
    code: 0,
    data: {
      productCount, stockValue, monthStockIn, monthStockInQty, monthStockOut, monthStockOutQty, monthExpense,
      trendData,
      recentOps: recentOps.slice(0, 10)
    }
  });
});

// 普通用户仪表盘数据
router.get('/user', (req, res) => {
  const db = getDb();
  // 北京时间 UTC+8
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const monthStr = `${year}-${month}`;
  const userName = req.user.real_name;

  const myProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE created_by = ?').get(userName).count;
  const myStockIn = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM stock_in WHERE operator = ? AND created_at LIKE ?").get(userName, `${monthStr}%`).total;
  const myStockOut = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM stock_out WHERE operator = ? AND created_at LIKE ?").get(userName, `${monthStr}%`).total;
  const myExpense = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE created_by = ? AND created_at LIKE ?").get(userName, `${monthStr}%`).total;

  const recentOps = [];
  const recentStockIn = db.prepare("SELECT si.*, p.name as product_name FROM stock_in si LEFT JOIN products p ON si.product_id = p.id WHERE si.operator = ? ORDER BY si.id DESC LIMIT 5").all(userName);
  recentStockIn.forEach(r => recentOps.push({ type: '入库', content: `${r.product_name} 入库`, time: r.created_at }));
  const recentStockOut = db.prepare("SELECT so.*, p.name as product_name FROM stock_out so LEFT JOIN products p ON so.product_id = p.id WHERE so.operator = ? ORDER BY so.id DESC LIMIT 5").all(userName);
  recentStockOut.forEach(r => recentOps.push({ type: '出库', content: `${r.product_name} 出库`, time: r.created_at }));
  const recentExpenses = db.prepare("SELECT * FROM expenses WHERE created_by = ? ORDER BY id DESC LIMIT 5").all(userName);
  recentExpenses.forEach(r => recentOps.push({ type: '开销', content: `${r.name} ¥${r.amount}`, time: r.created_at }));
  recentOps.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

  res.json({
    code: 0,
    data: { myProducts, myStockIn, myStockOut, myExpense, recentOps: recentOps.slice(0, 10) }
  });
});

module.exports = router;
