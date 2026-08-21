// ApexCrestVest — Campaign Message Templates
// Pre-written marketing messages an admin can send with one click.
// Each template: { id, category, title, subject, body, cta }
// Variables {{name}}, {{balance}}, {{plan_name}} are replaced at send time.

module.exports = [
  // ============ CATEGORY: Encourage non-investors to start ============
  {
    id: 'newbie_welcome',
    category: 'New Investors',
    title: 'Welcome Bonus — Start Investing Today',
    subject: 'Your $1,000 sign-up bonus is waiting, {{name}} 🎁',
    body: `Hello {{name}},

Welcome to ApexCrestVest! We're thrilled to have you on board.

When you signed up, we credited your account with a $1,000 welcome bonus — and it's ready to work for you right now. Our investment plans have helped thousands of members grow their wealth safely and consistently, and your bonus is the perfect way to begin without risking your own money.

Here's how to start in under 2 minutes:
1. Visit the Invest page in your dashboard.
2. Choose a plan that fits your goals.
3. Use your $1,000 bonus to activate it — no deposit required to begin.

Our most popular starter plan returns up to 25% ROI in just 7 days. That could turn your bonus into real, withdrawable profit before the week is over.

Don't let your bonus sit idle. Every day it's not invested is a day of potential earnings missed.

Start investing now — your future self will thank you.`,
    cta: 'Invest Now'
  },
  {
    id: 'newbie_first_step',
    category: 'New Investors',
    title: 'Take Your First Step — It\'s Easier Than You Think',
    subject: 'Ready to earn your first profit, {{name}}? 🚀',
    body: `Hello {{name}},

We noticed you haven't made your first investment yet — and we don't want you to miss out.

Investing with ApexCrestVest is simple, transparent, and designed for everyone — whether you're new to investing or an experienced hand. You don't need to be an expert. You just need to take the first step.

Our entry-level plan starts at just $100 and delivers guaranteed returns on a clear timeline. You'll see your earnings grow in real time, right inside your dashboard, and you can withdraw whenever you're ready.

Thousands of members started exactly where you are now — and today they're earning daily. The only difference between them and those who hesitate is that they took action.

Your dashboard is ready. Your plans are waiting. All that's left is for you to begin.

Open the Invest page and take your first step today.`,
    cta: 'View Investment Plans'
  },
  {
    id: 'newbie_why_invest',
    category: 'New Investors',
    title: 'Why Thousands Choose ApexCrestVest',
    subject: '3 reasons members trust ApexCrestVest with their money 💼',
    body: `Hello {{name}},

If you've been on the fence about investing, this message is for you.

Here are three reasons thousands of members trust ApexCrestVest:

1. Guaranteed Returns — Every plan has a fixed ROI and a clear payout date. No surprises, no guesswork. You know exactly what you'll earn and when.

2. Your Money Stays Yours — You can withdraw your capital and profits at any time. We never lock your funds beyond the plan duration, and withdrawals are processed quickly.

3. Start With What You Have — You don't need a fortune to begin. Plans start at $100, and your $1,000 sign-up bonus means you can start earning without spending a cent of your own money.

The members who act are the ones who earn. The ones who wait, watch from the sidelines.

Your journey starts on the Invest page. We're here to help every step of the way.`,
    cta: 'Start Earning Today'
  },

  // ============ CATEGORY: Encourage existing investors to invest more ============
  {
    id: 'grow_reinvest',
    category: 'Grow Your Portfolio',
    title: 'Reinvest & Compound Your Earnings',
    subject: '{{name}}, your profits can work even harder 📈',
    body: `Hello {{name}},

Congratulations on your progress with ApexCrestVest — you're already ahead of most.

But here's a truth the most successful investors know: the real power isn't in earning once. It's in earning, reinvesting, and earning again. That's how wealth compounds.

When you reinvest your profits into a higher-tier plan, your returns grow on a larger base — and over time, that difference becomes significant. A member who reinvests consistently can multiply their portfolio several times over within a few months.

Our premium plans offer higher ROI percentages and faster payouts for larger investments. The more you put to work, the more you take home.

Check your current balance in your dashboard. If you have profits sitting idle, now is the perfect moment to put them back to work.

Visit the Invest page and upgrade to a plan that matches your ambition.`,
    cta: 'Upgrade Your Plan'
  },
  {
    id: 'grow_premium_plan',
    category: 'Grow Your Portfolio',
    title: 'Unlock Our Premium Plan',
    subject: 'You\'ve earned access to higher returns, {{name}} ⭐',
    body: `Hello {{name}},

You've been an active member of ApexCrestVest, and that hasn't gone unnoticed.

Because of your engagement, we want to introduce you to our Premium plan — our highest-yielding investment tier, reserved for members who are serious about growing their wealth.

The Premium plan offers our strongest ROI with an accelerated payout schedule, meaning your money works harder and returns faster. It's designed for investors ready to scale up from starter plans to serious earnings.

Members on the Premium plan see the biggest difference in their portfolios over time. The gap between a starter and a premium investor widens every single day.

If you've been considering leveling up, this is your invitation. Your dashboard shows the full details and the minimum investment required.

Open the Invest page and see what Premium can do for you.`,
    cta: 'Explore Premium'
  },
  {
    id: 'grow_dont_let_idle',
    category: 'Grow Your Portfolio',
    title: 'Don\'t Let Your Balance Sit Idle',
    subject: 'Your balance is losing earning time, {{name}} ⏳',
    body: `Hello {{name}},

A quick reminder: money that sits idle is money that isn't growing.

Every day your balance isn't invested is a day of potential earnings that you can't get back. While you're reading this, other members are putting their funds to work and watching their returns tick up in real time.

The math is simple. A plan that returns 25% in 7 days means every day you wait is roughly 3.5% of potential profit left on the table. Over a month, that adds up fast.

If you have funds available — whether from a recent withdrawal, accumulated profits, or your sign-up bonus — the best time to invest them was yesterday. The second best time is right now.

Head to your Invest page, pick a plan, and put your money to work today.`,
    cta: 'Invest Your Balance'
  },

  // ============ CATEGORY: Time-limited offers (hours/days) ============
  {
    id: 'offer_24hr_boost',
    category: 'Limited-Time Offers',
    title: '24-Hour ROI Boost',
    subject: '⏰ 24 hours only — boosted returns starting now, {{name}}!',
    body: `Hello {{name}},

For the next 24 hours only, we're running a special ROI Boost — and you're invited.

Activate any investment plan within the next 24 hours and receive an additional return bonus on top of your plan's standard ROI. This is our way of rewarding members who act fast.

This offer expires exactly 24 hours from now. After that, standard rates apply and this bonus disappears.

How to claim:
1. Open the Invest page in your dashboard.
2. Choose any active plan.
3. Activate it before the timer runs out.

The boost is applied automatically — no code needed. But you must invest within the window.

Don't wait. Every hour that passes is an hour closer to the deadline. Claim your boosted returns now.`,
    cta: 'Claim My Boost'
  },
  {
    id: 'offer_weekend_flash',
    category: 'Limited-Time Offers',
    title: 'Weekend Flash Sale — Reduced Minimums',
    subject: '🔥 This weekend only — invest from just $50!',
    body: `Hello {{name}},

This weekend only, we're slashing the minimum investment on select plans — starting from just $50 instead of the usual $100.

It's the perfect opportunity to try a new plan, test a higher tier, or simply get started if you've been waiting for the right moment. Lower entry means less risk and the same great returns.

This flash sale ends Sunday at midnight. After that, minimums return to normal and this window closes.

Whether you're a first-time investor or looking to diversify, this weekend is your chance to do more with less.

Open the Invest page now and take advantage of the reduced minimums before they're gone.`,
    cta: 'See Weekend Plans'
  },
  {
    id: 'offer_48hr_double',
    category: 'Limited-Time Offers',
    title: '48-Hour Double Bonus',
    subject: '💸 48 hours left — double your sign-up bonus when you invest!',
    body: `Hello {{name}},

Here's an offer you don't want to miss.

For the next 48 hours, any member who activates an investment plan will receive a DOUBLE sign-up bonus credited to their account — that's an extra $1,000 on top of your existing bonus, ready to earn.

That means more capital working for you, more returns, and more profit — at no extra cost to you.

This is a limited-time promotion and it will not be extended. The clock is already ticking.

To claim your double bonus:
1. Go to the Invest page.
2. Activate any plan before the 48-hour window closes.
3. Your bonus doubling is applied automatically.

Members who act on these promotions always come out ahead. Don't be the one who reads this later and wishes they'd moved sooner.

Invest now and double your bonus before time runs out.`,
    cta: 'Double My Bonus'
  },
  {
    id: 'offer_3day_premium_access',
    category: 'Limited-Time Offers',
    title: '3-Day Premium Access',
    subject: '⭐ 3 days only — Premium plan at starter pricing!',
    body: `Hello {{name}},

For the next 3 days, we're unlocking the Premium plan at starter-plan pricing.

That means you get access to our highest-yielding investment tier — normally reserved for large investments — at a fraction of the usual entry cost. Same premium returns, same fast payouts, dramatically lower barrier to entry.

This is one of the most popular promotions we run, and it's only available for 72 hours. Once the window closes, Premium returns to its standard minimum.

If you've ever wanted to experience premium-level returns without the premium-level entry, this is your moment.

Open the Invest page and lock in Premium access at starter pricing before the 3 days are up.`,
    cta: 'Lock In Premium'
  },

  // ============ CATEGORY: Engagement / retention ============
  {
    id: 'engage_we_miss_you',
    category: 'Re-Engagement',
    title: 'We Miss You — Come Back to Earn',
    subject: 'We miss you, {{name}} — your account is still active 🤝',
    body: `Hello {{name}},

We noticed it's been a little while since you last logged in — and we wanted to reach out personally.

Your ApexCrestVest account is still active, and any earnings or balance you have are safe and waiting for you. But more importantly, the market doesn't pause — and neither do the opportunities to grow your money.

Since you've been away, we've added new plans, improved our payouts, and helped more members reach their financial goals. There's never been a better time to come back.

Log in to your dashboard, check your balance, and see what's new. If you have any questions, our support team is ready to help in the live chat.

We'd love to see you earning again.`,
    cta: 'Log In Now'
  },
  {
    id: 'engage_referral_earn',
    category: 'Re-Engagement',
    title: 'Earn $700 Per Friend You Refer',
    subject: 'Turn your friends into earnings, {{name}} 🎉',
    body: `Hello {{name}},

Did you know you can earn $700 for every friend you refer to ApexCrestVest?

Your unique referral link is waiting in your dashboard. Every time someone signs up using your link, $700 is credited straight to your account — no investment required, no limit on how many friends you can refer.

It's one of the easiest ways to boost your balance. A few shares with the right people could fund your next investment entirely.

Find your referral link on the Referral page in your dashboard and start earning from your network today.`,
    cta: 'Get My Referral Link'
  }
];
