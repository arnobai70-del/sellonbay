import Link from 'next/link';
import { BRAND_NAME } from '@/lib/brand';
import { Logo } from './Logo';

/* Four short columns by what a person wants to do, then one quiet line of legal links. Every page of the site keeps a way to each of them. */
const COLUMNS: { title: string; links: [label: string, href: string][] }[] = [
  {
    title: 'Marketplace',
    links: [
      ['Explore everything', '/'],
      ['Browse sites', '/browse'],
      ['Android apps', '/apps/android'],
      ['iPhone & iPad apps', '/apps/ios'],
      ['Web apps', '/apps/web'],
      ['Desktop apps', '/apps/desktop'],
      ['Digital products', '/apps/digital'],
      ['Restaurants', '/browse?cat=Restaurants'],
      ['Online stores', '/browse?cat=Stores'],
      ['Small tools', '/browse?cat=Tools'],
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
      ['List a site', '/sell'],
      ['Become a developer', '/developers/join'],
      ['Seller dashboard', '/dashboard/seller'],
      ['How it works', '/how-it-works'],
      ['Fees and payouts', '/faq#selling-a-site'],
    ],
  },
  {
    title: 'Help',
    links: [
      ['FAQ', '/faq'],
      ['Messages', '/messages'],
      ['Refunds', '/refunds'],
      ['Copyright complaints', '/dmca'],
      ['Report abuse', '/report-abuse'],
    ],
  },
];

const LEGAL: [label: string, href: string][] = [
  ['Terms of service', '/terms'],
  ['Privacy policy', '/privacy'],
  ['Your data', '/account/privacy'],
  ['Seller agreement', '/seller-agreement'],
  ['Acceptable use', '/acceptable-use'],
];

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="cols">
          <div className="foot-brand">
            <Logo />
            <p>Ready-made websites and small tools, live on your own domain in 1 to 7 days.</p>
            <ul className="foot-trust">
              <li>Payment held in escrow</li>
              <li>You review before you accept</li>
              <li>Domains registered in your name</li>
            </ul>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h4>{c.title}</h4>
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
        <div className="base">
          <span>&copy; 2026 {BRAND_NAME}. All rights reserved.</span>
          <nav className="base-legal" aria-label="Legal">
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
