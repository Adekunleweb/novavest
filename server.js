require('dotenv').config();
const crypto = require('crypto');
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
  secret: process.env.SESSION_SECRET || 'apexcrestvest-secret-key-2024-investment-platform',
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
    res.render('index', { plans: plans || [], title: 'ApexCrestVest - Premium Investment Platform' });
  });
});

// About
app.get('/about', (req, res) => {
  res.render('about', { title: 'About Us - ApexCrestVest' });
});

// Plans page
app.get('/plans', (req, res) => {
  db.all(`SELECT * FROM plans WHERE active = 1 ORDER BY min_deposit ASC`, (err, plans) => {
    res.render('plans', { plans: plans || [], title: 'Investment Plans - ApexCrestVest' });
  });
});

// FAQ
app.get('/faq', (req, res) => {
  res.render('faq', { title: 'FAQ - ApexCrestVest' });
});

// Contact
app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact - ApexCrestVest' });
});

// ============ AUTH ROUTES ============

// Signup
app.get('/signup', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  const ref = req.query.ref || '';
  res.render('signup', { countries, error: null, title: 'Sign Up - ApexCrestVest', ref });
});

app.post('/signup', (req, res) => {
  const { full_name, email, phone, password, confirm_password, country, address, national_id, ref } = req.body;
  
  if (password !== confirm_password) {
    return res.render('signup', { countries, error: 'Passwords do not match', title: 'Sign Up - ApexCrestVest', ref: ref || '' });
  }
  
  const countryData = countries.find(c => c.code === country);
  const idType = countryData ? countryData.idType : 'OtherID';

  db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, existing) => {
    if (existing) {
      return res.render('signup', { countries, error: 'Email already registered. Please login.', title: 'Sign Up - ApexCrestVest', ref: ref || '' });
    }
    bcrypt.hash(password, 10, (err, hash) => {
      // Generate a unique referral code for this new user
      const referralCode = 'NV' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      
      db.run(`INSERT INTO users (full_name, email, phone, password, country, address, national_id, id_type, balance, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1000, ?, ?)`,
        [full_name, email, phone, hash, countryData ? countryData.name : country, address, national_id, idType, referralCode, ref || null],
        function(err) {
          if (err) {
            return res.render('signup', { countries, error: 'Error creating account. Try again.', title: 'Sign Up - ApexCrestVest', ref: ref || '' });
          }
          const userId = this.lastID;
          req.session.userId = userId;
          req.session.userName = full_name;
          logActivity(userId, 'signup', `New user registered: ${full_name} (${email})`, req.ip);
          mailer.notifySignup({ full_name, email, country: countryData ? countryData.name : country });

          // Add $1,000 Sign Up Bonus transaction
          db.run(`INSERT INTO transactions (user_id, type, amount, description, status, tx_hash) VALUES (?, 'bonus', 1000, 'Sign Up Bonus', 'completed', ?)`, [userId, generateTxHash('bonus')]);

          // If referred by someone, give referrer $700 bonus and log referral transaction
          if (ref) {
            db.get(`SELECT * FROM users WHERE referral_code = ?`, [ref], (e, referrer) => {
              if (referrer && referrer.id !== userId) {
                // Give referrer $700 bonus
                db.run(`UPDATE users SET balance = balance + 700, total_earned = total_earned + 700 WHERE id = ?`, [referrer.id]);
                db.run(`INSERT INTO transactions (user_id, type, amount, description, status, tx_hash) VALUES (?, 'bonus', 700, 'Referral Bonus', 'completed', ?)`, [referrer.id, generateTxHash('bonus')]);
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
  res.render('login', { error: null, success_msg: null, title: 'Login - ApexCrestVest' });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (!user) {
      return res.render('login', { error: 'Invalid email or password', success_msg: null, title: 'Login - ApexCrestVest' });
    }
    if (user.status === 'blocked') {
      return res.render('login', { error: 'Your account has been blocked. Contact support.', success_msg: null, title: 'Login - ApexCrestVest' });
    }
    bcrypt.compare(password, user.password, (err, match) => {
      if (!match) {
        return res.render('login', { error: 'Invalid email or password', success_msg: null, title: 'Login - ApexCrestVest' });
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


// Forgot Password - GET (show form)
app.get('/forgot-password', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('forgot-password', { error: null, success: null, title: 'Forgot Password - ApexCrestVest' });
});

// Forgot Password - POST (send reset email)
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (!user) {
      // For security, show the same success message even if email doesn't exist
      return res.render('forgot-password', { 
        error: null, 
        success: 'If an account with that email exists, a password reset link has been sent. Please check your inbox and spam folder.', 
        title: 'Forgot Password - ApexCrestVest' 
      });
    }
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

    db.run(`UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?`, [token, expires, user.id], (err) => {
      const baseUrl = process.env.FRONTEND_URL || 'http://' + req.headers.host;
      const resetUrl = baseUrl + '/reset-password?token=' + token;
      
      // Send the reset email
      mailer.notifyPasswordReset(user, resetUrl);
      
      logActivity(user.id, 'password_reset_request', `Password reset requested for ${email}`, req.ip);
      
      res.render('forgot-password', { 
        error: null, 
        success: 'If an account with that email exists, a password reset link has been sent. Please check your inbox and spam folder.', 
        title: 'Forgot Password - ApexCrestVest' 
      });
    });
  });
});

// Reset Password - GET (show form with token)
app.get('/reset-password', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.render('reset-password', { 
      error: 'Invalid or missing reset token. Please request a new password reset link.', 
      token: null, 
      title: 'Reset Password - ApexCrestVest' 
    });
  }
  db.get(`SELECT * FROM users WHERE reset_token = ?`, [token], (err, user) => {
    if (!user) {
      return res.render('reset-password', { 
        error: 'This reset link is invalid or has already been used. Please request a new password reset link.', 
        token: null, 
        title: 'Reset Password - ApexCrestVest' 
      });
    }
    // Check if token has expired
    const expires = new Date(user.reset_expires);
    if (expires < new Date()) {
      return res.render('reset-password', { 
        error: 'This reset link has expired. Please request a new password reset link.', 
        token: null, 
        title: 'Reset Password - ApexCrestVest' 
      });
    }
    res.render('reset-password', { 
      error: null, 
      token: token, 
      title: 'Reset Password - ApexCrestVest' 
    });
  });
});

// Reset Password - POST (update password)
app.post('/reset-password', (req, res) => {
  const { password, confirm_password } = req.body;
  const token = req.query.token;

  if (!token) {
    return res.render('reset-password', { 
      error: 'Invalid or missing reset token. Please request a new password reset link.', 
      token: null, 
      title: 'Reset Password - ApexCrestVest' 
    });
  }
  if (password !== confirm_password) {
    return res.render('reset-password', { 
      error: 'Passwords do not match. Please try again.', 
      token: token, 
      title: 'Reset Password - ApexCrestVest' 
    });
  }
  if (password.length < 6) {
    return res.render('reset-password', { 
      error: 'Password must be at least 6 characters long.', 
      token: token, 
      title: 'Reset Password - ApexCrestVest' 
    });
  }

  db.get(`SELECT * FROM users WHERE reset_token = ?`, [token], (err, user) => {
    if (!user) {
      return res.render('reset-password', { 
        error: 'This reset link is invalid or has already been used. Please request a new password reset link.', 
        token: null, 
        title: 'Reset Password - ApexCrestVest' 
      });
    }
    const expires = new Date(user.reset_expires);
    if (expires < new Date()) {
      return res.render('reset-password', { 
        error: 'This reset link has expired. Please request a new password reset link.', 
        token: null, 
        title: 'Reset Password - ApexCrestVest' 
      });
    }

    bcrypt.hash(password, 10, (err, hash) => {
      db.run(`UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?`, [hash, user.id], (err) => {
        if (err) {
          return res.render('reset-password', { 
            error: 'An error occurred. Please try again.', 
            token: token, 
            title: 'Reset Password - ApexCrestVest' 
          });
        }
        // Send confirmation email
        mailer.notifyPasswordChanged(user);
        logActivity(user.id, 'password_change', `Password changed via reset for ${user.email}`, req.ip);
        
        // Redirect to login with success message
        res.render('login', { 
          error: null, 
          success_msg: 'Your password has been reset successfully. Please log in with your new password.',
          title: 'Login - ApexCrestVest' 
        });
      });
    });
  });
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
            res.render('dashboard', { user, investments: investments||[], transactions: transactions||[], deposits: deposits||[], plans: plans||[], active: 'overview', title: 'Dashboard - ApexCrestVest' });
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
        res.render('deposit', { user, wallets: wallets||[], deposits: deposits||[], active: 'deposit', req_query_success: req.query.success === '1', title: 'Deposit - ApexCrestVest' });
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
        db.run(`INSERT INTO transactions (user_id, type, amount, description, status, tx_hash) VALUES (?, 'deposit', ?, ?, 'pending', ?)`,
          [userId, amount, `Deposit via ${wallet.currency} - pending confirmation`, tx_hash]);
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
        res.render('invest', { user, plans: plans||[], investments: investments||[], active: 'invest', req_query_success: req.query.success === '1', req_query_error: req.query.error === '1', title: 'Invest - ApexCrestVest' });
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
        db.run(`INSERT INTO transactions (user_id, type, amount, description, status, tx_hash) VALUES (?, 'investment', ?, ?, 'completed', ?)`,
          [userId, amt, `Invested in ${plan.name} plan - ${plan.roi_percent}% ROI in ${plan.duration_days} days`, generateTxHash('investment')]);
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
      res.render('withdraw', { user, withdrawals: withdrawals||[], active: 'withdraw', req_query_success: req.query.success === '1', req_query_error: req.query.error === '1', title: 'Withdraw - ApexCrestVest' });
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
        const wHash = generateTxHash('withdrawal');
        db.run(`INSERT INTO transactions (user_id, type, amount, description, status, tx_hash) VALUES (?, 'withdrawal', ?, ?, 'pending', ?)`,
          [userId, amt, `Withdrawal request to ${wallet_address}`, wHash]);
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
      res.render('transactions', { user, transactions: transactions||[], active: 'transactions', title: 'Transactions - ApexCrestVest' });
    });
  });
});

// Generate a realistic blockchain-style transaction hash
function generateTxHash(type) {
  const prefix = type === 'deposit' ? '0x' : type === 'withdrawal' ? '0x' : 'NV';
  const chars = '0123456789abcdef';
  let hash = prefix;
  const length = type === 'interest' || type === 'bonus' ? 48 : 64;
  for (let i = 0; i < length; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

// Transaction detail page — shows a full receipt like a blockchain explorer
app.get('/transactions/:id', requireUser, (req, res) => {
  const userId = req.session.userId;
  const txnId = req.params.id;

  db.get(`SELECT * FROM transactions WHERE id = ? AND user_id = ?`, [txnId, userId], (err, txn) => {
    if (!txn) {
      return res.status(404).render('error', { message: 'Transaction not found', title: 'Not Found - ApexCrestVest' });
    }

    db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
      // Generate tx_hash if missing (for older transactions)
      let txHash = txn.tx_hash;
      if (!txHash) {
        txHash = generateTxHash(txn.type);
        db.run(`UPDATE transactions SET tx_hash = ? WHERE id = ?`, [txHash, txn.id]);
        txn.tx_hash = txHash;
      }

      // Build block / confirmation info for realism
      const txnDate = new Date(txn.created_at);
      const now = new Date();
      const hoursDiff = Math.abs(now - txnDate) / 36e5;
      const confirmations = Math.min(999, Math.floor(hoursDiff * 6) + 3); // ~6 conf per hour
      const blockHeight = 850000 + Math.floor(Math.abs(now - txnDate) / 60000); // ~1 block per min

      // Determine network & from/to addresses based on type
      let network = 'TRC-20 (Tron)';
      let fromAddr = 'TQn9Y2khEsLJW7B' + txn.tx_hash?.substring(2, 12).toUpperCase() || 'TQn9Y2khEsLJW7B';
      let toAddr = 'TNzK9h2xWpF3mQd' + Math.random().toString(36).substring(2, 12).toUpperCase();
      let gasFee = 0;

      if (txn.type === 'deposit') {
        network = ['TRC-20 (Tron)', 'Bitcoin (BTC)', 'ERC-20 (Ethereum)', 'Litecoin (LTC)'][Math.floor(Math.random() * 4)];
        fromAddr = 'External Wallet';
        toAddr = user.email;
        gasFee = network.includes('Bitcoin') ? 0.00001234 : network.includes('Ethereum') ? 0.00234567 : 0.00000123;
      } else if (txn.type === 'withdrawal') {
        network = ['TRC-20 (Tron)', 'Bitcoin (BTC)', 'ERC-20 (Ethereum)'][Math.floor(Math.random() * 3)];
        fromAddr = user.email;
        toAddr = 'External Wallet';
        gasFee = network.includes('Bitcoin') ? 0.00002345 : network.includes('Ethereum') ? 0.00345678 : 0.00000234;
      } else if (txn.type === 'interest' || txn.type === 'bonus' || txn.type === 'investment') {
        network = 'Internal Transfer';
        fromAddr = 'ApexCrestVest Investment Pool';
        toAddr = user.email;
        gasFee = 0;
      }

      // Format the amount nicely
      const formattedAmount = parseFloat(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      res.render('transaction-detail', {
        user, txn, txHash, confirmations, blockHeight, network,
        fromAddr, toAddr, gasFee, formattedAmount,
        active: 'transactions',
        title: `Transaction ${txHash.substring(0, 12)}... - ApexCrestVest`
      });
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
        res.render('referral', { user, referralLink, referrals: referrals || [], totalReferralEarnings, active: 'referral', title: 'Referral Program - ApexCrestVest' });
      });
    });
  });
});

// Profile
app.get('/profile', requireUser, (req, res) => {
  const userId = req.session.userId;
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    res.render('profile', { user, active: 'profile', title: 'Profile - ApexCrestVest' });
  });
});

