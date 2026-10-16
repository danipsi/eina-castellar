import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Agreement, Catalog, Grant, SupplierYear} from '../../src/types';
import {elapsed, isLongTerm, isOverdue, isUpcoming, issuesFor} from '../../src/grantData';

// Dades inventades: la prova no depèn de la captura real.
const grant = (id: string, values: Partial<Grant>): Grant => ({id, year: 2025, date: '2025-06-01', call: 'Convocatòria inventada de subvencions a entitats 2025', procedure: 'convocatòria', agreement: null, beneficiary: 'ENTITAT ALFA', category: 'entitat', grants: 1, amountCents: 100000, repeated: 0, url: `https://example.org/${id}`, capturedAt: '2026-10-15', ...values});
const grants = [
  grant('a', {amountCents: 300000}),
  grant('b', {beneficiary: 'Entitat Alfa', amountCents: 50000, call: 'Acord de subvenció nominativa a Entitat Alfa amb conveni CONV2400001', procedure: 'sense convocatòria', agreement: 'CONV2400001', date: '2025-09-01'}),
  grant('c', {beneficiary: 'CLUB BETA', amountCents: 200000, repeated: 1}),
  grant('d', {beneficiary: null, category: 'sense nom publicat', grants: 3, amountCents: 90000, call: 'Ajuts inventats a persones autònomes', url: 'https://example.org/dataset'}),
  grant('e', {year: 2024, date: '2024-05-01', amountCents: 120000}),
];
const suppliers: SupplierYear[] = [{id: 'supplier-2025-beta', year: 2025, name: 'CLUB BETA', category: 'entitat', emitters: 1, invoices: 2, invoicedCents: 800000, maxInvoiceCents: 500000, firstDate: '2025-02-01', lastDate: '2025-10-01', url: 'https://example.org/factures', capturedAt: '2026-10-15'}];
const agreement = (code: string, values: Partial<Agreement>): Agreement => ({id: `agreement-${code}`, code, title: `Conveni inventat ${code}`, description: null, start: '2024-01-01', end: '2024-12-31', endIssue: null, status: 'En curs', extendable: true, url: `https://example.org/${code}`, capturedAt: '2026-10-15', ...values});
const agreements = [
  agreement('CONV2400001', {}),
  agreement('CONV2400002', {extendable: false, end: '2025-06-30'}),
  agreement('CONV2400003', {start: '2026-01-01', end: '2026-12-31'}),
  agreement('CONV2400004', {end: null, endIssue: 'absent'}),
  agreement('CONV2400005', {start: '2020-01-01', end: '2030-12-31'}),
  agreement('CONV2400006', {status: 'Finalitzat', end: '2023-12-31'}),
];

test('convenis: vigència respecte de la data de referència', () => {
  const ref = '2026-10-15';
  expect(isOverdue(agreements[0], ref)).toBe(true);
  expect(isOverdue(agreements[5], ref)).toBe(false);
  expect(isUpcoming(agreements[2], ref)).toBe(true);
  expect(isUpcoming(agreements[2], '2025-10-15')).toBe(false);
  expect(isLongTerm(agreements[4])).toBe(true);
  expect(isLongTerm(agreement('X', {start: '2022-01-01', end: '2025-12-31'}))).toBe(false);
  expect(issuesFor(agreements[3], ref)).toEqual(['Sense data de fi']);
  expect(elapsed('2024-12-31', ref)).toBe('21 mesos');
  expect(elapsed('2020-01-01', ref)).toBe('6 anys');
  expect(elapsed('2026-10-10', ref)).toBe('5 dies');
});

test.beforeEach(async ({page}) => {
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, grants, agreements, suppliers}}));
});

test('subvencions: entitats agrupades, sense convocatòria i factures del mateix nom', async ({page}) => {
  await page.goto('/#grants?year=2025');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Subvencions i convenis');
  const stats = page.locator('.stat');
  await expect(stats.nth(0)).toContainText('6.400,00');
  await expect(stats.nth(0)).toContainText('6 concessions');
  await expect(stats.nth(0)).toContainText('2 entitats amb nom');
  await expect(stats.nth(1)).toContainText('7,8%');
  await expect(stats.nth(2)).toContainText('1');

  const items = page.locator('section[aria-labelledby="entities-title"] .grant-item');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('ENTITAT ALFA');
  await expect(items.first()).toContainText('3.500,00');
  await expect(items.first()).toContainText('500,00 € sense convocatòria');
  await expect(items.nth(1)).toContainText('També factura');
  await expect(page.getByText('3 concessions a persones físiques')).toBeVisible();

  await items.first().locator('summary').click();
  await expect(items.first().locator('.year-summary tbody tr')).toHaveCount(2);
  await items.first().getByRole('button', {name: 'Conveni CONV2400001'}).click();
  await expect(page).toHaveURL(/view=convenis/);
  await expect(page.locator('section[aria-labelledby="agreements-title"] tbody tr')).toHaveCount(1);
  await expect(page.locator('section[aria-labelledby="agreements-title"]')).toContainText('1 subvenció citada');
});

test('subvencions: exportació i cerca', async ({page}) => {
  await page.goto('/#grants?year=2025');
  await page.getByLabel('Cerca una entitat').fill('beta');
  await expect(page.locator('.grant-item')).toHaveCount(1);
  await expect(page).toHaveURL(/name=beta/);
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Exporta l’exercici'}).click();
  const file = await fs.readFile(await (await download).path(), 'utf8');
  expect(file).toContain('Concessions sense nom publicat');
  expect(file).toContain('CONV2400001');
  expect(file).toContain('"8000,00"');
});

test('convenis: vençuts en curs, venciments i vigència a revisar', async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00Z'));
  await page.goto('/#grants?view=convenis');
  const stats = page.locator('.stat');
  await expect(stats.nth(0)).toContainText('2');
  await expect(stats.nth(0)).toContainText('de 5 convenis en curs · 1 no prorrogable');
  await expect(stats.nth(1)).toContainText('1');
  await expect(stats.nth(2)).toContainText('2');
  const overdue = page.locator('section[aria-labelledby="overdue-title"] tbody tr');
  await expect(overdue).toHaveCount(2);
  await expect(overdue.first()).toContainText('CONV2400002');
  await expect(overdue.first()).toContainText('No prorrogable');
  await expect(page.locator('section[aria-labelledby="review-title"]')).toHaveCount(0);
  await page.getByRole('button', {name: /Vigència a revisar/}).click();
  await expect(page).toHaveURL(/llista=revisar/);
  await expect(page.locator('section[aria-labelledby="review-title"]')).toContainText('Durada superior a 4 anys');

  await page.getByRole('button', {name: /Tots els convenis/}).click();
  await page.getByLabel('Estat del conveni').selectOption('Finalitzat');
  await expect(page.locator('section[aria-labelledby="agreements-title"] tbody tr')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Exporta els convenis'}).click();
  const file = await fs.readFile(await (await download).path(), 'utf8');
  expect(file).toContain('Vençut i en curs');
});

test('subvencions: catàleg antic sense subvencions ni convenis', async ({page}) => {
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, grants: undefined, agreements: undefined}}));
  await page.goto('/#grants');
  await expect(page.getByText('Aquesta captura encara no inclou les subvencions')).toBeVisible();
  await page.getByRole('button', {name: 'Convenis', exact: true}).click();
  await expect(page.getByText('Aquesta captura encara no inclou els convenis')).toBeVisible();
});
