import {test, expect} from '@playwright/test';

test('el paquet de producció carrega sota el nom del repositori', async ({page}) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {if (response.status() >= 400) failed.push(response.url());});
  await page.goto('./');
  await expect(page.getByRole('heading', {name: 'La informació pública, connectada.'})).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/eina-castellar/favicon.svg');
  const data = await page.request.get('./data/catalog.json');
  expect(data.ok()).toBe(true);
  await page.goto('./#contracts');
  await page.reload();
  await expect(page.getByLabel('Filtra contractes')).toBeVisible();
  await page.goto('./#search?q=CONT2400054');
  await expect(page.locator('.subtitle')).toContainText('coincidències exactes del codi');
  await page.getByRole('button', {name: /PSCP · CONT2400054 · lot 1/}).click();
  expect(new URL(page.url()).pathname).toBe('/eina-castellar/');
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText('CONT2400054');
  await page.keyboard.press('Escape');
  await page.goto('./#budget?year=2025&compare=2024&metric=initialCents');
  await expect(page.getByRole('region', {name: 'Comparació pressupostària'})).toBeVisible();
  await expect(page.getByLabel('Magnitud de comparació')).toHaveValue('initialCents');
  await page.setViewportSize({width: 1440, height: 1200});
  await page.screenshot({path: 'docs/captures/comparacio-anual.png'});
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('una captura fallida mostra l’avís i manté les dades consultables', async ({page}) => {
  await page.route('**/data/status.json', route => route.fulfill({json: {status: 'error', attemptedAt: new Date().toISOString()}}));
  await page.goto('./');
  await expect(page.getByRole('status').filter({hasText: 'La darrera actualització no s’ha completat.'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'La informació pública, connectada.'})).toBeVisible();
});
