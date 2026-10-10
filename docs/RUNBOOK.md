# Runbook

How to operate SellOnBay. Short on purpose. Where something is not built yet it says so.

## Applying database changes

1. Back up first (Supabase dashboard > Database > Backups, or `pg_dump`).
2. Apply the files in `supabase/migrations/` in number order: Supabase SQL editor (paste, run), or a Postgres client with the project's connection string.
3. After a migration that adds tables, check the grants in that file (clients get the minimum, never TRUNCATE) and run `npm run test:e2e` with the real database: `tests/e2e/rls.spec.ts` tries every forbidden action as the wrong user.
4. Migrations are never edited after they have been applied. Fix forward with a new file.

## Scheduled job

`POST /api/cron/orders` with `Authorization: Bearer $CRON_SECRET`, every 5 to 10 minutes. It runs `runDueJobs`: auto-accept after the review window, mark late orders `overdue`, end the 7-day payout hold, and make sure the ledger and certificates match every open order. It is safe to run twice. Orders are also brought up to date whenever somebody opens them.

## Orders and money

- Rules and numbers: `lib/config.ts`. State machine: `lib/orders/machine.ts`. Every change of state writes a row to `order_events` (append-only, nobody can edit or delete it).
- The ledger (`ledger_entries`, double entry, append-only) is the record of money. `select * from ledger_balances;` shows each account (credits minus debits). `platform_cash` is the only account where debits grow it. Escrow, seller pending and seller available are never below zero.
- **Reconcile** (monthly, and before any payout): for each provider payment in the provider dashboard, the matching `pay:<order id>` entry must exist and have the same amount. Sum of `order_escrow:*` balances = money held for open orders. Payouts: `seller_available:*` after payouts must be zero or a positive balance that still waits for the weekly run.
- Payment events arrive at `POST /api/webhooks/payment`. They are checked (signature, age under 5 minutes) and each event id is processed once. A rejected event (wrong amount, unknown order) is logged in the response and never funds anything.

## Disputes (built)

