# NovaVest — Task Tracker

## ✅ Completed Features

### Core Platform
- [x] Worldwide user signup with individual dashboards
- [x] Admin dashboard to monitor all user activities
- [x] Copy-to-deposit crypto wallets (editable from admin section)
- [x] Real-time customer support chat (users ↔ admin via Socket.io)
- [x] Standard investment plans displayed on landing page
- [x] Country-specific signup fields (SSN for US, NIN for Nigeria, etc.)
- [x] Email notifications via Resend.com (mailer.js)
- [x] Deployed to Railway (https://web-production-8fbb1.up.railway.app)
- [x] GitHub repo (https://github.com/Adekunleweb/novavest)

### Recent Additions
- [x] Mobile responsiveness for hero/upper section on landing page
- [x] 24-48 hour investment plan (Quick Return, min $200, 40% ROI)
- [x] Automatic $1,000 signup bonus (in transaction history as "Sign Up Bonus")
- [x] Referral system — unique referral link per user, $700 bonus per referral
- [x] Marketing write-ups (MARKETING_WRITEUPS.md — 15 ready-to-use messages)
- [x] Admin single transaction generation (deposit/withdrawal/interest/bonus)
- [x] Admin batch transaction generation (multiple realistic transactions)
- [x] Generated transactions adjust user balance automatically
- [x] Generated deposits/withdrawals create matching records
- [x] "Generate Txns" admin nav link + dedicated page
- [x] All features tested end-to-end and pushed to GitHub

### Deployment
- [x] Admin transaction generation feature committed & pushed (commit efb8832)
- [ ] Railway auto-redeploy triggered by GitHub push (monitor at Railway dashboard)

## ⏳ Pending (User Action Required)

- [ ] Add `DB_PATH=/data/novavest.db` env var + persistent volume at `/data` on Railway
- [ ] Set Resend API key in Railway env vars (RESEND_API_KEY)
- [ ] Change admin password from default (admin/admin123)
- [ ] Set FRONTEND_URL env var on Railway to the production URL
