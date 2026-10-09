import { NextResponse } from 'next/server';
import { z } from 'zod';
import { orderFor } from '@/lib/commerce/access';
import { addReview } from '@/lib/reviews';
import { getViewerId } from '@/lib/supabase/viewer';
import { idOf, readJson } from '@/lib/validate';

export const runtime = 'nodejs';
const schema = z.object({ rating: z.number().int(), body: z.string().max(1200).default('') });

/* The buyer of an accepted order leaves a review (one per order). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const o = await orderFor(await idOf(params));
  if (!o) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const body = await readJson(req, schema);
  if (!body.ok) return body.res;
  const r = await addReview(o.id, (await getViewerId()) ?? null, body.data);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
