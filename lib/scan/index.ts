import 'server-only';
import { createHash } from 'node:crypto';
import { safeFetch } from '../delivery/ssrf';
import { orderStore } from '../orders/store';
import { createAdminClient } from '../supabase/server';
import { SCAN_LIMITS, inspect, similarity, type MalwareResult, type SecretHit } from './engine';

/*
 * The listing scan (spec 8.2). Runs when a listing is submitted for review and again on request. It fetches the seller's private file link
 * (with the same protections as a delivery: https only, public addresses only), looks inside, checks the demo link and compares the listing with
 * the others. It only ADDS FLAGS: an admin approves or rejects, and for digital products still opens the files in a sandbox.
 * MalwareScanner is the door for a real scanner (VirusTotal, ClamAV): until keys exist the local heuristics in engine.ts answer, and they say so.
 */
export interface MalwareScanner {
  readonly name: string;
  scan(i: { bytes: Uint8Array; sha256: string; name: string }): Promise<MalwareResult & { extra?: { secrets: SecretHit[]; licenceFile: boolean; files: number } }>;
}

export const localScanner: MalwareScanner = {
  name: 'local',
  async scan({ bytes, name }) {
    const r = inspect(bytes, name);
    return { ...r.malware, extra: { secrets: r.secrets, licenceFile: r.licenceFile, files: r.files } };
  },
};

export type Fingerprint = { slug: string; description: string; sha256?: string };
export type ScanFlags = {
  malware: MalwareResult;
  secrets: SecretHit[];
  licenceFile: boolean | null; // null: not checked (nothing to check against)
  duplicate: { slug: string; similarity: number; sameFile: boolean } | null;
  demoReachable: boolean | null; // null: no demo link given
  fileSha256?: string;
  bytes?: number;
  fileNote?: string;
  scanner: string;
};
export type ScanResult = { slug: string; version: number; originality: number; flags: ScanFlags; at: number };
export type ScanInput = { slug: string; productId?: string; description: string; codeUrl: string; demoUrl: string | null; thirdPartyDeclared: boolean; needsLicenceFile: boolean };

export type Deps = {
  scanner: MalwareScanner;
  fetchFile: (url: string) => Promise<{ ok: boolean; status: number; bytes?: Uint8Array; tooBig?: boolean; name: string }>;
  checkDemo: (url: string) => Promise<boolean>;
  others: (slug: string) => Promise<Fingerprint[]>;
};

const nameFromUrl = (u: string) => {
  try {
    return decodeURIComponent(new URL(u).pathname.split('/').filter(Boolean).pop() ?? '') || 'download';
  } catch {
    return 'download';
  }
};

export const defaultDeps: Deps = {
  scanner: localScanner,
  async fetchFile(url) {
    try {
      const res = await safeFetch(url, AbortSignal.timeout(20_000));
      const name = nameFromUrl(url);
      if (!res.ok || !res.body) return { ok: false, status: res.status, name };
      const declared = Number(res.headers.get('content-length') ?? 0);
      if (declared > SCAN_LIMITS.fileBytes) return { ok: true, status: res.status, tooBig: true, name };
      const chunks: Uint8Array[] = [];
      let size = 0;
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > SCAN_LIMITS.fileBytes) {
          await reader.cancel();
          return { ok: true, status: res.status, tooBig: true, name };
        }
        chunks.push(value);
      }
      return { ok: true, status: res.status, bytes: Buffer.concat(chunks), name };
    } catch {
      return { ok: false, status: 0, name: nameFromUrl(url) };
    }
  },
  async checkDemo(url) {
    try {
      const r = await safeFetch(url, AbortSignal.timeout(10_000));
      await r.body?.cancel();
      return r.status < 400;
    } catch {
      return false;
    }
  },
  async others(slug) {
    return othersFromStore(slug);
  },
};

