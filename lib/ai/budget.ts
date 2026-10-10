/**
 * Emergency AI spending controls. This is an upper-bound preflight, not a
 * concurrency-safe reservation or provider billing ledger.
 */
export function allowedAiBudget(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function reservedAiTokens(prompt: string, maxOutputTokens: number): number {
  // Conservative overestimate for short site-ideas prompts. Provider-specific
  // tokenisation and atomic multi-worker reservations remain launch tasks.
  return Math.ceil(prompt.length / 2) + maxOutputTokens;
}
