# NovaVest — Premium Investment Platform

A full-stack investment platform built with Node.js, Express, SQLite, and Socket.io. Features worldwide user signup with country-specific ID fields, individual dashboards, an admin control panel, copy-to-deposit crypto wallets, real-time chat support, and automated email notifications via Resend.com.

## Features

- **Worldwide User Registration** — Users from 25+ countries can sign up with country-specific national ID fields (SSN for US, NIN for Nigeria, NINO for UK, Aadhaar for India, and more)
- **Individual User Dashboards** — Each user gets a personal dashboard showing balance, deposits, investments, withdrawals, and transaction history
- **Admin Dashboard** — Full monitoring of all user activities, signup details, deposits, withdrawals, wallets, plans, and an activity log
- **Copy-to-Deposit Crypto Wallets** — Multiple crypto wallets (BTC, ETH, USDT-TRC20, USDT-ERC20, LTC) with copy-to-clipboard functionality, fully editable from the admin panel
- **Real-Time Chat Support** — Socket.io-powered live chat between users and admin, with each conversation handled separately
- **Email Notifications** — Automated emails via Resend.com for every account activity: signup, deposit submitted/approved/rejected, investment created, withdrawal submitted/approved/rejected, and support chat replies
- **Investment Plans** — Three tiers (Starter, Professional, Elite) with configurable ROI and duration, editable from admin

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (via sqlite3)
- **Real-time:** Socket.io
- **Templating:** EJS
- **Authentication:** express-session + bcrypt
- **Email:** Resend.com API
- **Styling:** Custom CSS with gold/navy premium theme

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
node db/init.js   # Initialize database with default admin, plans, and wallets
node server.js    # Start the server
```

The app will be available at `http://localhost:3000`.

### Default Admin Credentials

- **Username:** admin
- **Password:** admin123

> Change these immediately after first login.

## Environment Variables

Create a `.env` file (see `.env.example`):

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=NovaVest <noreply@yourdomain.com>
FRONTEND_URL=https://your-app-url.com
PORT=3000
```

### Email Setup (Resend.com)

1. Create a free account at [resend.com](https://resend.com)
2. Verify your sending domain (or use the free `onboarding@resend.dev` for testing)
3. Create an API key at [resend.com/api-keys](https://resend.com/api-keys)
4. Set `RESEND_API_KEY` in your environment variables
5. Set `RESEND_FROM_EMAIL` to your verified sender address
6. Set `FRONTEND_URL` to your deployed app URL (used in email links)

Emails are sent automatically for these events:
- User signup (welcome email)
- Deposit submitted (pending review)
- Deposit approved (balance credited)
- Deposit rejected (action needed)
- Investment created (plan active)
- Withdrawal submitted (pending review)
- Withdrawal approved (funds sent)
- Withdrawal rejected (balance returned)
- Admin support chat reply (new message notification)

## Deployment

### Railway (Recommended — supports SQLite + Socket.io)

Railway is the recommended host because it supports persistent processes, WebSockets, and file-based databases.

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Deploy from GitHub repo — Railway will auto-detect Node.js
4. Add environment variables in the Railway dashboard:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `FRONTEND_URL` (your Railway app URL)
5. Railway will run `node server.js` automatically (see `Procfile` and `railway.json`)

### Render

1. Push to GitHub
2. Create a new Web Service on [render.com](https://render.com)
3. Connect your GitHub repo
4. Build Command: `npm install`
5. Start Command: `node server.js`
6. Add environment variables in the Render dashboard

> Note: Vercel is NOT recommended for this app because it's a serverless platform that doesn't support SQLite file persistence or Socket.io WebSocket connections.

## Project Structure

```
novavest/
├── server.js              # Main application (all routes + Socket.io)
├── package.json
├── Procfile               # Railway/deployment config
├── railway.json           # Railway config
├── .env.example           # Environment variable template
├── .gitignore
├── db/
│   ├── init.js            # Database initialization + seeding
│   └── countries.js       # 25+ countries with ID field configs
├── middleware/
│   └── auth.js            # User + admin auth middleware
├── utils/
│   └── mailer.js          # Resend.com email notification module
├── public/
│   └── css/
│       └── style.css      # Complete stylesheet (gold/navy theme)
└── views/
    ├── index.ejs          # Landing page
    ├── about.ejs          # About page
    ├── plans.ejs          # Plans page
    ├── faq.ejs            # FAQ page
    ├── contact.ejs        # Contact page
    ├── signup.ejs         # Registration with country-specific fields
    ├── login.ejs          # User login
    ├── dashboard.ejs      # User overview
    ├── deposit.ejs        # Deposit with wallet copy
    ├── invest.ejs         # Investment plans
    ├── withdraw.ejs       # Withdrawal form
    ├── transactions.ejs   # Transaction history
    ├── profile.ejs        # User profile
    ├── support.ejs        # Real-time chat (user side)
    ├── partials/
    │   ├── dash-sidebar.ejs
    │   └── admin-sidebar.ejs
    └── admin/
        ├── login.ejs
        ├── dashboard.ejs
        ├── users.ejs
        ├── user_detail.ejs
        ├── deposits.ejs
        ├── withdrawals.ejs
        ├── wallets.ejs
        ├── plans.ejs
        ├── support.ejs
        └── activity.ejs
```

## Investment Plans (Default)

| Plan | Min Deposit | ROI | Duration |
|------|------------|-----|----------|
| Starter | $100 | 25% | 7 days |
| Professional | $1,000 | 40% | 14 days |
| Elite | $10,000 | 60% | 30 days |

All plans are editable from the admin dashboard.

## License

Proprietary — All rights reserved.