/* The core. Every outside thing comes in through `deps`, so it can be tested without a network. */
export async function runScan(input: ScanInput, deps: Deps = defaultDeps): Promise<ScanResult> {
  const flags: ScanFlags = { malware: { status: 'unknown', detail: [] }, secrets: [], licenceFile: null, duplicate: null, demoReachable: null, scanner: deps.scanner.name };
  const file = input.codeUrl && input.codeUrl !== 'about:blank' ? await deps.fetchFile(input.codeUrl) : null;
  if (!file) flags.fileNote = 'No file link to scan.';
  else if (!file.ok) flags.fileNote = `The file link did not open (status ${file.status || 'no answer'}).`;
  else if (file.tooBig || !file.bytes) flags.fileNote = 'The file is larger than the scan limit, so it was not opened. Check it by hand.';
  else {
    const sha = createHash('sha256').update(file.bytes).digest('hex');
    flags.fileSha256 = sha;
    flags.bytes = file.bytes.length;
    const r = await deps.scanner.scan({ bytes: file.bytes, sha256: sha, name: file.name });
    flags.malware = { status: r.status, detail: r.detail };
    flags.secrets = r.extra?.secrets ?? [];
    if (input.thirdPartyDeclared || input.needsLicenceFile) flags.licenceFile = r.extra?.licenceFile ?? null;
  }
  if (input.demoUrl) flags.demoReachable = await deps.checkDemo(input.demoUrl);

  // Compare with the other listings: the same file, or nearly the same words.
  let originality = 1;
  for (const o of await deps.others(input.slug)) {
    const sameFile = !!flags.fileSha256 && o.sha256 === flags.fileSha256;
    const sim = similarity(input.description, o.description);
    const alike = sameFile ? 1 : sim;
    originality = Math.min(originality, 1 - alike);
    if (sameFile || sim >= 0.6) {
      if (!flags.duplicate || alike > Math.max(flags.duplicate.similarity, flags.duplicate.sameFile ? 1 : 0)) flags.duplicate = { slug: o.slug, similarity: Math.round(sim * 100) / 100, sameFile };
    }
  }
  const version = await recordVersion(input, flags);
  const result: ScanResult = { slug: input.slug, version, originality: Math.round(originality * 1000) / 1000, flags, at: Date.now() };
  await saveResult(input, result);
  return result;
}

/* ---------- storage ---------- */
type Mem = { results: Map<string, ScanResult[]>; hashes: Map<string, string[]>; listings: Map<string, Fingerprint> };
const mem: Mem = ((globalThis as { __scanMem?: Mem }).__scanMem ??= { results: new Map(), hashes: new Map(), listings: new Map() });
let ready: { ok: boolean; at: number } | undefined;
async function pg() {
  if ((await orderStore()).kind !== 'postgres') return false;
  if (!ready || (!ready.ok && Date.now() - ready.at > 30_000)) {
    const { error } = await createAdminClient().from('scan_results').select('id').limit(1);
    ready = { ok: !error, at: Date.now() };
  }
  return ready.ok;
}

/* A new version number only when the file really changed (a different hash). */
async function recordVersion(input: ScanInput, flags: ScanFlags): Promise<number> {
  const sha = flags.fileSha256;
  if (await pg()) {
    if (!input.productId) return 1;
    const db = createAdminClient();
    const { data } = await db.from('product_files').select('version, sha256').eq('product_id', input.productId);
    const known = data?.find((r) => r.sha256 === sha);
    if (known) return known.version;
    const version = (data?.reduce((m, r) => Math.max(m, r.version), 0) ?? 0) + 1;
    if (sha) {
      let host: string | null = null;
      try {
        host = new URL(input.codeUrl).hostname;
      } catch {
        /* no host to record */
      }
      await db.from('product_files').insert({ product_id: input.productId, version, sha256: sha, size_bytes: flags.bytes ?? 0, source_host: host });
    }
    return sha ? version : Math.max(1, version - 1);
  }
  const list = mem.hashes.get(input.slug) ?? [];
  if (sha && !list.includes(sha)) list.push(sha);
  mem.hashes.set(input.slug, list);
  mem.listings.set(input.slug, { slug: input.slug, description: input.description, sha256: sha });
  return Math.max(1, sha ? list.indexOf(sha) + 1 : list.length || 1);
}

