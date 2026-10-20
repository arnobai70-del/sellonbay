'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SHELF_OPTIONS } from '@/lib/storeShelves';

/* The big search on the home page: pick a shelf, type, and land on that shelf with the words already in its search. */
export function HeroSearch() {
  const router = useRouter();
  const [shelf, setShelf] = useState('/browse');
  const [q, setQ] = useState('');
  return (
    <form
      className="mk-hsearch"
      role="search"
      aria-label="Search the store"
      onSubmit={(e) => {
        e.preventDefault();
        const t = q.trim();
        router.push(shelf + (t ? '?q=' + encodeURIComponent(t) : ''));
      }}
    >
      <label className="sr-only" htmlFor="mk-hq">
        What are you looking for?
      </label>
      <input id="mk-hq" type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try restaurant, invoice app or Figma kit" autoComplete="off" />
      <label className="sr-only" htmlFor="mk-hshelf">
        Where to search
      </label>
      <select id="mk-hshelf" value={shelf} onChange={(e) => setShelf(e.target.value)}>
        {SHELF_OPTIONS.map(([href, label]) => (
          <option key={href} value={href}>
            {label}
          </option>
        ))}
      </select>
      <button className="btn btn-gold" type="submit">
        Search
      </button>
    </form>
  );
}
