import type { MetadataRoute } from 'next';
import { getLiveDbProducts } from '@/lib/catalog';
import { starterProducts } from '@/lib/examples';
import { categoryPages } from '@/lib/seo/pages';
import { SITE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    '',
    '/welcome',
    '/browse',
    '/apps/android',
    '/apps/ios',
    '/apps/web',
    '/apps/desktop',
    '/apps/digital',
    '/developers',
    '/developers/join',
    '/domains',
    '/tools/site-ideas',
    '/find',
    '/how-it-works',
    '/faq',
    '/sell',
    '/terms',
    '/refunds',
    '/seller-agreement',
    '/acceptable-use',
    '/dmca',
    '/privacy',
    '/report-abuse',
  ].map((p) => ({ url: SITE_URL + p, changeFrequency: 'weekly' as const }));
  const cats = (await categoryPages()).map((x) => ({ url: `${SITE_URL}/${x.copy.group}/${x.copy.slug}`, changeFrequency: 'weekly' as const }));
  // Sellers' live listings and, while they are shown, the examples.
  const live = (await Promise.all((['web', 'android', 'ios', 'webapp', 'desktop', 'digital'] as const).map((pl) => getLiveDbProducts(pl)))).flat();
  const products = [...live, ...(await starterProducts())].filter((p, i, a) => a.findIndex((q) => q.id === p.id) === i);
  return [...pages, ...cats, ...products.map((p) => ({ url: `${SITE_URL}/product/${p.id}`, changeFrequency: 'weekly' as const }))];
}
