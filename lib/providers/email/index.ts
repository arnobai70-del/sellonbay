/*
 * The one door to email (Resend or Brevo, decision K: keys come from the owner). Only a fake exists today: it keeps what would have been sent.
 * To go live, write a class that implements EmailProvider, read the provider's current docs, and return it from emailProvider().
 */
export type Mail = { to: string; subject: string; text: string };
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
export const emailProvider = (): EmailProvider => fake;
export const fakeEmail = fake;
