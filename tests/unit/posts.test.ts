import { describe, expect, it } from 'vitest';
import { auditList } from '@/lib/admin/audit';
import { markdownText, parseInline, parseMarkdown, safeHref } from '@/lib/markdown';
import { allPosts, deletePost, descriptionOf, postProblem, publishedPost, publishedPosts, savePost, seoHints, slugify, type PostInput } from '@/lib/posts';
import { getSeo, setSeo, verificationCode } from '@/lib/seo/site';

const base: PostInput = {
  title: 'How to start an online bakery shop',
  slug: '',
  metaTitle: '',
  metaDescription: '',
  excerpt: '',
  body: '## Pick a site\n\nStart with a ready-made shop.',
  coverUrl: '',
  coverAlt: '',
  status: 'draft',
  noindex: false,
};

describe('markdown in posts', () => {
  it('reads headings, lists, quotes, pictures and inline marks', () => {
    const b = parseMarkdown('# Big\n\nSome **bold** and *it* and `x`.\n\n- one\n- two\n\n1. first\n\n> said\n\n![A cake](https://img.example/cake.jpg)\n\n### Small');
    expect(b.map((x) => x.t)).toEqual(['h2', 'p', 'ul', 'ol', 'quote', 'img', 'h3']);
    expect(b[0]).toMatchObject({ t: 'h2', id: 'big' });
    expect(parseInline('a **b** c')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'b', c: [{ t: 'text', v: 'b' }] },
      { t: 'text', v: ' c' },
    ]);
  });
  it('never lets a script or a bad link through', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,x')).toBeNull();
    expect(safeHref('//evil.example')).toBeNull();
    expect(safeHref('/browse')).toEqual({ href: '/browse', external: false });
    expect(safeHref('https://example.com/a')).toEqual({ href: 'https://example.com/a', external: true });
    expect(parseInline('[click](javascript:alert(1))')).toEqual([
      { t: 'text', v: 'click' },
      { t: 'text', v: ')' },
    ]);
    const html = parseMarkdown('<script>alert(1)</script>');
    expect(html).toEqual([{ t: 'p', c: [{ t: 'text', v: '<script>alert(1)</script>' }] }]);
    expect(parseMarkdown('![x](http://insecure.example/a.png)')).toEqual([]);
  });
  it('gives repeated headings their own anchors and reads plain text', () => {
    const b = parseMarkdown('## Price\n\n## Price');
    expect(b.map((x) => (x.t === 'h2' ? x.id : ''))).toEqual(['price', 'price-2']);
    expect(markdownText('## Hi\n\n**Bold** words')).toBe('Hi Bold words');
  });
});

describe('post rules', () => {
  it('makes addresses and checks the fields', () => {
    expect(slugify('Café & Bakery: 10 tips!')).toBe('cafe-bakery-10-tips');
    expect(postProblem({ ...base, slug: 'ok-slug' })).toBeNull();
    expect(postProblem({ ...base, slug: 'Bad Slug' })).toMatch(/small letters/);
    expect(postProblem({ ...base, slug: 'a', metaTitle: 'x'.repeat(71) })).toMatch(/meta title/);
    expect(postProblem({ ...base, slug: 'a', metaDescription: 'x'.repeat(171) })).toMatch(/meta description/);
    expect(postProblem({ ...base, slug: 'a', coverUrl: 'http://x.example/a.png', coverAlt: 'a' })).toMatch(/https/);
    expect(postProblem({ ...base, slug: 'a', coverUrl: 'https://x.example/a.png' })).toMatch(/alt text/);
    expect(postProblem({ ...base, slug: 'a', body: '', status: 'published' })).toMatch(/Write the post/);
  });
  it('gives SEO hints and a description that fits in Google', () => {
    const hints = seoHints({ ...base });
    expect(hints.some((h) => h.includes('No meta description'))).toBe(true);
    expect(hints.some((h) => h.includes('words'))).toBe(true);
    const long = descriptionOf({ metaDescription: '', excerpt: '', body: 'word '.repeat(100) });
    expect(long.length).toBeLessThanOrEqual(160);
    expect(descriptionOf({ metaDescription: 'Mine.', excerpt: 'Summary', body: 'Body' })).toBe('Mine.');
  });
});

describe('saving posts', () => {
  it('a draft is hidden; publishing gives it a date it keeps; addresses are unique; every change is audited', async () => {
    const r = await savePost('admin-1', null, { ...base, slug: 'bakery-guide' }, 1_000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await publishedPost('bakery-guide')).toBeNull();
    const pub = await savePost('admin-1', r.value.id, { ...base, slug: 'bakery-guide', status: 'published', metaTitle: 'Bakery guide' }, 2_000);
    expect(pub.ok && pub.value.publishedAt).toBe(2_000);
    const edit = await savePost('admin-1', r.value.id, { ...base, slug: 'bakery-guide', status: 'published', excerpt: 'Short.' }, 3_000);
    expect(edit.ok && edit.value.publishedAt).toBe(2_000);
    expect((await publishedPost('bakery-guide'))?.excerpt).toBe('Short.');
    expect((await publishedPosts()).some((p) => p.slug === 'bakery-guide')).toBe(true);
    expect(await savePost('admin-1', null, { ...base, slug: 'bakery-guide' })).toMatchObject({ ok: false, status: 409 });
    expect(await savePost('admin-1', 'missing', { ...base, slug: 'x' })).toMatchObject({ ok: false, status: 404 });
    const actions = (await auditList(500)).filter((e) => e.targetRef === r.value.id).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['post_created', 'post_published', 'post_edited']));
    expect((await deletePost('admin-1', r.value.id)).ok).toBe(true);
    expect((await allPosts()).some((p) => p.id === r.value.id)).toBe(false);
  });
  it('fills the address from the title when it is left empty', async () => {
    const r = await savePost('admin-1', null, { ...base, title: 'Ten shop ideas for 2026' });
    expect(r.ok && r.value.slug).toBe('ten-shop-ideas-for-2026');
  });
});

describe('search settings', () => {
  it('keeps only the code from a pasted Search Console tag, refuses junk, and saves', async () => {
    expect(verificationCode('<meta name="google-site-verification" content="abc_DEF-123" />')).toBe('abc_DEF-123');
    expect(verificationCode('"><script>')).toBeNull();
    expect(await setSeo('admin-1', { googleVerification: '"><script>' })).toMatchObject({ ok: false, status: 400 });
    expect(await setSeo('admin-1', { googleVerification: '<meta name="google-site-verification" content="abc123" />', homeTitle: 'Ready-made websites' })).toEqual({ ok: true });
    expect(await getSeo(Date.now() + 60_000)).toMatchObject({ googleVerification: 'abc123', homeTitle: 'Ready-made websites' });
    expect(await setSeo('admin-1', { homeTitle: 'x'.repeat(71) })).toMatchObject({ ok: false, status: 400 });
  });
});
