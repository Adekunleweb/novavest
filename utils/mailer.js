const { Resend } = require('resend');

// Initialize Resend client only if API key is present
let resend = null;
let fromEmail = process.env.RESEND_FROM_EMAIL || 'NovaVest <noreply@novavest.com>';
let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

function initResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Base email template with NovaVest gold/navy branding
function emailTemplate(content) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a1628;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#112240;border-radius:16px;overflow:hidden;max-width:600px;border:1px solid #1e3a5f;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a1628,#1a2f4e);padding:30px 40px;text-align:center;border-bottom:2px solid #d4af37;">
              <h1 style="margin:0;color:#d4af37;font-size:28px;letter-spacing:1px;">NovaVest</h1>
              <p style="margin:5px 0 0;color:#8892b0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Premium Investment Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:25px 40px;background:#0a1628;border-top:1px solid #1e3a5f;">
              <p style="margin:0;color:#5c6f8a;font-size:12px;text-align:center;line-height:1.6;">
                This is an automated message from NovaVest. Please do not reply to this email.<br>
                &copy; 2026 NovaVest. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Send email wrapper — silently fails if no API key (so app never crashes)
async function sendEmail(to, subject, htmlContent) {
  try {
    const client = initResend();
    if (!client) {
      console.log(`[MAIL] No RESEND_API_KEY set — skipping email to ${to}: ${subject}`);
      return { skipped: true };
    }
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: emailTemplate(htmlContent)
    });
    if (error) {
      console.error(`[MAIL] Error sending to ${to}:`, error);
      return { error };
    }
    console.log(`[MAIL] Email sent to ${to}: ${subject} (ID: ${data.id})`);
    return { data };
  } catch (err) {
    console.error(`[MAIL] Exception sending to ${to}:`, err.message);
    return { error: err.message };
  }
}

// ========== NOTIFICATION TEMPLATES ==========

async function notifySignup(user) {
  const content = `
    <h2 style="margin:0 0 20px;color:#e6f1ff;font-size:22px;">Welcome to NovaVest, ${user.full_name}! 🎉</h2>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Your account has been successfully created. You're now part of an elite community of investors
      growing their wealth with smart, AI-powered investment strategies.
    </p>
    <div style="background:#0a1628;border-radius:10px;padding:20px;margin:25px 0;border-left:3px solid #d4af37;">
      <p style="margin:0 0 8px;color:#8892b0;font-size:13px;">Your Account Details:</p>
      <p style="margin:0;color:#e6f1ff;font-size:15px;"><strong>Name:</strong> ${user.full_name}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Email:</strong> ${user.email}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Country:</strong> ${user.country}</p>
    </div>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      You can start investing with as little as $100 and earn up to 25% ROI in just 7 days.
      Log in to your dashboard to explore our investment plans and make your first deposit.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${frontendUrl}/login" style="background:#d4af37;color:#0a1628;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Go to Dashboard</a>
    </div>`;
  return sendEmail(user.email, 'Welcome to NovaVest — Your Investment Journey Begins! 🚀', content);
}

async function notifyDepositSubmitted(user, deposit) {
  const content = `
    <h2 style="margin:0 0 20px;color:#e6f1ff;font-size:22px;">Deposit Submitted ✅</h2>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Hello ${user.full_name}, we've received your deposit submission and it's now pending review.
      Our team will verify your transaction shortly.
    </p>
    <div style="background:#0a1628;border-radius:10px;padding:20px;margin:25px 0;border-left:3px solid #d4af37;">
      <p style="margin:0 0 8px;color:#8892b0;font-size:13px;">Deposit Details:</p>
      <p style="margin:0;color:#e6f1ff;font-size:15px;"><strong>Amount:</strong> $${deposit.amount}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Currency:</strong> ${deposit.currency}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Network:</strong> ${deposit.network}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>TX Hash:</strong> ${deposit.tx_hash}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Status:</strong> <span style="color:#f0ad4e;">Pending Review</span></p>
    </div>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      You'll receive another email once your deposit is approved and your account balance is credited.
    </p>`;
  return sendEmail(user.email, 'Deposit Submitted — Pending Review', content);
}

async function notifyDepositApproved(user, deposit) {
  const content = `
    <h2 style="margin:0 0 20px;color:#e6f1ff;font-size:22px;">Deposit Approved! 💰</h2>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Great news, ${user.full_name}! Your deposit has been approved and your account balance has been credited.
    </p>
    <div style="background:#0a1628;border-radius:10px;padding:20px;margin:25px 0;border-left:3px solid #28a745;">
      <p style="margin:0 0 8px;color:#8892b0;font-size:13px;">Approved Deposit:</p>
      <p style="margin:0;color:#e6f1ff;font-size:15px;"><strong>Amount Credited:</strong> $${deposit.amount}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Currency:</strong> ${deposit.currency}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Status:</strong> <span style="color:#28a745;">Approved & Credited</span></p>
    </div>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Your updated balance is now available in your dashboard. You can start investing right away!
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${frontendUrl}/invest" style="background:#d4af37;color:#0a1628;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Start Investing</a>
    </div>`;
  return sendEmail(user.email, 'Deposit Approved — Balance Credited! 💰', content);
}

