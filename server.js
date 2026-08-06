require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const db = require('./db/init');
const countries = require('./db/countries');
const { requireUser, requireAdmin } = require('./middleware/auth');
const mailer = require('./utils/mailer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Session config
app.use(session({
  secret: 'novavest-secret-key-2024-investment-platform',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make countries and session available to all views
app.use((req, res, next) => {
  res.locals.countries = countries;
  res.locals.user = req.session.userId ? true : false;
  res.locals.admin = req.session.adminId ? true : false;
  res.locals.userName = req.session.userName || null;
  next();
});

// ============ HELPER ============
function logActivity(userId, action, details, ip) {
  db.run(`INSERT INTO activity_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
    [userId, action, details, ip]);
}

// ============ PUBLIC ROUTES ============

// Home / Landing
app.get('/', (req, res) => {
  db.all(`SELECT * FROM plans WHERE active = 1 ORDER BY min_deposit ASC`, (err, plans) => {
    res.render('index', { plans: plans || [], title: 'NovaVest - Premium Investment Platform' });
  });
});

// About
app.get('/about', (req, res) => {
  res.render('about', { title: 'About Us - NovaVest' });
});

// Plans page
app.get('/plans', (req, res) => {
  db.all(`SELECT * FROM plans WHERE active = 1 ORDER BY min_deposit ASC`, (err, plans) => {
    res.render('plans', { plans: plans || [], title: 'Investment Plans - NovaVest' });
  });
});

// FAQ
app.get('/faq', (req, res) => {
  res.render('faq', { title: 'FAQ - NovaVest' });
});

// Contact
app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact - NovaVest' });
});

// ============ AUTH ROUTES ============

// Signup
app.get('/signup', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  const ref = req.query.ref || '';
  res.render('signup', { countries, error: null, title: 'Sign Up - NovaVest', ref });
});

app.post('/signup', (req, res) => {
  const { full_name, email, phone, password, confirm_password, country, address, national_id, ref } = req.body;
  
  if (password !== confirm_password) {
    return res.render('signup', { countries, error: 'Passwords do not match', title: 'Sign Up - NovaVest', ref: ref || '' });
  }
  
  const countryData = countries.find(c => c.code === country);
  const idType = countryData ? countryData.idType : 'OtherID';

  db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, existing) => {
    if (existing) {
      return res.render('signup', { countries, error: 'Email already registered. Please login.', title: 'Sign Up - NovaVest', ref: ref || '' });
    }
    bcrypt.hash(password, 10, (err, hash) => {
      // Generate a unique referral code for this new user
      const referralCode = 'NV' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      
      db.run(`INSERT INTO users (full_name, email, phone, password, country, address, national_id, id_type, balance, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1000, ?, ?)`,
        [full_name, email, phone, hash, countryData ? countryData.name : country, address, national_id, idType, referralCode, ref || null],
        function(err) {
          if (err) {
            return res.render('signup', { countries, error: 'Error creating account. Try again.', title: 'Sign Up - NovaVest', ref: ref || '' });
          }
          const userId = this.lastID;
          req.session.userId = userId;
          req.session.userName = full_name;
          logActivity(userId, 'signup', `New user registered: ${full_name} (${email})`, req.ip);
          mailer.notifySignup({ full_name, email, country: countryData ? countryData.name : country });

          // Add $1,000 Sign Up Bonus transaction
          db.run(`INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, 'bonus', 1000, 'Sign Up Bonus', 'completed')`, [userId]);

          // If referred by someone, give referrer $700 bonus and log referral transaction
          if (ref) {
            db.get(`SELECT * FROM users WHERE referral_code = ?`, [ref], (e, referrer) => {
              if (referrer && referrer.id !== userId) {
                // Give referrer $700 bonus
                db.run(`UPDATE users SET balance = balance + 700, total_earned = total_earned + 700 WHERE id = ?`, [referrer.id]);
                db.run(`INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, 'bonus', 700, 'Referral Bonus', 'completed')`, [referrer.id]);
                logActivity(referrer.id, 'referral', `Referral bonus credited: ${full_name} signed up with your link`, null);
              }
            });
          }

          res.redirect('/dashboard');
        });
    });
  });
});

// Login
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('login', { error: null, title: 'Login - NovaVest' });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (!user) {
      return res.render('login', { error: 'Invalid email or password', title: 'Login - NovaVest' });
    }
    if (user.status === 'blocked') {
      return res.render('login', { error: 'Your account has been blocked. Contact support.', title: 'Login - NovaVest' });
    }
    bcrypt.compare(password, user.password, (err, match) => {
      if (!match) {
        return res.render('login', { error: 'Invalid email or password', title: 'Login - NovaVest' });
      }
      req.session.userId = user.id;
      req.session.userName = user.full_name;
      logActivity(user.id, 'login', `User logged in: ${user.email}`, req.ip);
      res.redirect('/dashboard');
    });
  });
});

// Logout
app.get('/logout', (req, res) => {
  if (req.session.userId) {
    logActivity(req.session.userId, 'logout', 'User logged out', req.ip);
  }
  req.session.destroy();
  res.redirect('/');
});

// Admin logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// ============ USER DASHBOARD ROUTES ============

app.get('/dashboard', requireUser, (req, res) => {
  const userId = req.session.userId;
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    db.all(`SELECT * FROM investments WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, investments) => {
      db.all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`, [userId], (err, transactions) => {
        db.all(`SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`, [userId], (err, deposits) => {
          db.all(`SELECT * FROM plans WHERE active = 1 ORDER BY min_deposit ASC`, (err, plans) => {
            res.render('dashboard', { user, investments: investments||[], transactions: transactions||[], deposits: deposits||[], plans: plans||[], active: 'overview', title: 'Dashboard - NovaVest' });
          });
        });
      });
    });
  });
});

// Deposit page
app.get('/deposit', requireUser, (req, res) => {
  const userId = req.session.userId;
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    db.all(`SELECT * FROM wallets WHERE active = 1 ORDER BY currency`, (err, wallets) => {
      db.all(`SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, deposits) => {
        res.render('deposit', { user, wallets: wallets||[], deposits: deposits||[], active: 'deposit', req_query_success: req.query.success === '1', title: 'Deposit - NovaVest' });
      });
    });
  });
});

