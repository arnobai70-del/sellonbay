import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminOnly } from '@/lib/admin/guard';
import { decideReport } from '@/lib/admin/queue';
import { idOf, readJson } from '@/lib/validate';

export const runtime = 'nodejs';
const schema = z.object({ decision: z.enum(['suspend', 'dismiss', 'reinstate']), note: z.string().max(500).default('') });

/* Suspend the reported site (its listing is paused) or dismiss the report. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await adminOnly();
  if (!a.ok) return a.res;
  const id = await idOf(params);
  const body = await readJson(req, schema);
  if (!body.ok) return body.res;
  const r = await decideReport(a.id, id, body.data.decision, body.data.note);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