async function notifyDepositRejected(user, deposit) {
  const content = `
    <h2 style="margin:0 0 20px;color:#e6f1ff;font-size:22px;">Deposit Update ⚠️</h2>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Hello ${user.full_name}, we were unable to verify your recent deposit submission.
    </p>
    <div style="background:#0a1628;border-radius:10px;padding:20px;margin:25px 0;border-left:3px solid #dc3545;">
      <p style="margin:0 0 8px;color:#8892b0;font-size:13px;">Deposit Details:</p>
      <p style="margin:0;color:#e6f1ff;font-size:15px;"><strong>Amount:</strong> $${deposit.amount}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Currency:</strong> ${deposit.currency}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Status:</strong> <span style="color:#dc3545;">Rejected</span></p>
    </div>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      This may happen if the transaction hash couldn't be verified on the blockchain.
      Please double-check your transaction and submit a new deposit, or contact our support team
      via the live chat in your dashboard if you believe this is an error.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${frontendUrl}/deposit" style="background:#d4af37;color:#0a1628;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Try Again</a>
    </div>`;
  return sendEmail(user.email, 'Deposit Update — Action Needed', content);
}

async function notifyInvestmentCreated(user, investment, plan) {
  const content = `
    <h2 style="margin:0 0 20px;color:#e6f1ff;font-size:22px;">Investment Active! 📈</h2>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Congratulations, ${user.full_name}! Your investment is now active and earning returns.
    </p>
    <div style="background:#0a1628;border-radius:10px;padding:20px;margin:25px 0;border-left:3px solid #d4af37;">
      <p style="margin:0 0 8px;color:#8892b0;font-size:13px;">Investment Details:</p>
      <p style="margin:0;color:#e6f1ff;font-size:15px;"><strong>Plan:</strong> ${plan.name}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Amount Invested:</strong> $${investment.amount}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Expected ROI:</strong> ${plan.roi}%</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Duration:</strong> ${plan.duration_days} days</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Expected Return:</strong> $${(investment.amount * (1 + plan.roi / 100)).toFixed(2)}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Status:</strong> <span style="color:#28a745;">Active</span></p>
    </div>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Your investment will mature in ${plan.duration_days} days. You can track its progress anytime in your dashboard.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${frontendUrl}/dashboard" style="background:#d4af37;color:#0a1628;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">View Investment</a>
    </div>`;
  return sendEmail(user.email, `Investment Active — ${plan.name} Plan 📈`, content);
}

async function notifyWithdrawalSubmitted(user, withdrawal) {
  const content = `
    <h2 style="margin:0 0 20px;color:#e6f1ff;font-size:22px;">Withdrawal Request Received 💸</h2>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Hello ${user.full_name}, we've received your withdrawal request and it's now pending review.
    </p>
    <div style="background:#0a1628;border-radius:10px;padding:20px;margin:25px 0;border-left:3px solid #d4af37;">
      <p style="margin:0 0 8px;color:#8892b0;font-size:13px;">Withdrawal Details:</p>
      <p style="margin:0;color:#e6f1ff;font-size:15px;"><strong>Amount:</strong> $${withdrawal.amount}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Currency:</strong> ${withdrawal.currency}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Wallet Address:</strong> ${withdrawal.wallet_address}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Status:</strong> <span style="color:#f0ad4e;">Pending Review</span></p>
    </div>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Our team will process your withdrawal shortly. You'll receive an email notification once it's been sent.
    </p>`;
  return sendEmail(user.email, 'Withdrawal Request — Pending Review', content);
}

async function notifyWithdrawalApproved(user, withdrawal) {
  const content = `
    <h2 style="margin:0 0 20px;color:#e6f1ff;font-size:22px;">Withdrawal Sent! ✅</h2>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Great news, ${user.full_name}! Your withdrawal has been processed and sent to your wallet.
    </p>
    <div style="background:#0a1628;border-radius:10px;padding:20px;margin:25px 0;border-left:3px solid #28a745;">
      <p style="margin:0 0 8px;color:#8892b0;font-size:13px;">Withdrawal Details:</p>
      <p style="margin:0;color:#e6f1ff;font-size:15px;"><strong>Amount:</strong> $${withdrawal.amount}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Currency:</strong> ${withdrawal.currency}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Wallet Address:</strong> ${withdrawal.wallet_address}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Status:</strong> <span style="color:#28a745;">Completed</span></p>
    </div>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Please allow some time for the blockchain transaction to confirm. You can verify the transaction
      on the blockchain explorer for your selected network.
    </p>`;
  return sendEmail(user.email, 'Withdrawal Sent — Funds on the Way! ✅', content);
}

