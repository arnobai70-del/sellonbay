'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SHELVES, shelfHref, shelfLabel, type Platform } from '@/lib/apps';
import { Logo } from './Logo';

const SHELF_ORDER: Platform[] = ['web', 'android', 'ios', 'webapp', 'desktop', 'digital'];

function Items() {
  const path = usePathname();
  const tab = useSearchParams().get('tab');
  const on = (href: string) => (href.includes('?') ? path + '?' + (tab ? 'tab=' + tab : '') === href : href === '/' ? path === '/' && !tab : path === href);
  const item = (href: string, label: string, key: string) => (
    <Link key={key} href={href} aria-current={on(href) ? 'page' : undefined}>
      {label}
    </Link>
  );
  return (
    <>
      <nav aria-label="Store">
        {item('/', 'Home', 'home')}
        {SHELF_ORDER.map((pl) => item(shelfHref(pl), shelfLabel(pl), pl))}
      </nav>
      <nav aria-label="Discover">
        {item('/?tab=new', 'New arrivals', 'new')}
        {item('/?tab=top', 'Top rated', 'top')}
      </nav>
      <nav aria-label="Help">
        {item('/developers', 'Hire a developer', 'dev')}
        {item('/domains', 'Find a domain', 'dom')}
        {item('/faq', 'Support', 'faq')}
        {item('/welcome', 'About SellOnBay', 'about')}
      </nav>
    </>
  );
}

/* The left menu of the store pages. On a phone it becomes a row you can swipe. */
export function StoreSide() {
  return (
    <aside className="st-side">
      <Logo />
      <Suspense fallback={null}>
        <Items />
      </Suspense>
      <p className="st-note">
        <b>{Object.keys(SHELVES).length + 1} shelves</b>, one safe checkout. Your payment is held until you accept.
      </p>
    </aside>
  );
}
