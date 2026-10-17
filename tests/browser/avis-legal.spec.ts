import {test, expect} from '@playwright/test';

test('avís legal accessible des del peu, amb contacte i sense desplaçament horitzontal', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.locator('.main-footer').getByRole('button', {name: 'Avís legal i contacte'}).click();
  await expect(page).toHaveURL(/#legal$/);
  await expect(page.getByRole('heading', {level: 1, name: 'Avís legal i privacitat'})).toBeVisible();
  await expect(page).toHaveTitle('Avís legal i privacitat · Observatori de Castellar');
  await expect(page.getByRole('link', {name: 'observatoricastellar@gmail.com'}).first()).toHaveAttribute('href', 'mailto:observatoricastellar@gmail.com');
  await expect(page.getByText(/iniciativa ciutadana, independent i sense ànim de lucre/)).toBeVisible();
  await page.getByRole('main').getByRole('button', {name: 'Fonts i qualitat'}).click();
  await expect(page).toHaveURL(/#sources$/);
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/#legal');
  await expect(page.getByRole('heading', {level: 1, name: 'Avís legal i privacitat'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path: 'test-results/avis-legal-mobil.png', fullPage: true});
  expect(errors).toEqual([]);
});
