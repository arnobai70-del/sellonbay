import type { MetadataRoute } from 'next';
import { publishedPosts } from '@/lib/posts';
import { listingPath } from '@/lib/seo/listingMeta';
import { SEO_PAGES } from '@/lib/seo/pageList';
import { categoryPages } from '@/lib/seo/pages';
import { liveListings } from '@/lib/seo/report';
import { SITE_URL } from '@/lib/site';

// Read on each request, so new listings and posts appear without a new build.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The home page and every page in the SEO list (lib/seo/pageList.ts), digital topics included: one list for the panel and the sitemap.
  const pages = ['', ...SEO_PAGES.map((p) => p.path)].map((p) => ({ url: SITE_URL + p, changeFrequency: 'weekly' as const }));
  const cats = (await categoryPages()).map((x) => ({ url: `${SITE_URL}/${x.copy.group}/${x.copy.slug}`, changeFrequency: 'weekly' as const }));
  // Sellers' live listings and, while they are shown, the examples.
  const products = await liveListings();
  // Published posts, except those kept out of search.
  const posts = (await publishedPosts(1000)).filter((p) => !p.noindex).map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: 'monthly' as const }));
  return [...pages, ...cats, ...products.map((p) => ({ url: SITE_URL + listingPath(p.id), changeFrequency: 'weekly' as const })), ...posts];
}
