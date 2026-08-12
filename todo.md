# Investment Platform — Full Rebrand TODO (NovaVest → ApexCrestVest)

## Phase 1: Survey & Planning
- [x] Clone novavest repo from GitHub
- [x] Survey current branding (NovaVest) across all files
- [x] Identify color scheme (gold #d4af37 + navy) and all branding contexts
- [x] Map all 21 files with 138 occurrences

## Phase 2: Name Selection
- [x] Generate strong investment platform name suggestions
- [x] Verify domain availability via DNS (NXDOMAIN check)
- [x] Get user approval on new name → ApexCrestVest
- [x] Document the chosen name + replacements

## Phase 3: Execute Rebrand
- [x] Rebrand server.js (54 occurrences)
- [x] Rebrand utils/mailer.js (12 occurrences)
- [x] Rebrand views/index.ejs (7 occurrences)
- [x] Rebrand views/about.ejs (4 occurrences)
- [x] Rebrand views/faq.ejs (3 occurrences)
- [x] Rebrand views/contact.ejs (2 occurrences)
- [x] Rebrand views/support.ejs (2 occurrences)
- [x] Rebrand views/dashboard.ejs (1 occurrence)
- [x] Rebrand views/forgot-password.ejs (1 occurrence)
- [x] Rebrand views/reset-password.ejs (1 occurrence)
- [x] Rebrand views/transaction-detail.ejs (1 occurrence)
- [x] Rebrand views/plans.ejs (2 occurrences)
- [x] Rebrand public/css/style.css (1 occurrence)
- [x] Rebrand db/init.js (2 occurrences)
- [x] Rebrand package.json (3 occurrences)
- [x] Rebrand .env.example (3 occurrences)
- [x] Rebrand README.md (3 occurrences)
- [x] Rebrand MARKETING_WRITEUPS.md (21 occurrences)
- [x] Rebrand PRODUCTION_SETUP.md (12 occurrences)
- [x] Rebrand TRANSACTION_DESCRIPTIONS.md (1 occurrence)
- [x] Rebrand todo.md

## Phase 4: Verify & Push
- [x] Verify zero remaining NovaVest references (0 found)
- [x] Test all JS files pass syntax check
- [x] Test server.js starts cleanly ("ApexCrestVest server running on port 3000")
- [x] Commit rebrand (5ba62c9, 22 files changed)
- [x] Push to GitHub (main branch)
- [x] Confirm push succeeded via GitHub API

## ✅ REBRAND COMPLETE

## Phase 5: Domain Registrar Recommendation (Nigerian Payment + Reliability + No Account Closure)
- [x] Research Whogohost TOS — found HYIP/investment site prohibition (applies to hosting)
- [x] Research Namecheap Universal TOS — found HYIP/investment site prohibition (under "uploads unacceptable material" = hosting)
- [x] Research Namecheap Hosting AUP — confirmed HYIP prohibition is hosting-specific
- [x] Research Cloudflare Domain Registration Agreement — NO investment site prohibition, only illegal/fraudulent activity
- [x] Research Porkbun Domain Registration Agreement — NO investment site prohibition, only illegal/fraudulent activity
- [x] Identify the critical distinction: hosting prohibitions ≠ domain registration prohibitions
- [x] Deliver comprehensive answer to user with warnings and recommendations

## Phase 7: Pre-Purchase Reassurance & Going-Live Guide

- [x] Verify apexcrestvest.com domain availability via whois → CONFIRMED AVAILABLE ("No match for domain APEXCRESTVEST.COM")
- [x] Research Whogohost domain registration speed (instant after card payment, within 1hr for bank transfer)
- [x] Research Railway custom domain setup steps (CNAME + TXT record both required, auto SSL via Let's Encrypt)
- [x] Research DNS propagation timeline (global ~2hrs, up to 72hrs worst case)
- [x] Deliver comprehensive reassurance + step-by-step going-live guide to user

### Research Findings (Phase 7)
- [x] apexcrestvest.com is AVAILABLE (WHOIS confirmed: "No match for domain APEXCRESTVEST.COM")
- [x] Whogohost: instant activation after payment; card = instant, bank transfer = within 1hr
- [x] Railway custom domain: requires BOTH CNAME record (points to xxx.up.railway.app) AND TXT record (domain ownership verification). Domain will NOT verify with only CNAME — returns 404 without TXT.
- [x] Railway auto-provisions free Let's Encrypt SSL certificate (ECDSA, 90-day validity, auto-renewed at 30 days remaining). Certificate issued within 1 hour of DNS update.
- [x] DNS propagation: Whogohost says global propagation usually complete within 2 hours. Railway notes up to 72 hours worldwide worst case.
- [x] Root domain (apexcrestvest.com) requires CNAME flattening support — Whogohost/GO54 supports this. Alternatively use www subdomain.

## Phase 6: Nigerian-Payment-Only Domain Registrar Recommendation
- [x] Research DomainKing Nigeria — now owned by HOSTAFRICA (same as Whogohost/GO54 parent)
- [x] Research SmartWeb (smartwebng) — accepts Naira; HYIP prohibited on hosting servers only
- [x] Research QServers — accepts Naira (bank transfer + Paystack); HYIP prohibited on hosting servers only
- [x] Research NairaHost — accepts Naira (Paystack, Flutterwave, bank transfer, USSD, crypto); investment on shared hosting needs approval, domain reg has no such clause
- [x] Research Garanntor/HostAfrica Nigeria — parent of DomainKing & Whogohost/GO54
- [x] Research Domain.com.ng / TrueNigeria / other NIRA registrars
- [x] Re-evaluate Whogohost/GO54 — Non-.ng Domain Registrant Agreement has NO investment prohibition; only "illegal activities" trigger suspension
- [x] Compile NIRA-accredited registrar list (Whogohost/GO54, DomainKing, QServers, Web4Africa, Truehost, Leanna.ng, SmartWeb, NairaHost)
- [x] Deliver revised recommendation focused exclusively on Naira-paying registrars

### Research Findings (Phase 6)
- [x] SmartWeb TOS: HYIP/investment prohibited UNDER HOSTING "Unacceptable Material" (servers). Domain reg agreement separate.
- [x] QServers TOS: HYIP/investment prohibited UNDER HOSTING "Prohibited Activities" (servers). Domain reg agreement separate.
- [x] NairaHost TOS: Section 8.6 - investment on SHARED HOSTING needs written approval. Section 16 (Domain Registration) has NO investment clause. Section 14A.7: domains are separate from hosting.
- [x] Whogohost/GO54 Non-.ng Domain Registrant Agreement: NO investment/HYIP prohibition. Section 15.2 suspension only for breach, trademark, spam, "illegal activities." Accepts Naira (Paystack, Flutterwave, bank transfer, USSD).
- [x] NIRA accredited list retrieved: Whogohost/GO54, DomainKing (now HostAfrica), QServers, Web4Africa, Truehost, Leanna.ng, SmartWeb, NairaHost
- [x] DomainKing now owned by HOSTAFRICA (same parent as Whogohost/GO54)
- [x] KEY FINDING: ALL Nigerian registrars prohibit investment sites ON THEIR HOSTING SERVERS, but their DOMAIN REGISTRATION AGREEMENTS only prohibit illegal activities. Hosting AUP ≠ domain registration agreement. User hosts on Railway => hosting AUP irrelevant.
