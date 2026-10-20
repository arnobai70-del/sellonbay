import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { AppArt } from '@/components/AppPhone';
import { HeroSearch } from '@/components/HeroSearch';
import { SaveButton } from '@/components/SaveButton';
import { ScaledPage } from '@/components/ScaledPage';
import { StoreMotion } from '@/components/StoreMotion';
import { TemplatePage } from '@/components/TemplatePage';
import { Tilt } from '@/components/Tilt';
import { SHELVES, isApp, platformOf, shelfHref, shelfLabel, type AppPlatform, type Platform } from '@/lib/apps';
import { getLiveDbProducts } from '@/lib/catalog';
import { SHOW_LIST_PRICES } from '@/lib/config';
import { CONFIG, PAYOUT_HOLD_DAYS, REVIEW_HOURS, pct } from '@/lib/config';
import { daysLabel, imageFor, isNew, money, type Product } from '@/lib/data';
import { AREAS } from '@/lib/developers';
import { starterProducts } from '@/lib/examples';
import { getSeo } from '@/lib/seo/site';

const HOME_DESCRIPTION = 'Websites, apps and digital products in one place. Look at the real thing before you pay; your money is held until you accept.';

/* The admin can set the title and description Google shows, and the Search Console and Bing codes, at /dashboard/admin/seo. */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo();
  const description = seo.homeDescription || HOME_DESCRIPTION;
  return {
    ...(seo.homeTitle ? { title: { absolute: seo.homeTitle } } : {}),
    description,
    alternates: { canonical: '/' },
    openGraph: { description, ...(seo.homeTitle ? { title: seo.homeTitle } : {}) },
    verification: {
      ...(seo.googleVerification ? { google: seo.googleVerification } : {}),
      ...(seo.bingVerification ? { other: { 'msvalidate.01': seo.bingVerification } } : {}),
    },
  };
}
export const dynamic = 'force-dynamic';

const TABS = [
  ['popular', 'Popular'],
  ['new', 'New'],
  ['top', 'Top rated'],
] as const;
type Tab = (typeof TABS)[number][0];

const SHELF_ORDER: Platform[] = ['web', 'android', 'ios', 'webapp', 'desktop', 'digital'];
const TILE_NOTE: Record<Platform, string> = {
  web: 'Live on your own domain',
  android: 'On your Google Play',
  ios: 'On your App Store',
  webapp: 'Deployed for you',
  desktop: 'Windows, Mac and Linux',
  digital: 'Files the moment you pay',
};
const AREA_NOTE: Record<(typeof AREAS)[number], string> = {
  Websites: 'A new page, a booking form, your own words',
  'Web apps': 'Features, logins and dashboards',
  'Android apps': 'Your brand, store listing and updates',
  'iPhone & iPad apps': 'Rebrand, publish and keep it current',
  'Desktop apps': 'Installers and new features',
  'Online stores': 'Products, payments and shipping',
  'Bug fixes': 'Something broke? Get it fixed',
  'Customise a template': 'Make a bought site truly yours',
};

/* A small glyph per shelf and kind of work, drawn here so no brand logo is used. */
function Glyph({ k, size = 28 }: { k: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
  switch (k) {
    case 'web':
    case 'Websites':
    case 'Customise a template':
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <path d="M3 9h18M7 6.5h.01M10 6.5h.01" />
        </svg>
      );
    case 'android':
    case 'ios':
    case 'Android apps':
    case 'iPhone & iPad apps':
      return (
        <svg {...p}>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M11 18.5h2" />
        </svg>
      );
    case 'webapp':
    case 'Web apps':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
        </svg>
      );
    case 'desktop':
    case 'Desktop apps':
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      );
    case 'Online stores':
      return (
        <svg {...p}>
          <path d="M6 7h12l-1 13H7L6 7zM9 7a3 3 0 0 1 6 0" />
        </svg>
      );
    case 'Bug fixes':
      return (
        <svg {...p}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />
        </svg>
      );
    case 'dev':
      return (
        <svg {...p}>
          <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
        </svg>
      );
    case 'domains':
      return (
        <svg {...p}>
          <path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5L12 12l8-4.5M12 12v9" />
        </svg>
      );
  }
}

