import { NextResponse } from 'next/server';
import { audit } from '@/lib/admin/audit';
import { adminOnly } from '@/lib/admin/guard';
import { runScan } from '@/lib/scan';
import { orderStore } from '@/lib/orders/store';
import { createAdminClient } from '@/lib/supabase/server';
import { idOf } from '@/lib/validate';

export const runtime = 'nodejs';
export const maxDuration = 60;

/* Run the listing scan again (after the seller changed the file, or when it did not finish the first time). It only adds flags. */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const a = await adminOnly();
  if (!a.ok) return a.res;
  const slug = await idOf(params.then((p) => ({ id: p.slug })));
  if ((await orderStore()).kind !== 'postgres') return NextResponse.json({ error: 'There are no listings to scan in demo mode.' }, { status: 404 });
  const { data: p } = await createAdminClient().from('products').select('id, slug, description, code_url, demo_url, third_party, platform').eq('slug', slug).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  const demo = typeof p.demo_url === 'string' && p.demo_url.startsWith('https://') ? p.demo_url : null;
  const r = await runScan({
    slug: p.slug,
    productId: p.id,
    description: p.description,
    codeUrl: p.code_url,
    demoUrl: demo,
    thirdPartyDeclared: Array.isArray(p.third_party) && p.third_party.length > 0,
    needsLicenceFile: p.platform === 'digital',
  });
  await audit(a.id, 'listing_scanned', 'product', slug, { malware: r.flags.malware.status, secrets: r.flags.secrets.length, version: r.version });
  return NextResponse.json({ ok: true });
}
