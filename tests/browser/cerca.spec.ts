import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Agreement, Catalog, Contract, Grant, Session, SupplierYear} from '../../src/types';

// Dades inventades: la prova no depèn de la captura real.
const contract: Contract = {id: 'c1', source: 'PSCP', expedient: 'CONT9900001', title: 'Servei de manteniment del parc Aurora', year: 2025, lot: null, procedure: 'Obert', type: 'Serveis', status: 'Adjudicat', amountCents: 1_000_000, vat: 'sense IVA', supplier: 'Aurora Serveis SL', date: '2025-03-01', url: 'https://example.org/c1', capturedAt: '2026-10-15', flags: []};
const session: Session = {id: 's1', title: 'Sessió de prova del Ple', body: 'Ple', date: '2025-04-29', url: 'https://example.org/s1', capturedAt: '2026-10-15', agenda: [{number: 1, title: 'Moció presentada pel grup municipal Alfa Verd que porta per títol: Moció per a la millora del parc Aurora', expedients: []}]};
const supplier = (year: number, invoicedCents: number): SupplierYear => ({id: `p${year}`, year, name: 'AURORA SERVEIS SL', category: 'societat', emitters: 1, invoices: 3, invoicedCents, maxInvoiceCents: invoicedCents, firstDate: `${year}-01-10`, lastDate: `${year}-11-10`, url: 'https://example.org/p', capturedAt: '2026-10-15'});
const grant: Grant = {id: 'g1', year: 2025, date: '2025-06-01', call: 'Subvenció directa per a activitats', procedure: 'sense convocatòria', agreement: null, beneficiary: 'ASSOCIACIO AURORA', category: 'entitat', grants: 1, amountCents: 300_000, repeated: 0, url: 'https://example.org/g1', capturedAt: '2026-10-15'};
const agreement: Agreement = {id: 'a1', code: 'CONV9900001', title: 'Conveni de col·laboració amb l’associació Aurora', description: null, start: '2024-01-01', end: '2026-12-31', endIssue: null, status: 'En curs', extendable: false, url: 'https://example.org/a1', capturedAt: '2026-10-15'};

test.beforeEach(async ({page}) => {
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, contracts: [contract], sessions: [session], suppliers: [supplier(2024, 2_000_000), supplier(2025, 2_500_000)], suppliersFile: undefined, grants: [grant], agreements: [agreement]}}));
});

test('cerca transversal: contractes, sessions, mocions, proveïdors, subvencions i convenis', async ({page}) => {
  await page.goto('/#search?q=aurora');
  const tabs = page.getByRole('group', {name: 'Tipus de resultat'});
  await expect(tabs.getByRole('button', {name: /^Tot/})).toContainText('6');
  for (const label of ['Contractació', 'Sessions', 'Mocions', 'Proveïdors', 'Subvencions', 'Convenis']) await expect(tabs.getByRole('button', {name: new RegExp('^' + label)})).toContainText('1');
  await expect(page.locator('.search-result', {hasText: 'AURORA SERVEIS SL'})).toContainText('6 factures · 45.000 € amb IVA · 2024–2025');
  await tabs.getByRole('button', {name: /^Proveïdors/}).click();
  await expect(page).toHaveURL(/type=supplier/);
  await expect(page.locator('.search-result')).toHaveCount(1);
  await page.locator('.search-result').click();
  await expect(page).toHaveURL(/#suppliers\?year=2025&name=AURORA/);
  await expect(page.getByLabel('Cerca un proveïdor')).toHaveValue('AURORA SERVEIS SL');
  await page.goBack();
  await tabs.getByRole('button', {name: /^Mocions/}).click();
  await page.locator('.search-result').click();
  await expect(page.getByRole('dialog', {name: 'Seguiment de la moció'})).toContainText('Moció per a la millora del parc Aurora');
});

test('cerca transversal: el codi exacte d’un conveni porta a la llista de convenis', async ({page}) => {
  await page.goto('/#search?q=conv9900001');
  await expect(page.locator('.subtitle')).toContainText('1 coincidència exacta del codi');
  await expect(page.locator('.search-result')).toHaveCount(1);
  await page.locator('.search-result').click();
  await expect(page).toHaveURL(/view=convenis&conveni=CONV9900001/);
  await expect(page.getByText('Conveni de col·laboració amb l’associació Aurora').first()).toBeVisible();
});
