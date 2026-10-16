import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Agreement, Catalog, Contract, Grant, Session, SupplierYear} from '../../src/types';
import {entityTrail, isSearchable} from '../../src/entityData';
import {parseDossierBody} from '../../src/storage';
import {entityEvidence} from '../../src/evidence';

// Dades inventades: la prova no depèn de la captura real.
const supplier = (year: number, invoicedCents: number, name = 'L’ARCA SERVEIS, S.L.'): SupplierYear => ({id: `supplier-${year}-${name.length}`, year, name, category: 'societat', emitters: 1, invoices: 2, invoicedCents, maxInvoiceCents: invoicedCents / 2, firstDate: `${year}-02-01`, lastDate: `${year}-10-01`, url: `https://example.org/factures/${year}`, capturedAt: '2026-10-15'});
const suppliers = [supplier(2025, 3000000), supplier(2024, 1000000, 'L\'ARCA SERVEIS SL'), supplier(2025, 500000, 'ALTRA EMPRESA, S.A.')];
const contract = (id: string, values: Partial<Contract>): Contract => ({id, source: 'PSCP', expedient: 'CONT2500001', title: 'Servei inventat de manteniment', year: 2025, lot: null, procedure: 'Contracte menor', type: 'Serveis', status: 'Adjudicat', amountCents: 1400000, vat: 'Sense IVA', supplier: 'L’Arca Serveis SLU', cpv: null, date: '2025-03-01', url: `https://example.org/${id}`, capturedAt: '2026-10-15', flags: [], ...values});
// La segona fila és la mateixa adjudicació publicada dues vegades: es compta una sola vegada al rastre.
const contracts = [contract('c1', {}), contract('c2', {}), contract('c3', {source: 'RPC', year: 2024, date: '2024-05-01', expedient: 'CONT2400009', amountCents: 900000})];
const grants: Grant[] = [{id: 'g1', year: 2025, date: '2025-06-01', call: 'Subvenció directa inventada', procedure: 'sense convocatòria', agreement: 'CONV2500003', beneficiary: 'L’ARCA SERVEIS SL', category: 'societat', grants: 1, amountCents: 200000, repeated: 0, url: 'https://example.org/g1', capturedAt: '2026-10-15'}];
const agreement = (code: string, title: string): Agreement => ({id: `agreement-${code}`, code, title, description: null, start: '2025-01-15', end: '2026-12-31', endIssue: null, status: 'En curs', extendable: true, url: `https://example.org/${code}`, capturedAt: '2026-10-15'});
const agreements = [agreement('CONV2500003', 'Conveni inventat de col·laboració'), agreement('CONV2500004', 'Conveni amb l’Arca Serveis per a la formació'), agreement('CONV2500005', 'Conveni sense relació')];
const sessions: Session[] = [{id: 's1', title: 'Sessió 2025-04-10', body: 'Junta de Govern', date: '2025-04-10', url: 'https://example.org/s1', capturedAt: '2026-10-14', agenda: [{number: 3, title: 'Aprovació de la factura de L’ARCA SERVEIS, S.L.', expedients: []}, {number: 4, title: 'Arcade municipal', expedients: []}]}];

test.beforeEach(async ({page}) => {
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, contracts, events: [], suppliers, suppliersFile: undefined, grants, agreements, sessions}}));
});

test('fitxa d’entitat: rastre per anys amb totes les fonts i accés des de proveïdors', async ({page}) => {
  await page.goto('/#suppliers?year=2025');
  await page.locator('summary', {hasText: 'L’ARCA SERVEIS'}).first().click();
  await page.getByRole('link', {name: 'Fitxa de l’entitat'}).click();
  await expect(page).toHaveURL(/#entity\?name=/);
  await expect(page.getByRole('heading', {level: 1})).toHaveText('L’ARCA SERVEIS, S.L.');
  const years = page.locator('.entity-years tbody tr');
  await expect(years).toHaveCount(2);
  await expect(years.nth(0)).toContainText('2025');
  await expect(years.nth(0)).toContainText('2 factures');
  await expect(years.nth(0).locator('td').nth(2)).toHaveText('14.000,00 €1 contracte');
  await expect(years.nth(1).locator('td').nth(3)).toHaveText('1');
  await expect(page.locator('section:has(#entity-contracts) .contract-table tbody tr')).toHaveCount(3);
  await expect(page.locator('section:has(#entity-grants)')).toContainText('Subvenció directa inventada');
  const linked = page.locator('section:has(#entity-agreements) .agreement-table');
  await expect(linked).toContainText('CONV2500003');
  await expect(linked).toContainText('CONV2500004');
  await expect(linked).not.toContainText('CONV2500005');
  const mentions = page.locator('.entity-mentions li');
  await expect(mentions).toHaveCount(1);
  await expect(mentions).toContainText('Junta de Govern');
  await page.locator('section:has(#entity-contracts)').getByRole('button', {name: /Obre CONT2400009/}).click();
  const detail = page.getByRole('dialog', {name: 'Fitxa d’expedient'});
  await expect(detail.getByRole('link', {name: 'Fitxa de l’entitat'})).toBeVisible();
});

test('fitxa d’entitat: es desa al dossier i l’enllaç sobreviu a la importació', async ({page}) => {
  await page.goto('/#entity?name=L%E2%80%99ARCA%20SERVEIS%2C%20S.L.');
  await page.getByRole('button', {name: 'Afegeix al dossier: fitxa de L’ARCA SERVEIS, S.L.'}).click();
  const save = page.getByRole('dialog', {name: 'Afegeix al dossier'});
  await save.getByLabel('Nom del dossier').fill('Rastre de proves');
  await save.getByRole('button', {name: 'Desa la referència'}).click();
  await page.goto('/#dossiers');
  const item = page.locator('.evidence-item');
  await expect(item).toContainText('L’ARCA SERVEIS, S.L. · fitxa d’entitat');
  await expect(item).toContainText('contractes: PSCP 1 · RPC 1');
  await item.getByRole('link', {name: 'Obre a l’Observatori'}).click();
  await expect(page.getByRole('heading', {level: 1})).toHaveText('L’ARCA SERVEIS, S.L.');
});

test('fitxa d’entitat: nom desconegut i noms massa curts per buscar al text', async ({page}) => {
  await page.goto('/#entity?name=Entitat%20inexistent');
  await expect(page.getByText('No s’ha trobat cap registre amb aquest nom')).toBeVisible();
  expect(isSearchable('arca')).toBe(false);
  expect(isSearchable('arca serveis')).toBe(true);
  // Amb un apòstrof recte el nom continua sent un enllaç intern vàlid per importar.
  const data = {contracts: [], sessions, suppliers: [supplier(2025, 100, 'L\'OBRADOR, S.L.')], grants: [], agreements: []} as unknown as Catalog;
  const t = entityTrail(data, 'L\'OBRADOR, S.L.');
  expect(t.mentions).toHaveLength(0);
  const dossier = {id: 'd1', title: 'Prova', createdAt: '2026-10-16', updatedAt: '2026-10-16', notes: [], evidence: [entityEvidence(t, '2026-10-15')]};
  expect(parseDossierBody(dossier).evidence[0].href).toBe('#entity?name=L%27OBRADOR%2C%20S.L.');
});