// ============ SUPPORT CHAT (USER SIDE) ============

app.get('/support', requireUser, (req, res) => {
  const userId = req.session.userId;
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    db.all(`SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC`, [userId], (err, messages) => {
      // mark admin messages as read
      db.run(`UPDATE messages SET read_status = 1 WHERE user_id = ? AND sender = 'admin'`, [userId]);
      res.render('support', { user, messages: messages||[], active: 'support', title: 'Support - ApexCrestVest' });
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
  res.render('admin/login', { error: null, title: 'Admin Login - ApexCrestVest' });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM admins WHERE username = ?`, [username], (err, admin) => {
    if (!admin) {
      return res.render('admin/login', { error: 'Invalid credentials', title: 'Admin Login - ApexCrestVest' });
    }
    bcrypt.compare(password, admin.password, (err, match) => {
      if (!match) {
        return res.render('admin/login', { error: 'Invalid credentials', title: 'Admin Login - ApexCrestVest' });
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
                title: 'Admin Dashboard - ApexCrestVest'
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
    res.render('admin/users', { users: users||[], active: 'users', adminName: req.session.adminName, title: 'Users - ApexCrestVest Admin' });
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
                req_query_generated: req.query.generated,
                title: `User: ${user?.full_name} - ApexCrestVest Admin`
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

// Admin - generate transaction for a user (deposit, withdrawal, interest)
app.post('/admin/users/:id/generate-transaction', requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { type, amount, description, status, adjust_balance } = req.body;
  const amt = parseFloat(amount);
  const txnStatus = status || 'completed';
  const txnDesc = description || '';
  const doAdjust = adjust_balance === 'yes';

  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    if (!user) return res.redirect('/admin/users');

    // Insert the transaction with a blockchain-style hash
    const txHash = generateTxHash(type);
    db.run(`INSERT INTO transactions (user_id, type, amount, description, status, tx_hash) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, amt, txnDesc, txnStatus, txHash], function() {

      // Adjust user balance based on transaction type
      if (doAdjust) {
        if (type === 'deposit') {
          db.run(`UPDATE users SET balance = balance + ?, total_deposited = total_deposited + ? WHERE id = ?`, [amt, amt, userId]);
        } else if (type === 'withdrawal') {
          db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [amt, userId]);
        } else if (type === 'interest' || type === 'bonus') {
          db.run(`UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?`, [amt, amt, userId]);
        }
      }

      // Also create matching deposit/withdrawal record for realism
      if (type === 'deposit' && doAdjust) {
        db.run(`INSERT INTO deposits (user_id, currency, amount, status, tx_hash) VALUES (?, 'USDT', ?, 'completed', ?)`,
          [userId, amt, 'TXN' + Date.now().toString(36).toUpperCase()]);
      } else if (type === 'withdrawal' && doAdjust) {
        db.run(`INSERT INTO withdrawals (user_id, amount, currency, wallet_address, status) VALUES (?, ?, 'USDT', ?, 'completed')`,
          [userId, amt, user.email]);
      }

      // Log the admin action
      logActivity(userId, 'admin_transaction', `Admin generated ${type} of $${amt} (${txnStatus})${txnDesc ? ': ' + txnDesc : ''}`, req.ip);
      res.redirect('/admin/users/' + userId + '?generated=1');
    });
  });
});

