import Link from 'next/link';
import { BRAND_NAME } from '@/lib/brand';

/* One quiet line under the store pages. */
export function StoreFoot() {
  return (
    <footer className="st-foot">
      <span>&copy; 2026 {BRAND_NAME}. Payments are held in escrow until you accept.</span>
      <nav aria-label="Legal">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/refunds">Refunds</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/welcome">About</Link>
      </nav>
    </footer>
  );
}
