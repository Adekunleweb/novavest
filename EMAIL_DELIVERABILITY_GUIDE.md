# Email Deliverability Guide — Landing in the Inbox, Not Promotions

This guide explains why your ApexCrestVest emails may be landing in Gmail's
**Promotions tab** instead of the **Primary inbox**, and exactly what to do
about it. It is divided into two parts:

1. **What has already been done in your code** (commit `e26814b`)
2. **What you must do on your end** (DNS / Resend dashboard) — this is the
   most important part and will make the biggest difference

---

## Part 1 — What I Already Did in Your Code

I updated `utils/mailer.js` and `.env.example` with several technical
improvements that signal to Gmail/Outlook that your emails are legitimate,
personal, and transactional — not bulk marketing:

### Email Headers Added

Every email sent now includes these headers:

| Header | Purpose |
|--------|---------|
| `X-Entity-Type: email` | Tells Gmail **not** to render a promotional image card next to your email (a strong "this is not an ad" signal) |
| `X-Entity-Ref-ID` | A unique ID per email that **prevents Gmail from grouping** your emails into a promotional thread/cluster |
| `X-Priority: 1` | High-priority hint that nudges emails toward Primary |
| `Reply-To: support@apexcrestvest.com` | When a user hits "Reply" in their email client, it goes to your support inbox — and **replies are a strong engagement signal** that improves future inbox placement |
| `List-Unsubscribe` + `List-Unsubscribe-Post` | RFC 8058 one-click unsubscribe header. Required for bulk senders since Feb 2024; its presence signals legitimacy to Gmail |

### Personal Sender Names

Gmail's AI looks at the sender display name. A robotic `noreply@` with no
friendly name looks like a system/bulk sender. I changed the display name
per email type:

- **Welcome, Broadcast, Individual messages** → `ApexCrestVest Team`
- **Support auto-reply, chat replies** → `Support at ApexCrestVest`

### Resend Tags

Every email is now tagged (e.g. `type=broadcast`, `type=support`,
`type=individual`) so you can track deliverability per email type in the
Resend dashboard.

### New Environment Variable

Added `RESEND_REPLY_TO` (defaults to `support@apexcrestvest.com`). Set this
on Railway to an inbox you actually monitor so user replies reach you.

---

## Part 2 — What YOU Must Do (This Is the Big One)

The code changes above help, but **the single biggest factor** in whether
your emails land in Primary vs. Promotions is your **sending domain
authentication**. Here is the honest truth from the research:

> Even with 99.89% SPF/DKIM compliance, authentication alone does NOT
> guarantee Primary tab placement — but **without** it, you are
> guaranteed to land in Promotions or Spam.

There are two scenarios for your current setup. **You must figure out which
one applies to you**, because the fix is different.

### Scenario A — You are sending from `onboarding@resend.dev` (NOT verified)

If you created a Resend account but **never added/verified the
`apexcrestvest.com` domain**, then Resend forces you to send from
`onboarding@resend.dev` — a **shared domain used by thousands of other
apps**. This domain has terrible sender reputation for Gmail because
everyone's marketing emails go through it. **This is almost certainly why
you are landing in Promotions.**

**The fix: Verify your custom domain in Resend.** This is free and takes
~15 minutes. Follow the steps below.

### Scenario B — You ARE sending from `noreply@apexcrestvest.com` but it's not verified

If your `RESEND_FROM_EMAIL` on Railway is set to
`noreply@apexcrestvest.com` but you never added the DNS records Resend
gave you, then **your emails are failing silently** or being sent
unauthenticated. Gmail sees unauthenticated email from a new domain and
dumps it in Promotions or Spam.

**The fix: Same as Scenario A — verify the domain.**

---

## Step-by-Step: Verify `apexcrestvest.com` in Resend

This is the most important action you can take. It will move you from
"shared domain with bad reputation" to "your own authenticated domain."

### Step 1 — Add the domain in Resend

1. Log in to **https://resend.com** → go to **Domains** in the left sidebar
2. Click **Add Domain**
3. **IMPORTANT:** Resend recommends using a **subdomain** for email, not
   your root domain. Enter one of these:
   - `mail.apexcrestvest.com` (recommended)
   - `notifications.apexcrestvest.com`
   - `updates.apexcrestvest.com`
   
   *Why a subdomain?* It isolates your email reputation from your website
   domain. If something goes wrong with email, it won't affect your
   website's DNS. This is industry best practice.
4. Choose the region closest to most of your users (likely **US East** or
   **EU West**)
5. Click **Add**

### Step 2 — Get the DNS records from Resend

Resend will show you a set of DNS records to add. You will see:

- **SPF record** (TXT record) — authorizes Resend's servers to send email
  for your domain
- **DKIM records** (TXT or CNAME records, usually 2-3 of them) —
  cryptographically signs your emails so receivers can verify they
  haven't been tampered with
- **MX record** — for the return-path / bounce handling
- **DMARC record** (TXT record on `_dmarc.yourdomain.com`) — tells
  receivers what to do if SPF/DKIM fail

**Copy these exactly.** Do not modify the values.

### Step 3 — Add the DNS records in Whogohost

You bought `apexcrestvest.com` on **Whogohost/GO54**. Here's how to add
the records:

1. Log in to **https://panel.whogohost.com** (your Whogohost client area)
2. Go to **Domains** → click on **apexcrestvest.com**
3. Click **Manage DNS Records** (you saw this in your screenshots —
   "Quick Actions" → "Manage DNS Records")
4. For **each record** Resend gave you:
   - Click **Add Record**
   - Set the **Type** (TXT, MX, or CNAME — match what Resend shows)
   - Set the **Name/Host** (this is what Resend shows in the "Host" or
     "Name" column — for a subdomain like `mail.apexcrestvest.com`, you
     usually just enter `mail` or the full value Resend gives you)
   - Set the **Value/Content** (paste exactly from Resend)
   - For MX records, set the **Priority** (Resend will tell you, usually
     `10`)
   - Click **Save**
