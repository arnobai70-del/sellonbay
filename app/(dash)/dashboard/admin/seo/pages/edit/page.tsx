import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminForm } from '@/components/AdminForm';
import { DashShell } from '@/components/DashShell';
import { PageWordsForm } from '@/components/PageWordsForm';
import { PAGE_SEO_GOOD, PAGE_SEO_MAX, PAGE_WORDS_MAX, seoPage } from '@/lib/seo/pageList';
import { allPageSeo } from '@/lib/seo/pageMeta';
import { allPageWords } from '@/lib/seo/pageWords';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { requireViewer } from '@/lib/supabase/viewer';

export const metadata: Metadata = { title: 'Edit a page', robots: { index: false } };
export const dynamic = 'force-dynamic';

/* One page at a time: what Google shows (meta title and description) and what visitors read (heading, intro, policy text). */
export default async function EditPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const { path = '' } = await searchParams;
  const viewer = await requireViewer({ path: `/dashboard/admin/seo/pages/edit?path=${encodeURIComponent(path)}`, roles: ['admin'] });
  const page = seoPage(path);
  if (!page) notFound();
  const [seo, words] = await Promise.all([allPageSeo(0), allPageWords(0)]);
  const s = seo[path] ?? { title: '', description: '' };
  const w = words[path] ?? { heading: '', intro: '', body: '' };
  return (
    <DashShell name={viewer?.name} signedIn={!!viewer} viewerRole={viewer?.role} role="admin" active="admin-seo" title={page.name}>
      <div className="dp">
        <div className="hd">
          <div>
            <h2>{page.name}</h2>
            <p className="sub">
              <a href={path} target="_blank" rel="noopener">
                {SITE_URL.replace(/^https?:\/\//, '')}
                {path}
              </a>
            </p>
          </div>
          <Link className="btn btn-line btn-sm" href="/dashboard/admin/seo/pages">
            All pages
          </Link>
        </div>
        <h3 className="pw-h">In Google</h3>
        <div className="pe-serp">
          <span className="pe-st">{s.title || `${page.title} · ${SITE_NAME}`}</span>
          <span className="pe-sd">{s.description || page.description || 'The site-wide description (this page has none of its own yet).'}</span>
        </div>
        <AdminForm
          endpoint="/api/admin/seo/pages"
          fixed={{ path }}
          open
          fields={[
            {
              name: 'title',
              label: 'Meta title',
              kind: 'text',
              value: s.title,
              max: PAGE_SEO_MAX.title,
              hint: `About ${PAGE_SEO_GOOD.title} characters show in Google. Empty = "${page.title} · ${SITE_NAME}".`,
            },
            {
              name: 'description',
              label: 'Meta description',
              kind: 'textarea',
              value: s.description,
              max: PAGE_SEO_MAX.description,
              hint: `About ${PAGE_SEO_GOOD.description} characters show. Empty = the built-in words.`,
            },
          ]}
          submit="Save meta title and description"
        />
      </div>
      <div className="dp">
        <div className="hd">
          <div>
            <h2>On the page</h2>
            <p className="sub">
              {page.words
                ? page.words.body
                  ? 'The heading and the whole text of this page. Leave a box empty to keep the built-in words.'
                  : 'The heading and the line under it. The rest of this page is built from live parts (lists, prices, forms) and stays as it is.'
                : 'This page is built from live parts (products, developers, counts), so only its meta title and description can be changed here.'}
            </p>
          </div>
        </div>
        {page.words && <PageWordsForm path={path} saved={w} builtIn={page.words} hasIntro={!page.words.body} hasBody={!!page.words.body} max={PAGE_WORDS_MAX} />}
      </div>
    </DashShell>
  );
}
