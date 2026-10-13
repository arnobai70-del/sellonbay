import { BRAND_NAME } from '../brand';
import { SELLER_KEEP_TEXT } from '../config';

/*
 * The public pages whose title and description an admin can change at /dashboard/admin/seo/pages, with the built-in words each page uses
 * when nothing is saved. Product pages, category pages and blog posts have their own words; the home page has its own form.
 * Pages read this through pageMetadata() in lib/seo/pageMeta.ts.
 */
export type SeoPage = { path: string; name: string; title: string; description: string };

export const SEO_PAGES: SeoPage[] = [
  { path: '/welcome', name: 'About (welcome)', title: 'Websites and apps ready for your domain', description: '' },
  {
    path: '/browse',
    name: 'Browse websites',
    title: 'Browse sites',
    description: 'Ready-made websites you can put on your own domain in 1 to 7 days. Filter by what you do, price, speed and rating, and compare side by side.',
  },
  { path: '/apps/android', name: 'Android apps', title: 'Android apps', description: 'Ready-made Android apps, rebranded and published to your own Google Play account in 1 to 7 days.' },
  { path: '/apps/ios', name: 'iPhone & iPad apps', title: 'iPhone & iPad apps', description: 'Ready-made iPhone and iPad apps, rebranded and sent to your own App Store account in 1 to 7 days.' },
  { path: '/apps/web', name: 'Web apps', title: 'Web apps', description: 'Ready-made web apps, rebranded and deployed on your own domain in 1 to 7 days.' },
  { path: '/apps/desktop', name: 'Desktop apps', title: 'Desktop apps', description: 'Ready-made desktop apps for Windows, Mac and Linux, rebranded and sent as installers in 1 to 7 days.' },
  {
    path: '/apps/digital',
    name: 'Digital products',
    title: 'Digital products',
    description: 'Figma kits, no-code templates, plugins, scripts, AI automations, chatbots, AI prompts and video templates. Files right after payment, money held in escrow until you accept.',
  },
  {
    path: '/developers',
    name: 'Hire a developer',
    title: 'Hire a developer',
    description: 'Hire a developer to customise your template, fix a bug or build a feature. Fixed prices, payment held until you accept.',
  },
  { path: '/developers/join', name: 'Become a developer', title: 'Become a developer', description: '' },
  { path: '/domains', name: 'Domains', title: 'Domain name ideas', description: 'Explore domain name ideas. Live registrar availability, registration and purchase are not yet connected.' },
  { path: '/find', name: 'Find your site', title: 'Find your site', description: 'Tell us what you do and get the best matching sites straight away.' },
  { path: '/how-it-works', name: 'How it works', title: 'How it works', description: 'Pick a site, add your domain, review it, then accept. Your money waits until the site works.' },
  { path: '/faq', name: 'Questions and answers', title: 'Questions and answers', description: '' },
  { path: '/sell', name: 'Sell a site', title: `Sell on ${BRAND_NAME}`, description: `Upload the site you built once and sell it again and again. You keep ${SELLER_KEEP_TEXT} of every sale.` },
  { path: '/blog', name: 'Blog', title: 'Blog', description: `Guides on choosing, launching and growing a website, from the ${BRAND_NAME} team.` },
  {
    path: '/tools/site-ideas',
    name: 'Free site ideas tool',
    title: 'Free website idea and domain name generator',
    description: 'Type your business in one line. Get five pages your website needs, ten domain names to try, and ready-made sites that fit. Free, no sign-up.',
  },
  { path: '/terms', name: 'Terms of service', title: 'Terms of service', description: '' },
  { path: '/privacy', name: 'Privacy policy', title: 'Privacy policy', description: '' },
  { path: '/refunds', name: 'Refunds', title: 'Refunds', description: '' },
  { path: '/acceptable-use', name: 'Acceptable use', title: 'Acceptable use', description: '' },
  { path: '/seller-agreement', name: 'Seller agreement', title: 'Seller agreement', description: '' },
  { path: '/dmca', name: 'Copyright complaints', title: 'Copyright complaints', description: '' },
  { path: '/report-abuse', name: 'Report abuse', title: 'Report abuse', description: '' },
];

export const seoPage = (path: string) => SEO_PAGES.find((p) => p.path === path);

/* Limits for what an admin saves: Google shows about 60 and 160 characters. */
export const PAGE_SEO_MAX = { title: 70, description: 170 } as const;
export const PAGE_SEO_GOOD = { title: 60, description: 160 } as const;

export type PageSeo = { title: string; description: string };
export function pageSeoProblem(v: PageSeo): string | null {
  if (typeof v.title !== 'string' || typeof v.description !== 'string') return 'Send a title and a description.';
  if (v.title.trim().length > PAGE_SEO_MAX.title) return `The title can have up to ${PAGE_SEO_MAX.title} characters.`;
  if (v.description.trim().length > PAGE_SEO_MAX.description) return `The description can have up to ${PAGE_SEO_MAX.description} characters.`;
  if (/[<>]/.test(v.title + v.description)) return 'Leave out < and >.';
  return null;
}
