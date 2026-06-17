const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { authMiddleware, staffMiddleware, clientMiddleware } = require('../middleware/auth');

// 所有采购接口均需登录
router.use(authMiddleware);

// 生成不重复的采购单号（CG + 8位随机数字）
router.get('/generate-order-no', clientMiddleware, (req, res) => {
  const db = getDb();
  let orderNo;
  let exists;
  do {
    orderNo = 'CG' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
    exists = db.prepare('SELECT id FROM purchase_orders WHERE order_no = ?').get(orderNo);
  } while (exists);
  res.json({ code: 0, data: { order_no: orderNo } });
});

// 获取商品列表（客户选购用，不含库存信息）
router.get('/products', clientMiddleware, (req, res) => {
  const db = getDb();
  const list = db.prepare(`
    SELECT p.id, p.name, p.spec, p.unit, p.price, c.name AS company_name
    FROM products p
    LEFT JOIN companies c ON p.company_id = c.id
    ORDER BY p.id DESC
  `).all();
  res.json({ code: 0, data: list });
});

// 创建采购单（客户提交 → 状态：pending）
router.post('/', clientMiddleware, (req, res) => {
  const { order_no, items, remark } = req.body;
  if (!order_no || !items || !items.length) {
    return res.json({ code: 400, message: '请填写采购单信息' });
  }
  const clientId = req.user.client_id;
  if (!clientId) {
    return res.json({ code: 400, message: '该账号未绑定客户单位' });
  }
  const db = getDb();
  const dup = db.prepare('SELECT id FROM purchase_orders WHERE order_no = ?').get(order_no);
  if (dup) {
    return res.json({ code: 400, message: '采购单号已存在，请重新生成' });
  }
  const insertOrder = db.prepare(`
    INSERT INTO purchase_orders (order_no, client_id, status, remark, created_by)
    VALUES (?, ?, 'pending', ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO purchase_items (order_no, product_id, quantity, unit, price, total_amount, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const createdBy = req.user.real_name || req.user.username;
  const transaction = db.transaction(() => {
    insertOrder.run(order_no, clientId, remark || '', createdBy);
    for (const item of items) {
      const price = item.price || 0;
      const total = price * (item.quantity || 0);
      insertItem.run(order_no, item.product_id, item.quantity, item.unit || '', price, total, item.remark || '');
    }
  });
  try {
    transaction();
    res.json({ code: 0, message: '采购单提交成功', data: { order_no } });
  } catch (err) {
    res.json({ code: 500, message: '创建失败：' + err.message });
  }
});

// 查询本人采购单列表（客户）
router.get('/my', clientMiddleware, (req, res) => {
  const clientId = req.user.client_id;
  if (!clientId) {
    return res.json({ code: 400, message: '该账号未绑定客户单位' });
  }
  const db = getDb();
  const list = db.prepare(`
    SELECT po.*, c.name AS client_name,
      (SELECT COUNT(*) FROM purchase_items pi WHERE pi.order_no = po.order_no) AS item_count
    FROM purchase_orders po
    LEFT JOIN clients c ON po.client_id = c.id
    WHERE po.client_id = ?
    ORDER BY po.id DESC
  `).all(clientId);
  res.json({ code: 0, data: list });
});

// 所有采购单列表（工作人员：admin/user）
router.get('/', staffMiddleware, (req, res) => {
  try {
    const { keyword = '', status = '', page = 1, pageSize = 15 } = req.query;
    const offset = (page - 1) * pageSize;
    const db = getDb();
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) {
      where += ' AND (po.order_no LIKE ? OR c.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status) {
      where += ' AND po.status = ?';
      params.push(status);
    }
    const total = db.prepare(`SELECT COUNT(*) as count FROM purchase_orders po LEFT JOIN clients c ON po.client_id = c.id ${where}`).get(...params).count;
    const list = db.prepare(`
      SELECT po.*, c.name AS client_name,
        (SELECT COUNT(*) FROM purchase_items pi WHERE pi.order_no = po.order_no) AS item_count
      FROM purchase_orders po
      LEFT JOIN clients c ON po.client_id = c.id
      ${where}
      ORDER BY po.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(pageSize), offset);
    res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('采购单列表错误:', err);
    res.json({ code: 500, message: '查询失败：' + err.message });
  }
});

