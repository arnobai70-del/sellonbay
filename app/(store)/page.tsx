import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LoopVideo } from '@/components/LoopVideo';
import { AppArt } from '@/components/AppPhone';
import { SaveButton } from '@/components/SaveButton';
import { ScaledPage } from '@/components/ScaledPage';
import { TemplatePage } from '@/components/TemplatePage';
import { Tilt } from '@/components/Tilt';
import { SHELVES, isApp, platformOf, shelfHref, shelfLabel, type AppPlatform, type Platform } from '@/lib/apps';
import { getLiveDbProducts } from '@/lib/catalog';
import { starterProducts } from '@/lib/examples';
import { CONFIG, REVIEW_HOURS } from '@/lib/config';
import { daysLabel, imageFor, isNew, money, type Product } from '@/lib/data';

export const metadata: Metadata = {
  description: 'Websites, apps and digital products in one place. Look at the real thing before you pay; your money is held until you accept.',
};
export const dynamic = 'force-dynamic';

const TABS = [
  ['popular', 'Popular'],
  ['new', 'New'],
  ['top', 'Top rated'],
] as const;
type Tab = (typeof TABS)[number][0];

const SHELF_ORDER: Platform[] = ['web', 'android', 'ios', 'webapp', 'desktop', 'digital'];
const TILE_NOTE: Record<Platform, string> = {
  web: 'Live on your domain',
  android: 'On your Google Play',
  ios: 'On your App Store',
  webapp: 'Deployed for you',
  desktop: 'Windows, Mac, Linux',
  digital: 'Files at once',
};

/* A small glyph per shelf, drawn here so no brand logo is used. */
function Glyph({ k }: { k: Platform }) {
  const p = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
  switch (k) {
    case 'web':
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <path d="M3 9h18M7 6.5h.01M10 6.5h.01" />
        </svg>
      );
    case 'android':
    case 'ios':
      return (
        <svg {...p}>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M11 18.5h2" />
        </svg>
      );
    case 'webapp':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
        </svg>
      );
    case 'desktop':
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
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

function Thumb({ p }: { p: Product }) {
  const img = imageFor(p.id);
  if (p.app)
    return (
      <span className="ex-ico" style={{ background: `linear-gradient(160deg, ${p.app.accent}, ${p.app.accent}cc)` }}>
        {p.app.glyph}
      </span>
    );
  if (img) return <Image className="ex-ico ex-ico-img" src={img.src} alt="" width={64} height={64} style={{ objectFit: 'cover', objectPosition: 'top' }} />;
  return (
    <span className="ex-ico" style={{ background: 'linear-gradient(160deg, var(--cobalt), #6F7BFF)' }}>
      {p.name[0]}
    </span>
  );
}

/* A big picture of the product, the same one the browse cards use: the site's own page, the app on a phone or in a window, or the files of a digital product. */
function Cover({ p }: { p: Product }) {
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
        <Image className="tc-img" src={img.src} alt="" fill sizes="(max-width: 640px) 100vw, 380px" style={{ objectFit: 'cover', objectPosition: '50% 0%' }} />
      ) : (
        <span className="tc-pan" aria-hidden="true">
          <ScaledPage>
            <TemplatePage p={p} />
          </ScaledPage>
        </span>
      )}
      <span className="ex-plat">{shelfLabel(platformOf(p))}</span>
      {p.example ? <span className="ex-new ex-eg">Example</span> : isNew(p) && <span className="ex-new">New</span>}
    </span>
  );
}

function Card({ p }: { p: Product }) {
  return (
    <Tilt className="ex-tilt" max={6}>
      <div className="pwrap ex-card">
        <Link href={`/product/${p.id}`} className="ex-card-in">
          <Cover p={p} />
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
            <span className="ex-price">{money(p.price)}</span>
            <span className="chip">{daysLabel(p.days)}</span>
          </span>
        </Link>
        <SaveButton id={p.id} name={p.name} />
      </div>
    </Tilt>
  );
}

