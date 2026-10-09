import 'server-only';
import { FakeDomainProvider } from './demo';
import type { DomainProvider } from './types';

/* The one line to change when decision D3 is made: return the real registrar here. */
const fake = ((globalThis as { __fakeDomains?: FakeDomainProvider }).__fakeDomains ??= new FakeDomainProvider());
export const domainProvider = (): DomainProvider => fake;
export type { DomainProvider } from './types';
