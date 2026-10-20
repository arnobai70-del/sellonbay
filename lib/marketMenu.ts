import { APP_CATS, DIGITAL_CATS, shelfHref, shelfLabel, type Platform } from './apps';
import { CATS } from './data';
import { AREAS } from './developers';

/*
 * The category bar of the top bar: one entry per shelf plus developers, domains and help.
 * Each entry opens a wide panel with a few groups of links and one feature card. Kept as plain data so the top bar,
 * the phone menu and the all-categories page show the same things, and so a test can check every link.
 */
export type MenuLink = [label: string, href: string];
export type MenuGroup = { title: string; all?: MenuLink; links: MenuLink[] };
export type MenuEntry = { key: string; label: string; href: string; groups: MenuGroup[]; feature?: { title: string; text: string; href: string; cta: string } };

const q = (href: string, k: string, v: string) => `${href}?${k}=${encodeURIComponent(v)}`;
const SHELF_ORDER: Platform[] = ['web', 'android', 'ios', 'webapp', 'desktop', 'digital'];

/* What people look for on each shelf, sent to that shelf's search. Short and plain, never a brand. */
const SEARCHES: Record<Platform, string[]> = {
  web: ['Restaurant', 'Clinic', 'Portfolio', 'Online store', 'Real estate', 'Booking', 'Landing page'],
  android: ['Fitness', 'Food delivery', 'To-do', 'Habit', 'Recipe'],
  ios: ['Travel', 'Budget', 'Notes', 'Journal', 'Planner'],
  webapp: ['Dashboard', 'Invoices', 'CRM', 'Booking', 'Inventory'],
  desktop: ['Timer', 'Notes', 'Finance', 'File tools', 'Screen'],
  digital: ['Figma', 'Notion', 'n8n', 'Zapier', 'ChatGPT', 'Premiere Pro'],
};
const BUILT_WITH: Partial<Record<Platform, string[]>> = {
  android: ['Flutter', 'React Native', 'Kotlin', 'Java'],
  ios: ['Swift', 'SwiftUI', 'Flutter', 'React Native'],
  webapp: ['Next.js', 'React', 'Vue', 'Laravel'],
  desktop: ['Electron', 'Tauri', '.NET', 'Python'],
};
const FEATURE: Record<Platform, MenuEntry['feature']> = {
  web: { title: 'Not sure which site?', text: 'Answer three questions and we suggest one.', href: '/find', cta: 'Find your site' },
  android: { title: 'On your own Google Play', text: 'The seller sends a test build first, then helps you publish under your account.', href: '/how-it-works', cta: 'How it works' },
  ios: { title: 'On your own App Store', text: 'Rebranded for you and sent as a test build before anything goes live.', href: '/how-it-works', cta: 'How it works' },
  webapp: { title: 'Deployed on your domain', text: 'Try a private test link, then it goes live under your own address.', href: '/domains', cta: 'Find a domain' },
  desktop: { title: 'Windows, Mac and Linux', text: 'Pick the systems you need. Installers are signed with your own accounts.', href: '/how-it-works', cta: 'How it works' },
  digital: { title: 'Files the moment you pay', text: 'Download through a private link with your own licence key, then check them for 48 hours.', href: '/faq', cta: 'Read the FAQ' },
};

function shelfEntry(pl: Platform): MenuEntry {
  const href = shelfHref(pl);
  const cats = pl === 'web' ? CATS.filter((c) => c !== 'All') : pl === 'digital' ? DIGITAL_CATS : APP_CATS;
  const groups: MenuGroup[] = [
    { title: pl === 'digital' ? 'Kinds' : pl === 'web' ? 'By business' : 'By use', all: [`All ${shelfLabel(pl).toLowerCase()}`, href], links: cats.map((c) => [c, q(href, 'cat', c)]) },
  ];
  const built = BUILT_WITH[pl];
  if (built) groups.push({ title: 'Built with', links: built.map((t) => [t, q(href, 'q', t)]) });
  groups.push({ title: 'Popular searches', links: SEARCHES[pl].map((s) => [s, q(href, 'q', s)]) });
  return { key: pl, label: shelfLabel(pl), href, groups, feature: FEATURE[pl] };
}

export const MARKET_MENU: MenuEntry[] = [
  ...SHELF_ORDER.map(shelfEntry),
  {
    key: 'dev',
    label: 'Hire a developer',
    href: '/developers',
    groups: [
      { title: 'Kinds of work', all: ['All developers', '/developers'], links: AREAS.map((a) => [a, q('/developers', 'area', a)]) },
      {
        title: 'For developers',
        links: [
          ['Make a developer profile', '/developers/join'],
          ['How hiring works', '/how-it-works'],
        ],
      },
    ],
    feature: { title: 'Try before a big job', text: 'Every developer offers a small paid trial, held in escrow like any order.', href: '/developers', cta: 'Meet the developers' },
  },
  {
    key: 'domains',
    label: 'Domains',
    href: '/domains',
    groups: [
      {
        title: 'Domains',
        links: [
          ['Search for a domain', '/domains'],
          ['Pick a site for it', '/browse'],
          ['Free site ideas', '/tools/site-ideas'],
        ],
      },
    ],
    feature: { title: 'Registered in your name', text: 'The domain is yours, not ours or the seller’s.', href: '/domains', cta: 'Search domains' },
  },
  {
    key: 'help',
    label: 'Help',
    href: '/faq',
    groups: [
      {
        title: 'Buying',
        links: [
          ['How it works', '/how-it-works'],
          ['Questions and answers', '/faq'],
          ['Refunds', '/refunds'],
          ['Find your site', '/find'],
        ],
      },
      {
        title: 'Selling',
        links: [
          ['Sell on SellOnBay', '/sell'],
          ['Seller agreement', '/seller-agreement'],
          ['Acceptable use', '/acceptable-use'],
        ],
      },
      {
        title: 'More',
        links: [
          ['Blog', '/blog'],
          ['About SellOnBay', '/welcome'],
          ['Report abuse', '/report-abuse'],
        ],
      },
    ],
  },
];

/* Every place the menus can send someone, for the test that keeps them all inside the site. */
export const menuLinks = (m: MenuEntry[] = MARKET_MENU): MenuLink[] =>
  m.flatMap((e) => [[e.label, e.href] as MenuLink, ...e.groups.flatMap((g) => [...(g.all ? [g.all] : []), ...g.links]), ...(e.feature ? [[e.feature.cta, e.feature.href] as MenuLink] : [])]);
