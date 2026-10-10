import type { EmailProvider, Mail } from './index';

type EmailEnv = Record<string, string | undefined>;
export const resendConfigured = (env: EmailEnv = process.env): boolean => {
  if (env.EMAIL_PROVIDER !== 'resend') return false;
  const key = env.RESEND_API_KEY?.trim() ?? '';
  const sender = env.EMAIL_FROM?.trim() ?? '';
  // Syntax check only: the sender must also be verified in the Resend account.
  if (!/^re_[A-Za-z0-9_-]{12,}$/.test(key) || /[\r\n]/.test(sender)) return false;
  const address = /^([^<>]+\s<)?([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>?$/.exec(sender);
  return !!address && sender.length <= 254;
};

/** Optional provider. No SDK or implicit outgoing email in a demo deployment. */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly http: typeof fetch = fetch,
  ) {}
  async send(mail: Mail): Promise<void> {
    // Never log a bearer token, recipient, subject, response body or payload.
    const response = await this.http('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(mail.idempotencyKey ? { 'Idempotency-Key': mail.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: this.from, to: [mail.to], subject: mail.subject, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Email provider rejected the notification.');
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error('Email provider did not confirm acceptance.');
    }
    if (!body || typeof body !== 'object' || !('id' in body) || typeof body.id !== 'string' || !body.id) {
      throw new Error('Email provider did not confirm acceptance.');
    }
  }
}
