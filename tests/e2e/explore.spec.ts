import { expect, test } from '@playwright/test';

/* The home page: a store-style page over the same products. Real products only, no brand logos, no claims we cannot keep. */
const DEMO = process.env.DEMO_URL ?? 'http://localhost:3002';

test('has one h1, every shelf with a count, featured products that open, and tabs that reorder', async ({ page }) => {
  await page.goto(`${DEMO}/`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  for (const name of ['Websites', 'Android apps', 'iPhone & iPad apps', 'Web apps', 'Desktop apps', 'Digital products']) await expect(page.locator('.ex-tile', { hasText: name })).toBeVisible();
  await expect(page.locator('.ex-tile', { hasText: 'Websites' })).toContainText(/\d+ products/);
  const first = page.locator('.ex-grid .ex-card').first();
  await expect(first).toBeVisible();
  const popular = await page.locator('.ex-grid .ex-name').allTextContents();
  await page.getByRole('tab', { name: 'New', exact: true }).click();
  await expect(page).toHaveURL(/tab=new/);
  await expect(page.getByRole('tab', { name: 'New', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect(await page.locator('.ex-grid .ex-name').allTextContents()).not.toEqual(popular);
  await page.locator('.ex-grid .ex-card-in').first().click();
  await expect(page).toHaveURL(/\/product\//);
});

test('does not promise what we do not have', async ({ page }) => {
  await page.goto(`${DEMO}/`);
  const text = await page.locator('main, .ex').first().innerText();
  for (const bad of [/24\/7/i, /instant delivery/i, /50% off/i, /minutes/i]) expect(text).not.toMatch(bad);
  await expect(page.locator('.ex-trust').getByText('Held in escrow')).toBeVisible();
});

test('the top bar searches the chosen shelf, the side menu has its own links, and a phone keeps the page inside its width', async ({ page }) => {
  await page.goto(`${DEMO}/`);
  await expect(page.locator('header.hdr')).toHaveCount(0); // its own shell, not the site's top bar
  await page.locator('#st-q').fill('timer');
  await page.locator('#st-shelf').selectOption('/apps/desktop');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/\/apps\/desktop\?q=timer/);
  await page.goto(`${DEMO}/`);
  await page.locator('.st-side').getByRole('link', { name: 'New arrivals' }).click();
  await expect(page).toHaveURL(/tab=new/);
  await expect(page.locator('.st-side a[aria-current]')).toHaveText('New arrivals');
  await page.locator('.st-side .logo').click();
  await expect(page).toHaveURL(`${DEMO}/`);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`${DEMO}/`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator('.ex-tile').first()).toBeVisible();
});

test('the old /explore address goes to the home page, and the globe hero lives on /welcome', async ({ page, request }) => {
  const r = await request.get(`${DEMO}/explore?tab=new`, { maxRedirects: 0 });
  expect([301, 307, 308]).toContain(r.status());
  expect(r.headers().location).toContain('/?tab=new');
  await page.goto(`${DEMO}/welcome`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pick a site');
  await expect(page.locator('header.hdr')).toBeVisible(); // the site's own top bar is back
  await page.goto(`${DEMO}/`);
  await page.locator('.st-side').getByRole('link', { name: 'About SellOnBay' }).click();
  await expect(page).toHaveURL(`${DEMO}/welcome`);
});

test('the hero plays the laptop video (a still picture for people who want less motion)', async ({ page }) => {
  await page.goto(`${DEMO}/`);
  const v = page.locator('.ex-hero video');
  await expect(v).toHaveAttribute('src', '/video/work-laptop.mp4');
  await expect(v).toHaveAttribute('poster', /work-laptop-poster/);
  await expect.poll(() => v.evaluate((el: HTMLVideoElement) => !el.paused && el.currentTime > 0), { timeout: 10_000 }).toBe(true);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); // the words stay on top
});

test('a row of apps and software comes before the featured list, with four orders and a buy button', async ({ page }) => {
  await page.goto(`${DEMO}/`);
  const apps = page.locator('section[aria-labelledby="ex-apps"]');
  const feat = page.locator('section[aria-labelledby="ex-feat"]');
  await expect(apps.getByRole('heading', { name: 'Apps and software' })).toBeVisible();
  const a = await apps.boundingBox();
  const f = await feat.boundingBox();
  expect(a!.y).toBeLessThan(f!.y); // above it
  const cards = apps.locator('.ex-mini');
  await expect(cards).toHaveCount(6);
  for (const t of await apps.locator('.ex-mini-plat').allTextContents()) expect(t).not.toBe('Websites'); // apps and software only
  const popular = await apps.locator('.ex-mini .ex-name').allTextContents();
  for (const name of ['Popular', 'New arrivals', 'Best sellers', 'Top rated']) await expect(apps.getByRole('tab', { name })).toBeVisible();
  await apps.getByRole('tab', { name: 'New arrivals' }).click();
  await expect(page).toHaveURL(/row=new/);
  await expect(apps.getByRole('tab', { name: 'New arrivals' })).toHaveAttribute('aria-selected', 'true');
  expect(await apps.locator('.ex-mini .ex-name').allTextContents()).not.toEqual(popular);
  await feat.getByRole('tab', { name: 'Top rated' }).click(); // the two rows keep each other's choice
  await expect(page).toHaveURL(/row=new/);
  await expect(page).toHaveURL(/tab=top/);
  const buy = apps.locator('.ex-buy').first();
  await expect(buy).toHaveAttribute('href', /\/checkout\?id=.+&pkg=asis/);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`${DEMO}/`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('sections below the screen rise in as you scroll, and nothing is ever left hidden', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${DEMO}/`);
  await expect(page.locator('.ex-hero h1')).toHaveCSS('opacity', '1'); // the hero words finish arriving
  const banners = page.locator('.ex-banners');
  await expect(banners).toHaveClass(/\brise\b/); // starts below the screen, so it waits
  await expect(banners).not.toHaveClass(/\bin\b/);
  expect(
    await banners
      .locator('.ex-ban')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity),
  ).toBe('0');
  await banners.scrollIntoViewIfNeeded();
  await expect(banners).toHaveClass(/\bin\b/);
  for (const b of await banners.locator('.ex-ban').all()) await expect(b).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280); // rising moves up and down only
  // a group already on screen at load is never hidden
  expect(await page.locator('.ex-tiles').evaluate((el) => el.classList.contains('rise') && !el.classList.contains('in'))).toBe(false);
  // switching tabs after the cards came in keeps the new cards visible
  const grid = page.locator('.ex-grid');
  await grid.scrollIntoViewIfNeeded();
  await expect(grid).toHaveClass(/\bin\b/);
  await page.getByRole('tab', { name: 'Top rated' }).last().click();
  await expect(page).toHaveURL(/tab=top/);
  for (const c of await grid.locator('.ex-card').all()) await expect(c.locator('xpath=ancestor::div[contains(@class,"tilt")][1]')).toHaveCSS('opacity', '1');
  expect(errors).toEqual([]);
});

test('with reduced motion the store home shows everything at once', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${DEMO}/`);
  await expect(page.locator('.rise')).toHaveCount(0);
  expect(await page.locator('.ex-hero h1').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  for (const b of await page.locator('.ex-ban').all()) expect(await b.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});