5. Repeat for every record Resend listed

### Step 4 — Add the DMARC record

Resend may or may not show you a DMARC record. Either way, add this TXT
record:

- **Type:** TXT
- **Name/Host:** `_dmarc.apexcrestvest.com` (or `_dmarc` if Whogohost
  auto-appends the domain)
- **Value:**
  ```
  v=DMARC1; p=none; rua=mailto:support@apexcrestvest.com; ruf=mailto:support@apexcrestvest.com; fo=1
  ```
  
  > `p=none` means "monitor but don't reject" — this is the safe starting
  > point. Once you've monitored for a few weeks and see no failures,
  > you can escalate to `p=quarantine` then `p=reject`.

### Step 5 — Verify in Resend

1. Go back to Resend → **Domains**
2. Click **Verify DNS Records**
3. If all records show **"Verified"** (green), you're done!
4. If not verified immediately, **wait 15 minutes to 24 hours** for DNS
   propagation, then click "Verify" again
5. If still not verified after 24 hours, double-check every record value
   character-by-character against what Resend showed

### Step 6 — Update your Railway environment variables

Once the domain is verified in Resend, update your Railway env vars:

| Variable | Value |
|----------|-------|
| `RESEND_FROM_EMAIL` | `ApexCrestVest <noreply@mail.apexcrestvest.com>` (use the subdomain you chose) |
| `RESEND_REPLY_TO` | `support@apexcrestvest.com` (or any inbox you monitor) |
| `RESEND_API_KEY` | (your existing key — unchanged) |
| `FRONTEND_URL` | `https://apexcrestvest.com` |

Then redeploy on Railway.

---

## Part 3 — Content & Sending Habits (Ongoing)

Even with perfect authentication, Gmail's AI categorizes based on
**content and engagement**. Here are the habits that keep you in Primary:

### Do These

- **Personalize every email.** Use the recipient's name (your campaign
  templates already do this with `{{name}}`). Personalized emails get
  higher open rates, and opens/replies are the #1 signal Gmail uses.
- **Ask users to add you as a contact.** Add a line to your welcome email
  like: *"Tip: Add support@apexcrestvest.com to your contacts so our
  messages always reach your inbox."* When a user adds you as a contact,
  Gmail routes ALL future emails from you to Primary — permanently.
- **Ask users to move you to Primary.** If a user finds your email in
  Promotions, they can drag it to Primary. Gmail asks "Do this for future
  messages?" → Yes. This is a powerful signal.
- **Keep emails short and text-focused.** 50–125 words, minimal images,
  minimal links. Your current email template is fairly HTML-heavy with a
  branded header — consider a simpler "plain text-like" version for
  personal/individual messages (broadcasts can stay branded).
- **Send consistently, not in sudden bursts.** If you suddenly email 500
  users at once from a new domain, that looks like spam. Ramp up slowly.
- **Encourage replies.** Your individual messages and support emails now
  have `Reply-To` set. When users reply, that's the strongest possible
  "this is a real person, not a marketer" signal to Gmail.

### Avoid These

- **Don't use spam-trigger words** in subject lines: `FREE`, `GUARANTEED`,
  `ACT NOW`, `LIMITED TIME`, `CLICK HERE`, ALL CAPS, excessive exclamation
  marks. (Some of your campaign templates use "Limited-Time" — this is
  okay in the body, but keep subject lines cleaner.)
- **Don't send to inactive users.** If a user hasn't opened your last 5
  emails, sending more just teaches Gmail "this recipient doesn't care
  about this sender" → future emails go to Promotions. Remove or
  re-engage inactive users.
- **Don't use URL shorteners** (bit.ly, tinyurl) — they look like spam
  tracking links. Use full URLs.
- **Don't send one giant image** with no text. Gmail can't read images
  and assumes it's an ad.

---

## Part 4 — Monitoring Your Deliverability

Once your domain is verified, set up monitoring so you can see where your
emails actually land:

1. **Google Postmaster Tools** (free): https://postmaster.google.com
   - Add and verify `mail.apexcrestvest.com`
   - Shows your domain reputation, spam rate, delivery errors, and
     authentication success rate as seen by Gmail
   - This is the single most important tool for Gmail deliverability

2. **Resend Dashboard**: Check the **Logs** and **Analytics** pages for
   bounce rates, open rates, and click rates per email type (the tags I
   added will help you segment this).

3. **Test sends**: Before sending to all users, send a test to a Gmail
   address you control and check which tab it lands in.

---

## Summary — Priority Order

| Priority | Action | Impact | Who does it |
|----------|--------|--------|-------------|
| 🔴 #1 | **Verify your domain in Resend + add DNS records in Whogohost** | Huge — fixes the root cause | You (15 min) |
| 🟠 #2 | **Set `RESEND_REPLY_TO` on Railway + redeploy** | Medium — enables replies | You (2 min) |
| 🟡 #3 | **Sign up for Google Postmaster Tools** | Monitoring | You (5 min) |
| 🟢 #4 | **Code improvements (headers, sender names, tags)** | Helps | ✅ Already done (commit `e26814b`) |
| 🟢 #5 | **Content habits (personalize, short, ask to add contact)** | Helps over time | You (ongoing) |

**The domain verification (Priority #1) is the fix that will make the
biggest difference.** Without it, you are sending from a shared or
unauthenticated domain, and no amount of code changes will overcome that.
With it, your emails will be cryptographically signed and authenticated
as genuinely coming from ApexCrestVest — which is the foundation Gmail
requires before it will even consider putting you in Primary.