async function notifyWithdrawalRejected(user, withdrawal) {
  const content = `
    <h2 style="margin:0 0 20px;color:#e6f1ff;font-size:22px;">Withdrawal Update ⚠️</h2>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Hello ${user.full_name}, your withdrawal request could not be processed at this time.
    </p>
    <div style="background:#0a1628;border-radius:10px;padding:20px;margin:25px 0;border-left:3px solid #dc3545;">
      <p style="margin:0 0 8px;color:#8892b0;font-size:13px;">Withdrawal Details:</p>
      <p style="margin:0;color:#e6f1ff;font-size:15px;"><strong>Amount:</strong> $${withdrawal.amount}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Currency:</strong> ${withdrawal.currency}</p>
      <p style="margin:5px 0 0;color:#e6f1ff;font-size:15px;"><strong>Status:</strong> <span style="color:#dc3545;">Rejected</span></p>
    </div>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      The withdrawn amount has been returned to your account balance. Please verify your wallet address
      and try again, or contact our support team via live chat if you need assistance.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${frontendUrl}/withdraw" style="background:#d4af37;color:#0a1628;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">New Withdrawal</a>
    </div>`;
  return sendEmail(user.email, 'Withdrawal Update — Please Review', content);
}

async function notifyChatReply(user, adminMessage) {
  const content = `
    <h2 style="margin:0 0 20px;color:#e6f1ff;font-size:22px;">New Message from Support 💬</h2>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Hello ${user.full_name}, you've received a new reply from our support team.
    </p>
    <div style="background:#0a1628;border-radius:10px;padding:20px;margin:25px 0;border-left:3px solid #d4af37;">
      <p style="margin:0 0 8px;color:#8892b0;font-size:13px;">Support Team says:</p>
      <p style="margin:0;color:#e6f1ff;font-size:15px;line-height:1.7;">"${adminMessage}"</p>
    </div>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      You can continue the conversation by opening the support chat in your dashboard.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${frontendUrl}/support" style="background:#d4af37;color:#0a1628;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Open Support Chat</a>
    </div>`;
  return sendEmail(user.email, 'New Reply from NovaVest Support 💬', content);
}

module.exports = {
  sendEmail,
  notifySignup,
  notifyDepositSubmitted,
  notifyDepositApproved,
  notifyDepositRejected,
  notifyInvestmentCreated,
  notifyWithdrawalSubmitted,
  notifyWithdrawalApproved,
  notifyWithdrawalRejected,
  notifyChatReply,
  notifyPasswordReset,
  notifyPasswordChanged
};

// Password reset email
async function notifyPasswordReset(user, resetUrl) {
  const content = `
    <h2 style="margin:0 0 20px;color:#e6f1ff;font-size:22px;">Password Reset Request 🔐</h2>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Hello ${user.full_name}, we received a request to reset your NovaVest account password.
    </p>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Click the button below to set a new password. This link will expire in 1 hour for security reasons.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${resetUrl}" style="background:#d4af37;color:#0a1628;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Reset My Password</a>
    </div>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="color:#d4af37;font-size:13px;word-break:break-all;background:#0a1628;padding:12px;border-radius:8px;">
      ${resetUrl}
    </p>
    <div style="background:#0a1628;border-radius:10px;padding:16px;margin:25px 0;border-left:3px solid #f0ad4e;">
      <p style="margin:0;color:#f0ad4e;font-size:14px;">
        ⚠️ If you did not request a password reset, please ignore this email. Your password will remain unchanged and your account is safe.
      </p>
    </div>`;
  return sendEmail(user.email, 'Password Reset Request — NovaVest 🔐', content);
}

// Password reset confirmation email
async function notifyPasswordChanged(user) {
  const content = `
    <h2 style="margin:0 0 20px;color:#e6f1ff;font-size:22px;">Password Changed Successfully ✅</h2>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      Hello ${user.full_name}, your NovaVest account password has been successfully changed.
    </p>
    <div style="background:#0a1628;border-radius:10px;padding:16px;margin:25px 0;border-left:3px solid #28a745;">
      <p style="margin:0;color:#28a745;font-size:14px;">
        ✅ Your account security has been updated. You can now log in with your new password.
      </p>
    </div>
    <p style="color:#a8b2d1;font-size:15px;line-height:1.7;">
      If you did not make this change, please contact our support team immediately via the live chat in your dashboard.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${frontendUrl}/login" style="background:#d4af37;color:#0a1628;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Login to Your Account</a>
    </div>`;
  return sendEmail(user.email, 'Password Changed — NovaVest ✅', content);
}
