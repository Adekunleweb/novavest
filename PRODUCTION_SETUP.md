# ApexCrestVest — Production Setup Checklist

This guide covers everything you need to do after adding your custom domain to make ApexCrestVest fully operational in production.

---

## 🔴 CRITICAL — Do These First

### 1. Set Up Persistent Database Volume (PREVENTS DATA LOSS)

Railway's filesystem is **ephemeral** — your SQLite database gets wiped on every redeploy or restart. This is the **most important** step.

**Steps:**
1. Go to Railway → your ApexCrestVest project → **Settings** → **Volumes**
2. Click **Add Volume**
3. Mount path: `/data`
4. Go to the **Variables** tab and add:
   ```
   DB_PATH=/data/apexcrestvest.db
   ```
5. Redeploy the app

**Why this matters:** Without this, every time Railway redeploys (from a git push, or a restart), all your users, transactions, balances, and investments are permanently deleted.

---

### 2. Change the Admin Password

The default admin credentials are `admin` / `admin123`. Change this immediately.

**Option A — Via environment variable (recommended for new deployments):**
1. Go to Railway → **Variables** tab
2. Add: `ADMIN_PASSWORD=your_secure_password_here`
3. **Important:** This only works if the admin doesn't exist yet. If the admin already exists in the database, you'll need to change it manually (see Option B).

**Option B — Change existing admin password:**
Contact the developer (or run a script) to update the admin password in the database directly.

---

### 3. Set the Session Secret

A random session secret prevents session forgery attacks.

**Steps:**
1. Generate a random string (use any password generator, at least 32 characters)
2. Go to Railway → **Variables** tab
3. Add: `SESSION_SECRET=your_random_64_character_string_here`

---

## 📧 Email Notifications Setup (Resend.com)

Your app has **9 email notification templates** already built and ready:
- Signup welcome email
- Deposit submitted / approved / rejected
- Investment created
- Withdrawal submitted / approved / rejected
- Support chat reply

They are currently **silently skipped** because no API key is set.

### Step 1: Add Your Domain to Resend
1. Log into [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain (e.g., `apexcrestvest.com`)
4. Resend provides DNS records (SPF, DKIM, MX, Return-Path)

### Step 2: Add DNS Records
1. Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
2. Add **all** DNS records Resend provides:
   - **SPF record** (TXT record)
   - **DKIM record** (TXT record)
   - **MX record** (for Return-Path)
   - **DMARC record** (recommended for deliverability)
3. Wait for DNS propagation (usually 5–30 minutes, up to 48 hours)
4. Click **Verify** in Resend → should show ✅ Verified

### Step 3: Get API Key
1. Go to [resend.com/api-keys](https://resend.com/api-keys)
2. Create new API key → name it "ApexCrestVest Production"
3. Copy the key (starts with `re_...`)

### Step 4: Set Environment Variables on Railway
Go to Railway → **Variables** tab and add:
```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=ApexCrestVest <noreply@apexcrestvest.com>
FRONTEND_URL=https://apexcrestvest.com
```

### Step 5: Test
- Create a test user account → should receive welcome email
- Submit a test deposit → should receive deposit submitted email
- Approve the deposit as admin → user should receive deposit approved email

**Resend Free Plan Limits:** 3,000 emails/month, 100 emails/day. Upgrade if you expect more traffic.

---

## 🌐 Custom Domain Setup on Railway

### Step 1: Add Custom Domain
1. Go to Railway → your project → **Settings** → **Networking**
2. Click **Custom Domain** (or "Generate Domain" for a free `.up.railway.app` subdomain)
3. Enter your domain (e.g., `apexcrestvest.com` or `app.apexcrestvest.com`)
4. Railway gives you a **CNAME record** to add

### Step 2: Add CNAME Record
1. Go to your domain registrar's DNS settings
2. Add a CNAME record:
   - **Name/Host:** `app` (or `@` for root domain — some registrars use ALIAS/ANAME for root)
   - **Value/Target:** the CNAME Railway gives you (e.g., `web-production-8fbb1.up.railway.app`)
3. Wait for DNS propagation

### Step 3: SSL is Automatic
Railway provides **automatic SSL/HTTPS certificates** — no manual setup needed. Once your domain resolves, it will have a valid SSL certificate.

### Step 4: Update FRONTEND_URL
Make sure `FRONTEND_URL` env var is set to your custom domain:
```
FRONTEND_URL=https://apexcrestvest.com
```
This ensures email links point to the correct URL.

---

## ⚠️ Things to Watch Out For

### Email Deliverability (Spam Folder)
Even with domain verification, emails might initially land in spam. To minimize this:
- ✅ Ensure SPF, DKIM, and DMARC records are properly set
- ✅ Your email templates are well-designed (good HTML, no spammy content)
- ⚠️ Avoid ALL CAPS subject lines and excessive emoji in subject lines
- ⚠️ Ask early users to check spam folder and mark "Not Spam"
- ⚠️ Warm up your domain — start with lower email volume and increase gradually

### Database Migrations
When you add new features that require database changes (like the `tx_hash` column), the app runs `ALTER TABLE` migrations automatically on startup. However:
- If you're using a persistent volume, migrations run automatically — no action needed
- If you're NOT using a persistent volume, the database recreates from scratch on every deploy (losing data but always having the latest schema)

### Session Timeout
User sessions expire after **24 hours** (configured in the session cookie `maxAge`). Users will need to log in again after 24 hours of inactivity. This is normal and secure.

### Railway Sleep/Restart Behavior
- Railway may restart your app periodically (especially on the free/hobby plan)
- This is why the persistent volume is critical — without it, restarts = data loss
- Socket.io connections will drop on restart — users on the chat page will need to refresh

### Rate Limiting
Currently, there's no rate limiting on login/signup endpoints. For production with real users, consider adding rate limiting to prevent brute force attacks. This can be added with the `express-rate-limit` package if needed.

### Backup Your Database
Even with a persistent volume, it's good practice to periodically back up your database:
1. SSH into Railway (or use Railway CLI)
2. Copy `/data/apexcrestvest.db` to a safe location
3. Or use Railway's volume snapshot feature if available

---

## ✅ Complete Environment Variables Reference

Set ALL of these on Railway → **Variables** tab:

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `DB_PATH` | ✅ YES | `/data/apexcrestvest.db` | Database file path (persistent volume) |
| `SESSION_SECRET` | ✅ YES | (random 64-char string) | Session encryption |
| `ADMIN_PASSWORD` | ✅ YES | (your secure password) | Admin login password |
| `RESEND_API_KEY` | ✅ YES | `re_abc123...` | Email notifications |
| `RESEND_FROM_EMAIL` | ✅ YES | `ApexCrestVest <noreply@apexcrestvest.com>` | Sender email address |
| `FRONTEND_URL` | ✅ YES | `https://apexcrestvest.com` | Email link URLs |
| `NODE_ENV` | Optional | `production` | Express production mode |

---

## 🚀 Quick Deployment Verification

After setting everything up, test these:

1. **Visit your domain** → should show ApexCrestVest landing page with HTTPS ✅
2. **Sign up a new user** → should receive welcome email ✅
3. **Log in as admin** → should access admin dashboard ✅
4. **Submit a deposit as user** → should receive deposit email ✅
5. **Approve deposit as admin** → user should receive approval email ✅
6. **Check transaction history** → should see clickable transactions with receipts ✅
7. **Restart the app** → data should still be there (persistent volume working) ✅

---

*Last updated: August 2026*