async function saveResult(input: ScanInput, r: ScanResult) {
  if (await pg()) {
    if (!input.productId) return;
    await createAdminClient()
      .from('scan_results')
      .insert({ product_id: input.productId, version: r.version, malware_status: r.flags.malware.status, originality_score: r.originality, flags: r.flags, scanner: r.flags.scanner });
    return;
  }
  mem.results.set(input.slug, [...(mem.results.get(input.slug) ?? []), r]);
}

export async function latestScan(slug: string, productId?: string): Promise<ScanResult | null> {
  if (await pg()) {
    if (!productId) return null;
    const { data } = await createAdminClient()
      .from('scan_results')
      .select('version, originality_score, flags, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? { slug, version: data.version, originality: Number(data.originality_score ?? 1), flags: data.flags as ScanFlags, at: Date.parse(data.created_at) } : null;
  }
  return mem.results.get(slug)?.at(-1) ?? null;
}

async function othersFromStore(slug: string): Promise<Fingerprint[]> {
  if (await pg()) {
    const db = createAdminClient();
    const { data } = await db.from('products').select('id, slug, description').neq('slug', slug).in('status', ['live', 'in_review', 'paused']).limit(500);
    const rows = data ?? [];
    const { data: files } = rows.length
      ? await db
          .from('product_files')
          .select('product_id, sha256')
          .in(
            'product_id',
            rows.map((r) => r.id),
          )
      : { data: [] as { product_id: string; sha256: string }[] };
    return rows.map((r) => ({ slug: r.slug, description: r.description, sha256: files?.find((f) => f.product_id === r.id)?.sha256 }));
  }
  return [...mem.listings.values()].filter((l) => l.slug !== slug);
}

/* One line for the admin card: what the scan found, in words. */
export function summarise(r: ScanResult): { tone: 'mint' | 'amber' | 'rose'; text: string }[] {
  const f = r.flags;
  const out: { tone: 'mint' | 'amber' | 'rose'; text: string }[] = [];
  out.push(
    f.malware.status === 'clean'
      ? { tone: 'mint', text: `No known malware (${f.scanner} checks, not a full antivirus)` }
      : f.malware.status === 'unknown'
        ? { tone: 'amber', text: f.fileNote ?? f.malware.detail[0] ?? 'Could not check the file' }
        : { tone: 'rose', text: `${f.malware.status === 'infected' ? 'Infected' : 'Suspicious'}: ${f.malware.detail.slice(0, 2).join('; ')}` },
  );
  out.push(
    f.secrets.length
      ? { tone: 'rose', text: `${f.secrets.length} secret(s) in the code: ${[...new Set(f.secrets.map((s) => s.kind))].join(', ')}` }
      : { tone: 'mint', text: 'No pasted secrets found' },
  );
  if (f.licenceFile === false) out.push({ tone: 'amber', text: 'No licence file in the download' });
  if (f.licenceFile === true) out.push({ tone: 'mint', text: 'Licence file included' });
  if (f.duplicate) out.push({ tone: 'rose', text: f.duplicate.sameFile ? `Same file as ${f.duplicate.slug}` : `${Math.round(f.duplicate.similarity * 100)}% the same words as ${f.duplicate.slug}` });
  else out.push({ tone: 'mint', text: `Original: ${Math.round(r.originality * 100)}%` });
  if (f.demoReachable === true) out.push({ tone: 'mint', text: 'Demo link opens' });
  if (f.demoReachable === false) out.push({ tone: 'rose', text: 'Demo link does not open' });
  out.push({ tone: 'mint', text: `File version ${r.version}` });
  return out;
}

/*
 * Can this listing be approved, given its latest scan? Known malware always blocks. With SCAN_REQUIRE_REAL=1 (set it before launch) a listing that
 * has files for buyers (a download or repo) also needs a scan by a real scanner (ClamAV, VirusTotal), not the local heuristics. Returns the reason, or null.
 */
export function approvalBlock(scan: ScanResult | null, hasFiles: boolean, requireReal: boolean): string | null {
  if (scan?.flags.malware.status === 'infected') return 'The scan found malware in the files. Send the listing back or reject it.';
  if (requireReal && hasFiles && (!scan || scan.flags.scanner === 'local'))
    return 'Files for buyers need a scan by a real scanner (ClamAV or VirusTotal) before approval. Only the basic local checks have run.';
  return null;
}