// Submit deposit
app.post('/deposit', requireUser, (req, res) => {
  const userId = req.session.userId;
  const { wallet_id, amount, tx_hash } = req.body;
  
  db.get(`SELECT * FROM wallets WHERE id = ? AND active = 1`, [wallet_id], (err, wallet) => {
    if (!wallet) return res.redirect('/deposit');
    
    db.run(`INSERT INTO deposits (user_id, wallet_id, currency, amount, wallet_address, tx_hash, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, wallet_id, wallet.currency, amount, wallet.address, tx_hash],
      function(err) {
        const depositId = this.lastID;
        db.run(`INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, 'deposit', ?, ?, 'pending')`,
          [userId, amount, `Deposit via ${wallet.currency} - pending confirmation`]);
        logActivity(userId, 'deposit', `Deposit request: $${amount} via ${wallet.currency}`, req.ip);
        db.get(`SELECT * FROM users WHERE id = ?`, [userId], (e, user) => {
          if (user) mailer.notifyDepositSubmitted(user, { amount, currency: wallet.currency, network: wallet.network, tx_hash });
        });
        res.redirect('/deposit?success=1');
      });
  });
});

// Invest page
app.get('/invest', requireUser, (req, res) => {
  const userId = req.session.userId;
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    db.all(`SELECT * FROM plans WHERE active = 1 ORDER BY min_deposit ASC`, (err, plans) => {
      db.all(`SELECT * FROM investments WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, investments) => {
        res.render('invest', { user, plans: plans||[], investments: investments||[], active: 'invest', req_query_success: req.query.success === '1', req_query_error: req.query.error === '1', title: 'Invest - NovaVest' });
      });
    });
  });
});

