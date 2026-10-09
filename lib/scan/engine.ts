/*
 * The checks behind the listing scan (spec 8.2). Pure code, no framework and no network, so every rule can be tested on its own.
 * The seller's files are untrusted: nothing here runs them, it only reads bytes and text. These are heuristics, NOT a real antivirus:
 * they catch the obvious (a test virus, a pasted secret, a Windows program inside a plugin) and say "unknown" for the rest. A real scanner
 * (VirusTotal or ClamAV) plugs in behind MalwareScanner in lib/scan/index.ts once keys exist, and an admin still opens the files in a sandbox.
 */
import { unzipSync } from 'fflate';

export const SCAN_LIMITS = { fileBytes: 50 * 1024 * 1024, entries: 5000, totalBytes: 200 * 1024 * 1024, textFileBytes: 2 * 1024 * 1024 };

export type SecretHit = { kind: string; file: string; sample: string };
export type MalwareStatus = 'clean' | 'suspicious' | 'infected' | 'unknown';
export type MalwareResult = { status: MalwareStatus; detail: string[] };

const JWT = /eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g;
const SECRETS: [kind: string, re: RegExp][] = [
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ['Stripe live key', /sk_live_[0-9a-zA-Z]{16,}/],
  ['Slack token', /xox[baprs]-[0-9A-Za-z-]{10,}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{30,}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['hard-coded secret', /\b(?:api[_-]?key|secret|passwd|password|token)\b\s*[:=]\s*['"][A-Za-z0-9_\-/+=]{16,}['"]/i],
];
/* Shown to the admin as a hint only: the first characters, never the whole secret. */
const mask = (s: string) => s.slice(0, 4) + '…' + `(${s.length} characters)`;

export function findSecrets(text: string, file: string): SecretHit[] {
  const hits: SecretHit[] = [];
  for (const [kind, re] of SECRETS) {
    const m = re.exec(text);
    if (m) hits.push({ kind, file, sample: mask(m[0]) });
  }
  for (const m of text.matchAll(JWT)) {
    try {
      const payload = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
      if (payload.role === 'service_role') hits.push({ kind: 'database admin key (service_role)', file, sample: mask(m[0]) });
    } catch {
      /* not a JWT */
    }
  }
  return hits;
}

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
const SUSPICIOUS_TEXT: [string, RegExp][] = [
  ['hides code with eval(atob(...))', /eval\s*\(\s*atob\s*\(/i],
  ['runs an encoded PowerShell command', /powershell(?:\.exe)?\s+(?:-\w+\s+)*-(?:enc|encodedcommand)\b/i],
  ['browser crypto miner', /coinhive|cryptonight|coin-hive|minero\.cc/i],
  ['writes unescaped script into the page', /document\.write\s*\(\s*unescape\s*\(/i],
  ['downloads and runs a program', /(?:curl|wget)[^\n|]*\|\s*(?:ba)?sh\b/i],
];
const PROGRAM_EXT = new Set(['exe', 'dll', 'scr', 'msi', 'com', 'pif', 'bat', 'cmd', 'vbs', 'jar', 'apk']);
const ext = (p: string) => (p.includes('.') ? p.slice(p.lastIndexOf('.') + 1).toLowerCase() : '');

export function inspectBytes(name: string, bytes: Uint8Array, text: string | null): MalwareResult {
  const detail: string[] = [];
  const e = ext(name);
  if (text && text.includes(EICAR)) return { status: 'infected', detail: [`${name}: the standard antivirus test file (EICAR)`] };
  if (PROGRAM_EXT.has(e)) detail.push(`${name}: contains a program file (.${e})`);
  if (bytes.length > 4 && bytes[0] === 0x4d && bytes[1] === 0x5a && !PROGRAM_EXT.has(e)) detail.push(`${name}: looks like a Windows program with another name`);
  if (bytes.length > 4 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) detail.push(`${name}: looks like a Linux program`);
  if (text) for (const [what, re] of SUSPICIOUS_TEXT) if (re.test(text)) detail.push(`${name}: ${what}`);
  return { status: detail.length ? 'suspicious' : 'clean', detail };
}

const TEXT_EXT = new Set([
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'jsx',
  'py',
  'php',
  'rb',
  'go',
  'java',
  'cs',
  'json',
  'txt',
  'md',
  'yml',
  'yaml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'env',
  'sh',
  'ps1',
  'html',
  'htm',
  'css',
  'xml',
  'sql',
]);
const isTextName = (p: string) => TEXT_EXT.has(ext(p)) || /(^|\/)\.env(\.|$)/.test(p);
const LICENCE_FILE = /(^|\/)(licen[cs]e|copying|notice)(\.(md|txt|rst))?$/i;

export type Inspection = { kind: 'archive' | 'file' | 'unreadable'; files: number; totalBytes: number; secrets: SecretHit[]; malware: MalwareResult; licenceFile: boolean };

/* Opens a zip (carefully) or treats the bytes as a single file, and runs every check over it. */
export function inspect(bytes: Uint8Array, name = 'download'): Inspection {
  const asText = (b: Uint8Array) => (b.length <= SCAN_LIMITS.textFileBytes ? Buffer.from(b).toString('utf8') : null);
  const isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isZip) {
    const text = isTextName(name) || !name.includes('.') ? asText(bytes) : null;
    return { kind: 'file', files: 1, totalBytes: bytes.length, secrets: text ? findSecrets(text, name) : [], malware: inspectBytes(name, bytes, text), licenceFile: LICENCE_FILE.test(name) };
  }
  let entries: Record<string, Uint8Array>;
  try {
    let total = 0;
    let count = 0;
    entries = unzipSync(bytes, {
      filter: (f) => {
        count++;
        total += f.originalSize;
        if (count > SCAN_LIMITS.entries || total > SCAN_LIMITS.totalBytes) throw new Error('archive too large to open');
        return f.originalSize <= SCAN_LIMITS.fileBytes && !f.name.endsWith('/');
      },
    });
  } catch (e) {
    return {
      kind: 'unreadable',
      files: 0,
      totalBytes: bytes.length,
      secrets: [],
      malware: { status: 'unknown', detail: [e instanceof Error && /too large/.test(e.message) ? 'The archive is too big to open here.' : 'The archive could not be opened.'] },
      licenceFile: false,
    };
  }
  const secrets: SecretHit[] = [];
  const detail: string[] = [];
  let status: MalwareStatus = 'clean';
  let totalBytes = 0;
  let licenceFile = false;
  for (const [path, data] of Object.entries(entries)) {
    totalBytes += data.length;
    if (path.split('/').some((p) => p === '..') || path.startsWith('/')) detail.push(`${path}: a path that tries to leave its folder`);
    if (LICENCE_FILE.test(path)) licenceFile = true;
    const text = isTextName(path) ? asText(data) : null;
    if (text) secrets.push(...findSecrets(text, path));
    const r = inspectBytes(path, data, text);
    detail.push(...r.detail);
    if (r.status === 'infected') status = 'infected';
    else if (r.status === 'suspicious' && status !== 'infected') status = 'suspicious';
  }
  if (detail.some((d) => d.includes('tries to leave')) && status === 'clean') status = 'suspicious';
  return { kind: 'archive', files: Object.keys(entries).length, totalBytes, secrets, malware: { status, detail: detail.slice(0, 20) }, licenceFile };
}

/* How alike two texts are, 0 to 1: overlap of their three-word groups. 1 means the same words in the same order. */
const shingles = (t: string) => {
  const w = t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 2 < w.length; i++) out.add(w.slice(i, i + 3).join(' '));
  return out;
};
export function similarity(a: string, b: string): number {
  const x = shingles(a),
    y = shingles(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const s of x) if (y.has(s)) both++;
  return both / (x.size + y.size - both);
}
