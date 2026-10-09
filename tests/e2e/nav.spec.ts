import { expect, test, type Page } from '@playwright/test';

/* The two menus in the top bar open when the mouse arrives, so nobody has to guess that there is more behind the name. */
const DEMO = process.env.DEMO_URL ?? 'http://localhost:3002';
test.use({ viewport: { width: 1366, height: 800 } });

/* The cookie notice sits over the bottom of the page; close it if it is there (it is not in every run). */
const bar = (page: Page) => page.locator('header.hdr');
const dismissNotice = async (page: Page) => {
  const got = page.getByRole('button', { name: 'Got it' });
  if (await got.isVisible()) await got.click();
};

test.describe('top bar menus', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${DEMO}/browse`);
    await dismissNotice(page);
  });

  test('Browse sites opens on hover, stays open while the pointer is on it, and closes after it leaves', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Browse sites' });
    const menu = bar(page).getByRole('link', { name: /All websites/ });
    await expect(menu).toBeHidden();
    await btn.hover();
    await expect(menu).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await menu.hover(); // moving down onto the list must not close it
    await expect(menu).toBeVisible();
    await page.mouse.move(700, 600);
    await expect(menu).toBeHidden();
  });

  test('App templates opens on hover and lists the shelves; moving to the other menu switches', async ({ page }) => {
    await page.getByRole('button', { name: 'App templates' }).hover();
    await expect(bar(page).getByRole('link', { name: /Android apps/ })).toBeVisible();
    await expect(bar(page).getByRole('link', { name: /Digital products/ })).toBeVisible();
    await page.getByRole('button', { name: 'Browse sites' }).hover();
    await expect(bar(page).getByRole('link', { name: /All websites/ })).toBeVisible();
    await expect(bar(page).getByRole('link', { name: /Android apps/ })).toBeHidden();
  });

  test('a click on an open menu keeps it open; the keyboard still toggles it; Escape closes it', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'App templates' });
    await btn.hover();
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  test('there is a visible arrow on both names, and a menu entry takes you to its page', async ({ page }) => {
    for (const name of ['Browse sites', 'App templates']) await expect(page.getByRole('button', { name }).locator('svg')).toBeVisible();
    await page.getByRole('button', { name: 'App templates' }).hover();
    await bar(page)
      .getByRole('link', { name: /Web apps/ })
      .click();
    await expect(page).toHaveURL(/\/apps\/web/);
  });
});

test.describe('on a phone width the menus stay flat in the sheet (no hover)', () => {
  test.use({ viewport: { width: 390, height: 800 } });
  test('the sheet shows both menus laid out and the page does not scroll sideways', async ({ page }) => {
    await page.goto(`${DEMO}/browse`);
    await dismissNotice(page);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(bar(page).getByRole('link', { name: /All websites/ })).toBeVisible();
    await expect(bar(page).getByRole('link', { name: /Android apps/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test('Browse sites has a door to the store page', async ({ page }) => {
  await page.goto(`${DEMO}/browse`);
  await dismissNotice(page);
  await page.getByRole('button', { name: 'Browse sites' }).hover();
  await bar(page)
    .getByRole('link', { name: /Explore everything/ })
    .click();
  await expect(page).toHaveURL(`${DEMO}/`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ready to use');
});
