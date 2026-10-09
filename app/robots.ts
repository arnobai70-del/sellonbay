import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/messages', '/checkout', '/sell/new', '/auth', '/login', '/orders', '/pay', '/account', '/notifications', '/api/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
