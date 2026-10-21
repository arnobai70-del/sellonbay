'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type DeckCard = { id: string; name: string; src: string; cat: string; days: number };

const TURN_MS = 3200;

/* The home hero picture: a fanned stack of real listings. Every few seconds the front card slides to the back and the
   next one comes forward; the dots pick a card. It pauses on hover, off-screen and in a hidden tab; with reduced motion
   (or without JS) it stays on the first card. Only the front card is a link, so keyboard users meet one stop. */
export function HeroDeck({ cards }: { cards: DeckCard[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [front, setFront] = useState(0);
  const [run, setRun] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') return;
    const el = box.current;
    if (!el) return;
    let seen = false;
    const sync = () => setRun(seen && !document.hidden);
    const io = new IntersectionObserver(([e]) => ((seen = e.isIntersecting), sync()));
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => (io.disconnect(), document.removeEventListener('visibilitychange', sync));
  }, []);

  useEffect(() => {
    if (!run || held || cards.length < 2) return;
    const t = setInterval(() => setFront((n) => (n + 1) % cards.length), TURN_MS);
    return () => clearInterval(t);
  }, [run, held, cards.length]);

  if (cards.length === 0) return null;
  return (
    <div className="mk-deck" ref={box} onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      <div className="mk-deck-stack">
        {cards.map((c, n) => {
          const pos = (n - front + cards.length) % cards.length;
          const top = pos === 0;
          const body = (
            <>
              <span className="mk-deck-pic">
                <Image src={c.src} alt="" fill sizes="(max-width: 1023px) 80vw, 440px" style={{ objectFit: 'cover', objectPosition: '50% 0%' }} priority={n === 0} />
              </span>
              <span className="mk-deck-foot">
                <span className="mk-deck-cat">{c.cat}</span>
                <span className="mk-deck-name">{c.name}</span>
                <span className="mk-deck-days">
                  Live in {c.days} {c.days === 1 ? 'day' : 'days'}
                </span>
              </span>
            </>
          );
          return (
            <Link key={c.id} href={`/product/${c.id}`} className="mk-deck-card" data-pos={Math.min(pos, 3)} tabIndex={top ? undefined : -1} aria-hidden={top ? undefined : true}>
              {body}
            </Link>
          );
        })}
      </div>
      {cards.length > 1 && (
        <div className="mk-deck-dots" role="group" aria-label="Pick a listing">
          {cards.map((c, n) => (
            <button key={c.id} type="button" aria-label={c.name} aria-pressed={n === front} onClick={() => setFront(n)} />
          ))}
        </div>
      )}
    </div>
  );
}
