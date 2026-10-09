import 'server-only';
import { FakePaymentProvider } from './fake';
import type { PaymentProvider } from './types';

/* The one line to change when decision D1 is made: return the real provider here. */
const fake = ((globalThis as { __fakePay?: FakePaymentProvider }).__fakePay ??= new FakePaymentProvider());
export const fakePayments = fake;
export const paymentProvider = (): PaymentProvider => fake;
export type { PaymentProvider, VerifiedEvent } from './types';