// Submit investment
app.post('/invest', requireUser, (req, res) => {
  const userId = req.session.userId;
  const { plan_id, amount } = req.body;
  
  db.get(`SELECT * FROM plans WHERE id = ? AND active = 1`, [plan_id], (err, plan) => {
    if (!plan) return res.redirect('/invest');
    
    const amt = parseFloat(amount);
    if (amt < plan.min_deposit || (plan.max_deposit && amt > plan.max_deposit)) {
      return res.redirect('/invest?error=1');
    }
    
    const expectedReturn = amt + (amt * plan.roi_percent / 100);
    const endDate = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString();
    
    db.run(`INSERT INTO investments (user_id, plan_id, amount, roi_percent, expected_return, end_date, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [userId, plan_id, amt, plan.roi_percent, expectedReturn, endDate],
      function(err) {
        db.run(`INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, 'investment', ?, ?, 'completed')`,
          [userId, amt, `Invested in ${plan.name} plan - ${plan.roi_percent}% ROI in ${plan.duration_days} days`]);
        logActivity(userId, 'invest', `Invested $${amt} in ${plan.name} plan`, req.ip);
        db.get(`SELECT * FROM users WHERE id = ?`, [userId], (e, user) => {
          if (user) mailer.notifyInvestmentCreated(user, { amount: amt }, { name: plan.name, roi: plan.roi_percent, duration_days: plan.duration_days });
        });
        res.redirect('/invest?success=1');
      });
  });
});

// Withdraw
app.get('/withdraw', requireUser, (req, res) => {
  const userId = req.session.userId;
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    db.all(`SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, withdrawals) => {
      res.render('withdraw', { user, withdrawals: withdrawals||[], active: 'withdraw', req_query_success: req.query.success === '1', req_query_error: req.query.error === '1', title: 'Withdraw - NovaVest' });
    });
  });
});

app.post('/withdraw', requireUser, (req, res) => {
  const userId = req.session.userId;
  const { amount, wallet_address, currency } = req.body;
  const amt = parseFloat(amount);
  
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    if (amt > user.balance) {
      return res.redirect('/withdraw?error=1');
    }
    db.run(`INSERT INTO withdrawals (user_id, amount, wallet_address, currency, status) VALUES (?, ?, ?, ?, 'pending')`,
      [userId, amt, wallet_address, currency],
      function(err) {
        db.run(`INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, 'withdrawal', ?, ?, 'pending')`,
          [userId, amt, `Withdrawal request to ${wallet_address}`]);
        logActivity(userId, 'withdraw', `Withdrawal request: $${amt}`, req.ip);
        mailer.notifyWithdrawalSubmitted(user, { amount: amt, currency, wallet_address });
        res.redirect('/withdraw?success=1');
      });
  });
});

// Transactions history
app.get('/transactions', requireUser, (req, res) => {
  const userId = req.session.userId;
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    db.all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, transactions) => {
      res.render('transactions', { user, transactions: transactions||[], active: 'transactions', title: 'Transactions - NovaVest' });
    });
  });
});

// Referral page
app.get('/referral', requireUser, (req, res) => {
  const userId = req.session.userId;
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    const baseUrl = process.env.FRONTEND_URL || `http://${req.headers.host}`;
    const referralLink = `${baseUrl}/signup?ref=${user.referral_code}`;
    // Count referrals
    db.all(`SELECT full_name, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC`, [user.referral_code], (err, referrals) => {
      db.all(`SELECT amount FROM transactions WHERE user_id = ? AND type = 'bonus' AND description = 'Referral Bonus'`, [userId], (err, refBonuses) => {
        const totalReferralEarnings = (refBonuses || []).reduce((sum, b) => sum + b.amount, 0);
        res.render('referral', { user, referralLink, referrals: referrals || [], totalReferralEarnings, active: 'referral', title: 'Referral Program - NovaVest' });
      });
    });
  });
});

// Profile
app.get('/profile', requireUser, (req, res) => {
  const userId = req.session.userId;
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    res.render('profile', { user, active: 'profile', title: 'Profile - NovaVest' });
  });
});

// ============ SUPPORT CHAT (USER SIDE) ============

app.get('/support', requireUser, (req, res) => {
  const userId = req.session.userId;
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    db.all(`SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC`, [userId], (err, messages) => {
      // mark admin messages as read
      db.run(`UPDATE messages SET read_status = 1 WHERE user_id = ? AND sender = 'admin'`, [userId]);
      res.render('support', { user, messages: messages||[], active: 'support', title: 'Support - NovaVest' });
    });
  });
});

app.post('/support/send', requireUser, (req, res) => {
  const userId = req.session.userId;
  const { message } = req.body;
  db.run(`INSERT INTO messages (user_id, sender, message) VALUES (?, 'user', ?)`, [userId, message], function() {
    const msgId = this.lastID;
    io.to('admin-room').emit('new_message', { id: msgId, user_id: userId, sender: 'user', message, created_at: new Date().toISOString() });
    res.json({ success: true });
  });
});

