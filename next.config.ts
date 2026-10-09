import type { NextConfig } from 'next';

/*
 * Security headers on every page and API answer (spec section 9). The hosted seller demos under /demo are left out on purpose: they set their own
 * `Content-Security-Policy: sandbox` (no allow-same-origin) and must keep it. Scripts and styles need 'unsafe-inline' because Next writes small inline
 * scripts; tightening that needs per-request nonces and is a later step. Everything else is closed down: no plugins, no framing by other sites,
 * forms and base only to ourselves, connections only to ourselves, Supabase and Cloudflare Turnstile.
 */
const dev = process.env.NODE_ENV !== 'production';
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com${dev ? ' ws: http://localhost:*' : ''}`,
  "frame-src 'self' https:", // our own previews and a seller's https demo link
  "worker-src 'self' blob:",
  "media-src 'self' https: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/((?!demo/).*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
