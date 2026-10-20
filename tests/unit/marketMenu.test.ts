import { describe, expect, it } from 'vitest';
import { DIGITAL_CATS, shelfHref } from '@/lib/apps';
import { MARKET_MENU, menuLinks } from '@/lib/marketMenu';

describe('the marketplace menus', () => {
  it('only send people to pages of this site', () => {
    for (const [label, href] of menuLinks()) {
      expect(href, label).toMatch(/^\/[a-z]/);
      expect(href, label).not.toMatch(/\s/);
    }
  });
  it('have one entry per shelf, then developers, domains and help, each with a unique key', () => {
    expect(MARKET_MENU.map((e) => e.key)).toEqual(['web', 'android', 'ios', 'webapp', 'desktop', 'digital', 'dev', 'domains', 'help']);
  });
  it('lists every digital kind and sends it to its shelf with the category picked', () => {
    const digital = MARKET_MENU.find((e) => e.key === 'digital')!;
    expect(digital.groups[0].all?.[1]).toBe(shelfHref('digital'));
    expect(digital.groups[0].links.map(([l]) => l)).toEqual(DIGITAL_CATS);
    expect(digital.groups[0].links[0][1]).toBe('/apps/digital?cat=Figma%20kits');
  });
  it('never names a brand we do not own in a feature card', () => {
    for (const e of MARKET_MENU) expect(JSON.stringify(e.feature ?? {})).not.toMatch(/envato|fiverr|flippa/i);
  });
});
