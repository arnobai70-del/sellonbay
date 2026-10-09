import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { planPayouts } from '@/lib/payouts';

export const runtime = 'nodejs';

/* The Sunday job: make the week's payout batch. Needs CRON_SECRET in the Authorization header. An admin then downloads the CSV and pays by hand. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET ?? '';
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const a = Buffer.from(given),
    b = Buffer.from(secret);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: 'Not allowed.' }, { status: 401 });
  const r = await planPayouts(Date.now(), null);
  return NextResponse.json({ weekStart: r.weekStart, created: r.created.length, skipped: r.skipped.length });
}
