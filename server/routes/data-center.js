const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { getDb, DB_PATH, initDb } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

const upload = multer({
  dest: path.join(__dirname, '..', 'backups'),
  limits: { fileSize: 50 * 1024 * 1024 },  // 上传文件最大 50MB
  fileFilter: (req, file, cb) => {
    // 仅允许 .xlsx 和 .db 文件
    const allowed = ['.xlsx', '.xls', '.db'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

// 导出Excel（仅管理员）
router.get('/export/:type', adminMiddleware, (req, res) => {
  const { type } = req.params;
  const db = getDb();
  let data = [];
  let filename = '';
  let headers = [];

  switch (type) {
    case 'products':
      filename = '商品明细';
      headers = ['ID', '商品名称', '采购公司', '规格', '单位', '数量', '单价', '备注', '记录人', '记录时间'];
      const products = db.prepare(`
        SELECT p.*, c.name as company_name FROM products p 
        LEFT JOIN companies c ON p.company_id = c.id ORDER BY p.id ASC
      `).all();
      data = products.map(p => [p.id, p.name, p.company_name || '', p.spec, p.unit, p.quantity, p.price, p.remark, p.created_by, p.created_at]);
      break;
    case 'stock-in':
      filename = '入库明细';
      headers = ['ID', '入库单号', '商品名称', '供货公司', '入库库房', '单位', '单价', '数量', '入库前数量', '入库后数量', '合计金额', '备注', '入库人', '入库时间'];
      const stockIn = db.prepare(`
        SELECT si.*, p.name as product_name, c.name as company_name,
          w.name as warehouse_name
        FROM stock_in si 
        LEFT JOIN products p ON si.product_id = p.id 
        LEFT JOIN companies c ON si.company_id = c.id 
        LEFT JOIN warehouses w ON si.warehouse_id = w.id
        ORDER BY si.id ASC
      `).all();
      data = stockIn.map(s => [s.id, s.order_no, s.product_name, s.company_name || '', s.warehouse_name || '', s.unit, s.price, s.quantity, s.before_qty, s.after_qty, s.total_amount, s.remark, s.operator, s.created_at]);
      break;
    case 'stock-out':
      filename = '出库明细';
      headers = ['ID', '出库单号', '商品名称', '客户单位', '出货库房', '单位', '单价', '数量', '出库前数量', '出库后数量', '合计金额', '备注', '出库人', '出库时间'];
      const stockOut = db.prepare(`
        SELECT so.*, p.name as product_name, cl.name as client_name,
          w.name as warehouse_name
        FROM stock_out so 
        LEFT JOIN products p ON so.product_id = p.id 
        LEFT JOIN clients cl ON so.client_id = cl.id 
        LEFT JOIN warehouses w ON so.warehouse_id = w.id
        ORDER BY so.id ASC
      `).all();
      data = stockOut.map(s => [s.id, s.order_no, s.product_name, s.client_name || '', s.warehouse_name || '', s.unit, s.price, s.quantity, s.before_qty, s.after_qty, s.total_amount, s.remark, s.operator, s.created_at]);
      break;
    case 'expenses':
      filename = '开销明细';
      headers = ['ID', '开销名称', '分类', '支付方式', '支付金额', '支付人', '加给谁', '备注', '记录人', '记录时间'];
      const expenses = db.prepare('SELECT * FROM expenses ORDER BY id ASC').all();
      data = expenses.map(e => [e.id, e.name, e.category, e.pay_method, e.amount, e.payer, e.recipient, e.remark, e.created_by, e.created_at]);
      break;
    default:
      return res.json({ code: 400, message: '不支持的导出类型' });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = headers.map(() => ({ wch: 15 }));
  XLSX.utils.book_append_sheet(wb, ws, filename);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}.xlsx`);
  res.send(buffer);
});

// 商品导入模板下载
router.get('/import-template/products', (req, res) => {
  const headers = ['商品名称', '规格', '单位', '数量', '单价', '备注'];
  const sample = [
    ['螺丝M6', '6x20mm', '个', 1000, 0.15, '普通碳钢'],
    ['轴承6205', '25x52x15', '个', 50, 12.5, '深沟球轴承'],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length * 3, 15) }));
  XLSX.utils.book_append_sheet(wb, ws, '商品导入模板');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent('商品导入模板')}.xlsx`);
  res.send(buffer);
});

// 商品数据导入（仅管理员）
router.post('/import-products', adminMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.json({ code: 400, message: '请上传Excel文件' });
  }
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (!rows || rows.length < 2 || !rows[0] || rows[0].length === 0) {
      fs.unlinkSync(req.file.path);
      return res.json({ code: 400, message: 'Excel文件无数据，请确保第1行为表头，第2行起为数据' });
    }

    const db = getDb();
    const header = rows[0].map(h => String(h).trim());
    // 查找列索引
    const nameIdx = header.findIndex(h => h.includes('商品名称') || h === '名称');
    const specIdx = header.findIndex(h => h.includes('规格'));
    const unitIdx = header.findIndex(h => h.includes('单位'));
    const qtyIdx = header.findIndex(h => h.includes('数量'));
    const priceIdx = header.findIndex(h => h.includes('单价'));
    const remarkIdx = header.findIndex(h => h.includes('备注'));

    if (nameIdx === -1) {
      fs.unlinkSync(req.file.path);
      return res.json({ code: 400, message: '未找到"商品名称"列，请检查表头' });
    }

    const now = new Date();
    const bjTime = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const operator = req.user?.username || 'admin';
    const insertStmt = db.prepare('INSERT INTO products (name, spec, unit, quantity, price, remark, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

    let successCount = 0;
    let skipCount = 0;
    const insertMany = db.transaction((dataRows) => {
      for (const row of dataRows) {
        const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';
        if (!name) { skipCount++; continue; }
        const spec = specIdx >= 0 && row[specIdx] ? String(row[specIdx]).trim() : '';
        const unit = unitIdx >= 0 && row[unitIdx] ? String(row[unitIdx]).trim() : '';
        const quantity = qtyIdx >= 0 && row[qtyIdx] ? Number(row[qtyIdx]) || 0 : 0;
        const price = priceIdx >= 0 && row[priceIdx] ? Number(row[priceIdx]) || 0 : 0;
        const remark = remarkIdx >= 0 && row[remarkIdx] ? String(row[remarkIdx]).trim() : '';
        insertStmt.run(name, spec, unit, quantity, price, remark, operator, bjTime);
        successCount++;
      }
    });

    insertMany(rows.slice(1));
    fs.unlinkSync(req.file.path);
    res.json({ code: 0, message: `导入完成：成功 ${successCount} 条，跳过 ${skipCount} 条` });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.json({ code: 500, message: '导入失败，请检查文件格式' });
  }
});

// 数据库备份（仅管理员）
router.post('/backup', adminMiddleware, (req, res) => {
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup_${timestamp}.db`);
  fs.copyFileSync(DB_PATH, backupFile);
  res.json({ code: 0, message: '备份成功', data: { filename: `backup_${timestamp}.db` } });
});

// 获取备份列表（仅管理员）
router.get('/backups', adminMiddleware, (req, res) => {
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    return res.json({ code: 0, data: [] });
  }
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).sort().reverse();
  res.json({ code: 0, data: files });
});

// 数据库恢复（仅管理员）
router.post('/restore', adminMiddleware, upload.single('file'), (req, res) => {
  const { filename } = req.query;
  let sourcePath;

  if (req.file) {
    sourcePath = req.file.path;
  } else if (filename) {
    // 安全校验：只允许备份目录内的 .db 文件，禁止路径穿越
    const sanitized = path.basename(filename);  // 去除路径分隔符
    if (sanitized !== filename || sanitized.includes('..') || !sanitized.endsWith('.db')) {
      return res.json({ code: 400, message: '无效的备份文件名' });
    }
    const backupDir = path.resolve(__dirname, '..', 'backups');
    sourcePath = path.resolve(backupDir, sanitized);
    // 二次验证：确保解析后的路径仍在备份目录内
    if (!sourcePath.startsWith(backupDir + path.sep) && sourcePath !== backupDir) {
      return res.json({ code: 400, message: '非法的文件路径' });
    }
    if (!fs.existsSync(sourcePath)) {
      return res.json({ code: 400, message: '备份文件不存在' });
    }
  } else {
    return res.json({ code: 400, message: '请选择备份文件' });
  }

  try {
    // 复制备份文件覆盖当前数据库
    fs.copyFileSync(sourcePath, DB_PATH);
    // 删除上传的临时文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    // 重新初始化数据库连接
    const { initDb } = require('../db/init');
    initDb();
    res.json({ code: 0, message: '恢复成功' });
  } catch (err) {
    res.json({ code: 500, message: '恢复失败，请检查备份文件' });
  }
});

// 数据库重置（仅管理员）
router.post('/reset', adminMiddleware, (req, res) => {
  try {
    const db = getDb();
    // 清空所有表数据
    db.exec('DELETE FROM stock_in');
    db.exec('DELETE FROM stock_out');
    db.exec('DELETE FROM expenses');
    db.exec('DELETE FROM products');
    db.exec('DELETE FROM companies');
    db.exec('DELETE FROM clients');
    // 删除非默认管理员的用户
    db.exec('DELETE FROM users WHERE is_default != 1');
    // 重置默认管理员密码
    const hashedPassword = bcrypt.hashSync('admin', 10);
    db.prepare('UPDATE users SET password = ? WHERE is_default = 1').run(hashedPassword);
    res.json({ code: 0, message: '数据库重置成功' });
  } catch (err) {
    res.json({ code: 500, message: '重置失败' });
  }
});

module.exports = router;
