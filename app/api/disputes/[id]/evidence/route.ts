import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addEvidenceTo, getDispute } from '@/lib/disputes';
import { getOrder } from '@/lib/orders/service';
import { supabaseConfigured } from '@/lib/supabase/env';
import { getViewerId } from '@/lib/supabase/viewer';
import { idOf, readJson } from '@/lib/validate';

export const runtime = 'nodejs';
const schema = z.object({ text: z.string().max(2500) });

/* The buyer or the seller of the order adds evidence to an open dispute. Nobody else can. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = await idOf(params);
  const d = await getDispute(id);
  const o = d ? await getOrder(d.orderId) : null;
  if (!d || !o) return NextResponse.json({ error: 'Dispute not found.' }, { status: 404 });
  const me = (await getViewerId()) ?? null;
  // Signed in: only the two parties. Demo mode has no accounts, so the order id is the key (the dispute id is unguessable).
  if (supabaseConfigured && (!me || (me !== o.buyerId && me !== o.sellerId))) return NextResponse.json({ error: 'Dispute not found.' }, { status: 404 });
  const body = await readJson(req, schema);
  if (!body.ok) return body.res;
  const r = await addEvidenceTo(id, me, body.data.text);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
