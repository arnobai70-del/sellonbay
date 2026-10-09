import { NextResponse } from 'next/server';
import { cleanName, lookup, registrarLive } from '@/lib/domains';
import { domainQuery } from '@/lib/schemas';
import { parseWith } from '@/lib/validate';

export const runtime = 'nodejs';

/* GET /api/domains?name=mybakery  ->  availability and yearly price for each ending. Public and read-only. */
export async function GET(req: Request) {
  const q = parseWith(domainQuery, new URL(req.url).searchParams.get('name') ?? '', 'That name is too long.');
  if (!q.ok) return q.res;
  const name = cleanName(q.data);
  if (name.length < 2) return NextResponse.json({ error: 'Type at least 2 letters or numbers.' }, { status: 400 });
  return NextResponse.json({ name, live: registrarLive(), results: lookup(name) }, { headers: { 'cache-control': 'no-store' } });
}