app.get('/support/messages', requireUser, (req, res) => {
  const userId = req.session.userId;
  db.all(`SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC`, [userId], (err, messages) => {
    db.run(`UPDATE messages SET read_status = 1 WHERE user_id = ? AND sender = 'admin'`, [userId]);
    res.json({ messages: messages || [] });
  });
});

// ============ ADMIN ROUTES ============

app.get('/admin/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin');
  res.render('admin/login', { error: null, title: 'Admin Login - NovaVest' });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM admins WHERE username = ?`, [username], (err, admin) => {
    if (!admin) {
      return res.render('admin/login', { error: 'Invalid credentials', title: 'Admin Login - NovaVest' });
    }
    bcrypt.compare(password, admin.password, (err, match) => {
      if (!match) {
        return res.render('admin/login', { error: 'Invalid credentials', title: 'Admin Login - NovaVest' });
      }
      req.session.adminId = admin.id;
      req.session.adminName = admin.username;
      res.redirect('/admin');
    });
  });
});

// Admin dashboard
app.get('/admin', requireAdmin, (req, res) => {
  db.get(`SELECT COUNT(*) as totalUsers, SUM(total_deposited) as totalDeposits, SUM(total_earned) as totalEarnings FROM users WHERE is_admin = 0`, (err, stats) => {
    db.get(`SELECT COUNT(*) as pendingDeposits FROM deposits WHERE status = 'pending'`, (err, depStats) => {
      db.get(`SELECT COUNT(*) as pendingWithdrawals FROM withdrawals WHERE status = 'pending'`, (err, wdStats) => {
        db.get(`SELECT COUNT(*) as unreadMessages FROM messages WHERE sender = 'user' AND read_status = 0`, (err, msgStats) => {
          db.all(`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 15`, (err, activities) => {
            db.all(`SELECT * FROM users WHERE is_admin = 0 ORDER BY created_at DESC LIMIT 8`, (err, recentUsers) => {
              res.render('admin/dashboard', {
                stats: stats || {}, 
                pendingDeposits: depStats?.pendingDeposits || 0,
                pendingWithdrawals: wdStats?.pendingWithdrawals || 0,
                unreadMessages: msgStats?.unreadMessages || 0,
                activities: activities || [],
                recentUsers: recentUsers || [],
                active: 'overview',
                adminName: req.session.adminName,
                title: 'Admin Dashboard - NovaVest'
              });
            });
          });
        });
      });
    });
  });
});

// Admin - Users
app.get('/admin/users', requireAdmin, (req, res) => {
  db.all(`SELECT * FROM users WHERE is_admin = 0 ORDER BY created_at DESC`, (err, users) => {
    res.render('admin/users', { users: users||[], active: 'users', adminName: req.session.adminName, title: 'Users - NovaVest Admin' });
  });
});

// Admin - User detail
app.get('/admin/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    db.all(`SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, deposits) => {
      db.all(`SELECT * FROM investments WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, investments) => {
        db.all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, transactions) => {
          db.all(`SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, withdrawals) => {
            db.all(`SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, activities) => {
              res.render('admin/user_detail', { 
                user, deposits: deposits||[], investments: investments||[], 
                transactions: transactions||[], withdrawals: withdrawals||[], 
                activities: activities||[], active: 'users', adminName: req.session.adminName,
                title: `User: ${user?.full_name} - NovaVest Admin`
              });
            });
          });
        });
      });
    });
  });
});

// Admin - block/unblock user
app.post('/admin/users/:id/status', requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;
  db.run(`UPDATE users SET status = ? WHERE id = ?`, [status, userId], () => {
    res.redirect('/admin/users/' + userId);
  });
});

// Admin - Deposits
app.get('/admin/deposits', requireAdmin, (req, res) => {
  db.all(`SELECT d.*, u.full_name, u.email FROM deposits d JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC`, (err, deposits) => {
    res.render('admin/deposits', { deposits: deposits||[], active: 'deposits', adminName: req.session.adminName, title: 'Deposits - NovaVest Admin' });
  });
});

// Admin - approve/reject deposit
app.post('/admin/deposits/:id/approve', requireAdmin, (req, res) => {
  const depositId = req.params.id;
  db.get(`SELECT * FROM deposits WHERE id = ?`, [depositId], (err, deposit) => {
    db.run(`UPDATE deposits SET status = 'confirmed' WHERE id = ?`, [depositId], () => {
      db.run(`UPDATE users SET balance = balance + ?, total_deposited = total_deposited + ? WHERE id = ?`, [deposit.amount, deposit.amount, deposit.user_id]);
      db.run(`UPDATE transactions SET status = 'completed', description = ? WHERE id = (SELECT id FROM transactions WHERE user_id = ? AND type = 'deposit' ORDER BY id DESC LIMIT 1)`, 
        [`Deposit of $${deposit.amount} confirmed`, deposit.user_id]);
      db.get(`SELECT * FROM users WHERE id = ?`, [deposit.user_id], (e, user) => {
        if (user) mailer.notifyDepositApproved(user, { amount: deposit.amount, currency: deposit.currency });
      });
      res.redirect('/admin/deposits');
    });
  });
});

app.post('/admin/deposits/:id/reject', requireAdmin, (req, res) => {
  const depositId = req.params.id;
  db.get(`SELECT * FROM deposits WHERE id = ?`, [depositId], (err, deposit) => {
    db.run(`UPDATE deposits SET status = 'rejected' WHERE id = ?`, [depositId], () => {
      if (deposit) {
        db.get(`SELECT * FROM users WHERE id = ?`, [deposit.user_id], (e, user) => {
          if (user) mailer.notifyDepositRejected(user, { amount: deposit.amount, currency: deposit.currency });
        });
      }
      res.redirect('/admin/deposits');
    });
  });
});

// Admin - Withdrawals
app.get('/admin/withdrawals', requireAdmin, (req, res) => {
  db.all(`SELECT w.*, u.full_name, u.email FROM withdrawals w JOIN users u ON w.user_id = u.id ORDER BY w.created_at DESC`, (err, withdrawals) => {
    res.render('admin/withdrawals', { withdrawals: withdrawals||[], active: 'withdrawals', adminName: req.session.adminName, title: 'Withdrawals - NovaVest Admin' });
  });
});

app.post('/admin/withdrawals/:id/approve', requireAdmin, (req, res) => {
  const wdId = req.params.id;
  db.get(`SELECT * FROM withdrawals WHERE id = ?`, [wdId], (err, wd) => {
    db.run(`UPDATE withdrawals SET status = 'completed' WHERE id = ?`, [wdId], () => {
      db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [wd.amount, wd.user_id]);
      db.run(`UPDATE transactions SET status = 'completed' WHERE id = (SELECT id FROM transactions WHERE user_id = ? AND type = 'withdrawal' ORDER BY id DESC LIMIT 1)`, [wd.user_id]);
      db.get(`SELECT * FROM users WHERE id = ?`, [wd.user_id], (e, user) => {
        if (user) mailer.notifyWithdrawalApproved(user, { amount: wd.amount, currency: wd.currency, wallet_address: wd.wallet_address });
      });
      res.redirect('/admin/withdrawals');
    });
  });
});

app.post('/admin/withdrawals/:id/reject', requireAdmin, (req, res) => {
  db.get(`SELECT * FROM withdrawals WHERE id = ?`, [req.params.id], (err, wd) => {
    db.run(`UPDATE withdrawals SET status = 'rejected' WHERE id = ?`, [req.params.id], () => {
      if (wd) {
        db.get(`SELECT * FROM users WHERE id = ?`, [wd.user_id], (e, user) => {
          if (user) mailer.notifyWithdrawalRejected(user, { amount: wd.amount, currency: wd.currency });
        });
      }
      res.redirect('/admin/withdrawals');
    });
  });
});

// Admin - Wallets (editable)
app.get('/admin/wallets', requireAdmin, (req, res) => {
  db.all(`SELECT * FROM wallets ORDER BY currency`, (err, wallets) => {
    res.render('admin/wallets', { wallets: wallets||[], active: 'wallets', adminName: req.session.adminName, title: 'Wallets - NovaVest Admin' });
  });
});

app.post('/admin/wallets/add', requireAdmin, (req, res) => {
  const { currency, network, address } = req.body;
  db.run(`INSERT INTO wallets (currency, network, address, active) VALUES (?, ?, ?, 1)`, [currency, network, address], () => {
    res.redirect('/admin/wallets');
  });
});

app.post('/admin/wallets/:id/update', requireAdmin, (req, res) => {
  const { currency, network, address, active } = req.body;
  db.run(`UPDATE wallets SET currency = ?, network = ?, address = ?, active = ? WHERE id = ?`, 
    [currency, network, address, active === 'on' ? 1 : 0, req.params.id], () => {
    res.redirect('/admin/wallets');
  });
});

app.post('/admin/wallets/:id/delete', requireAdmin, (req, res) => {
  db.run(`DELETE FROM wallets WHERE id = ?`, [req.params.id], () => {
    res.redirect('/admin/wallets');
  });
});

// Admin - Plans management
app.get('/admin/plans', requireAdmin, (req, res) => {
  db.all(`SELECT * FROM plans ORDER BY min_deposit ASC`, (err, plans) => {
    res.render('admin/plans', { plans: plans||[], active: 'plans', adminName: req.session.adminName, title: 'Plans - NovaVest Admin' });
  });
});

app.post('/admin/plans/add', requireAdmin, (req, res) => {
  const { name, min_deposit, max_deposit, roi_percent, duration_days, description, badge } = req.body;
  db.run(`INSERT INTO plans (name, min_deposit, max_deposit, roi_percent, duration_days, description, badge, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [name, min_deposit, max_deposit || null, roi_percent, duration_days, description, badge], () => {
    res.redirect('/admin/plans');
  });
});

app.post('/admin/plans/:id/update', requireAdmin, (req, res) => {
  const { name, min_deposit, max_deposit, roi_percent, duration_days, description, badge, active } = req.body;
  db.run(`UPDATE plans SET name=?, min_deposit=?, max_deposit=?, roi_percent=?, duration_days=?, description=?, badge=?, active=? WHERE id=?`,
    [name, min_deposit, max_deposit || null, roi_percent, duration_days, description, badge, active === 'on' ? 1 : 0, req.params.id], () => {
    res.redirect('/admin/plans');
  });
});

app.post('/admin/plans/:id/delete', requireAdmin, (req, res) => {
  db.run(`DELETE FROM plans WHERE id = ?`, [req.params.id], () => {
    res.redirect('/admin/plans');
  });
});

// Admin - Support chat
app.get('/admin/support', requireAdmin, (req, res) => {
  db.all(`SELECT u.id, u.full_name, u.email, 
          (SELECT message FROM messages WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM messages WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_time,
          (SELECT COUNT(*) FROM messages WHERE user_id = u.id AND sender = 'user' AND read_status = 0) as unread
          FROM users u WHERE u.is_admin = 0 AND EXISTS (SELECT 1 FROM messages WHERE user_id = u.id)
          ORDER BY last_time DESC`, (err, users) => {
    res.render('admin/support', { users: users||[], active: 'support', adminName: req.session.adminName, title: 'Support - NovaVest Admin' });
  });
});

app.get('/admin/support/:userId/messages', requireAdmin, (req, res) => {
  const userId = req.params.userId;
  db.all(`SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC`, [userId], (err, messages) => {
    db.run(`UPDATE messages SET read_status = 1 WHERE user_id = ? AND sender = 'user'`, [userId]);
    db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
      res.json({ messages: messages || [], user: user });
    });
  });
});

