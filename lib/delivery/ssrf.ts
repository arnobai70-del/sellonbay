import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/*
 * The seller gives us a link to their file and the server fetches it for the buyer. That is a server-side request, so it must never be
 * allowed to reach our own network: only https, only public addresses, and every redirect is checked again.
 */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (v === 6) {
    const x = ip.toLowerCase();
    if (x === '::' || x === '::1') return true;
    if (x.startsWith('::ffff:')) return isPrivateAddress(x.slice(7));
    return x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb') || x.startsWith('ff');
  }
  return true; // not an address at all: refuse
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('bad_url');
  }
  if (u.protocol !== 'https:' || u.username || u.password) throw new Error('bad_url');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('private_address');
    return u;
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) throw new Error('private_address');
  const found = await lookup(host, { all: true });
  if (!found.length || found.some((a) => isPrivateAddress(a.address))) throw new Error('private_address');
  return u;
}

/* Fetch a seller file with the checks above, following at most 3 redirects and re-checking each one. */
export async function safeFetch(raw: string, signal?: AbortSignal): Promise<Response> {
  let url = raw;
  for (let hop = 0; hop < 4; hop++) {
    const u = await assertPublicUrl(url);
    const res = await fetch(u, { redirect: 'manual', signal });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location') as string, u).toString();
      continue;
    }
    return res;
  }
  throw new Error('too_many_redirects');
}
