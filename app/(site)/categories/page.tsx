import type { Metadata } from 'next';
import Link from 'next/link';
import { platformOf, shelfHref, shelfLabel, type Platform } from '@/lib/apps';
import { getLiveDbProducts } from '@/lib/catalog';
import { starterProducts } from '@/lib/examples';
import { MARKET_MENU } from '@/lib/marketMenu';

export const metadata: Metadata = {
  title: 'All categories',
  description: 'Every shelf and category on SellOnBay: websites, apps, digital products, developers and domains.',
  alternates: { canonical: '/categories' },
};
export const dynamic = 'force-dynamic';

const SHELF_ORDER: Platform[] = ['web', 'android', 'ios', 'webapp', 'desktop', 'digital'];

/* Every shelf with its categories and how many products each has; the phone tab bar's Categories button lands here. */
export default async function Categories() {
  const live = (await Promise.all(SHELF_ORDER.map((pl) => getLiveDbProducts(pl)))).flat();
  const ids = new Set(live.map((p) => p.id));
  const all = [...live, ...(await starterProducts()).filter((p) => !ids.has(p.id))];
  const on = (pl: Platform) => all.filter((p) => platformOf(p) === pl);
  const extra = MARKET_MENU.filter((e) => !SHELF_ORDER.includes(e.key as Platform));
  return (
    <div className="wrap mk-allcats">
      <h1>All categories</h1>
      <p className="mk-sub">Every shelf in the store, with how many products are on it today.</p>
      <div className="mk-allcats-grid">
        {SHELF_ORDER.map((pl) => {
          const items = on(pl);
          const cats = MARKET_MENU.find((e) => e.key === pl)!.groups[0].links;
          return (
            <section key={pl} className="mk-allcat" aria-labelledby={`c-${pl}`}>
              <h2 id={`c-${pl}`}>
                <Link href={shelfHref(pl)}>{shelfLabel(pl)}</Link>
              </h2>
              <p className="muted">
                {items.length} {items.length === 1 ? 'product' : 'products'}
              </p>
              <ul>
                {cats.map(([label, href]) => {
                  const n = items.filter((p) => p.cat === label).length;
                  return (
                    <li key={href}>
                      {n > 0 ? (
                        <Link href={href}>
                          {label} <span>{n}</span>
                        </Link>
                      ) : (
                        <span className="mk-allcat-none">
                          {label} <span>0</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {extra.map((e) => (
          <section key={e.key} className="mk-allcat" aria-labelledby={`c-${e.key}`}>
            <h2 id={`c-${e.key}`}>
              <Link href={e.href}>{e.label}</Link>
            </h2>
            <ul>
              {e.groups
                .flatMap((g) => g.links)
                .map(([label, href]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
