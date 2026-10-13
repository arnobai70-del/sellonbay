import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminForm } from '@/components/AdminForm';
import { DashShell } from '@/components/DashShell';
import { allPosts, seoHints } from '@/lib/posts';
import { getSeo } from '@/lib/seo/site';
import { SITE_URL } from '@/lib/site';
import { requireViewer } from '@/lib/supabase/viewer';

export const metadata: Metadata = { title: 'SEO and blog', robots: { index: false } };
export const dynamic = 'force-dynamic';

const day = (t?: number) => (t ? new Date(t).toISOString().slice(0, 10) : '');

export default async function SeoAdmin() {
  const viewer = await requireViewer({ path: '/dashboard/admin/seo', roles: ['admin'] });
  const [posts, seo] = await Promise.all([allPosts(), getSeo(0)]);
  const live = posts.filter((p) => p.status === 'published');
  return (
    <DashShell name={viewer?.name} signedIn={!!viewer} viewerRole={viewer?.role} role="admin" active="admin-seo" title="SEO and blog">
      <div className="dp">
        <div className="hd">
          <div>
            <h2>Posts</h2>
            <p className="sub">
              Guides and news at <Link href="/blog">/blog</Link>. Each post has its own address, meta title and meta description, and goes into the sitemap and the feed when published.
            </p>
          </div>
          <Link className="btn btn-dark btn-sm" href="/dashboard/admin/seo/post">
            Write a post
          </Link>
        </div>
        {posts.length === 0 && <p className="muted">No posts yet. Posts that answer what buyers search for (for example &ldquo;how to start an online shop&rdquo;) bring visitors from Google.</p>}
        <ul className="lst">
          {posts.map((p) => {
            const hints = seoHints(p);
            return (
              <li key={p.id}>
                <div className="grow">
                  <b>
                    <Link href={`/dashboard/admin/seo/post?id=${p.id}`}>{p.title}</Link>
                  </b>
                  <small>
                    /blog/{p.slug} · {p.status === 'published' ? `published ${day(p.publishedAt)}` : 'draft'}
                    {p.noindex ? ' · kept out of Google' : ''} · {hints.length ? `${hints.length} SEO hint${hints.length > 1 ? 's' : ''}` : 'SEO looks good'}
                  </small>
                </div>
                <span className={p.status === 'published' ? 'chip mint' : 'chip'}>
                  <i />
                  {p.status === 'published' ? 'Live' : 'Draft'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="dp">
        <div className="hd">
          <div>
            <h2>Home page in Google</h2>
            <p className="sub">The title and description search engines show for {SITE_URL}. Empty uses the built-in words.</p>
          </div>
        </div>
        <div className="adm-card">
          <b>Title: {seo.homeTitle || '(built-in)'}</b>
          <p className="muted">Description: {seo.homeDescription || '(built-in)'}</p>
          <AdminForm
            endpoint="/api/admin/seo"
            fields={[
              { name: 'homeTitle', label: 'Title (about 60 characters)', kind: 'text', hint: 'Empty = the built-in title.' },
              { name: 'homeDescription', label: 'Description (about 150 to 160 characters)', kind: 'textarea', hint: 'Empty = the built-in description.' },
            ]}
            submit="Save"
            openLabel="Change them"
            tone="line"
          />
        </div>
      </div>

      <div className="dp">
        <div className="hd">
          <div>
            <h2>Google and Bing</h2>
            <p className="sub">
              To see how the site does in search, add it to Google Search Console and Bing Webmaster Tools, choose the &ldquo;HTML tag&rdquo; check, and paste the tag or its code here. Then send the
              sitemap there: {SITE_URL}/sitemap.xml
            </p>
          </div>
        </div>
        <div className="adm-card">
          <b>Google Search Console: {seo.googleVerification ? 'code saved' : 'not set'}</b>
          <AdminForm
            endpoint="/api/admin/seo"
            fields={[{ name: 'googleVerification', label: 'Tag or code from Google (empty removes it)', kind: 'text' }]}
            submit="Save"
            openLabel="Set the code"
            tone="line"
          />
        </div>
        <div className="adm-card">
          <b>Bing Webmaster Tools: {seo.bingVerification ? 'code saved' : 'not set'}</b>
          <AdminForm
            endpoint="/api/admin/seo"
            fields={[{ name: 'bingVerification', label: 'Tag or code from Bing (empty removes it)', kind: 'text' }]}
            submit="Save"
            openLabel="Set the code"
            tone="line"
          />
        </div>
      </div>

      <div className="dp">
        <div className="hd">
          <div>
            <h2>What is already in place</h2>
          </div>
        </div>
        <ul className="lst">
          {[
            ['Sitemap', `${SITE_URL}/sitemap.xml lists every page, live listing, category page and published post.`, '/sitemap.xml'],
            ['Robots file', 'Search engines are kept out of private pages (dashboard, orders, checkout, sign-in).', '/robots.txt'],
            ['Blog feed', `${live.length} published post${live.length === 1 ? '' : 's'} in the feed readers and some search tools use.`, '/blog/feed.xml'],
            ['Structured data', 'Products carry Product data with real reviews; posts carry Article data and a breadcrumb.', null],
            ['Share cards', 'Every page has a title, description and picture for Google, Facebook, LinkedIn and X.', null],
            ['Category pages', 'A category gets its own page once it has 3 or more real products, so there are no thin pages.', null],
          ].map(([t, d, href]) => (
            <li key={t}>
              <div className="grow">
                <b>{t}</b>
                <small>{d}</small>
              </div>
              {href && (
                <a className="btn btn-line btn-sm" href={href} target="_blank" rel="noopener">
                  Open
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </DashShell>
  );
}
