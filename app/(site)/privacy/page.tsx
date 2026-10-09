import type { Metadata } from 'next';
import Link from 'next/link';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function Privacy() {
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Privacy policy</h1>
        <p className="stamp muted">Last updated October 2026</p>
      </div>
      <div className="prose">
        <p>This explains what SellOnBay collects, why, and the choices you have.</p>

        <h2>What we collect</h2>
        <ul>
          <li>Account details: name, email and sign-in method.</li>
          <li>Order details: the site you bought, your domain, and the messages you send in an order chat.</li>
          <li>For sellers: payout details and the verification needed to pay you.</li>
          <li>Basic technical data such as device type and error logs, used to keep the service secure.</li>
        </ul>

        <h2>Why we use it</h2>
        <ul>
          <li>To run your orders, hold and release payments, and set up your domain.</li>
          <li>To keep the platform safe, including blocking contact details in chat and reviewing reports.</li>
          <li>To contact you about your account and orders.</li>
        </ul>

        <h2>Who we share it with</h2>
        <p>Only the providers needed to run the service, such as payments, domain registration and hosting. Sellers see what they need to deliver your order. We do not sell your data.</p>

        <h2 id="cookies">Cookies</h2>
        <p>
          We use only what the site needs to work: a sign-in session so you stay signed in, and a few choices kept in your browser (for example that you closed the cookie notice, or paused an
          animation). To stop abuse we also set a random device id cookie and keep a hashed form of it and of your connection address with the actions you take (sign up, order, list), for{' '}
          {CONFIG.limits.keepDays} days. When you accept an order we keep a record of the click (time, your connection address, your browser and the words you saw) as evidence in case of a dispute or
          a chargeback. We do not use advertising or tracking cookies. If we ever add an optional one, we will ask first.
        </p>

        <h2>Your choices</h2>
        <p>
          You can download a copy of your data and ask us to delete your account on the <Link href="/account/privacy">Your data</Link> page. Deleting removes your name, payout details, developer
          profile and notifications, and locks the sign-in. Payments, orders and accounting records are kept for the time the law requires (usually several years), without a link to your name. We
          cannot delete while an order, a dispute or a payout is open. You can also ask us to correct your data.
        </p>

        <h2>Security</h2>
        <p>Data is stored with access rules per account. Sellers and admins sign in with a code from an authenticator app.</p>
      </div>
    </div>
  );
}
