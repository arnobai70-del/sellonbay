'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CrystalLogo } from './CrystalLogo';
import { OAuthButtons } from './OAuthButtons';
import { authenticate, requestReset } from '@/app/(bare)/login/actions';

const ROLES = [
  { key: 'buyer', title: 'I want a site', note: 'Pick one and go live on my domain.' },
  { key: 'seller', title: 'I sell sites', note: 'List what I built and get paid.' },
] as const;

/* Real sign-in when Supabase keys are set, otherwise the old demo redirect. */
export function AuthClient({ live, error, next, sent }: { live: boolean; error?: string; next?: string; sent?: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(sent ? 'forgot' : 'signin');
  const [show, setShow] = useState(false);
  const signup = mode === 'signup';

  return (
    <div className="auth" data-auth>
      <div className="art">
        <h2>Your site is one domain away.</h2>
        <CrystalLogo />
        <div className="sun" style={{ width: 420, height: 420, right: -160, bottom: -200, top: 'auto' }} />
      </div>
      <div className="form">
        <h1 style={{ fontSize: '2.4rem' }}>{mode === 'forgot' ? 'Reset your password' : signup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          {mode === 'forgot'
            ? 'Enter your email and we will send you a link to choose a new password.'
            : signup
              ? 'Two minutes and you can pick a site or list your own.'
              : 'Sign in to see your orders and messages.'}
        </p>
        {!signup && next?.startsWith('/dashboard/admin') && (
          <div className="note" style={{ marginTop: 16 }}>
            <span>
              You are opening the <b>admin area</b>. Sign in, then enter the code from your authenticator app.
            </span>
          </div>
        )}
        {!signup && next?.startsWith('/dashboard/seller') && (
          <div className="note" style={{ marginTop: 16 }}>
            <span>
              You are opening the <b>seller dashboard</b>. Sign in to continue.
            </span>
          </div>
        )}

        {mode === 'forgot' ? (
          <>
            {sent ? (
              <div className="note" style={{ marginTop: 24 }}>
                <span>If that email has an account, a reset link is on its way. Check your inbox and spam folder.</span>
              </div>
            ) : (
              <form action={requestReset}>
                <div className="field">
                  <label htmlFor="f-mail">Email</label>
                  <input id="f-mail" name="email" type="email" required autoComplete="email" />
                </div>
                <button className="btn btn-blue btn-lg" type="submit" style={{ width: '100%', marginTop: 24 }}>
                  Send reset link
                </button>
              </form>
            )}
            <p style={{ marginTop: 20 }} className="muted">
              <button
                type="button"
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--cobalt)', fontWeight: 600, textDecoration: 'underline' }}
                onClick={() => setMode('signin')}
              >
                Back to sign in
              </button>
            </p>
          </>
        ) : (
          <>
            {(signup || !live) && (
              <div role="radiogroup" aria-label="What brings you here" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    role="radio"
                    aria-checked={role === r.key}
                    onClick={() => setRole(r.key)}
                    style={{
                      textAlign: 'left',
                      padding: 16,
                      borderRadius: 'var(--r-m)',
                      cursor: 'pointer',
                      background: role === r.key ? 'var(--blue-bg)' : '#fff',
                      border: '2px solid ' + (role === r.key ? 'var(--cobalt)' : 'var(--line)'),
                    }}
                  >
                    <b style={{ display: 'block', fontFamily: 'var(--display)', fontSize: '1.1rem' }}>{r.title}</b>
                    <span className="muted" style={{ fontSize: 14 }}>
                      {r.note}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <form
              {...(live
                ? { action: authenticate }
                : {
                    onSubmit: (e: React.FormEvent) => {
                      e.preventDefault();
                      router.push('/dashboard/' + role);
                    },
                  })}
            >
              <input type="hidden" name="role" value={role} />
              <input type="hidden" name="mode" value={mode} />
              <input type="hidden" name="next" value={next ?? ''} />
              {signup && (
                <div className="field">
                  <label htmlFor="a-name">Your name</label>
                  <input id="a-name" name="name" required autoComplete="name" />
                </div>
              )}
              <div className="field">
                <label htmlFor="a-mail">Email</label>
                <input id="a-mail" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="a-pass">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="a-pass"
                    name="password"
                    type={show ? 'text' : 'password'}
                    minLength={8}
                    required
                    style={{ width: '100%', paddingRight: 64 }}
                    autoComplete={signup ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShow((v) => !v)}
                    aria-pressed={show}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 0,
                      cursor: 'pointer',
                      color: 'var(--mute)',
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    {show ? 'Hide' : 'Show'}
                  </button>
                </div>
                {signup && <small>At least 8 characters.</small>}
                {!signup && live && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    style={{ background: 'none', border: 0, padding: 0, marginTop: 8, cursor: 'pointer', color: 'var(--cobalt)', fontWeight: 600, fontSize: 14 }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              {error && (
                <p role="alert" style={{ color: 'var(--rose)', marginTop: 12 }}>
                  {error}
                </p>
              )}
              <button className="btn btn-blue btn-lg" type="submit" style={{ width: '100%', marginTop: 24 }}>
                {signup ? 'Create account' : 'Sign in'}
              </button>
              {signup && (
                <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>
                  By creating an account you accept our terms of service and privacy policy.
                </p>
              )}
            </form>

            {live && <OAuthButtons next={next} />}

            <p style={{ marginTop: 20 }} className="muted">
              {signup ? 'Already have an account? ' : 'New to SellOnBay? '}
              <button
                type="button"
                style={{ background: 'none', border: 0, padding: '8px 0', cursor: 'pointer', color: 'var(--cobalt)', fontWeight: 600, textDecoration: 'underline' }}
                onClick={() => setMode(signup ? 'signin' : 'signup')}
              >
                {signup ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </>
        )}

        <p className="muted" style={{ marginTop: 8, fontSize: '14.5px' }}>
          Sellers and admins sign in with a code from an authenticator app.
        </p>
      </div>
    </div>
  );
}
