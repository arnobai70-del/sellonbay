'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SHELF_OPTIONS } from '@/lib/storeShelves';
import { useList } from '@/lib/saved';
import { createClient } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/env';

/* Search with a shelf picker, the saved list, and the account link. */
export function StoreTop() {
  const router = useRouter();
  const [shelf, setShelf] = useState('/browse');
  const [q, setQ] = useState('');
  const [dash, setDash] = useState<string>();
  const saved = useList('saved').length;
  useEffect(() => {
    if (!supabaseConfigured) return;
    const sb = createClient();
    (async () => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from('profiles').select('role').eq('id', user.id).single();
      setDash('/dashboard/' + (data?.role ?? 'buyer'));
    })();
  }, []);
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(shelf + (q.trim() ? '?q=' + encodeURIComponent(q.trim()) : ''));
  };
  return (
    <header className="st-top">
      <form className="st-search" onSubmit={go} role="search">
        <label className="sr-only" htmlFor="st-q">
          Search
        </label>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input id="st-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search websites, apps and more" autoComplete="off" />
        <label className="sr-only" htmlFor="st-shelf">
          Where to search
        </label>
        <select id="st-shelf" value={shelf} onChange={(e) => setShelf(e.target.value)}>
          {SHELF_OPTIONS.map(([href, label]) => (
            <option key={href} value={href}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn btn-dark btn-sm" type="submit">
          Search
        </button>
      </form>
      <div className="st-end">
        <Link className="st-ico" href="/browse?saved=1" aria-label={`Saved sites${saved ? `, ${saved}` : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />
          </svg>
          {saved > 0 && <i>{saved}</i>}
        </Link>
        <Link className="btn btn-line btn-sm" href="/sell">
          Sell a site
        </Link>
        <Link className="btn btn-dark btn-sm" href={dash ?? '/login'}>
          {dash ? 'My dashboard' : 'Sign in'}
        </Link>
      </div>
    </header>
  );
}
