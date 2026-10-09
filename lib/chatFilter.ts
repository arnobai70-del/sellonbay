/*
 * Keeps contact details and outside payments off SellOnBay. Used on the server for every message (order chat, pre-sale questions,
 * briefs, profiles) and in the browser as a friendly preview. The server result is the one that counts.
 *
 * It looks at a cleaned-up copy of the text, so tricks like "name at gmail dot com", "n a m e @ g m a i l", "five five five 0123",
 * zero-width characters or full-width digits do not get through. Plain mentions that a buyer may really ask about
 * ("does it work with Gmail?", "can I take payments with PayPal?") are allowed.
 */
export type BlockReason = 'email' | 'phone' | 'contact_channel' | 'link' | 'outside_payment';
export type FilterResult = { ok: true } | { ok: false; reason: BlockReason };

const DIGIT_WORDS: Record<string, string> = { zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9' };

/* Lower case, plain letters, no zero-width or invisible characters. */
const clean = (raw: string) =>
  raw
    .normalize('NFKD')
    .replace(/[̀-ͯ​-‏⁠﻿­]/g, '')
    .toLowerCase();

const looksLikeEmail = (t: string): boolean => {
  const plain = /[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}/;
  if (plain.test(t)) return true;
  // "name at gmail dot com", "name (at) gmail (dot) com", "name[at]gmail[dot]com"
  let s = t.replace(/\s*[[({<]\s*at\s*[\])}>]\s*/g, '@').replace(/\s+at\s+/g, '@');
  s = s.replace(/\s*[[({<]\s*dot\s*[\])}>]\s*/g, '.').replace(/\s+dot\s+/g, '.');
  s = s.replace(/\s*@\s*/g, '@').replace(/\s*\.\s*/g, '.');
  if (plain.test(s)) return true;
  // letters spread out with spaces: "n a m e @ g m a i l . c o m". Only checked when there is an @ or an at/dot word.
  if (/@|\bat\b|\bdot\b/.test(t)) return /[a-z0-9._%+-]{2,}@[a-z0-9-]{2,}\.[a-z]{2,}/.test(s.replace(/\s+/g, ''));
  return false;
};

const looksLikePhone = (t: string): boolean => {
  const s = t.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' '); // a date is not a phone number
  let run = 0;
  let gap = 0;
  for (const m of s.matchAll(/(\d)|\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b|([\s\-().+/_,])|(.)/g)) {
    if (m[1] || m[2]) {
      run++;
      gap = 0;
      if (run >= 7) return true;
    } else if (m[3]) {
      if (++gap > 3) run = 0;
    } else {
      run = 0;
      gap = 0;
    }
  }
  return false;
};

const CONTACT =
  /\b(whats\s*app|whatsapp|telegram|skype|discord|wechat|viber|messenger|signal\s+app|(text|call|ring|dm)\s+me|(my|me\s+on)\s+(number|phone|mobile|email|e-mail|insta|instagram|facebook)|contact\s+me\s+(at|on|outside)|reach\s+me\s+(at|on)|t\.me|wa\.me|discord\.gg)\b/;
const LINK = /(https?:\/\/|\bwww\.|\bbit\.ly\/|\btinyurl\.com\/)/;
const PAY_STANDALONE = /\b(venmo|zelle|cash\s*app|cashapp|bkash|nagad|western\s+union|moneygram)\b/;
const PAY_METHOD = '(paypal|payoneer|wise|crypto|bitcoin|btc|usdt|binance|bank|wire|upi|paytm|remitly)';
const PAY_CONTEXT = new RegExp(`\\b(pay|paid|send|sent|transfer|deposit|settle)\\b.{0,40}\\b${PAY_METHOD}\\b|\\b${PAY_METHOD}\\b.{0,25}\\b(me|my|id|account|address|details|number)\\b`);
const PAY_PHRASE =
  /\b(pay|deal|talk|chat|contact|buy|order)\s+(me\s+|you\s+)?(outside|off\s*site|off[\s-]*platform|directly|direct)\b|\b(outside|off|without)\s+(the\s+)?(platform|sellonbay|launchbay|escrow|site)\b|\b(skip|bypass|avoid)\s+(the\s+)?(escrow|fees?|platform)\b|\bdirect\s+payment\b|\bpay\s+me\b/;

export function checkMessage(raw: string): FilterResult {
  const t = clean(raw);
  if (looksLikeEmail(t)) return { ok: false, reason: 'email' };
  if (looksLikePhone(t)) return { ok: false, reason: 'phone' };
  if (PAY_STANDALONE.test(t) || PAY_CONTEXT.test(t) || PAY_PHRASE.test(t)) return { ok: false, reason: 'outside_payment' };
  if (CONTACT.test(t)) return { ok: false, reason: 'contact_channel' };
  if (LINK.test(t)) return { ok: false, reason: 'link' };
  return { ok: true };
}

export const isBlocked = (text: string) => !checkMessage(text).ok;

export const REASON_TEXT: Record<BlockReason, string> = {
  email: 'an email address',
  phone: 'a phone number',
  contact_channel: 'another way to contact you',
  link: 'a link',
  outside_payment: 'paying outside SellOnBay',
};
export const BLOCKED_MESSAGE = 'We could not send that. Please keep contact details, links and payments on SellOnBay, so both of you stay protected. Ask your question without them.';
