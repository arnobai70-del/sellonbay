import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminOnly } from '@/lib/admin/guard';
import { markFailed } from '@/lib/payouts';
import { idOf, readJson } from '@/lib/validate';

export const runtime = 'nodejs';
const schema = z.object({ note: z.string().max(300).default('') });

/* The transfer did not go through. The orders go back to waiting for the next batch. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await adminOnly();
  if (!a.ok) return a.res;
  const id = await idOf(params);
  const body = await readJson(req, schema);
  if (!body.ok) return body.res;
  const r = await markFailed(id, a.id, body.data.note);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