/* A big picture of the product, the same one the browse cards use: the site's own page, the app on a phone or in a window, or the files of a digital product. */
function Cover({ p, sizes = '(max-width: 640px) 100vw, 380px', badges = false }: { p: Product; sizes?: string; badges?: boolean }) {
  const app = isApp(p);
  const img = app ? undefined : imageFor(p.id);
  const shot = p.shots?.[0];
  const wide = app && SHELVES[platformOf(p) as AppPlatform].delivery !== 'store';
  return (
    <span
      className={'tc-shot ex-cover' + (app ? ' app-shot' : '') + (wide ? ' wide' : '')}
      style={app && p.app ? { background: `linear-gradient(165deg, ${p.app.accent}33, ${p.app.bg})` } : undefined}
    >
      {app ? (
        shot ? (
          <span className="ap-real">
            <Image src={shot} alt="" fill sizes="200px" unoptimized style={{ objectFit: 'cover', objectPosition: 'top' }} />
          </span>
        ) : (
          <AppArt p={p} />
        )
      ) : img ? (
        <Image className="tc-img" src={img.src} alt="" fill sizes={sizes} style={{ objectFit: 'cover', objectPosition: '50% 0%' }} />
      ) : (
        <span className="tc-pan" aria-hidden="true">
          <ScaledPage>
            <TemplatePage p={p} />
          </ScaledPage>
        </span>
      )}
      {badges && <span className="ex-plat">{shelfLabel(platformOf(p))}</span>}
      {badges && (p.example ? <span className="ex-new ex-eg">Example</span> : isNew(p) && <span className="ex-new">New</span>)}
    </span>
  );
}

function Card({ p }: { p: Product }) {
  return (
    <Tilt className="ex-tilt" max={6}>
      <div className="pwrap ex-card">
        <Link href={`/product/${p.id}`} className="ex-card-in">
          <Cover p={p} badges />
          <b className="ex-name">{p.name}</b>
          <span className="ex-sub">{p.tag}</span>
          <span className="ex-rate">
            {p.reviews > 0 ? (
              <>
                <span className="star">★</span> {p.rating} ({p.reviews})
              </>
            ) : (
              'No reviews yet'
            )}
          </span>
          <span className="ex-foot">
            {SHOW_LIST_PRICES && <span className="ex-price">{money(p.price)}</span>}
            <span className="chip">{daysLabel(p.days)}</span>
          </span>
        </Link>
        <SaveButton id={p.id} name={p.name} />
      </div>
    </Tilt>
  );
}

