'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export type StageSite = { id: string; name: string; src: string; domain: string };

const STEP_MS = 1700;

/* The home hero picture: a browser that types the buyer's own address while the four order steps light up one by one,
   then moves on to the next site. It pauses off-screen and in a hidden tab; with reduced motion (or without JS) it shows
   the first site with every step done. */
export function HeroStage({ sites, steps }: { sites: StageSite[]; steps: string[] }) {
  const box = useRef<HTMLDivElement>(null);
  // One counter drives everything: each round lights the steps one by one, then the next site comes in.
  const per = steps.length + 1;
  const [tick, setTick] = useState(steps.length);
  const [typed, setTyped] = useState({ at: 0, n: Infinity });
  const [run, setRun] = useState(false);
  const i = Math.floor(tick / per) % sites.length;
  const step = tick % per;

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
    if (!run) return;
    const t = setInterval(() => setTick((n) => n + 1), STEP_MS);
    return () => clearInterval(t);
  }, [run]);

  const site = sites[i];
  // The address types itself again each time a new site comes in.
  const shown = typed.at === tick - step ? typed.n : tick < per ? Infinity : 0;
  useEffect(() => {
    if (!run || !site || shown >= site.domain.length) return;
    const t = setTimeout(() => setTyped({ at: tick - step, n: shown + 1 }), 55);
    return () => clearTimeout(t);
  }, [run, site, shown, tick, step]);
  const typedLen = Math.min(shown, site?.domain.length ?? 0);

  if (!site) return null;
  return (
    <div className="mk-stage" ref={box} aria-hidden="true">
      <div className="mk-stage-win">
        <div className="mk-stage-bar">
          <i />
          <i />
          <i />
          <span className="mk-stage-url">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <span>{site.domain.slice(0, typedLen)}</span>
            {typedLen < site.domain.length && <span className="mk-stage-caret" />}
          </span>
          <span className={'mk-stage-live' + (step >= steps.length ? ' on' : '')}>Live</span>
        </div>
        <div className="mk-stage-view">
          {sites.map((s, n) => (
            <Image
              key={s.id}
              src={s.src}
              alt=""
              fill
              sizes="(max-width: 1023px) 90vw, 560px"
              className={n === i ? 'on' : ''}
              style={{ objectFit: 'cover', objectPosition: '50% 0%' }}
              priority={n === 0}
            />
          ))}
        </div>
      </div>
      <ol className="mk-stage-steps">
        {steps.map((s, n) => (
          <li key={s} className={n < step ? 'done' : n === step ? 'now' : ''}>
            <i>{n + 1}</i>
            {s}
          </li>
        ))}
      </ol>
      <span className="mk-stage-name">{site.name}</span>
    </div>
  );
}
