import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminOnly } from '@/lib/admin/guard';
import { removeFakeAccount, removeFakeReview } from '@/lib/clean';
import { readJson } from '@/lib/validate';

export const runtime = 'nodejs';
const schema = z.object({ what: z.enum(['account', 'review']), id: z.string().trim().min(1).max(64), note: z.string().max(500).default('') });

/* One-click clean-up: ban a fake account and remove its reviews and reports, or remove one review. Evidence (orders, chat, logs) is never deleted. */
export async function POST(req: Request) {
  const a = await adminOnly();
  if (!a.ok) return a.res;
  const body = await readJson(req, schema);
  if (!body.ok) return body.res;
  const { what, id, note } = body.data;
  const r = what === 'account' ? await removeFakeAccount(a.id, id, note) : await removeFakeReview(a.id, id, note);
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.status });
}
