import { NextResponse } from 'next/server';
import { isBlocked } from '@/lib/chatFilter';
import { quoteSite } from '@/lib/commerce/quote';
import { getDev } from '@/lib/devsDb';
import { creditsTrial, trialOf } from '@/lib/developers';
import { findTrialCredit } from '@/lib/orders/trial';
import { deliveryTypeOf, licenceOf } from '@/lib/handover';
import { createOrder } from '@/lib/orders/service';
import { orderCreateSchema } from '@/lib/schemas';
import { getViewerId } from '@/lib/supabase/viewer';
import { readJson } from '@/lib/validate';
import { isPkg } from '@/lib/data';
import { guard } from '@/lib/guard';
import { PAUSED_TEXT, checkoutPausedFor } from '@/lib/switches';

export const runtime = 'nodejs';
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/* Creates an order waiting for payment. What was chosen comes from the browser; what it costs is worked out here. */
export async function POST(req: Request) {
  const parsed = await readJson(req, orderCreateSchema);
  if (!parsed.ok) return parsed.res;
  const b = parsed.data;
  const buyerId = (await getViewerId()) ?? null;
  const g = await guard('order', buyerId);
  if (!g.ok) return fail(g.error, g.status);
  if (await checkoutPausedFor(buyerId)) return fail(PAUSED_TEXT, 503);

  if (b.kind === 'hire') {
    const brief = String(b.brief ?? '').trim();
    if (brief.length < 20 || brief.length > 2000) return fail('Write 20 to 2000 characters about what you need.');
    if (isBlocked(brief)) return fail('Keep emails, phone numbers and outside payment talk out of the brief.');
    const r = await getDev(String(b.dev ?? ''), buyerId ?? undefined);
    if (!r || r.status !== 'live') return fail('That developer is not available.', 404);
    const trial = b.pack === 'Trial';
    const pack = trial ? trialOf(r.dev) : r.dev.packs.find((p) => p.name === b.pack);
    if (!pack) return fail('Pick a package.');
    const price = pack.price * 100;
    // A finished trial with this developer takes its fee off a full project, if the developer credits trials.
    const credit = !trial && creditsTrial(r.dev) ? await findTrialCredit(buyerId, r.dev.id, price) : null;
    const make = (c: typeof credit) =>
      createOrder({
        kind: trial ? 'trial' : 'custom',
        pkg: 'custom',
        deliveryType: 'download',
        title: trial ? `${r.dev.name}: ${pack.days}-day paid trial` : `${r.dev.name}: ${pack.name} package`,
        devKey: r.dev.id,
        brief,
        lines: [[c ? `${pack.name} package, trial credit applied` : `${pack.name} package`, price - (c?.creditCents ?? 0)]],
        days: pack.days,
        buyerId,
        trialCreditFor: c?.trialId,
      });
    let o;
    try {
      o = await make(credit);
    } catch (e) {
      if (!credit) throw e;
      o = await make(null); // the credit was claimed by another order a moment ago
    }
    return NextResponse.json({ id: o.id, pay: `/pay/${o.id}` });
  }

  const q = await quoteSite(b);
  if ('error' in q) return fail(q.error);
  const p = q.product;
  // A seller's own listing: only a signed-in buyer can buy it (the seller and the money need a real account on both sides), and not from yourself.
  if (q.sellerId) {
    if (!buyerId) return fail('Sign in to buy this. Sellers are paid into their account, so every buyer needs one too.', 401);
    if (buyerId === q.sellerId) return fail('This is your own listing.', 400);
  }
  const o = await createOrder({
    kind: 'product',
    pkg: isPkg(b.pkg) ? b.pkg : 'asis',
    deliveryType: p ? deliveryTypeOf(p) : 'live_site',
    licence: p ? licenceOf(p) : undefined,
    githubUsername: q.github,
    title: q.title,
    productKey: q.productId,
    productId: q.productDbId,
    sellerId: q.sellerId,
    demo: !q.sellerId, // a seller's own listing is a real order (the payment provider is still the fake one until decision D1)
    lines: q.lines,
    days: q.days,
    buyerId,
    domain: q.domain,
    appName: q.appName,
    oses: q.oses,
    instant: q.instant,
    express: q.express,
  });
  return NextResponse.json({ id: o.id, pay: `/pay/${o.id}` });
}
