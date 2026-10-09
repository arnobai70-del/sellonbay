'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SHELVES, shelfHref, type AppPlatform } from '@/lib/apps';
import { Logo } from './Logo';

const APP_ORDER: AppPlatform[] = ['android', 'ios', 'webapp', 'desktop', 'digital'];
const APP_NOTE: Record<AppPlatform, string> = {
  android: 'Published on your Google Play account',
  ios: 'Published on your App Store account',
  webapp: 'Live on your own domain',
  desktop: 'Windows, Mac and Linux installers',
  digital: 'Figma kits, templates, scripts, prompts, video templates',
};
const CATS = ['Restaurants', 'Health', 'Portfolios', 'Stores', 'Landing pages', 'Real estate', 'Tools'];

const Chevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/* Top bar. Two menus (websites, app templates), three plain links, then Sell, Sign in and the main button.
   Under 1280px it becomes a hamburger that opens a full-height sheet with the same menus laid out flat. */
export function SiteNav({ active = '', dashHref }: { active?: string; dashHref?: string }) {
  const path = usePathname();
  const [sheet, setSheet] = useState(false);
  const [dd, setDd] = useState<'sites' | 'apps' | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const box = useRef<HTMLElement>(null);
  const pointer = useRef('mouse'); // what the last press was made with, so a tap toggles but a mouse click on an open menu keeps it open
  const leave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const appsActive = APP_ORDER.includes(active as AppPlatform) || active === 'apps';
  const sitesActive = active === 'browse' || active === 'find';

  useEffect(() => {
    setSheet(false);
    setDd(null);
  }, [path]);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 4);
    on();
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);
  // Menus close on Escape and on a click elsewhere; the sheet also locks the page behind it.
  useEffect(() => {
    if (!dd && !sheet) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDd(null);
        setSheet(false);
      }
    };
    const out = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setDd(null);
    };
    addEventListener('keydown', key);
    addEventListener('mousedown', out);
    return () => {
      removeEventListener('keydown', key);
      removeEventListener('mousedown', out);
    };
  }, [dd, sheet]);
  useEffect(() => {
    document.documentElement.classList.toggle('sheet-open', sheet);
    return () => document.documentElement.classList.remove('sheet-open');
  }, [sheet]);

  const cur = (k: string) => (k === active ? ('page' as const) : undefined);
  const done = () => {
    setDd(null);
    setSheet(false);
  };
  /* With a mouse on a wide screen a menu opens when the pointer arrives and closes a moment after it leaves. Touch and keyboard still use the button. */
  const hoverOpen = (k: 'sites' | 'apps') => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !matchMedia('(min-width: 1280px)').matches) return;
    clearTimeout(leave.current);
    setDd(k);
  };
  const hoverClose = (k: 'sites' | 'apps') => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(leave.current);
    leave.current = setTimeout(() => setDd((v) => (v === k ? null : v)), 220);
  };
  const menu = (k: 'sites' | 'apps', label: string, current: boolean, body: React.ReactNode) => (
    <div
      className={'hdr-dd' + (dd === k ? ' open' : '')}
      onPointerEnter={hoverOpen(k)}
      onPointerLeave={hoverClose(k)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDd((v) => (v === k ? null : v));
      }}
    >
      <button
        type="button"
        className="hdr-link hdr-dd-btn"
        aria-expanded={dd === k}
        aria-haspopup="true"
        aria-current={current ? 'page' : undefined}
        onPointerDown={(e) => (pointer.current = e.pointerType)}
        onClick={(e) => setDd((v) => (e.detail > 0 && pointer.current === 'mouse' && matchMedia('(min-width: 1280px)').matches ? k : v === k ? null : k))} // detail 0 is a key press: that toggles
      >
        {label}
        <Chevron />
      </button>
      <div className={'hdr-menu hdr-menu-' + k}>{body}</div>
    </div>
  );

  return (
    <header ref={box} className={'hdr' + (sheet ? ' open' : '') + (scrolled ? ' scrolled' : '')}>
      <div className="wrap hdr-in">
        <Logo />
        <nav className="hdr-nav" id="hdr-nav" aria-label="Main">
          {menu(
            'sites',
            'Browse sites',
            sitesActive,
            <>
              <Link className="hdr-all" href="/browse" aria-current={cur('browse')} onClick={done}>
                <b>All websites</b>
                <span>Ready-made sites for any business</span>
              </Link>
              <p className="hdr-h">By business</p>
              <div className="hdr-cats">
                {CATS.map((c) => (
                  <Link key={c} href={`/browse?cat=${encodeURIComponent(c)}`} onClick={done}>
                    {c}
                  </Link>
                ))}
              </div>
              <Link className="hdr-foot" href="/" onClick={done}>
                <b>Explore everything</b>
                <span>Websites, apps and digital products in one store</span>
              </Link>
              <Link className="hdr-foot" href="/find" aria-current={cur('find')} onClick={done}>
                <b>Not sure? Find your site</b>
                <span>Three questions, one pick</span>
              </Link>
            </>,
          )}
          {menu(
            'apps',
            'App templates',
            appsActive,
            <>
              {APP_ORDER.map((k) => (
                <Link key={k} className="hdr-row" data-tone={SHELVES[k].tone} href={shelfHref(k)} aria-current={cur(k)} onClick={done}>
                  <i aria-hidden="true" />
                  <span>
                    <b>{SHELVES[k].label}</b>
                    <small>{APP_NOTE[k]}</small>
                  </span>
                </Link>
              ))}
            </>,
          )}
          <Link className="hdr-link" href="/developers" aria-current={cur('dev')} onClick={done}>
            Hire a developer
          </Link>
          <Link className="hdr-link" href="/domains" aria-current={cur('domains')} onClick={done}>
            Domains
          </Link>
          <Link className="hdr-link" href="/how-it-works" aria-current={cur('how')} onClick={done}>
            How it works
          </Link>
          <div className="hdr-sheet-cta">
            <Link className="btn btn-line" href={dashHref ?? '/login'} onClick={done}>
              {dashHref ? 'My dashboard' : 'Sign in'}
            </Link>
            <Link className="btn btn-gold" href="/sell" onClick={done}>
              Sell on SellOnBay
            </Link>
          </div>
        </nav>
        <div className="hdr-end">
          <Link className="hdr-signin" href={dashHref ?? '/login'}>
            {dashHref ? 'My dashboard' : 'Sign in'}
          </Link>
          <div className="hdr-cta" role="group" aria-label="Start">
            <Link className="hdr-cta-b" href="/browse">
              Find a site
            </Link>
            <Link className="hdr-cta-s" href="/sell" aria-current={cur('sell')}>
              Sell a site
            </Link>
          </div>
        </div>
        <button type="button" className="hdr-toggle" aria-label={sheet ? 'Close menu' : 'Open menu'} aria-expanded={sheet} aria-controls="hdr-nav" onClick={() => setSheet((o) => !o)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {sheet ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
    </header>
  );
}
