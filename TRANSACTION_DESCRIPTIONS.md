# NovaVest — Realistic Transaction Descriptions Reference

When generating transaction history from the admin panel, you can type any of these descriptions
into the "Description" field to make transactions look completely real and believable.
The batch generator already uses these automatically with random selection.

---

## 💰 DEPOSIT Descriptions (32 variations)

### Network-Specific Deposits
- `Crypto deposit via USDT (TRC-20)`
- `Crypto deposit via Bitcoin`
- `Crypto deposit via Ethereum (ERC-20)`
- `Crypto deposit via Litecoin`
- `Deposit confirmed - USDT TRC-20`
- `Deposit confirmed - BTC network`
- `USDT deposit (TRC-20)`
- `BTC deposit confirmed`
- `ETH deposit confirmed`
- `LTC deposit confirmed`
- `Deposit via Bitcoin network`
- `Deposit via Ethereum network`
- `Bitcoin network deposit`
- `Ethereum network deposit`
- `USDT TRC-20 deposit`

### Wallet & Transfer Deposits
- `Wallet deposit - USDT`
- `Wallet deposit - Bitcoin`
- `Crypto wallet deposit`
- `Incoming transfer - USDT`
- `Incoming transfer - BTC`
- `Deposit from external wallet`
- `Deposit credited to account`
- `Crypto funding confirmed`
- `Account funding via USDT`
- `Account funding via Bitcoin`
- `Account funding - BTC`
- `Top-up deposit - USDT`
- `Wallet top-up confirmed`

### Confirmation & Verification Deposits
- `Deposit confirmed`
- `Blockchain deposit confirmed`
- `Deposit received and confirmed`
- `Crypto deposit - 1 confirmation`
- `Deposit verified on blockchain`

---

## 🏦 WITHDRAWAL Descriptions (32 variations)

### Wallet-Specific Withdrawals
- `Withdrawal to external wallet`
- `Withdrawal to Bitcoin wallet`
- `Withdrawal to Ethereum wallet`
- `Withdrawal to Litecoin wallet`
- `Withdrawal to external BTC wallet`
- `Withdrawal to USDT wallet (TRC-20)`
- `Withdrawal to crypto wallet`
- `Withdrawal to blockchain wallet`
- `Withdrawal to personal wallet`
- `Withdrawal to cold wallet`
- `Withdrawal to hardware wallet`
- `Withdrawal to designated wallet`
- `Withdrawal to crypto address`

### Currency-Specific Withdrawals
- `Withdrawal processed - USDT`
- `Withdrawal processed - BTC`
- `Funds withdrawal - USDT`
- `Funds withdrawal - BTC`
- `Withdrawal to external wallet (BTC)`
- `Withdrawal to external wallet (USDT)`

### Status & Processing Withdrawals
- `Withdrawal completed`
- `Withdrawal processed successfully`
- `Withdrawal request approved`
- `Withdrawal sent to wallet`
- `Withdrawal confirmed - BTC network`
- `Withdrawal confirmed - USDT TRC-20`
- `Withdrawal confirmed - ETH network`
- `Payout to wallet address`
- `Withdrawal transfer completed`
- `Profit withdrawal to wallet`
- `Funds transferred to external wallet`
- `Withdrawal payout confirmed`
- `Withdrawal settled`

---

## 📈 INTEREST / ROI Descriptions (40 variations)

### Per-Plan ROI Payouts
- `Investment ROI payout - Starter Plan`
- `Investment ROI payout - Professional Plan`
- `Investment ROI payout - Elite Plan`
- `Investment ROI payout - Quick Return Plan`
- `ROI earnings - Starter Plan`
- `ROI earnings - Professional Plan`
- `ROI earnings - Elite Plan`
- `ROI earnings - Quick Return Plan`
- `Investment return - Starter Plan`
- `Investment return - Professional Plan`
- `Investment return - Elite Plan`
- `Investment return - Quick Return Plan`
- `Interest earned - Starter Plan`
- `Interest earned - Professional Plan`
- `Interest earned - Elite Plan`
- `Interest earned - Quick Return Plan`

### Maturity & Completion Payouts
- `Plan maturity payout`
- `Maturity payout - Starter Plan`
- `Maturity payout - Professional Plan`
- `Maturity payout - Elite Plan`
- `Maturity payout - Quick Return Plan`
- `Plan completion payout`
- `Plan ROI settlement`
- `Investment maturity settlement`
- `ROI maturity bonus`

### Daily/Weekly/General Interest
- `Daily interest payout`
- `Daily ROI credit`
- `Daily earnings credit`
- `Daily trading profit`
- `Weekly interest payout`
- `Plan interest payout`
- `ROI dividend payout`
- `Investment profit credit`
- `Investment yield credit`
- `Profit sharing payout`
- `Compound interest payout`
- `Investment growth credit`
- `Trading profit payout`
- `Portfolio ROI return`
- `ROI payout - plan completed`

---

## 🎁 BONUS Descriptions (for manual use)

- `Sign Up Bonus`
- `Referral Bonus`
- `Promotional bonus credit`
- `Loyalty reward bonus`
- `Welcome bonus`
- `Referral program reward`
- `Promo campaign bonus`
- `Special bonus credit`
- `Anniversary bonus`
- `VIP member bonus`

---

## 💡 Pro Tips for Maximum Realism

1. **Use varied amounts** — Don't make all deposits the same round number. Use amounts like
   `$1,247.83`, `$3,891.50`, `$856.22` instead of always `$1,000` or `$500`

2. **Spread dates realistically** — Deposits should come first (earlier dates), then interest
   payouts spread over time, with occasional withdrawals mixed in

3. **Match descriptions to plan types** — If the user invested in the "Professional Plan",
   use `Investment ROI payout - Professional Plan` for their interest transactions

4. **Use network-specific language** — Real crypto platforms always specify the network
   (TRC-20, ERC-20, BTC network) in deposit/withdrawal descriptions

5. **The batch generator does all of this automatically** — Just go to
   **Admin → Generate Txns → Batch section**, pick a user, set the numbers, and it creates
   a full realistic history with random descriptions, amounts, and dates

6. **For single transactions** — Use the form on the user detail page or the Generate Txns
   page. Pick from the descriptions above and paste into the Description field
