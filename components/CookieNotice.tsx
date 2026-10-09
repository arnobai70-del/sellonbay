'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/*
 * Cookie notice. Today the site sets only what it needs to work (the sign-in session and a few choices kept in the browser), and no advertising or tracking.
 * So this is a notice with one button, not a consent wall. If an optional cookie is ever added, this is where the choice goes.
 * Storage can be blocked or empty (private windows), so every read and write is wrapped, and the notice simply shows again.
 */
const KEY = 'lb-cookies';

export function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="cookie" role="region" aria-label="Cookies">
      <p>
        We only use the cookies the site needs to work, like keeping you signed in. No advertising, no tracking. <Link href="/privacy#cookies">What we store</Link>
      </p>
      <button
        className="btn btn-blue btn-sm"
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(KEY, '1');
          } catch {
            /* the notice will show again next time, that is fine */
          }
          setShow(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}
