import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Catalog, Contract, SupplierYear} from '../../src/types';
import {companyKey, defaultYear} from '../../src/supplierData';

// Dades inventades: la prova no depèn de la captura real.
const contract = (id: string, values: Partial<Contract>): Contract => ({id, source: 'PSCP', expedient: id.toUpperCase(), title: `Objecte ${id}`, year: 2024, lot: null, procedure: 'Obert', type: 'Serveis', status: 'Adjudicació', amountCents: 5000000, vat: 'sense IVA', supplier: null, cpv: null, date: '2024-03-01', url: `https://example.org/${id}`, capturedAt: '2026-10-15', flags: [], ...values});
const supplier = (name: string | null, year: number, invoicedCents: number, values: Partial<SupplierYear> = {}): SupplierYear => ({id: `supplier-${year}-${name ?? 'altres'}`, year, name, category: name ? 'societat' : 'sense nom publicat', emitters: 1, invoices: 3, invoicedCents, maxInvoiceCents: Math.round(invoicedCents / 2), firstDate: `${year}-02-01`, lastDate: `${year}-11-30`, url: `https://example.org/factures/${year}/${name ?? 'altres'}`, capturedAt: '2026-10-15', ...values});
const suppliers = [
  supplier('EMPRESA ALFA, S.L.', 2025, 2500000),
  supplier('Serveis Beta SA', 2025, 2000000),
  supplier('CONSORCI PÚBLIC INVENTAT', 2025, 9000000, {category: 'administració o ens públic'}),
  supplier('PETITA GAMMA SL', 2025, 1000000),
  supplier(null, 2025, 300000, {emitters: 12, invoices: 40}),
  supplier('Serveis Beta SA', 2024, 1200000),
];
const contracts = [contract('a', {supplier: 'EMPRESA ALFA SL'})];

test('noms comparables entre fonts', () => {
  expect(companyKey('EMPRESA ALFA, S.L.')).toBe(companyKey('Empresa Alfa SL'));
  expect(companyKey('Àrids Castellar S.A.U.')).toBe('arids castellar');
  expect(companyKey('Neteges Sccl')).toBe('neteges');
  expect(companyKey('S.L.')).toBe('sl');
  expect(defaultYear([2026, 2025, 2024], 2026)).toBe(2025);
  expect(defaultYear([2026], 2026)).toBe(2026);
});

test.beforeEach(async ({page}) => {
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, contracts, events: [], suppliers}}));
});

test('proveïdors: llindar, contracte trobat per nom i emissors sense nom', async ({page}) => {
  await page.goto('/#suppliers?year=2025');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Proveïdors i facturació');
  const stats = page.locator('.stat');
  await expect(stats.nth(0)).toContainText('52 factures');
  await expect(stats.nth(1)).toContainText('4');
  await expect(stats.nth(2)).toContainText('1');
  await expect(stats.nth(2)).toContainText('de 3 emissors');
  const flagged = page.locator('section[aria-labelledby="flagged-title"] .supplier-item');
  await expect(flagged).toHaveCount(1);
  await expect(flagged.first()).toContainText('Serveis Beta SA');
  await expect(flagged.first()).toContainText('No s’ha trobat contracte amb aquest nom');
  await expect(page.getByText('1 administracions o ens públics superen el llindar')).toBeVisible();

  const all = page.locator('section[aria-labelledby="all-title"]');
  await expect(all.locator('.supplier-item')).toHaveCount(4);
  const alfa = all.locator('.supplier-item', {hasText: 'EMPRESA ALFA'});
  await expect(alfa).toContainText('1 contracte trobat');
  await alfa.locator('summary').click();
  await expect(alfa.getByRole('button', {name: 'Objecte a'})).toBeVisible();
  await expect(all).toContainText('12 emissors sense nom publicat');

  await flagged.first().locator('summary').click();
  await expect(flagged.first().locator('tbody tr')).toHaveCount(2);

  await page.getByLabel('Cerca un proveïdor').fill('gamma');
  await expect(all.locator('.supplier-item')).toHaveCount(1);
  await expect(page).toHaveURL(/name=gamma/);

  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Exporta l’exercici'}).click();
  const file = await fs.readFile(await (await download).path(), 'utf8');
  expect(file).toContain('Per sobre del llindar sense contracte trobat');
  expect(file).toContain('Emissors sense nom publicat');
});

test('proveïdors: catàleg antic sense factures', async ({page}) => {
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, suppliers: undefined}}));
  await page.goto('/#suppliers');
  await expect(page.getByText('Aquesta captura encara no inclou les factures')).toBeVisible();
});

test('factures en un fitxer a part: càrrega a demanda i avís si falla', async ({page}) => {
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  const {suppliers: _omitted, ...rest} = data;
  let fail = false;
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...rest, contracts, suppliersFile: 'suppliers.json'}}));
  await page.route('**/data/suppliers.json', route => fail ? route.fulfill({status: 404, body: ''}) : route.fulfill({json: {generatedAt: data.generatedAt, suppliers}}));
  await page.goto('/#suppliers');
  await expect(page.locator('.supplier-item', {hasText: 'EMPRESA ALFA'})).toBeVisible();
  fail = true;
  await page.reload();
  await expect(page.getByRole('status').filter({hasText: 'No s’han pogut carregar les factures'})).toBeVisible();
  await page.goto('/#overview');
  await expect(page.getByRole('status').filter({hasText: 'No s’han pogut carregar les factures'})).toHaveCount(0);
});
