import { NextResponse } from 'next/server';
import { orderFor } from '@/lib/commerce/access';
import { cancel } from '@/lib/orders/service';
import { fakePayments } from '@/lib/providers/payment';
import { getViewerId } from '@/lib/supabase/viewer';
import { idOf } from '@/lib/validate';

export const runtime = 'nodejs';

/* The buyer cancels: any time before paying, or after the delivery time has passed (overdue) with a full refund. */
export async function POST(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const o = await orderFor(await idOf(params));
  if (!o) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (o.state !== 'awaiting_payment' && o.state !== 'overdue') return NextResponse.json({ error: 'This order cannot be cancelled now.' }, { status: 409 });
  const wasPaid = !!o.fundedAt;
  const r = await cancel(o.id, (await getViewerId()) ?? null, wasPaid ? 'buyer cancelled an overdue order' : 'buyer cancelled before paying');
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  if (wasPaid) await fakePayments.refund(o.id, o.priceCents);
  return NextResponse.json({ ok: true, refunded: wasPaid });
}