// 采购单详情（通用：客户只能看自己的，工作人员可看所有）
router.get('/:orderNo', authMiddleware, (req, res) => {
  const { orderNo } = req.params;
  const db = getDb();
  const order = db.prepare(`
    SELECT po.*, c.name AS client_name
    FROM purchase_orders po
    LEFT JOIN clients c ON po.client_id = c.id
    WHERE po.order_no = ?
  `).get(orderNo);
  if (!order) {
    return res.json({ code: 400, message: '采购单不存在' });
  }
  if (req.user.role === 'client' && order.client_id !== req.user.client_id) {
    return res.json({ code: 403, message: '无权查看该采购单' });
  }
  const items = db.prepare(`
    SELECT pi.*, p.name AS product_name, p.spec, p.unit AS product_unit, pi.price, pi.total_amount
    FROM purchase_items pi
    LEFT JOIN products p ON pi.product_id = p.id
    WHERE pi.order_no = ?
  `).all(orderNo);
  res.json({ code: 0, data: { order, items } });
});

// 开始备货（工作人员：pending → preparing）
router.put('/:orderNo/prepare', staffMiddleware, (req, res) => {
  const { orderNo } = req.params;
  const db = getDb();
  const order = db.prepare('SELECT * FROM purchase_orders WHERE order_no = ?').get(orderNo);
  if (!order) {
    return res.json({ code: 400, message: '采购单不存在' });
  }
  if (order.status !== 'pending') {
    return res.json({ code: 400, message: '只有待备货状态才能开始备货' });
  }
  const operator = req.user.real_name || req.user.username;
  db.prepare(`UPDATE purchase_orders SET status = 'preparing', preparing_by = ?, preparing_at = datetime('now', '+8 hours'), updated_at = datetime('now', '+8 hours') WHERE order_no = ?`)
    .run(operator, orderNo);
  res.json({ code: 0, message: '已开始备货' });
});

// 开始送货（工作人员：preparing → delivering，需填写送货信息）
router.put('/:orderNo/deliver', staffMiddleware, (req, res) => {
  const { orderNo } = req.params;
  const { delivery_company, delivery_no, delivery_contact, delivery_phone, delivery_remark } = req.body;
  const db = getDb();
  const order = db.prepare('SELECT * FROM purchase_orders WHERE order_no = ?').get(orderNo);
  if (!order) {
    return res.json({ code: 400, message: '采购单不存在' });
  }
  if (order.status !== 'preparing') {
    return res.json({ code: 400, message: '只有备货中状态才能开始送货' });
  }
  const operator = req.user.real_name || req.user.username;
  db.prepare(`UPDATE purchase_orders SET status = 'delivering', delivering_by = ?, delivering_at = datetime('now', '+8 hours'), delivery_company = ?, delivery_no = ?, delivery_contact = ?, delivery_phone = ?, delivery_remark = ?, updated_at = datetime('now', '+8 hours') WHERE order_no = ?`)
    .run(operator, delivery_company || '', delivery_no || '', delivery_contact || '', delivery_phone || '', delivery_remark || '', orderNo);
  res.json({ code: 0, message: '已开始送货' });
});

// 确认收货（客户：delivering → done）
router.put('/:orderNo/complete', clientMiddleware, (req, res) => {
  const { orderNo } = req.params;
  const { receipt_note } = req.body;
  const db = getDb();
  const order = db.prepare('SELECT * FROM purchase_orders WHERE order_no = ?').get(orderNo);
  if (!order) {
    return res.json({ code: 400, message: '采购单不存在' });
  }
  if (req.user.client_id !== order.client_id) {
    return res.json({ code: 403, message: '无权操作该采购单' });
  }
  if (order.status !== 'delivering') {
    return res.json({ code: 400, message: '只有送货中状态才能确认收货' });
  }
  const operator = req.user.real_name || req.user.username;
  db.prepare(`UPDATE purchase_orders SET status = 'done', done_by = ?, done_at = datetime('now', '+8 hours'), receipt_note = ?, updated_at = datetime('now', '+8 hours') WHERE order_no = ?`)
    .run(operator, receipt_note || '', orderNo);
  res.json({ code: 0, message: '已确认收货，采购单完成' });
});

module.exports = router;