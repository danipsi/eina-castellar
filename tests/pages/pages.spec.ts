import {test, expect} from '@playwright/test';

const basePath = process.env.PAGES_BASE ?? '/eina-castellar/';

test('el paquet de producció carrega sota el nom del repositori', async ({page}) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {if (response.status() >= 400) failed.push(response.url());});
  await page.goto('./');
  await expect(page.getByRole('heading', {name: 'La informació pública, connectada.'})).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', `${basePath}favicon.svg`);
  const data = await page.request.get('./data/catalog.json');
  expect(data.ok()).toBe(true);
  const feed = await page.request.get('./ple.xml');
  expect(feed.ok()).toBe(true);
  expect(await feed.text()).toContain('<rss version="2.0">');
  await page.goto('./#contracts');
  await page.reload();
  await expect(page.getByLabel('Filtra contractes')).toBeVisible();
  await page.goto('./#search?q=CONT2400054');
  await expect(page.locator('.subtitle')).toContainText('coincidències exactes del codi');
  await page.getByRole('button', {name: /PSCP · CONT2400054 · lot 1/}).click();
  expect(new URL(page.url()).pathname).toBe(basePath);
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText('CONT2400054');
  await page.keyboard.press('Escape');
  await page.goto('./#budget?year=2025&compare=2024&metric=initialCents');
  await expect(page.getByRole('region', {name: 'Comparació pressupostària'})).toBeVisible();
  await expect(page.getByLabel('Magnitud de comparació')).toHaveValue('initialCents');
  await page.setViewportSize({width: 1440, height: 1200});
  await page.screenshot({path: 'test-results/pages-comparacio-anual.png'});
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('les factures es publiquen a part i es carreguen només quan calen', async ({page}) => {
  const catalog = await (await page.request.get('./data/catalog.json')).json();
  expect(catalog.suppliers).toBeUndefined();
  expect(catalog.suppliersFile).toBe('suppliers.json');
  const loaded: string[] = [];
  page.on('request', request => {if (request.url().endsWith('/data/suppliers.json')) loaded.push(request.url());});
  await page.goto('./');
  await expect(page.getByRole('heading', {name: 'La informació pública, connectada.'})).toBeVisible();
  expect(loaded).toEqual([]);
  await page.goto('./#suppliers');
  await expect(page.getByRole('heading', {name: 'Proveïdors i facturació'})).toBeVisible();
  await expect(page.locator('.supplier-item').first()).toBeVisible();
  expect(loaded).toHaveLength(1);
});

test('una captura fallida mostra l’avís i manté les dades consultables', async ({page}) => {
  await page.route('**/data/status.json', route => route.fulfill({json: {status: 'error', attemptedAt: new Date().toISOString()}}));
  await page.goto('./');
  await expect(page.getByRole('status').filter({hasText: 'La darrera actualització no s’ha completat.'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'La informació pública, connectada.'})).toBeVisible();
});