/* Shelves and categories with the most products, as collections of three pictures. */
type Collection = { key: string; title: string; href: string; items: Product[]; count: number };
function collections(all: Product[]): Collection[] {
  const by = new Map<string, Collection>();
  for (const p of all) {
    if (!p.cat) continue;
    const pl = platformOf(p);
    const key = `${pl}:${p.cat}`;
    const c = by.get(key) ?? {
      key,
      title: pl === 'web' ? `${p.cat} websites` : `${p.cat}: ${shelfLabel(pl).toLowerCase()}`,
      href: `${shelfHref(pl)}?cat=${encodeURIComponent(p.cat)}`,
      items: [],
      count: 0,
    };
    c.items.push(p);
    c.count++;
    by.set(key, c);
  }
  return [...by.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)).slice(0, 6);
}

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const asked = (await searchParams).tab;
  const tab: Tab = TABS.find((t) => t[0] === asked)?.[0] ?? 'popular';
  const live = (await Promise.all(SHELF_ORDER.map((pl) => getLiveDbProducts(pl)))).flat();
  const ids = new Set(live.map((p) => p.id));
  const all = [...live, ...(await starterProducts()).filter((p) => !ids.has(p.id))];
  const count = (pl: Platform) => all.filter((p) => platformOf(p) === pl).length;
  const sorted = [...all].sort((a, b) => (tab === 'new' ? b.added.localeCompare(a.added) : tab === 'top' ? b.rating * Math.log(b.reviews + 2) - a.rating * Math.log(a.reviews + 2) : b.sold - a.sold));
  const featured = sorted.slice(0, 8);
  const pictured = all.filter((p) => !isApp(p) && imageFor(p.id)).slice(0, 2);
  const sets = collections(all);
  const keep = (bps: number) => pct(10_000 - bps);

  return (
    <div className="mk-home">
      <StoreMotion />
      <section className="mk-hero" aria-labelledby="mk-h1">
        <div className="wrap mk-hero-in">
          <div className="mk-hero-copy">
            <h1 id="mk-h1">Websites, apps and digital products, ready to use</h1>
            <p>Built once by real developers and made yours: your name, your domain, your store accounts. Look at the real thing before you pay.</p>
            <HeroSearch />
            <ul className="mk-hero-points">
              <li>Payment held in escrow until you accept</li>
              <li>{REVIEW_HOURS} hours to check it</li>
              <li>
                Live in {CONFIG.delivery.minDays} to {CONFIG.delivery.maxDays} days
              </li>
            </ul>
          </div>
          {pictured.length > 0 && (
            <div className="mk-hero-art" aria-hidden="true">
              {pictured.map((p, i) => (
                <span key={p.id} className="mk-hero-shot" data-i={i}>
                  <Cover p={p} sizes="280px" />
                </span>
              ))}
              <span className="mk-hero-badge">
                <b>Held in escrow</b>
                <small>The seller is paid after you accept</small>
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="wrap mk-sec" aria-labelledby="mk-kinds">
        <div className="mk-head">
          <h2 id="mk-kinds">Every kind of product, for every kind of business</h2>
          <Link className="link-u" href="/categories">
            All categories
          </Link>
        </div>
        <div className="mk-tiles" data-rise>
          {SHELF_ORDER.map((pl) => (
            <Link key={pl} href={shelfHref(pl)} className="mk-tile" data-k={pl}>
              <span className="mk-tile-art">
                <Glyph k={pl} size={34} />
              </span>
              <b>{shelfLabel(pl)}</b>
              <small>
                {count(pl)} {count(pl) === 1 ? 'product' : 'products'}
              </small>
              <small className="mk-tile-note">{TILE_NOTE[pl]}</small>
            </Link>
          ))}
          <Link href="/developers" className="mk-tile" data-k="dev">
            <span className="mk-tile-art">
              <Glyph k="dev" size={34} />
            </span>
            <b>Hire a developer</b>
            <small>Fixed prices, paid into escrow</small>
            <small className="mk-tile-note">Changes, fixes and new builds</small>
          </Link>
          <Link href="/domains" className="mk-tile" data-k="domains">
            <span className="mk-tile-art">
              <Glyph k="domains" size={34} />
            </span>
            <b>Domains</b>
            <small>Search an address</small>
            <small className="mk-tile-note">Registered in your name</small>
          </Link>
        </div>
      </section>

      <section className="mk-band" aria-labelledby="mk-made">
        <div className="wrap">
          <div className="mk-head">
            <div>
              <h2 id="mk-made">Make it yours with a developer</h2>
              <p className="mk-sub">Fixed packages, a small paid trial, and the money held until you accept the work.</p>
            </div>
            <Link className="link-u" href="/developers">
              All developers
            </Link>
          </div>
          <div className="mk-row" data-rise>
            {AREAS.map((a) => (
              <Link key={a} className="mk-svc" href={`/developers?area=${encodeURIComponent(a)}`}>
                <span className="mk-svc-ico">
                  <Glyph k={a} size={24} />
                </span>
                <b>{a}</b>
                <small>{AREA_NOTE[a]}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {sets.length > 0 && (
        <section className="wrap mk-sec" aria-labelledby="mk-sets">
          <div className="mk-head">
            <h2 id="mk-sets">Collections</h2>
            <Link className="link-u" href="/categories">
              See every category
            </Link>
          </div>
          <div className="mk-sets" data-rise>
            {sets.map((c) => (
              <Link key={c.key} href={c.href} className="mk-set">
                <span className={'mk-set-pics n' + Math.min(c.items.length, 3)}>
                  {c.items.slice(0, 3).map((p) => (
                    <span key={p.id} className="mk-set-pic">
                      <Cover p={p} sizes="300px" />
                    </span>
                  ))}
                </span>
                <b>{c.title}</b>
                <small>
                  {c.count} {c.count === 1 ? 'product' : 'products'}
                </small>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="wrap mk-sec" aria-labelledby="ex-feat">
        <div className="mk-head">
          <h2 id="ex-feat">Featured products</h2>
          <Link className="link-u" href="/browse">
            Browse everything
          </Link>
        </div>
        <div className="ex-tabs" role="tablist" aria-label="Order">
          {TABS.map(([k, label]) => (
            <Link key={k} href={k === 'popular' ? '/' : `/?tab=${k}`} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : undefined} scroll={false}>
              {label}
            </Link>
          ))}
        </div>
        <div className="ex-grid mk-grid" data-rise>
          {featured.map((p) => (
            <Card key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="mk-why" aria-labelledby="mk-why-h">
        <div className="wrap">
          <h2 id="mk-why-h">Why people buy on SellOnBay</h2>
          <div className="mk-why-cols" data-rise>
            <div className="mk-why-col">
              <span className="mk-why-art" data-a="look" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <h3>Look before you pay</h3>
              <p>Click through the live site or try the app first. What you see is what the seller delivers.</p>
            </div>
            <div className="mk-why-col">
              <span className="mk-why-art" data-a="hold" aria-hidden="true">
                <i />
              </span>
              <h3>Your money waits for you</h3>
              <p>Payment stays in escrow. You get {REVIEW_HOURS} hours to check the work, and a fair dispute if something is wrong.</p>
            </div>
            <div className="mk-why-col">
              <span className="mk-why-art" data-a="yours" aria-hidden="true">
                <i />
                <i />
              </span>
              <h3>Made to be yours</h3>
              <p>Domains and store accounts are in your name. Need changes? Order them from the seller or hire a developer.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap mk-sec" aria-labelledby="mk-steps">
        <h2 id="mk-steps" className="mk-steps-h">
          How a purchase goes
        </h2>
        <ol className="mk-steps" data-rise>
          <li>
            <b>Pick it</b>
            <span>Find a site, app or file and look at the live demo.</span>
          </li>
          <li>
            <b>Pay into escrow</b>
            <span>Your money is held. The seller cannot touch it yet.</span>
          </li>
          <li>
            <b>Get it delivered</b>
            <span>
              Live on your domain or accounts in {CONFIG.delivery.minDays} to {CONFIG.delivery.maxDays} days. Files arrive at once.
            </span>
          </li>
          <li>
            <b>Check and accept</b>
            <span>
              You have {REVIEW_HOURS} hours. The seller is paid {PAYOUT_HOLD_DAYS} days after you accept.
            </span>
          </li>
        </ol>
      </section>

      <section className="mk-sellband" aria-labelledby="mk-sell-h">
        <div className="wrap mk-sellband-in">
          <div>
            <h2 id="mk-sell-h">Build once, sell it again and again</h2>
            <p>
              Upload a site, app or digital product once and deliver it to many buyers. You keep {keep(CONFIG.fees.saleBps)} of every sale from ${CONFIG.fees.saleLowBelowCents / 100} and{' '}
              {keep(CONFIG.fees.saleLowBps)} below it; custom and extra work keep {keep(CONFIG.fees.customBps)}.
            </p>
          </div>
          <div className="mk-sellband-cta">
            <Link className="btn btn-gold btn-lg" href="/sell">
              Start selling
            </Link>
            <Link className="btn btn-line btn-lg" href="/developers/join">
              Join as a developer
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
