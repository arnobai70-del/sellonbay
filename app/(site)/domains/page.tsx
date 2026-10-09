import type { Metadata } from 'next';
import Link from 'next/link';
import { DomainSearch } from '@/components/DomainSearch';
import { ALL_TLDS, cleanName } from '@/lib/domains';

export const metadata: Metadata = { title: 'Find a domain', description: 'Search a domain name, see the yearly price, and pick a site for it. Registered in your name, transferable any time.' };

const GET: [string, string][] = [
  ['Registered in your name', 'You are the owner on record. We never hold your domain.'],
  ['Prices up front', 'The yearly price is on the result. Renewals cost the same.'],
  ['Privacy where allowed', 'Your contact details are hidden from the public lookup when the ending allows it.'],
  ['Yours to take away', 'Transfer it to any other provider whenever you like.'],
];
const STEPS: [string, string][] = [
  ['Pick the name', 'Search, choose an ending, and pay once at checkout together with your site.'],
  ['We register it', 'Right after payment, in your name. You get the details in your order.'],
  ['It goes live', 'The seller connects it to your site, and HTTPS is switched on when it launches.'],
];
const QA: [string, string][] = [
  ['Who owns the domain?', 'You do. It is registered in your name from the first day, and you can move it to another provider at any time.'],
  ['Can I use a domain I already own?', 'Yes. Choose "I have a domain" at checkout, or use the box below. The seller connects it for you, and you only change two settings at your provider.'],
  ['What if the name is taken?', 'Try a different ending or one of the idea chips. If a name is gone before you pay, nothing is charged.'],
  ['When do I pay for the domain?', 'At checkout, in the same payment as your site. The yearly price is shown first.'],
  ['What happens next year?', 'You renew at the same price shown today. We remind you before it expires.'],
];

export default async function Domains({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <div className="dm-page">
      <DomainSearch initial={cleanName(q ?? '')} />

      <section className="dm-sec">
        <div className="wrap">
          <h2>Every domain here</h2>
          <ul className="dm-get">
            {GET.map(([t, d]) => (
              <li key={t}>
                <b>{t}</b>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dm-sec dm-conn">
        <div className="wrap">
          <h2>From name to live site</h2>
          <ol className="dm-steps">
            {STEPS.map(([t, d], i) => (
              <li key={t}>
                <i>{i + 1}</i>
                <b>{t}</b>
                <span>{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="dm-sec">
        <div className="wrap dm-split">
          <div>
            <h2>Already own one?</h2>
            <p className="dm-lead">Bring it. Pick a site, and the seller connects your domain to it.</p>
            <form className="dm-own-form" action="/browse" method="get">
              <label className="sr" htmlFor="dm-own">
                Your domain
              </label>
              <input id="dm-own" name="domain" placeholder="mybusiness.com" autoComplete="off" autoCapitalize="none" spellCheck={false} required />
              <button className="btn btn-gold" type="submit">
                Pick a site
              </button>
            </form>
          </div>
          <div>
            <h2>Prices per year</h2>
            <ul className="dm-prices">
              {ALL_TLDS.map(([t, p]) => (
                <li key={t}>
                  <b>{t}</b>
                  <span>${p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="dm-sec dm-faq">
        <div className="wrap">
          <h2>Questions about domains</h2>
          {QA.map(([qq, a]) => (
            <details key={qq}>
              <summary>{qq}</summary>
              <p>{a}</p>
            </details>
          ))}
          <p className="dm-more">
            More answers in the <Link href="/faq">FAQ</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
