import type { Metadata } from 'next';
import Link from 'next/link';
import { EscrowLine } from '@/components/EscrowLine';
import { ExplainerVideo } from '@/components/ExplainerVideo';
import { FaqList } from '@/components/FaqList';
import { HowItWorks } from '@/components/HowItWorks';
import { PageHero } from '@/components/PageHero';
import { Reveal } from '@/components/Reveal';
import { TOP_FAQ } from '@/lib/faq';

export const metadata: Metadata = { title: 'How it works', description: 'Pick a site, add your domain, review it, then accept. Your money waits until the site works.' };

export default function HowPage() {
  return (
    <>
      <PageHero tone="gold" title="Pick a site. Add your domain. Go live." lead="Here is exactly what happens, from your first click to the day the seller gets paid.">
        <Link className="btn btn-dark btn-lg" href="/browse">
          Find a site
        </Link>
        <Link className="hero-link" href="/find">
          Not sure? Take the quiz
        </Link>
      </PageHero>

      <Reveal className="section" id="steps">
        <div className="wrap">
          <HowItWorks />
        </div>
      </Reveal>

      <Reveal className="section" id="tour" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head">
            <h2>The 25-second tour</h2>
            <p>Press play, or jump to any chapter.</p>
          </div>
          <ExplainerVideo />
        </div>
      </Reveal>

      <Reveal className="section" id="escrow" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head">
            <h2>Your money waits until the site works</h2>
            <p>Payment is held by SellOnBay. Sellers are paid after you accept, in a weekly payout 7 days later.</p>
          </div>
          <EscrowLine />
        </div>
      </Reveal>

      <Reveal className="section tight" id="custom">
        <div className="wrap split">
          <div>
            <h2>Need it to look like your brand?</h2>
            <p className="lead">Ask the seller who built the site. They know the code best and charge a fixed price, paid into escrow before work starts.</p>
            <Link className="btn btn-dark" style={{ marginTop: 24 }} href="/browse">
              Find a site to customise
            </Link>
          </div>
          <div className="rows">
            <div className="r">
              <h3>Brand swap</h3>
              <p>Your logo, colours, fonts and text, ready in 1 day.</p>
              <span className="amt">$30</span>
            </div>
            <div className="r">
              <h3>Extra pages and forms</h3>
              <p>Up to three new pages, a custom form and email alerts.</p>
              <span className="amt">$70</span>
            </div>
            <div className="r">
              <h3>Custom feature</h3>
              <p>Payments, logins or a new tool. Agreed price before work starts.</p>
              <span className="amt">from $150</span>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head">
            <h2>Good to know</h2>
            <Link className="link-u" href="/faq">
              All questions
            </Link>
          </div>
          <FaqList items={TOP_FAQ} />
        </div>
      </Reveal>

      <section className="cta-band" data-tone="gold">
        <div className="wrap">
          <h2>Ready to pick yours?</h2>
          <Link className="btn btn-dark btn-lg" href="/browse">
            Browse sites
          </Link>
        </div>
      </section>
    </>
  );
}
