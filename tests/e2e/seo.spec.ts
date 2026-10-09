import { expect, test } from '@playwright/test';

/* Category pages: real content, structured data, no thin pages, and the sitemap agrees. Demo mode (starter listings only). */
const DEMO = process.env.DEMO_URL ?? 'http://localhost:3002';
const ld = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map((m) => JSON.parse(m[1]));

test.describe('category pages', () => {
  test('a category with three or more products has its own page, text, cards and structured data', async ({ page, request }) => {
    const html = await (await request.get(`${DEMO}/websites/landing-pages`)).text();
    expect(html).toMatch(/<title>Ready-made landing pages/);
    expect(html).toContain('rel="canonical"');
    const types = ld(html).map((d) => d['@type']);
    expect(types).toEqual(expect.arrayContaining(['BreadcrumbList', 'ItemList', 'FAQPage']));
    expect(ld(html).find((d) => d['@type'] === 'ItemList').itemListElement.length).toBeGreaterThanOrEqual(3);
    await page.goto(`${DEMO}/websites/landing-pages`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/landing pages that turn visitors into sign-ups/);
    expect(await page.locator('a.pcard').count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByRole('heading', { name: 'What to look for' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Filter and compare all landing pages/ })).toHaveAttribute('href', /\/browse\?cat=Landing%20pages/);
  });
  test('a category with fewer than three products has no page; neither does a made-up one or the wrong group', async ({ request }) => {
    expect((await request.get(`${DEMO}/websites/restaurants`)).status()).toBe(404);
    expect((await request.get(`${DEMO}/websites/nope`)).status()).toBe(404);
    expect((await request.get(`${DEMO}/templates/figma-ui-kits`)).status()).toBe(404); // fewer than three today
    expect((await request.get(`${DEMO}/websites/figma-ui-kits`)).status()).toBe(404); // wrong group
  });
  test('the sitemap lists exactly the pages that exist, and the other pages link only to those', async ({ request, page }) => {
    const xml = await (await request.get(`${DEMO}/sitemap.xml`)).text();
    expect(xml).toContain('/websites/landing-pages');
    expect(xml).toContain('/websites/tools');
    expect(xml).not.toContain('/websites/restaurants');
    expect(xml).toContain('/tools/site-ideas');
    await page.goto(`${DEMO}/websites/tools`);
    const links = await page.locator('.prose a[href^="/websites/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(links).toEqual(['/websites/landing-pages']); // only the other category that has a page
  });
});
