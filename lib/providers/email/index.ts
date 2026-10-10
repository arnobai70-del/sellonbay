/* Real delivery is explicitly opt-in. Missing credentials must not pretend to send. */
import { ResendEmailProvider, resendConfigured } from './resend';
export type Mail = { to: string; subject: string; text: string; idempotencyKey?: string };
export interface EmailProvider {
  readonly name: string;
  send(mail: Mail): Promise<void>;
}

/* Test double and the development default: keeps what would have been sent. */
export class FakeEmailProvider implements EmailProvider {
  readonly name = 'fake';
  sent: Mail[] = [];
  async send(mail: Mail) {
    this.sent.push(mail);
  }
}

const fake = ((globalThis as { __fakeEmail?: FakeEmailProvider }).__fakeEmail ??= new FakeEmailProvider());
const unavailable: EmailProvider = {
  name: 'unconfigured',
  async send() { throw new Error('Email provider is not configured.'); },
};
/** Resend is available only after the owner explicitly enables it with valid env settings. */
export const emailProvider = (): EmailProvider => {
  if (process.env.EMAIL_PROVIDER !== 'resend') return fake;
  if (!resendConfigured()) return unavailable;
  return new ResendEmailProvider(process.env.RESEND_API_KEY!.trim(), process.env.EMAIL_FROM!.trim());
};
export const fakeEmail = fake;
