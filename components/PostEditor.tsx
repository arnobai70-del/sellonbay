'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GOOD, LIMITS, descriptionOf, postProblem, seoHints, slugify, type Post } from '@/lib/postRules';

/*
 * The post editor in the admin panel: title, address, meta title and meta description with live character counts, a preview of how the post
 * looks in Google, SEO hints, and the text in simple Markdown. The server checks everything again (lib/posts.ts).
 */
type Draft = Pick<Post, 'title' | 'slug' | 'metaTitle' | 'metaDescription' | 'excerpt' | 'body' | 'coverUrl' | 'coverAlt' | 'status' | 'noindex'>;
const EMPTY: Draft = { title: '', slug: '', metaTitle: '', metaDescription: '', excerpt: '', body: '', coverUrl: '', coverAlt: '', status: 'draft', noindex: false };

function Count({ n, good, max }: { n: number; good: number; max: number }) {
  return <small className={n > good ? 'pe-over' : 'muted'}>{`${n} / ${good} shown in Google (max ${max})`}</small>;
}

export function PostEditor({ post, siteUrl, siteName }: { post: (Draft & { id: string }) | null; siteUrl: string; siteName: string }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(post ?? EMPTY);
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v, ...(k === 'title' && !slugTouched ? { slug: slugify(String(v)) } : {}) }));

  const shownTitle = (d.metaTitle || d.title || 'Post title') + ` · ${siteName}`;
  const shownDesc = descriptionOf(d) || 'The meta description you write appears here.';
  const hints = seoHints(d);

  async function save(status: Draft['status']) {
    const next = { ...d, status };
    const bad = postProblem(next);
    if (bad) return setMsg({ ok: false, text: bad });
    setBusy(true);
    setMsg(null);
    const r = await fetch('/api/admin/posts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'save', id: post?.id ?? null, ...next }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: j.error ?? 'Something went wrong.' });
    setD(next);
    setMsg({ ok: true, text: status === 'published' ? 'Saved and published.' : 'Saved as a draft.' });
    if (!post) router.replace(`/dashboard/admin/seo/post?id=${j.id}`);
    else router.refresh();
  }

  async function remove() {
    if (!post || !window.confirm('Delete this post for good?')) return;
    setBusy(true);
    const r = await fetch('/api/admin/posts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: post.id }) });
    setBusy(false);
    if (r.ok) router.replace('/dashboard/admin/seo');
    else setMsg({ ok: false, text: 'Could not delete the post.' });
  }

  return (
    <div className="pe">
      <div className="pe-main">
        <div className="field">
          <label htmlFor="pe-title">Title (the heading on the page)</label>
          <input id="pe-title" value={d.title} maxLength={LIMITS.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pe-slug">Address</label>
          <input
            id="pe-slug"
            value={d.slug}
            maxLength={LIMITS.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set('slug', slugify(e.target.value));
            }}
          />
          <small className="muted">{`${siteUrl}/blog/${d.slug || '...'}`} Changing it after publishing breaks old links.</small>
        </div>
        <div className="field">
          <label htmlFor="pe-mt">Meta title</label>
          <input id="pe-mt" value={d.metaTitle} maxLength={LIMITS.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} placeholder="Empty = the title" />
          <Count n={(d.metaTitle || d.title).length} good={GOOD.metaTitle} max={LIMITS.metaTitle} />
        </div>
        <div className="field">
          <label htmlFor="pe-md">Meta description</label>
          <textarea id="pe-md" rows={3} value={d.metaDescription} maxLength={LIMITS.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
          <Count n={d.metaDescription.length} good={GOOD.metaDescription} max={LIMITS.metaDescription} />
        </div>
        <div className="field">
          <label htmlFor="pe-ex">Short summary (shown on the blog page)</label>
          <textarea id="pe-ex" rows={2} value={d.excerpt} maxLength={LIMITS.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pe-cover">Cover picture address (https://, optional)</label>
          <input id="pe-cover" value={d.coverUrl} maxLength={500} onChange={(e) => set('coverUrl', e.target.value)} />
        </div>
        {d.coverUrl && (
          <div className="field">
            <label htmlFor="pe-alt">What the picture shows (alt text)</label>
            <input id="pe-alt" value={d.coverAlt} maxLength={LIMITS.coverAlt} onChange={(e) => set('coverAlt', e.target.value)} />
          </div>
        )}
        <div className="field">
          <label htmlFor="pe-body">Post</label>
          <textarea id="pe-body" className="pe-body" rows={22} value={d.body} maxLength={LIMITS.body} onChange={(e) => set('body', e.target.value)} />
          <small className="muted">## Heading, ### Smaller heading, **bold**, *italic*, [link text](https://...), - list item, 1. numbered item, &gt; quote, ![picture description](https://...)</small>
        </div>
        <label className="adm-check">
          <input type="checkbox" checked={d.noindex} onChange={(e) => set('noindex', e.target.checked)} />
          <span>Keep this post out of Google (noindex)</span>
        </label>
        <div className="adm-btns">
          <button className="btn btn-dark btn-sm" type="button" disabled={busy} onClick={() => save('published')}>
            {d.status === 'published' ? 'Save changes' : 'Publish'}
          </button>
          <button className="btn btn-line btn-sm" type="button" disabled={busy} onClick={() => save('draft')}>
            {d.status === 'published' ? 'Unpublish (back to draft)' : 'Save draft'}
          </button>
          {post && d.status === 'published' && (
            <a className="btn btn-line btn-sm" href={`/blog/${d.slug}`} target="_blank" rel="noopener">
              View post
            </a>
          )}
          {post && (
            <button className="btn btn-line btn-sm" type="button" disabled={busy} onClick={remove}>
              Delete
            </button>
          )}
        </div>
        {msg && (
          <p className={msg.ok ? 'adm-ok' : 'form-err'} role={msg.ok ? 'status' : 'alert'}>
            {msg.text}
          </p>
        )}
      </div>
      <aside className="pe-side">
        <b>How it looks in Google</b>
        <div className="pe-serp">
          <span className="pe-url">{`${siteUrl.replace(/^https?:\/\//, '')} › blog › ${d.slug || '...'}`}</span>
          <span className="pe-st">{shownTitle}</span>
          <span className="pe-sd">{shownDesc}</span>
        </div>
        <b>SEO check</b>
        {hints.length ? (
          <ul className="pe-hints">
            {hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : (
          <p className="adm-ok">Looks good.</p>
        )}
      </aside>
    </div>
  );
}