// Admin - Generate Transactions page (pick any user, batch generate)
app.get('/admin/generate-transactions', requireAdmin, (req, res) => {
  db.all(`SELECT id, full_name, email, country, balance FROM users ORDER BY created_at DESC`, (err, users) => {
    db.all(`SELECT * FROM plans WHERE active = 1`, (err, plans) => {
      res.render('admin/generate-transactions', { 
        users: users || [], plans: plans || [], active: 'generate', adminName: req.session.adminName,
        req_query_success: req.query.success, req_query_user: req.query.user,
        title: 'Generate Transactions - ApexCrestVest Admin'
      });
    });
  });
});

// Admin - batch generate realistic transaction history for a user
app.post('/admin/generate-transactions/batch', requireAdmin, (req, res) => {
  const { user_id, num_deposits, num_withdrawals, num_interest, min_amount, max_amount, adjust_balance, start_date } = req.body;
  const userId = parseInt(user_id);
  const numDep = parseInt(num_deposits) || 0;
  const numWd = parseInt(num_withdrawals) || 0;
  const numInt = parseInt(num_interest) || 0;
  const minAmt = parseFloat(min_amount) || 100;
  const maxAmt = parseFloat(max_amount) || 5000;
  const doAdjust = adjust_balance === 'yes';
  const startDate = start_date || '2024-01-01';

  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    if (!user) return res.redirect('/admin/generate-transactions');

    const currencies = ['Bitcoin', 'USDT', 'Ethereum', 'Litecoin'];
    const depositDescs = [
      'Crypto deposit via USDT (TRC-20)', 'Crypto deposit via Bitcoin', 'Crypto deposit via Ethereum (ERC-20)', 'Crypto deposit via Litecoin',
      'Deposit confirmed - USDT TRC-20', 'Deposit confirmed - BTC network', 'Wallet deposit - USDT', 'Wallet deposit - Bitcoin',
      'Deposit via Bitcoin network', 'Deposit via Ethereum network', 'USDT deposit (TRC-20)', 'BTC deposit confirmed',
      'ETH deposit confirmed', 'LTC deposit confirmed', 'Crypto wallet deposit', 'Incoming transfer - USDT',
      'Incoming transfer - BTC', 'Blockchain deposit confirmed', 'Deposit credited to account', 'Crypto funding confirmed',
      'Deposit from external wallet', 'USDT TRC-20 deposit', 'Bitcoin network deposit', 'Ethereum network deposit',
      'Top-up deposit - USDT', 'Account funding - BTC', 'Deposit received and confirmed', 'Wallet top-up confirmed',
      'Crypto deposit - 1 confirmation', 'Deposit verified on blockchain', 'Account funding via USDT', 'Account funding via Bitcoin'
    ];
    const withdrawalDescs = [
      'Withdrawal to external wallet', 'Withdrawal processed - USDT', 'Withdrawal to Bitcoin wallet', 'Withdrawal completed',
      'Withdrawal to external BTC wallet', 'Withdrawal to USDT wallet (TRC-20)', 'Withdrawal to Ethereum wallet', 'Withdrawal to Litecoin wallet',
      'Withdrawal processed successfully', 'Withdrawal to crypto wallet', 'Funds withdrawal - USDT', 'Funds withdrawal - BTC',
      'Withdrawal request approved', 'Withdrawal sent to wallet', 'Withdrawal to external wallet (BTC)', 'Withdrawal to external wallet (USDT)',
      'Payout to wallet address', 'Withdrawal confirmed - BTC network', 'Withdrawal confirmed - USDT TRC-20', 'Withdrawal confirmed - ETH network',
      'Withdrawal to blockchain wallet', 'Profit withdrawal to wallet', 'Withdrawal transfer completed', 'Withdrawal to personal wallet',
      'Withdrawal processed - BTC', 'Withdrawal to cold wallet', 'Withdrawal to hardware wallet', 'Funds transferred to external wallet',
      'Withdrawal to designated wallet', 'Withdrawal payout confirmed', 'Withdrawal to crypto address', 'Withdrawal settled'
    ];
    const interestDescs = [
      'Investment ROI payout - Starter Plan', 'Investment ROI payout - Professional Plan', 'Investment ROI payout - Elite Plan', 'Investment ROI payout - Quick Return Plan',
      'Daily interest payout', 'Plan maturity payout', 'ROI earnings - Starter Plan', 'ROI earnings - Professional Plan',
      'ROI earnings - Elite Plan', 'ROI earnings - Quick Return Plan', 'Daily ROI credit', 'Weekly interest payout',
      'Investment return - Starter Plan', 'Investment return - Professional Plan', 'Investment return - Elite Plan', 'Investment return - Quick Return Plan',
      'Plan interest payout', 'Maturity payout - Professional Plan', 'Maturity payout - Elite Plan', 'Maturity payout - Quick Return Plan',
      'Maturity payout - Starter Plan', 'ROI dividend payout', 'Investment profit credit', 'Daily trading profit',
      'Interest earned - Starter Plan', 'Interest earned - Professional Plan', 'Interest earned - Elite Plan', 'Interest earned - Quick Return Plan',
      'Plan completion payout', 'Investment yield credit', 'ROI maturity bonus', 'Profit sharing payout',
      'Compound interest payout', 'Investment growth credit', 'Plan ROI settlement', 'Daily earnings credit',
      'Trading profit payout', 'Portfolio ROI return', 'Investment maturity settlement', 'ROI payout - plan completed'
    ];

    function randomAmount() {
      return Math.round((minAmt + Math.random() * (maxAmt - minAmt)) * 100) / 100;
    }
    function randomDate() {
      const start = new Date(startDate).getTime();
      const end = new Date().getTime();
      const randomTime = start + Math.random() * (end - start);
      return new Date(randomTime).toISOString().replace('T', ' ').substring(0, 19);
    }

    let totalDeposited = 0;
    let totalWithdrawn = 0;
    let totalInterest = 0;

    // Generate deposits
    for (let i = 0; i < numDep; i++) {
      const amt = randomAmount();
      const desc = depositDescs[Math.floor(Math.random() * depositDescs.length)];
      const curr = currencies[Math.floor(Math.random() * currencies.length)];
      const dateStr = randomDate();
      const dHash = generateTxHash('deposit');
      db.run(`INSERT INTO transactions (user_id, type, amount, description, status, tx_hash, created_at) VALUES (?, 'deposit', ?, ?, 'completed', ?, ?)`,
        [userId, amt, desc, dHash, dateStr]);
      if (doAdjust) {
        db.run(`INSERT INTO deposits (user_id, currency, amount, status, tx_hash, created_at) VALUES (?, ?, ?, 'completed', ?, ?)`,
          [userId, curr, amt, dHash, dateStr]);
        totalDeposited += amt;
      }
    }

    // Generate withdrawals
    for (let i = 0; i < numWd; i++) {
      const amt = randomAmount();
      const desc = withdrawalDescs[Math.floor(Math.random() * withdrawalDescs.length)];
      const curr = currencies[Math.floor(Math.random() * currencies.length)];
      const dateStr = randomDate();
      const wHash = generateTxHash('withdrawal');
      db.run(`INSERT INTO transactions (user_id, type, amount, description, status, tx_hash, created_at) VALUES (?, 'withdrawal', ?, ?, 'completed', ?, ?)`,
        [userId, amt, desc, wHash, dateStr]);
      if (doAdjust) {
        db.run(`INSERT INTO withdrawals (user_id, amount, currency, wallet_address, status, created_at) VALUES (?, ?, ?, ?, 'completed', ?)`,
          [userId, amt, curr, user.email, dateStr]);
        totalWithdrawn += amt;
      }
    }

    // Generate interest/ROI
    for (let i = 0; i < numInt; i++) {
      const amt = randomAmount();
      const desc = interestDescs[Math.floor(Math.random() * interestDescs.length)];
      const dateStr = randomDate();
      const iHash = generateTxHash('interest');
      db.run(`INSERT INTO transactions (user_id, type, amount, description, status, tx_hash, created_at) VALUES (?, 'interest', ?, ?, 'completed', ?, ?)`,
        [userId, amt, desc, iHash, dateStr]);
      if (doAdjust) {
        totalInterest += amt;
      }
    }

    // Adjust balance: deposits + interest - withdrawals
    if (doAdjust) {
      const netChange = totalDeposited + totalInterest - totalWithdrawn;
      db.run(`UPDATE users SET balance = balance + ?, total_deposited = total_deposited + ?, total_earned = total_earned + ? WHERE id = ?`,
        [netChange, totalDeposited, totalInterest, userId]);
    }

    logActivity(userId, 'admin_batch_generate', `Admin generated ${numDep} deposits, ${numWd} withdrawals, ${numInt} interest transactions`, req.ip);
    res.redirect('/admin/generate-transactions?success=1&user=' + userId);
  });
});

