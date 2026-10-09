import type { Metadata } from 'next';
import Link from 'next/link';
import { FEE_CUSTOM_TEXT, FEE_SALE_TEXT } from '@/lib/config';

export const metadata: Metadata = { title: 'Terms of service' };

export default function Terms() {
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Terms of service</h1>
        <p className="stamp muted">Last updated October 2026</p>
      </div>
      <div className="prose">
        <p>These terms cover your use of SellOnBay, where buyers get ready-made websites and tools set up on their own domain, and sellers list and deliver them.</p>

        <h2>Buying a site</h2>
        <ul>
          <li>Delivery takes 1 to 7 days, as the seller states on the listing. An express option (24 hours) is available for an extra fee shown at checkout.</li>
          <li>Your payment is held by SellOnBay until you accept the site. You have 48 hours after delivery to review it. If you do nothing, the order is accepted automatically.</li>
          <li>Domains are registered in your name. Domains and hosting are extras and are priced separately.</li>
        </ul>

        <h2>Refunds</h2>
        <ul>
          <li>Once you accept a site, the order is final.</li>
          <li>
            You can open a dispute if the site is not as described, does not work, contains malware or breaches copyright. We review the delivery log, messages and the live site, and decide the
            outcome.
          </li>
          <li>Every accepted order has a 7-day bug-fix guarantee for faults that were in the delivered site.</li>
          <li>
            A dispute needs evidence, such as screenshots or a short description of what does not match the listing. We decide using the evidence, the delivery log, the messages and the live site. The
            outcome can be a full refund, a partial refund, or no refund.
          </li>
          <li>Accounts with repeated disputes that we reject are reviewed and can be suspended.</li>
          <li>Nothing here limits rights you have under the consumer law where you live.</li>
        </ul>

        <h2>Review period and source files</h2>
        <p>
          During the 48-hour review you check the live site on your own domain. The source files are released to you when you accept the site, or when the review period ends and the order is accepted
          automatically.
        </p>

        <h2>License</h2>
        <ul>
          <li>When you buy a site, you get a license to use it for your own business or project, on your own domain.</li>
          <li>You may not resell it, share it, or give the seller&apos;s work to someone else to copy or rebuild. The seller keeps ownership and can sell the same site to other buyers.</li>
          <li>Taking a delivered site and then asking for a refund so you can use it elsewhere is a breach of these terms, and we can suspend the account.</li>
        </ul>

        <h2>Custom and extra work</h2>
        <p>Custom work and extra work are paid into escrow before the seller starts. For extra work, the seller sends a request with a title, price and extra days, and you approve and fund it.</p>

        <h2>Selling a site</h2>
        <ul>
          <li>You must own or have the right to sell what you list. Listings are scanned for malware and copied content, and reviewed before they go live.</li>
          <li>
            We charge a {FEE_SALE_TEXT} fee on sales and {FEE_CUSTOM_TEXT} on custom, extra and trial work.
          </li>
          <li>Accepted earnings are paid out weekly, 7 days after the buyer accepts.</li>
        </ul>

        <h2>Keep it on SellOnBay</h2>
        <p>
          Do not share emails or phone numbers, and do not ask to pay outside the platform. Payments made outside are not protected. Messages that break this rule are blocked, and repeat attempts can
          lead to a ban.
        </p>

        <h2>Not allowed</h2>
        <p>
          Phishing pages, impersonation, counterfeit goods, malware, copyrighted material you do not own, or anything illegal. We can suspend hosted sites and accounts that break these rules. Use the{' '}
          <Link href="/report-abuse">abuse report page</Link> to flag a site.
        </p>

        <h2>Abuse, fake accounts and fraud</h2>
        <p>
          You may not create fake or duplicate accounts, post fake reviews or fake abuse reports, use stolen cards or payment details, file false disputes or chargebacks, place orders only to get
          files, or use scripts to flood the site. To protect buyers and sellers we may limit or pause what new accounts can do, hold a paid order for a short safety check (the money stays in escrow),
          block a connection or device, and ban an account and remove the reviews and reports it wrote. We keep a record of what happened (orders, messages, downloads and security events) as evidence.
        </p>
        <p>
          If you cause us a loss by breaking these rules, for example through chargebacks, fraudulent orders or damage from an attack, you agree to compensate us for it as far as the law allows, and
          we may report clear cases to the authorities and take legal action. This does not take away any right you have under the law.
        </p>

        <h2>Changes</h2>
        <p>We may update these terms. If a change matters, we will tell you before it applies to your next order.</p>
      </div>
    </div>
  );
}
