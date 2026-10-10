# SellOnBay Financial Launch Gates

This repository contains a simulated card payment provider, not a real marketplace payment solution.

## Current safety rules

- Test cards can fund only built-in example product orders, never a seller listing or developer/trial order.
- Fake payment webhooks and paid extra-work events for real orders are rejected in the payment event handler.
- Real checkout is visibly unavailable until a real PSP is integrated; no funds are collected.
- A configured database with missing order or webhook migrations must fail closed, not use transient memory.
- Without Supabase credentials, production ordering is disabled except when `LAUNCHBAY_DEMO=1` intentionally runs a demo prototype.
- Launch readiness marks fake payments, missing real malware scanning, or missing database credentials as critical TODOs.

## Must be completed before launch

- [ ] Owner decision D1: compliant payment provider, merchant custody model, refunds, settlement and actual payout.
- [ ] Verify payment webhooks with provider-specific signatures and durable event deduplication.
- [ ] Run isolated payment/refund/dispute/reconciliation end-to-end scenarios.
- [ ] Connect a genuine malware scanning service before accepting real digital uploads.
- [ ] Verify actual Supabase migrations 0001–0041, RLS, storage and recovery plans on staging.
- [ ] Configure anti-bot protection, real email and all production environment secrets.
- [ ] Verify domain registrar integration before selling registrations.

No database migration, live hosting configuration or real-money integration is changed by this security patch.

- Production Turnstile verification fails closed when only public Cloudflare test keys or missing keys are configured, except when explicitly running the demo prototype with `LAUNCHBAY_DEMO=1`.

## P0 antivirus integration (ClamAV)

- Set `CLAMAV_HOST` and `CLAMAV_PORT` to a reachable **internal-only** ClamAV clamd service, with updated signatures. The TCP port is unauthenticated and must never be public.
- Seller files are transferred to clamd using its binary INSTREAM protocol, with a 50 MiB scan limit and timeout. Empty, oversized, suspicious, infected, unreadable or scanner-unavailable results block approval.
- In real production, the server requires a real ClamAV-clean result **even if** `SCAN_REQUIRE_REAL` is omitted or set to `0`. `LAUNCHBAY_DEMO=1` is only for the demo prototype.
- Listing and version approvals re-scan the submitted file before release, and attempt to record the scan in the database. If required scan records cannot be saved, the approval fails closed.
- The admin launch checklist calls clamd `PING` and reports failure while it is unreachable. A successful PING is **not** full certification: perform real clean/EICAR, large-file, certificate and staging handover tests before production launch.
- Malware scanning does not replace admin sandbox inspection, suspicious-license review, manual release checks or independent trust review of download links.

## Domain registration readiness
- The current registrar is a **demo only**; `DOMAIN_API_KEY` never proves live availability or registration. Production without a verified provider returns HTTP 503 for domain search, disables the new-domain option, and rejects funding a new-domain order (including orders with an old demo ref).
- Local or explicitly flagged `LAUNCHBAY_DEMO=1` prototypes may show *clearly labelled* simulated names and example prices. Those are not live availability or purchase offers.
- Connect and verify a real registrar (D3), customer registrant record, quote and renewal prices, ownership, refunds and webhook/order reconciliation in staging before enabling real sales. No registrar credentials were added in this patch.
