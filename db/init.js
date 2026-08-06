const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// DB path — can be overridden with DB_PATH env var for persistent volumes
const dbPath = process.env.DB_PATH || path.join(__dirname, 'novavest.db');

// Ensure directory exists for the DB file
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Users table - all signup details visible in admin
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    country TEXT,
    address TEXT,
    national_id TEXT,
    id_type TEXT,
    balance REAL DEFAULT 0,
    total_deposited REAL DEFAULT 0,
    total_earned REAL DEFAULT 0,
    referral_code TEXT,
    referred_by INTEGER,
    is_admin INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Admin users table
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Investment plans
  db.run(`CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    min_deposit REAL NOT NULL,
    max_deposit REAL,
    roi_percent REAL NOT NULL,
    duration_days INTEGER NOT NULL,
    description TEXT,
    badge TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Deposit wallets (editable by admin)
  db.run(`CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    currency TEXT NOT NULL,
    network TEXT,
    address TEXT NOT NULL,
    qr_code TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Deposits
  db.run(`CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    wallet_id INTEGER,
    currency TEXT,
    amount REAL NOT NULL,
    wallet_address TEXT,
    status TEXT DEFAULT 'pending',
    tx_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Investments
  db.run(`CREATE TABLE IF NOT EXISTS investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    roi_percent REAL,
    expected_return REAL,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
  )`);

  // Transactions
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    tx_hash TEXT,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Withdrawals
  db.run(`CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    wallet_address TEXT,
    currency TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Support chat messages
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    read_status INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Activity log for admin monitoring
  db.run(`CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Seed default admin
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  bcrypt.hash(adminPass, 10, (err, hash) => {
    if (err) return;
    db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, ['admin', hash]);
  });

  // Migrations for existing databases - add new columns if they don't exist
  db.run(`ALTER TABLE users ADD COLUMN referral_code TEXT`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN referred_by INTEGER`, () => {});
  db.run(`ALTER TABLE transactions ADD COLUMN tx_hash TEXT`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN reset_token TEXT`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN reset_expires TEXT`, () => {});

  // Seed investment plans
  db.run(`INSERT OR IGNORE INTO plans (id, name, min_deposit, max_deposit, roi_percent, duration_days, description, badge) VALUES
    (1, 'Starter', 100, 999, 25, 7, 'Perfect entry plan for new investors. Deposit from $100 and earn a guaranteed 25% return in just 7 days. Fast, reliable, and beginner-friendly.', 'Popular'),
    (2, 'Professional', 1000, 9999, 60, 14, 'For serious investors ready to scale. Deposit $1,000 - $9,999 and watch your portfolio grow by 60% in 14 days with our diversified trading strategies.', 'Best Value'),
    (3, 'Elite', 10000, 100000, 150, 30, 'The ultimate wealth-building plan. From $10,000, earn a massive 150% ROI in 30 days with VIP portfolio management and priority support.', 'Premium'),
    (4, 'Quick Return', 200, 1999, 40, 2, 'Lightning-fast returns for investors who want quick results. Deposit from $200 and earn 40% in just 24-48 hours. Perfect for short-term gains with minimal commitment.', 'Fast Cash')`);

  // Ensure plan 4 exists for existing databases (INSERT OR IGNORE)
  db.run(`INSERT OR IGNORE INTO plans (id, name, min_deposit, max_deposit, roi_percent, duration_days, description, badge) VALUES
    (4, 'Quick Return', 200, 1999, 40, 2, 'Lightning-fast returns for investors who want quick results. Deposit from $200 and earn 40% in just 24-48 hours. Perfect for short-term gains with minimal commitment.', 'Fast Cash')`);

  // Seed default wallets
  db.run(`INSERT OR IGNORE INTO wallets (id, currency, network, address, active) VALUES
    (1, 'Bitcoin', 'BTC Network', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 1),
    (2, 'Ethereum', 'ERC-20', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 1),
    (3, 'USDT', 'TRC-20 (Tron)', 'TQn9Y2khEsLJ7X6X5yFvcJ9vj4Pv2k1kM2', 1),
    (4, 'USDT', 'ERC-20 (Ethereum)', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 1),
    (5, 'Litecoin', 'LTC Network', 'ltc1qg9stkxrszkdqsuj92lm4c7akvk36zvhqw7p6ck', 1)`);
});

module.exports = db;
