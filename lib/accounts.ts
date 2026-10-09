/* Is this profile row allowed to act right now? Banned, or suspended until a time that has not come yet (see lib/strikes.ts). No imports: the proxy uses it too. */
export const cannotAct = (p: { banned?: boolean | null; suspended_until?: string | null } | null | undefined, now = Date.now()) =>
  !p || !!p.banned || (!!p.suspended_until && Date.parse(p.suspended_until) > now);
