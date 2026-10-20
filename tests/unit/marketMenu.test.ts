import { describe, expect, it } from 'vitest';
import { DIGITAL_CATS, DIGITAL_TOPICS } from '@/lib/apps';
import { MARKET_MENU, menuLinks } from '@/lib/marketMenu';

describe('the marketplace menus', () => {
  it('only send people to pages of this site', () => {
    for (const [label, href] of menuLinks()) {
      expect(href, label).toMatch(/^\/[a-z]/);
      expect(href, label).not.toMatch(/\s/);
    }
  });
  it('have one entry per topic, then web, apps, developers and help, each with a unique key', () => {
    expect(MARKET_MENU.map((e) => e.key)).toEqual(['ai', 'video-templates', 'stock-video', 'audio', 'graphics', 'design-templates', 'photos', '3d', 'fonts', 'web', 'apps', 'dev', 'help']);
  });
  it('sends each topic to the digital shelf with the topic picked, and lists its kinds', () => {
    const audio = MARKET_MENU.find((e) => e.key === 'audio')!;
    expect(audio.href).toBe('/apps/digital?topic=audio');
    expect(audio.groups[0].links).toEqual([
      ['Music', '/apps/digital?topic=audio&cat=Music'],
      ['Sound effects', '/apps/digital?topic=audio&cat=Sound%20effects'],
    ]);
  });
  it('puts every digital kind under a topic or under Web, and every topic kind is a real kind', () => {
    const inTopics = DIGITAL_TOPICS.flatMap((t) => t.cats);
    for (const c of inTopics) expect(DIGITAL_CATS).toContain(c);
    expect(new Set(inTopics).size).toBe(inTopics.length);
    const web = MARKET_MENU.find((e) => e.key === 'web')!.groups.flatMap((g) => g.links.map(([l]) => l));
    for (const c of DIGITAL_CATS.filter((c) => !inTopics.includes(c))) expect(web).toContain(c);
  });
  it('never names a brand we do not own in a feature card', () => {
    for (const e of MARKET_MENU) expect(JSON.stringify(e.feature ?? {})).not.toMatch(/envato|fiverr|flippa/i);
  });
});