/* The row of apps and software above the featured list: the same products as the shelves, in one line with four ways to order them. */
const ROW_TABS = [
  ['popular', 'Popular'],
  ['new', 'New arrivals'],
  ['best', 'Best sellers'],
  ['top', 'Top rated'],
] as const;
type RowTab = (typeof ROW_TABS)[number][0];
const rowOrder = (k: RowTab) => (a: Product, b: Product) =>
  k === 'new' ? b.added.localeCompare(a.added) : k === 'best' ? b.sold - a.sold : k === 'top' ? b.rating - a.rating || b.reviews - a.reviews : b.reviews - a.reviews || b.sold - a.sold;

function MiniCard({ p }: { p: Product }) {
  const store = platformOf(p) !== 'web';
  return (
    <div className="ex-mini">
      <Link href={`/product/${p.id}`} className="ex-mini-in">
        <span className="ex-mini-plat" data-pl={platformOf(p)}>
          <i aria-hidden="true" />
          {shelfLabel(platformOf(p))}
        </span>
        <Thumb p={p} />
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
        <span className="ex-sold">{p.example ? 'Example' : p.sold > 0 ? `${p.sold} sold` : store ? 'New' : ''}</span>
      </Link>
      <span className="ex-mini-foot">
        <span className="ex-price">{money(p.price)}</span>
        <Link className="ex-buy" href={`/checkout?id=${p.id}&pkg=asis`} aria-label={`Buy ${p.name}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 7h12l-1 13H7L6 7zM9 7a3 3 0 0 1 6 0" />
          </svg>
        </Link>
      </span>
    </div>
  );
}

export default async function Explore({ searchParams }: { searchParams: Promise<{ tab?: string; row?: string }> }) {
  const sp = await searchParams;
  const asked = sp.tab;
  const row: RowTab = ROW_TABS.find((t) => t[0] === sp.row)?.[0] ?? 'popular';
  const tab: Tab = TABS.find((t) => t[0] === asked)?.[0] ?? 'popular';
  const live = (await Promise.all(SHELF_ORDER.map((pl) => getLiveDbProducts(pl)))).flat();
  const ids = new Set(live.map((p) => p.id));
  const all = [...live, ...(await starterProducts()).filter((p) => !ids.has(p.id))];
  const count = (pl: Platform) => all.filter((p) => platformOf(p) === pl).length;
  const sorted = [...all].sort((a, b) => (tab === 'new' ? b.added.localeCompare(a.added) : tab === 'top' ? b.rating * Math.log(b.reviews + 2) - a.rating * Math.log(a.reviews + 2) : b.sold - a.sold));
  const featured = sorted.slice(0, 6);
  const rowItems = all
    .filter((p) => platformOf(p) !== 'web')
    .sort(rowOrder(row))
    .slice(0, 6);
  const hrefFor = (r: RowTab, t: Tab) => {
    const q = new URLSearchParams();
    if (t !== 'popular') q.set('tab', t);
    if (r !== 'popular') q.set('row', r);
    return q.size ? `/?${q}` : '/';
  };
  const rowHref = (k: RowTab) => hrefFor(k, tab);

  return (
    <div className="ex-main">
      <section className="ex-hero" aria-label="Explore everything">
        <LoopVideo className="ex-hero-video" src="/video/work-laptop.mp4" poster="/video/work-laptop-poster.webp" />
        <div className="ex-hero-shade" aria-hidden="true" />
        <div className="ex-hero-copy">
          <h1>Websites, apps and digital products, ready to use</h1>
          <p>Look at the real thing before you pay. Your money is held until you accept it, and your name goes on everything.</p>
          <Link className="btn btn-gold btn-lg" href="/browse">
            Explore websites
          </Link>
        </div>
        <ul className="ex-trust">
          <li>
            <b>Held in escrow</b>
            <span>The seller is paid only after you accept</span>
          </li>
          <li>
            <b>{REVIEW_HOURS} hours to check</b>
            <span>Then it is accepted for you</span>
          </li>
          <li>
            <b>Live in 1 to {CONFIG.delivery.maxDays} days</b>
            <span>On your own domain or accounts</span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="ex-cats">
        <div className="ex-head">
          <h2 id="ex-cats">Shop by category</h2>
          <Link className="link-u" href="/browse">
            View all websites
          </Link>
        </div>
        <div className="ex-tiles">
          {SHELF_ORDER.map((pl) => (
            <Link key={pl} href={shelfHref(pl)} className="ex-tile" data-tone={pl === 'web' ? 'cobalt' : SHELVES[pl as AppPlatform].tone}>
              <Glyph k={pl} />
              <b>{shelfLabel(pl)}</b>
              <small>
                {count(pl)} {count(pl) === 1 ? 'product' : 'products'}
              </small>
              <small className="ex-note">{TILE_NOTE[pl]}</small>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="ex-apps">
        <div className="ex-head">
          <h2 id="ex-apps">Apps and software</h2>
        </div>
        <div className="ex-tabs" role="tablist" aria-label="Order the apps">
          {ROW_TABS.map(([k, label]) => (
            <Link key={k} href={rowHref(k)} role="tab" aria-selected={row === k} className={row === k ? 'on' : undefined} scroll={false}>
              {label}
            </Link>
          ))}
        </div>
        <div className="ex-minis">
          {rowItems.map((p) => (
            <MiniCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <div className="ex-cols">
        <section aria-labelledby="ex-feat">
          <div className="ex-head">
            <h2 id="ex-feat">Featured products</h2>
          </div>
          <div className="ex-tabs" role="tablist" aria-label="Order">
            {TABS.map(([k, label]) => (
              <Link key={k} href={hrefFor(row, k)} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : undefined} scroll={false}>
                {label}
              </Link>
            ))}
          </div>
          <div className="ex-grid">
            {featured.map((p) => (
              <Card key={p.id} p={p} />
            ))}
          </div>
        </section>

        <div className="ex-right">
          <section className="ex-promo">
            <h2>Sell what you built</h2>
            <p>
              Upload once, deliver again and again, and keep {100 - CONFIG.fees.saleBps / 100}% of every sale from ${CONFIG.fees.saleLowBelowCents / 100} up.
            </p>
            <Link className="btn btn-gold btn-sm" href="/sell">
              Sell a product
            </Link>
          </section>
          <section className="ex-why">
            <h2>Why SellOnBay</h2>
            <ul>
              <li>
                <b>Real previews</b>
                <span>Click through the live site before you pay.</span>
              </li>
              <li>
                <b>Safe payments</b>
                <span>Held in escrow. A fair dispute if something is wrong.</span>
              </li>
              <li>
                <b>Your name on it</b>
                <span>Domains and store accounts are registered to you.</span>
              </li>
              <li>
                <b>Help when you need it</b>
                <span>Hire a developer for fixed-price changes.</span>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <section className="ex-banners" aria-label="Shelves">
        <Link href={shelfHref('android')} className="ex-ban" data-b="a">
          <small>Android apps</small>
          <b>Power up your Android</b>
          <span>Ready-made apps, sent to your own Google Play account.</span>
        </Link>
        <Link href={shelfHref('ios')} className="ex-ban" data-b="b">
          <small>iPhone and iPad apps</small>
          <b>Launch on the App Store</b>
          <span>Rebranded for you and sent as a test build first.</span>
        </Link>
        <Link href={shelfHref('digital')} className="ex-ban" data-b="c">
          <small>Digital products</small>
          <b>Kits, plugins and automations</b>
          <span>Get the files at once, with your own licence key.</span>
        </Link>
      </section>
    </div>
  );
}
