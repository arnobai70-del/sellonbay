import { NextResponse } from 'next/server';
import { z } from 'zod';
import { audit } from '@/lib/admin/audit';
import { adminOnly } from '@/lib/admin/guard';
import { decide, getDispute } from '@/lib/disputes';
import { listExtras } from '@/lib/orders/extra';
import { fakePayments } from '@/lib/providers/payment';
import { idOf, readJson } from '@/lib/validate';

export const runtime = 'nodejs';
const schema = z.object({
  decision: z.enum(['refund_full', 'refund_partial', 'fix_requested', 'release']),
  refundCents: z.number().int().optional(),
  note: z.string().max(500).default(''),
  liability: z.enum(['seller', 'buyer_fraud', 'platform']).optional(),
  feeCents: z.number().int().min(0).max(100_000).optional(),
});

/* The admin's decision on a dispute. Moves the order and the ledger, tells the payment provider about a refund, tells both sides, and is written to the audit log. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await adminOnly();
  if (!a.ok) return a.res;
  const id = await idOf(params);
  const body = await readJson(req, schema);
  if (!body.ok) return body.res;
  if (!(await getDispute(id))) return NextResponse.json({ error: 'Dispute not found.' }, { status: 404 });
  const r = await decide(id, a.id, body.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const { order, dispute } = r.value;
  const extras = (await listExtras(order.id)).filter((c) => c.state === 'funded').reduce((s, c) => s + c.priceCents, 0);
  if (dispute.decision === 'refund_full') await fakePayments.refund(order.id, order.priceCents + extras);
  if (dispute.decision === 'refund_partial' && dispute.refundCents) await fakePayments.refund(order.id, dispute.refundCents);
  await audit(a.id, `dispute_${dispute.decision}`, 'dispute', id, {
    orderId: order.id,
    refundCents: dispute.refundCents ?? null,
    note: body.data.note,
    liability: dispute.liability ?? null,
    feeCents: dispute.feeCents ?? 0,
    feeChargedCents: dispute.feeChargedCents ?? 0,
  });
  return NextResponse.json({ ok: true, state: order.state });
}
