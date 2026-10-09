import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ALL_PRODUCTS } from '../apps';
import { cacheGet, cachePut, monthTokens, recordRun, runsToday } from '../ai/usage';
import { verifyTurnstile } from '../bot/turnstile';
import { CONFIG, DAY_MS } from '../config';
import { registrarLive } from '../domains';
import { aiProvider, type AiProvider } from '../providers/ai';
import { domainProvider } from '../providers/domain';
import { matchProducts } from './siteIdeas';

/*
 * The free tool, end to end (spec 10 and 11): check the input, serve a saved answer if the same question was asked in the last 30 days (free, and it
 * does not use up the visitor's runs), otherwise check the bot test, the daily caps (5 runs per visitor, counted by cookie AND by address), and the
 * monthly budget switch, then ask the model, check what comes back, look up the domain names and match products. Nothing here trusts the model's text.
 */
export const TOOL = 'site-ideas';
const answerSchema = z.object({
  ideas: z
    .array(z.object({ title: z.string().min(3).max(140), why: z.string().min(3).max(300) }))
    .min(1)
    .max(5),
  names: z
    .array(z.string().regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/))
    .min(1)
    .max(10),
});

export type NameCheck = { name: string; domain: string; status: 'available' | 'taken' | 'unknown' };
export type Output = {
  ideas: { title: string; why: string }[];
  names: NameCheck[];
  products: { id: string; name: string; price: number; tag: string }[];
  cached: boolean;
  live: boolean;
  left: number;
};
export type Result = { ok: true; data: Output } | { ok: false; status: number; error: string };

export type Deps = { ai: AiProvider; verify: (token: string | undefined, ip: string) => Promise<boolean>; now: () => number; budget: () => number };
export const defaultDeps: Deps = { ai: aiProvider(), verify: verifyTurnstile, now: () => Date.now(), budget: () => Number(process.env.AI_MONTHLY_TOKEN_BUDGET ?? 2_000_000) };

const fail = (status: number, error: string): Result => ({ ok: false, status, error });
export const normalise = (idea: string) =>
  idea
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export const inputHash = (idea: string) => createHash('sha256').update(normalise(idea).toLowerCase()).digest('hex');
export const ipSubject = (ip: string) => 'ip:' + createHash('sha256').update(ip).digest('hex').slice(0, 24);

type Core = { ideas: Output['ideas']; names: string[] };

async function finish(core: Core, cached: boolean, idea: string, left: number): Promise<Result> {
  const live = registrarLive();
  const names: NameCheck[] = await Promise.all(
    core.names.map(async (name) => {
      if (!live) return { name, domain: `${name}.com`, status: 'unknown' as const };
      try {
        const hit = (await domainProvider().search(name)).find((r) => r.tld === '.com');
        return { name, domain: `${name}.com`, status: hit ? (hit.available ? ('available' as const) : ('taken' as const)) : ('unknown' as const) };
      } catch {
        return { name, domain: `${name}.com`, status: 'unknown' as const };
      }
    }),
  );
  const products = matchProducts(idea, ALL_PRODUCTS).map((p) => ({ id: p.id, name: p.name, price: p.price, tag: p.tag }));
  return { ok: true, data: { ideas: core.ideas, names, products, cached, live, left } };
}

export async function runSiteIdeas(i: { idea: string; cookieId: string; ip: string; token?: string }, deps: Deps = defaultDeps): Promise<Result> {
  const idea = normalise(i.idea);
  if (idea.length < 3 || idea.length > 140) return fail(400, 'Describe your business in one line, 3 to 140 characters.');
  const now = deps.now();
  const subjects = [`cookie:${i.cookieId}`, ipSubject(i.ip)];
  const used = Math.max(...(await Promise.all(subjects.map((s) => runsToday(s, TOOL, now)))));
  const left = Math.max(0, CONFIG.ai.freeRunsPerDay - used);

  const hash = inputHash(idea);
  const hit = await cacheGet<Core>(TOOL, hash, CONFIG.ai.cacheDays * DAY_MS, now);
  if (hit) return finish(hit, true, idea, left);

  if (!(await deps.verify(i.token, i.ip))) return fail(400, 'Please finish the bot check and try again.');
  if (left <= 0) return fail(429, `You used your ${CONFIG.ai.freeRunsPerDay} free runs for today. Come back tomorrow, or browse the ready-made sites now.`);
  const budget = deps.budget();
  if (budget > 0 && (await monthTokens(now, TOOL)) >= budget) return fail(503, 'This free tool is resting for the rest of the month. Browse the ready-made sites instead.');

  let out;
  try {
    out = await deps.ai.complete({ feature: TOOL, prompt: idea, maxTokens: 700, userKey: subjects[0] });
  } catch {
    return fail(502, 'The idea helper did not answer. Nothing was used, try again.');
  }
  let parsed;
  try {
    parsed = answerSchema.safeParse(JSON.parse(out.text));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) return fail(502, 'The idea helper gave an answer we could not use. Nothing was used, try again.');

  await recordRun(subjects, TOOL, out.tokensIn, out.tokensOut, now);
  await cachePut(TOOL, hash, parsed.data, now);
  return finish(parsed.data, false, idea, left - 1);
}
