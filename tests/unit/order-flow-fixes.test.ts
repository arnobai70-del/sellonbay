import { describe, expect, it } from 'vitest';
import { DAY_MS } from '@/lib/config';
import { createExtra } from '@/lib/orders/extra';
import { handlePaymentEvent } from '@/lib/orders/payments';
import { createOrder, deliver, getOrder, handoverSent, runDueJobs } from '@/lib/orders/service';

/* Order paths found wrong in a review: repository orders, extra work during the review, and payment events that do not fit the order. */
let n = 0;
const paid = async (deliveryType: 'live_site' | 'repo_access' = 'live_site') => {
  const sellerId = `of-seller-${Date.now()}-${++n}`;
  const o = await createOrder({
    kind: 'product',
    pkg: 'asis',
    deliveryType,
    title: 'Site',
    lines: [['Site', 10_000]],
    days: 2,
    buyerId: null,
    sellerId,
    productKey: 'saffron-table',
    demo: false,
    githubUsername: deliveryType === 'repo_access' ? 'octocat' : undefined,
  });
  await handlePaymentEvent('verified-test-psp', { id: 'evt_' + o.id, type: 'payment.succeeded', orderId: o.id, amountCents: o.priceCents, ref: 'pay_' + o.id, at: Date.now() });
  return (await getOrder(o.id))!;
};

describe('order flow fixes', () => {
  it('a repository order with the invite sent never turns overdue (the buyer already has the code)', async () => {
    const o = await paid('repo_access');
    expect((await handoverSent(o.id, o.sellerId)).ok).toBe(true);
    await runDueJobs(Date.now() + 10 * DAY_MS);
    expect((await getOrder(o.id))!.state).toBe('in_delivery');
  });

  it('a site order still turns overdue', async () => {
    const o = await paid();
    await runDueJobs(Date.now() + 10 * DAY_MS);
    expect((await getOrder(o.id))!.state).toBe('overdue');
  });

  it('no extra work while the buyer reviews a delivery', async () => {
    const o = await paid();
    await deliver(o.id, o.sellerId);
    const r = await createExtra(o.id, o.sellerId, { title: 'Add a gallery page', priceCents: 2_500, addDays: 2 });
    expect(r.ok).toBe(false);
  });

  it("an extra-work payment that names another order's extra is rejected", async () => {
    const a = await paid();
    const b = await paid();
    const r = await createExtra(b.id, b.sellerId, { title: 'Add a gallery page', priceCents: 2_500, addDays: 2 });
    if (!r.ok) throw new Error(r.error);
    const out = await handlePaymentEvent('verified-test-psp', {
      id: 'evt_cross_' + r.request.id,
      type: 'payment.succeeded',
      orderId: a.id,
      amountCents: 2_500,
      ref: 'pay_cross',
      at: Date.now(),
      changeRequestId: r.request.id,
    });
    expect(out.status).toBe('rejected');
  });

  it('a partial refund at the provider does not cancel the order', async () => {
    const o = await paid();
    const out = await handlePaymentEvent('verified-test-psp', { id: 'evt_pr_' + o.id, type: 'refund.succeeded', orderId: o.id, amountCents: 500, ref: 're_' + o.id, at: Date.now() });
    expect(out.status).toBe('ignored');
    expect((await getOrder(o.id))!.state).toBe('funded');
    const full = await handlePaymentEvent('verified-test-psp', { id: 'evt_fr_' + o.id, type: 'refund.succeeded', orderId: o.id, amountCents: o.priceCents, ref: 're2_' + o.id, at: Date.now() });
    expect(full.status).toBe('applied');
    expect((await getOrder(o.id))!.state).toBe('cancelled');
  });
});
