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
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
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

  // 库房表
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )
  `);

  // 商品在各库房的库存表
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

module.exports = { getDb, initDb, DB_PATH };
