import { describe, expect, it } from 'vitest';
import { checkMessage, isBlocked } from '@/lib/chatFilter';

const reason = (t: string) => {
  const r = checkMessage(t);
  return r.ok ? null : r.reason;
};

describe('pre-sale messages: blocked', () => {
  const cases: [string, string][] = [
    ['write to me at john@example.com please', 'email'],
    ['john.smith+shop@mail.example.co.uk', 'email'],
    ['my mail is name at gmail dot com', 'email'],
    ['name (at) gmail (dot) com', 'email'],
    ['name[at]gmail[dot]com', 'email'],
    ['n a m e @ g m a i l . c o m', 'email'],
    ['name AT yahoo DOT com', 'email'],
    ['n​ame@gmail.com', 'email'],
    ['call me on +880 1712 345678', 'phone'],
    ['0171-234-5678', 'phone'],
    ['(555) 123 4567', 'phone'],
    ['five five five zero one two three', 'phone'],
    ['oh one seven one two three four five six', 'phone'],
    ['０１７１２３４５６７', 'phone'],
    ['add me on whatsapp', 'contact_channel'],
    ['WhatsApp me', 'contact_channel'],
    ['lets talk on telegram', 'contact_channel'],
    ['my skype is abc', 'contact_channel'],
    ['dm me on discord', 'contact_channel'],
    ['text me later', 'contact_channel'],
    ['check https://evil.example/pay', 'link'],
    ['go to www.example.com', 'link'],
    ['send it to my venmo', 'outside_payment'],
    ['i can pay you on paypal', 'outside_payment'],
    ['pay directly and skip the escrow', 'outside_payment'],
    ['we can do the deal outside the platform', 'outside_payment'],
    ['send bitcoin to my wallet', 'outside_payment'],
    ['bkash number please', 'outside_payment'],
    ['pay me via bank transfer', 'outside_payment'],
    ['can you do it cheaper without escrow', 'outside_payment'],
  ];
  it.each(cases)('blocks %s', (text, why) => {
    expect(reason(text)).toBe(why);
  });
});

describe('pre-sale messages: allowed', () => {
  const fine = [
    'Does it work with Node 20?',
    'Does the workflow connect to Gmail and Slack?',
    'Can I take payments with PayPal or Stripe on the finished site?',
    'The price is $29, is that one site or many?',
    'Does it support 2 or 3 domains?',
    'I have 12 products and 3 languages, will that fit?',
    'Is the Figma file updated for 2026?',
    'Released 2026-10-08, is that the latest version?',
    'What do I get in the zip file?',
    'Is there a 30 day fix guarantee?',
    'How long does setup take, about 2 hours?',
    'Can you add a dark theme? I would pay for that extra.',
    'Version 2.4.1 works on WordPress 6.5, correct?',
  ];
  it.each(fine)('allows %s', (text) => {
    expect(isBlocked(text)).toBe(false);
  });
});
