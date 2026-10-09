import { NextResponse } from 'next/server';
import { orderFor } from '@/lib/commerce/access';
import { confirmAccess } from '@/lib/orders/service';
import { getViewerId } from '@/lib/supabase/viewer';
import { idOf } from '@/lib/validate';

export const runtime = 'nodejs';

/* The buyer says they can open the repository the seller invited them to. The review window starts now. */
export async function POST(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const o = await orderFor(await idOf(params));
  if (!o) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const r = await confirmAccess(o.id, (await getViewerId()) ?? null);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
