import type { Metadata } from 'next';
import { reportAbuse } from './actions';

export const metadata: Metadata = { title: 'Report abuse' };

export default async function ReportAbuse({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Report abuse</h1>
        <p>Tell us about a site hosted through SellOnBay that looks like phishing, fraud or stolen work. We review every report.</p>
      </div>
      <div style={{ maxWidth: 620, paddingBottom: 88 }}>
        {sent ? (
          <div className="panel">
            <div className="done">
              <span className="chip mint">
                <i />
                Report received
              </span>
              <h2 style={{ marginTop: 14 }}>Thanks. We will look at it.</h2>
              <p className="muted" style={{ marginTop: 10 }}>
                If a site is clearly harmful, we suspend it first and review after.
              </p>
            </div>
          </div>
        ) : (
          <form className="panel" action={reportAbuse}>
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor="r-url">Site address</label>
              <input id="r-url" name="url" required placeholder="example.com" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="r-reason">What is wrong?</label>
              <select id="r-reason" name="reason" defaultValue="phishing">
                <option value="phishing">Fake login or phishing</option>
                <option value="counterfeit">Counterfeit or scam goods</option>
                <option value="malware">Malware</option>
                <option value="copyright">Copied or stolen work</option>
                <option value="other">Something else</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="r-detail">Details (optional)</label>
              <textarea id="r-detail" name="detail" rows={4} maxLength={1000} placeholder="What did you see?" />
            </div>
            {error && (
              <p role="alert" style={{ color: 'var(--rose)', marginTop: 12 }}>
                We could not send that. Check the address and try again.
              </p>
            )}
            <button className="btn btn-blue btn-lg" type="submit" style={{ marginTop: 24 }}>
              Send report
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