The buyer reports a problem on the order page (during the review window, or in the 7 days after accepting). The order is held (`disputed`): no auto-accept, no payout. The seller replies within 48 hours (`POST /api/disputes/[id]/reply`), you decide within 5 days at `/dashboard/admin/disputes`: refund in full, refund part (taken from the seller's share), ask the seller to fix, or reject and pay the seller. A decision moves the order and the ledger, tells both sides, and is written to the audit log. Three rejected disputes flag the buyer (`profiles.flagged`, a database trigger). Refunds are told to the payment provider through `PaymentProvider.refund` (fake today: no real money moves until D1).

## Payout day (Sunday, built; money is sent by hand)

1. The Sunday job (`POST /api/cron/payouts` with `CRON_SECRET`) or the button on `/dashboard/admin/payouts` makes the week's batch: one payout per seller, from orders whose 7-day hold ended. Sellers with no payout method or account on file are left out and listed with the reason.
2. Download the CSV (this locks the batch as "exported"). Send each transfer with Payoneer, Wise or the bank.
3. Mark each payout paid with the transfer reference. That moves the ledger (`seller_available` to `payout_out`) and the orders to `paid_out`, tells the seller, and is written to the audit log. If a transfer fails, mark it failed and the orders go into the next batch.

## Abuse reports and hosted demos

Reports come in at `/report-abuse`. Open reports are at `/dashboard/admin/abuse`: suspend (pauses the listing the link points to) or dismiss. Never serve seller files with `allow-same-origin`. 

## Security page (abuse hardening)

`/dashboard/admin/security` shows accounts that share a connection or device, connections that keep hitting a limit, and active blocks. Offices and families share connections: look at the accounts before blocking. Set `GUARD_SALT` (long random value) before launch; changing it later forgets old hashes and breaks existing blocks. Limits are in `lib/config.ts` (`limits`). The daily cron (`POST /api/cron/orders`) purges events older than 90 days.

## Risk page (metrics, emergency switch, held orders, clean-up)

`/dashboard/admin/risk`. Check it daily: the table shows the last 14 days and flags an unusual rise (alerts also arrive as admin notifications). During a flood of fake buyers turn on "Pause checkout for new buyers" (turn it off again when it is over; both are in the audit log). Orders from new or flagged buyers appear under "waiting for a safety check": look at the buyer and the payment, then release or cancel. Clean-up bans fake accounts and removes their reviews and reports, but keeps all evidence. Keep the audit log, `order_events`, `download_events` and `security_events` if you ever need a lawyer's notice.

## Ledger risk, evidence and chargebacks

The seller reserve is off until you set `CONFIG.reserve` (percent and days) or a rule for one seller on the Risk page. A seller can owe money (shown on their dashboard) after a refund or fee the ledger could not take from them; new earnings pay it off. In Disputes, always say whose fault it was and the fee the dispute cost: a seller at fault is charged the fee. Download the evidence PDF (order page, seller dashboard or Disputes) when answering a chargeback or a dispute. A lost chargeback bans the buyer for good; the seller's money for that order is your decision in Disputes.

## Approving listings and developers

`/dashboard/admin` lists new listings and developer profiles. Open the demo and the files first (production requires a connected ClamAV daemon and a fresh successful real scan before approving a file; it fails closed if ClamAV is unavailable. For a digital product the admin must also confirm sandbox inspection). Approve, send back or reject, with a note the seller sees.

## Restore a backup (test this once before launch)

1. Supabase dashboard > Database > Backups > pick a backup > Restore (this replaces the database), or restore a `pg_dump` file into a fresh project with `psql`.
2. Re-set the environment variables of the app to the new project's keys.
3. Run `npm run test:e2e` against it, and open one order and one listing by hand.
4. Write the date of the test here: ______

## Cloudflare (put it in front before launch)

- Proxy DNS (orange cloud), SSL mode Full (strict).
- WAF managed rules on, Bot Fight Mode on.
- Rate limits on `/login`, `/api/*`, the chat and the free tools.
- Turnstile on sign-up, sign-in, chat send and free tools (the app already has the widget on the pre-sale question form; set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`).
- Do not cache `/api/*`, `/orders/*`, `/pay/*`, `/dashboard/*`.

## Security checklist (spec section 9). Tick when done and tested.

- [ ] Cloudflare in front (above)
- [x] Security headers: CSP, HSTS, X-Content-Type-Options, frame-ancestors, referrer policy (`next.config.ts`, tested in `tests/e2e/security.spec.ts`; scripts and styles still allow 'unsafe-inline', tighten with nonces later)
- [x] Service-role key only on the server; `scripts/check-bundle.mjs` (run in CI after the build) and `tests/unit/secrets.test.ts` check that no secret is in the browser bundle
- [x] Every API input is validated with Zod (`lib/schemas.ts`, `lib/validate.ts`)
- [x] No `dangerouslySetInnerHTML` (a unit test fails if one appears)
- [x] Uploaded files: type and size limits, random names, never served from the app origin with scripts (hosted demos are sandboxed)
- [x] Webhooks: signature checked, age checked, each event processed once
- [x] Audit log for every admin action (`audit_log`, append-only, `/dashboard/admin/audit`)
- [ ] Daily database backups, and a restore tested once (above)
- [ ] Automated dependency vulnerability audit with enforced patch thresholds; Dependabot is enabled (`.github/`) but `npm ci --no-audit` is not an audit.
- [x] Privacy: cookie notice, data export and delete request flow (`/account/privacy`, admins process deletions under Accounts), retention note on the Privacy page
- [ ] Real Turnstile keys set (the test keys check nothing)

## Things that must be true before the first real payment

- Decision D1 made, provider contract read, a lawyer has reviewed the escrow wording, refund wording, seller agreement and handover certificate (every page tagged `[LAWYER REVIEW]`).
- `GUARD_SALT` set to a long random value.
- A real malware scanner (ClamAV or VirusTotal) is connected and `SCAN_REQUIRE_REAL=1` is set.
- `PAYMENT_WEBHOOK_SECRET`, `DELIVERY_SECRET`, `CRON_SECRET` set. The demo controls (`/api/demo/orders/*/skip`, "Demo controls" in the order page) and the demo pay form removed.

## More operations

- **Scan a listing again**: Admin > New listings > "Scan again". Production scans use a private-network ClamAV daemon. Admin approval also re-scans the exact current file URL, persists the result and requires sandbox inspection.
- **Process a deletion request**: Admin > Accounts > Deletion requests. It is refused (and the person sees why) while an order, a dispute or a payout is open.
- **Abuse reports**: three different reporters pause a listing by themselves. Look at it, then suspend, dismiss, or put it back.
- **AI budget**: `AI_MONTHLY_TOKEN_BUDGET` stops the free tool for the rest of the month when used up. Watch `ai_usage` (subject `global`).
- **Domain renewals**: the scheduled job (`POST /api/cron/orders`) also sends the 30, 7 and 1 day reminders.
