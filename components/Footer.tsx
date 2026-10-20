import Link from 'next/link';
import { BRAND_NAME } from '@/lib/brand';
import { CONFIG, REVIEW_HOURS, pct } from '@/lib/config';
import { Logo } from './Logo';

/* The big footer: what we promise, then short columns by what a person wants to do, a call to sellers, and one line of legal links. */
const COLUMNS: { title: string; links: [label: string, href: string][] }[] = [
  {
    title: 'Shop',
    links: [
      ['Websites', '/browse'],
      ['Android apps', '/apps/android'],
      ['iPhone & iPad apps', '/apps/ios'],
      ['Web apps', '/apps/web'],
      ['Desktop apps', '/apps/desktop'],
      ['Digital products', '/apps/digital'],
      ['All categories', '/categories'],
    ],
  },
  {
    title: 'Services',
    links: [
      ['Hire a developer', '/developers'],
      ['Find a domain', '/domains'],
      ['Find your site', '/find'],
      ['Free site ideas', '/tools/site-ideas'],
    ],
  },
  {
    title: 'Sell',
    links: [
      ['Sell on SellOnBay', '/sell'],
      ['Become a developer', '/developers/join'],
      ['Seller dashboard', '/dashboard/seller'],
      ['Seller agreement', '/seller-agreement'],
    ],
  },
  {
    title: 'Help',
    links: [
      ['How it works', '/how-it-works'],
      ['Questions and answers', '/faq'],
      ['Messages', '/messages'],
      ['Refunds', '/refunds'],
      ['Report abuse', '/report-abuse'],
      ['Copyright complaints', '/dmca'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About SellOnBay', '/welcome'],
      ['Blog', '/blog'],
      ['Acceptable use', '/acceptable-use'],
    ],
  },
];

const LEGAL: [label: string, href: string][] = [
  ['Terms of service', '/terms'],
  ['Privacy policy', '/privacy'],
  ['Your data', '/account/privacy'],
];

export function Footer() {
  return (
    <footer className="mk-foot">
      <div className="wrap">
        <div className="mk-foot-top">
          <div className="mk-foot-brand">
            <Logo />
            <p>A marketplace for ready-made websites, apps and digital products, and the developers who make them yours.</p>
            <ul className="mk-foot-trust">
              <li>Payment held in escrow until you accept</li>
              <li>{REVIEW_HOURS} hours to check what you got</li>
              <li>Domains and accounts in your name</li>
            </ul>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="mk-foot-h">{c.title}</p>
              <ul>
                {c.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mk-foot-sell">
          <div>
            <b>Built something people need?</b>
            <span>
              Sell it again and again. You keep {pct(10_000 - CONFIG.fees.saleBps)} of every sale from ${CONFIG.fees.saleLowBelowCents / 100}.
            </span>
          </div>
          <Link className="btn btn-gold" href="/sell">
            Start selling
          </Link>
        </div>
        <div className="mk-foot-base">
          <span>&copy; 2026 {BRAND_NAME}. All rights reserved.</span>
          <nav aria-label="Legal">
            {LEGAL.map(([label, href]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
