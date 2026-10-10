import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminOnly } from '@/lib/admin/guard';
import { decideListing } from '@/lib/admin/queue';
import { idOf, readJson } from '@/lib/validate';

export const runtime = 'nodejs';
export const maxDuration = 60; // Fresh malware scan before approving an untrusted listing.
const schema = z.object({ decision: z.enum(['approve', 'changes', 'reject']), note: z.string().max(700).default(''), filesChecked: z.boolean().default(false) });

/* Approve, send back or reject a listing in review. A digital product needs the "I opened the files in a sandbox" tick. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const a = await adminOnly();
  if (!a.ok) return a.res;
  const slug = await idOf(params.then((p) => ({ id: p.slug })));
  const body = await readJson(req, schema);
  if (!body.ok) return body.res;
  const r = await decideListing(a.id, slug, body.data.decision, body.data.note, body.data.filesChecked);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
