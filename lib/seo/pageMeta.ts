import 'server-only';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { audit } from '../admin/audit';
import { orderStore } from '../orders/store';
import { SITE_NAME } from '../site';
import { createAdminClient } from '../supabase/server';
import { SEO_PAGES, pageSeoProblem, seoPage, type PageSeo } from './pageList';

/*
 * Title and description an admin saved for a public page (/dashboard/admin/seo/pages), kept in `app_settings` under "seo:page:<path>".
 * Empty means "use the page's built-in words" (lib/seo/pageList.ts). Saving refreshes that page so the new words show without a deploy.
 */
const KEY = (path: string) => `seo:page:${path}`;
const EMPTY: PageSeo = { title: '', description: '' };
const mem: { saved: Record<string, PageSeo> } = ((globalThis as { __pageSeoMem?: { saved: Record<string, PageSeo> } }).__pageSeoMem ??= { saved: {} });
const g = globalThis as { __pageSeoCache?: { at: number; value: Record<string, PageSeo> } };

let ready: { ok: boolean; at: number } | undefined;
async function pg() {
  if ((await orderStore()).kind !== 'postgres') return false;
  if (!ready || (!ready.ok && Date.now() - ready.at > 30_000)) {
    const { error } = await createAdminClient().from('app_settings').select('key').limit(1);
    ready = { ok: !error, at: Date.now() };
  }
  return ready.ok;
}

const clean = (v: unknown): PageSeo => {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<PageSeo>;
  const out = { title: typeof o.title === 'string' ? o.title : '', description: typeof o.description === 'string' ? o.description : '' };
  return pageSeoProblem(out) ? EMPTY : out; // a bad saved value never breaks a page
};

/* Every saved override, by path, with a short cache. */
export async function allPageSeo(now = Date.now()): Promise<Record<string, PageSeo>> {
  if (g.__pageSeoCache && now - g.__pageSeoCache.at < 30_000) return g.__pageSeoCache.value;
  let value: Record<string, PageSeo> = { ...mem.saved };
  if (await pg()) {
    const { data } = await createAdminClient()
      .from('app_settings')
      .select('key, value')
      .in(
        'key',
        SEO_PAGES.map((p) => KEY(p.path)),
      );
    value = Object.fromEntries((data ?? []).map((r) => [String(r.key).slice('seo:page:'.length), clean(r.value)]));
  }
  g.__pageSeoCache = { at: now, value };
  return value;
}

/*
 * The metadata a page exports: its built-in title and description, the extras it passes (canonical, share card), and what an admin saved on
 * top. A saved title is used exactly as written (no " · SellOnBay" added), so the admin sees in the panel what Google shows.
 */
export async function pageMetadata(path: string, extra: Metadata = {}): Promise<Metadata> {
  const page = seoPage(path);
  if (!page) return extra;
  const saved = (await allPageSeo())[path] ?? EMPTY;
  const title = saved.title.trim();
  const description = saved.description.trim() || page.description;
  const changed = title || saved.description.trim();
  return {
    ...extra,
    title: title ? { absolute: title } : page.title,
    ...(description ? { description } : {}),
    // A page's own share card stays as it was unless an admin changed its words; then the card carries them too.
    ...(extra.openGraph || changed ? { openGraph: { type: 'website', siteName: SITE_NAME, ...extra.openGraph, ...(title ? { title } : {}), ...(changed && description ? { description } : {}) } } : {}),
  };
}

export async function setPageSeo(adminId: string | null, path: string, v: PageSeo): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!seoPage(path)) return { ok: false, status: 404, error: 'That page cannot be changed here.' };
  const next = { title: v.title.trim(), description: v.description.trim() };
  const bad = pageSeoProblem(next);
  if (bad) return { ok: false, status: 400, error: bad };
  g.__pageSeoCache = undefined;
  const before = (await allPageSeo())[path] ?? EMPTY;
  if (before.title === next.title && before.description === next.description) return { ok: false, status: 409, error: 'Nothing changed.' };
  if (await pg()) {
    const { error } = await createAdminClient()
      .from('app_settings')
      .upsert({ key: KEY(path), value: next, changed_by: /^[0-9a-f-]{36}$/i.test(adminId ?? '') ? adminId : null, changed_at: new Date().toISOString() });
    if (error) return { ok: false, status: 500, error: 'Could not save.' };
  } else mem.saved[path] = next;
  g.__pageSeoCache = undefined;
  await audit(adminId, 'seo_page_changed', 'settings', path, { from: before, to: next });
  try {
    revalidatePath(path);
  } catch {
    // outside a request (tests): nothing is cached to refresh
  }
  return { ok: true };
}
