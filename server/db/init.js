const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'accounting.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// 关闭数据库连接并重置缓存
function closeDb() {
  if (db) {
    try {
      db.close();
    } catch (e) {
      console.error('关闭数据库连接失败:', e.message);
    }
    db = null;
  }
}

// 重新打开数据库连接（用于恢复后备份后）
function reopenDb() {
  closeDb();
  return getDb();
}

function initDb() {
  const db = getDb();

  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      real_name TEXT NOT NULL DEFAULT '',
      phone TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'client')),
      client_id INTEGER DEFAULT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )
  `);

  // 系统设置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // 出货公司表
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      credit_code TEXT DEFAULT '',
      bank_account TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )
  `);

  // 商品在各出货公司的库存表
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_warehouse_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      warehouse_id INTEGER NOT NULL,
      quantity REAL DEFAULT 0,
      UNIQUE(product_id, warehouse_id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    )
  `);

  // 商品公司表
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      credit_code TEXT DEFAULT '',
      address TEXT DEFAULT '',
      contact TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )
  `);

  // 客户单位表
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      credit_code TEXT DEFAULT '',
      address TEXT DEFAULT '',
      contact TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )
  `);

  // 商品表
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company_id INTEGER,
      spec TEXT DEFAULT '',
      unit TEXT DEFAULT '',
      quantity REAL DEFAULT 0,
      price REAL DEFAULT 0,
      remark TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  // 入库明细表
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_in (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT DEFAULT '',
      product_id INTEGER NOT NULL,
      company_id INTEGER,
      unit TEXT DEFAULT '',
      price REAL DEFAULT 0,
      quantity REAL DEFAULT 0,
      before_qty REAL DEFAULT 0,
      after_qty REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      remark TEXT DEFAULT '',
      operator TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  // 迁移：给旧数据库加字段
  const stockInCols = db.prepare("PRAGMA table_info(stock_in)").all().map(c => c.name);
  if (!stockInCols.includes('order_no')) {
    db.exec("ALTER TABLE stock_in ADD COLUMN order_no TEXT DEFAULT ''");
  }
  if (!stockInCols.includes('warehouse_id')) {
    db.exec("ALTER TABLE stock_in ADD COLUMN warehouse_id INTEGER DEFAULT NULL");
  }

  // 出库明细表
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_out (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT DEFAULT '',
      product_id INTEGER NOT NULL,
      client_id INTEGER,
      unit TEXT DEFAULT '',
      price REAL DEFAULT 0,
      quantity REAL DEFAULT 0,
      before_qty REAL DEFAULT 0,
      after_qty REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      remark TEXT DEFAULT '',
      operator TEXT DEFAULT '',
      purchase_order_no TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  // 迁移：给旧数据库加字段
  const stockOutCols = db.prepare("PRAGMA table_info(stock_out)").all().map(c => c.name);
  if (!stockOutCols.includes('order_no')) {
    db.exec("ALTER TABLE stock_out ADD COLUMN order_no TEXT DEFAULT ''");
  }
  if (!stockOutCols.includes('warehouse_id')) {
    db.exec("ALTER TABLE stock_out ADD COLUMN warehouse_id INTEGER DEFAULT NULL");
  }
  if (!stockOutCols.includes('purchase_order_no')) {
    db.exec("ALTER TABLE stock_out ADD COLUMN purchase_order_no TEXT DEFAULT ''");
  }

  // 日常开销表
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      pay_method TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      payer TEXT DEFAULT '',
      recipient TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )
  `);

  // 迁移：给旧数据库加category和recipient字段
  const expCols = db.prepare("PRAGMA table_info(expenses)").all().map(c => c.name);
  if (!expCols.includes('category')) {
    db.exec("ALTER TABLE expenses ADD COLUMN category TEXT DEFAULT ''");
  }
  if (!expCols.includes('recipient')) {
    db.exec("ALTER TABLE expenses ADD COLUMN recipient TEXT DEFAULT ''");
  }

  // 迁移：给旧数据库 users 表加 client_id 字段
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('client_id')) {
    db.exec('ALTER TABLE users ADD COLUMN client_id INTEGER DEFAULT NULL');
  }

  // 迁移：给旧数据库 warehouses 表加新字段
  const whCols = db.prepare("PRAGMA table_info(warehouses)").all().map(c => c.name);
  if (!whCols.includes('credit_code')) {
    db.exec("ALTER TABLE warehouses ADD COLUMN credit_code TEXT DEFAULT ''");
  }
  if (!whCols.includes('bank_account')) {
    db.exec("ALTER TABLE warehouses ADD COLUMN bank_account TEXT DEFAULT ''");
  }
  if (!whCols.includes('phone')) {
    db.exec("ALTER TABLE warehouses ADD COLUMN phone TEXT DEFAULT ''");
  }

  // 采购单表
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      client_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'delivering', 'done')),
      remark TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', '+8 hours')),
      preparing_by TEXT DEFAULT '',
      preparing_at TEXT DEFAULT '',
      delivering_by TEXT DEFAULT '',
      delivering_at TEXT DEFAULT '',
      delivery_company TEXT DEFAULT '',
      delivery_no TEXT DEFAULT '',
      delivery_contact TEXT DEFAULT '',
      delivery_phone TEXT DEFAULT '',
      delivery_remark TEXT DEFAULT '',
      done_by TEXT DEFAULT '',
      done_at TEXT DEFAULT '',
      receipt_note TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now', '+8 hours')),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  // 采购单明细表
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT DEFAULT '',
      price REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      remark TEXT DEFAULT '',
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // 迁移：给旧数据库 purchase_orders 加新字段
  const poOrderCols = db.prepare('PRAGMA table_info(purchase_orders)').all().map(c => c.name);
  if (!poOrderCols.includes('created_by')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN created_by TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('preparing_by')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN preparing_by TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('preparing_at')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN preparing_at TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('delivering_by')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN delivering_by TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('delivering_at')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN delivering_at TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('delivery_company')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN delivery_company TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('delivery_no')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN delivery_no TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('delivery_contact')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN delivery_contact TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('delivery_phone')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN delivery_phone TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('delivery_remark')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN delivery_remark TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('done_by')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN done_by TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('done_at')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN done_at TEXT DEFAULT ""');
  }
  if (!poOrderCols.includes('receipt_note')) {
    db.exec('ALTER TABLE purchase_orders ADD COLUMN receipt_note TEXT DEFAULT ""');
  }
  // 迁移旧状态：旧preparing改为pending，让工作人员重新点备货
  try {
    db.exec("UPDATE purchase_orders SET status = 'pending' WHERE status = 'preparing' AND preparing_by = ''");
  } catch(e) {}

  // 迁移：给旧数据库 purchase_items 加 price 和 total_amount 字段
  const piCols = db.prepare('PRAGMA table_info(purchase_items)').all().map(c => c.name);
  if (!piCols.includes('price')) {
    db.exec('ALTER TABLE purchase_items ADD COLUMN price REAL DEFAULT 0');
  }
  if (!piCols.includes('total_amount')) {
    db.exec('ALTER TABLE purchase_items ADD COLUMN total_amount REAL DEFAULT 0');
  }

  // 插入默认管理员账号
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin', 10);
    db.prepare(`
      INSERT INTO users (username, password, real_name, role, is_default)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, '系统管理员', 'admin', 1);
  }

  // 插入默认系统名称
  const sysName = db.prepare('SELECT value FROM settings WHERE key = ?').get('system_name');
  if (!sysName) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('system_name', '做账管理系统');
  }

  return db;
}

module.exports = { getDb, initDb, closeDb, reopenDb, DB_PATH };