// Admin - Deposits
app.get('/admin/deposits', requireAdmin, (req, res) => {
  db.all(`SELECT d.*, u.full_name, u.email FROM deposits d JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC`, (err, deposits) => {
    res.render('admin/deposits', { deposits: deposits||[], active: 'deposits', adminName: req.session.adminName, title: 'Deposits - ApexCrestVest Admin' });
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
    res.render('admin/withdrawals', { withdrawals: withdrawals||[], active: 'withdrawals', adminName: req.session.adminName, title: 'Withdrawals - ApexCrestVest Admin' });
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
    res.render('admin/wallets', { wallets: wallets||[], active: 'wallets', adminName: req.session.adminName, title: 'Wallets - ApexCrestVest Admin' });
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
    res.render('admin/plans', { plans: plans||[], active: 'plans', adminName: req.session.adminName, title: 'Plans - ApexCrestVest Admin' });
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
    res.render('admin/support', { users: users||[], active: 'support', adminName: req.session.adminName, title: 'Support - ApexCrestVest Admin' });
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
    res.render('admin/activity', { activities: activities||[], active: 'activity', adminName: req.session.adminName, title: 'Activity Log - ApexCrestVest Admin' });
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

// ============ HEALTHCHECK (for Railway / uptime monitors) ============
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'apexcrestvest', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`ApexCrestVest server running on port ${PORT}`);
  console.log(`Admin login: admin / admin123`);
});

module.exports = app;
