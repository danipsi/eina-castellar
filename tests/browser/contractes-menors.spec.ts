import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Catalog, Contract} from '../../src/types';

// Contractes inventats: la prova no depèn de la captura real.
const contract = (id: string, values: Partial<Contract>): Contract => ({id, source: 'PSCP', expedient: id.toUpperCase(), title: `Objecte ${id}`, year: 2025, lot: null, procedure: 'Contracte menor', type: 'Serveis', status: 'Adjudicació', amountCents: 100000, vat: 'sense IVA', supplier: null, cpv: null, date: '2025-03-01', url: `https://example.org/${id}`, capturedAt: '2026-10-15', flags: [], ...values});
const contracts = [
  contract('a', {amountCents: 1450000, supplier: 'EMPRESA ALFA SL', cpv: '79952000-2', title: 'Organització de la festa de prova'}),
  contract('a-lot', {expedient: 'A', lot: '1', amountCents: 1450000, status: 'Publicació agregada de contractes'}),
  contract('b', {amountCents: 900000, supplier: 'EMPRESA ALFA SL', cpv: '79952100-3', date: '2025-06-01'}),
  contract('c', {type: 'Obres', amountCents: 3900000, cpv: '45000000-7'}),
  contract('d', {year: 2024, date: '2024-05-01', amountCents: 1600000}),
  contract('e', {procedure: 'Obert', amountCents: 1490000}),
  contract('g', {type: 'Concessió de serveis', amountCents: 1400000}),
  contract('f', {source: 'RPC', procedure: 'Menor', type: '5. SERVEIS', amountCents: 1400000, vat: 'no especificat'}),
];

test.beforeEach(async ({page}) => {
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, contracts, events: []}}));
});

test('contractes menors: llindar, duplicats, adjudicatari i CPV', async ({page}) => {
  await page.goto('/#contracts');
  await page.getByRole('button', {name: 'Patrons en contractes menors'}).click();
  await expect(page).toHaveURL(/view=menors/);
  const stats = page.locator('.minor-patterns .stat');
  await expect(stats.nth(0)).toContainText('4');
  await expect(stats.nth(1)).toContainText('2');
  await expect(stats.nth(2)).toContainText('1');
  await expect(page.locator('.calculation-note')).toContainText('1 registres repetits');
  const near = page.locator('section[aria-labelledby="near-title"]');
  await expect(near.locator('.year-summary tbody tr')).toHaveCount(2);
  await expect(near.getByRole('button', {name: 'Organització de la festa de prova'})).toBeVisible();
  await expect(near).toContainText('97,5%');
  await expect(near).toContainText('Iguals o per sobre del llindar');

  const supplier = page.locator('section[aria-labelledby="supplier-title"] .pattern-group');
  await expect(supplier).toHaveCount(1);
  await expect(supplier).toContainText('EMPRESA ALFA SL');
  await expect(supplier).toContainText('2 contractes');
  await expect(supplier).toContainText('23.500,00');

  const cpv = page.locator('section[aria-labelledby="cpv-title"]');
  await expect(cpv.locator('.pattern-group')).toHaveCount(1);
  await expect(cpv.locator('.pattern-group')).toContainText('7995');
  await cpv.getByLabel('Nivell del codi CPV').selectOption('8');
  await expect(page).toHaveURL(/cpv=8/);
  await expect(cpv.locator('.pattern-group')).toHaveCount(0);
  await expect(cpv).toContainText('Cap grup compleix el criteri');

  await page.getByLabel('Exercici dels contractes menors').selectOption('2024');
  await expect(stats.nth(0)).toContainText('1');
  await expect(near.locator('.year-summary')).toHaveCount(0);

  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Exporta els patrons'}).click();
  const file = await (await download).path();
  const text = await fs.readFile(file!, 'utf8');
  expect(text).toContain('"Patró";"Grup";"Exercici"');
  expect(text).toContain('Igual o per sobre del llindar');
});

test('contractes menors: avís del RPC i CPV a la fitxa', async ({page}) => {
  await page.goto('/#contracts?view=menors&source=RPC');
  await expect(page.locator('.minor-patterns .notice.warning')).toContainText('no acredita si els imports porten IVA');
  await expect(page.locator('.minor-patterns .stat').nth(0)).toContainText('1');
  await page.goto('/#contracts?view=menors');
  await page.locator('section[aria-labelledby="supplier-title"] summary').click();
  await page.locator('section[aria-labelledby="supplier-title"]').getByRole('button', {name: 'Organització de la festa de prova'}).click();
  await expect(page.getByRole('dialog')).toContainText('CPV 79952000-2');
});
