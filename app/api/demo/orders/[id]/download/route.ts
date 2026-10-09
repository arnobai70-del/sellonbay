import { NextResponse } from 'next/server';
import { orderFor } from '@/lib/commerce/access';
import { allow, deliverySecret, ensureLicense, ttlSeconds } from '@/lib/delivery/service';
import { signToken } from '@/lib/delivery/token';
import { isFundedState } from '@/lib/orders/machine';
import { idOf } from '@/lib/validate';

export const runtime = 'nodejs';

/* Demo orders follow the same rule as real ones: nothing before the order is funded, then a signed 24-hour link and a licence key. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = await idOf(params);
  const o = await orderFor(id);
  if (!o) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (!isFundedState(o.state)) return NextResponse.json({ error: 'Your files are available once your payment is held in escrow.' }, { status: 403 });
  if (!allow(`source:${o.buyerId ?? 'anon'}:${id}`, 5, 60 * 60 * 1000)) return NextResponse.json({ error: 'Too many download links requested. Try again in an hour.' }, { status: 429 });
  const licenseKey = await ensureLicense(id);
  const ttl = ttlSeconds();
  // A seller's real files come through the real route (signed in as the buyer); only a made-up starter gets the harmless dummy file.
  const real = !!o.productId && !!o.buyerId;
  const token = signToken(deliverySecret(), { o: id, u: o.buyerId ?? null, k: real ? 'real' : 'demo' }, ttl);
  return NextResponse.json({ url: `/api/download/${token}`, expiresAt: new Date(Date.now() + ttl * 1000).toISOString(), licenseKey }, { headers: { 'cache-control': 'no-store' } });
}
