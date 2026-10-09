import { NextResponse } from 'next/server';
import { deliver, getOrder } from '@/lib/orders/service';
import { createClient } from '@/lib/supabase/server';
import { idOf } from '@/lib/validate';
import { HELD_TEXT, heldReason } from '@/lib/holds';

/* The seller of an order says it is delivered. The review window starts then. Sellers need the authenticator code (aal2). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = await idOf(params);
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') return NextResponse.json({ error: 'Enter your authenticator code first.' }, { status: 403 });
  const order = await getOrder(id);
  if (!order || order.sellerId !== user.id) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (await heldReason(id)) return NextResponse.json({ error: HELD_TEXT }, { status: 409 });
  const r = await deliver(id, user.id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
