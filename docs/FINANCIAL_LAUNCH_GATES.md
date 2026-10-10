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