app.post('/admin/support/:userId/send', requireAdmin, (req, res) => {
  const userId = req.params.userId;
  const { message } = req.body;
  db.run(`INSERT INTO messages (user_id, sender, message) VALUES (?, 'admin', ?)`, [userId, message], function() {
    const msgId = this.lastID;
    io.to('user-room-' + userId).emit('admin_message', { id: msgId, sender: 'admin', message, created_at: new Date().toISOString() });
    db.get(`SELECT * FROM users WHERE id = ?`, [userId], (e, user) => {
      if (user) mailer.notifyChatReply(user, message);
    });
    res.json({ success: true });
  });
});

// Admin - Activity log
app.get('/admin/activity', requireAdmin, (req, res) => {
  db.all(`SELECT a.*, u.full_name, u.email FROM activity_log a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 100`, (err, activities) => {
    res.render('admin/activity', { activities: activities||[], active: 'activity', adminName: req.session.adminName, title: 'Activity Log - NovaVest Admin' });
  });
});

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  // User joins their room
  socket.on('join_user', (userId) => {
    socket.join('user-room-' + userId);
  });
  
  // Admin joins admin room
  socket.on('join_admin', () => {
    socket.join('admin-room');
  });
  
  // Admin opens specific user chat
  socket.on('admin_open_chat', (userId) => {
    socket.join('admin-chat-' + userId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`NovaVest server running on port ${PORT}`);
  console.log(`Admin login: admin / admin123`);
});

module.exports = app;
