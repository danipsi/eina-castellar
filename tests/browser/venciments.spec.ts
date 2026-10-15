import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Catalog, Contract, ContractEvent} from '../../src/types';

// Contractes i fites inventats, amb data de referència fixa: la prova no depèn de la captura real.
const contract = (id: string, values: Partial<Contract>): Contract => ({id, source: 'PSCP', expedient: id.toUpperCase(), title: `Objecte ${id}`, year: 2025, lot: null, procedure: 'Obert', type: 'Serveis', status: 'Adjudicació', amountCents: 5000000, vat: 'sense IVA', supplier: null, cpv: null, date: '2025-01-15', url: `https://example.org/${id}`, capturedAt: '2026-10-15', flags: [], ...values});
const event = (id: string, expedient: string, values: Partial<ContractEvent>): ContractEvent => ({id, expedient, lot: '0', type: 'Pròrroga', title: '1a pròrroga', date: '2026-02-01', amountCents: 1000000, url: `https://example.org/${id}`, capturedAt: '2026-10-15', ...values});
const contracts = [
  contract('a', {termStart: '2025-02-01', termEnd: '2027-01-31', supplier: 'EMPRESA ALFA SL', title: 'Servei de neteja de prova'}),
  contract('b', {date: '2025-02-10', formalizedDate: '2025-02-27', duration: 'P2Y', title: 'Servei de manteniment de prova'}),
  contract('b-agregada', {expedient: 'B', date: '2025-02-10', duration: 'P2Y', status: 'Publicació agregada de contractes'}),
  contract('c', {date: '2026-06-01', duration: 'P2Y'}),
  contract('d', {}),
  contract('e', {procedure: 'Contracte menor', termEnd: '2027-01-15'}),
  contract('f', {termEnd: '2026-05-31', title: 'Servei ja vençut de prova'}),
  contract('g', {source: 'RPC', date: '2026-03-01', duration: 'P1Y'}),
];
const events = [
  event('p1', 'A', {date: '2026-01-31'}),
  event('p1-repetida', 'A', {date: '2026-01-31'}),
  event('p2', 'A', {title: '2a pròrroga', date: '2027-01-31'}),
  event('px', 'X', {title: 'PRÒRROGA EXTRAORDINÀRIA', date: '2025-09-01'}),
  event('m', 'A', {type: 'Modificació (Objectiva)', title: 'Modificació'}),
];

test.beforeEach(async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00+02:00'));
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, contracts, events}}));
});

test('venciments: calendari, base del càlcul i horitzó', async ({page}) => {
  await page.goto('/#contracts');
  await page.getByRole('button', {name: 'Venciments i pròrrogues'}).click();
  await expect(page).toHaveURL(/view=venciments/);
  const stats = page.locator('.terms-view .stat');
  await expect(stats.nth(0)).toContainText('2');
  await expect(stats.nth(1)).toContainText('2');
  await expect(stats.nth(1)).toContainText('1 amb dues o més');
  await expect(stats.nth(2)).toContainText('1');

  const terms = page.locator('section[aria-labelledby="terms-title"]');
  await expect(terms.locator('tbody tr:not(.month-row)')).toHaveCount(2);
  await expect(terms.locator('.month-row')).toHaveText([/gener.*2027/i, /febrer.*2027/i]);
  const a = terms.locator('tr', {hasText: 'Servei de neteja de prova'});
  await expect(a).toContainText('Data de fi publicada');
  await expect(a).toContainText('2 pròrrogues');
  const b = terms.locator('tr', {hasText: 'Servei de manteniment de prova'});
  await expect(b).toContainText('Estimada des de la formalització · 2 anys');
  await expect(b).toContainText('26');
  await expect(terms).toContainText('4 contractes no menors de PSCP');
  await expect(terms).toContainText('1 expedient no la té');
  await expect(terms).toContainText('1 contracte menor queda fora');

  await page.getByLabel('Horitzó dels venciments').selectOption('24');
  await expect(page).toHaveURL(/horitzo=24/);
  await expect(terms.locator('tbody tr:not(.month-row)')).toHaveCount(3);
  await page.getByLabel('Horitzó dels venciments').selectOption('passat');
  await expect(terms.locator('tbody tr:not(.month-row)')).toHaveCount(1);
  await expect(terms).toContainText('Servei ja vençut de prova');

  await page.getByRole('button', {name: /RPC/}).click();
  await page.getByLabel('Horitzó dels venciments').selectOption('12');
  await expect(stats.nth(0)).toContainText('1');
  await expect(terms.locator('tbody tr:not(.month-row)')).toHaveCount(1);
});

test('pròrrogues encadenades, extraordinàries, fitxa i exportació', async ({page}) => {
  await page.goto('/#contracts?view=venciments');
  const chains = page.locator('section[aria-labelledby="chains-title"]');
  await expect(chains.locator('.pattern-group')).toHaveCount(1);
  await expect(chains.locator('.pattern-group')).toContainText('2 pròrrogues');
  await chains.locator('summary').click();
  await expect(chains.locator('.chain-timeline li')).toHaveCount(3);
  await page.getByLabel('Inclou les pròrrogues úniques').check();
  await expect(page).toHaveURL(/cadenes=totes/);
  await expect(chains.locator('.pattern-group')).toHaveCount(2);
  const x = chains.locator('.pattern-group', {hasText: 'PRÒRROGA EXTRAORDINÀRIA'});
  await expect(x).toContainText('Pròrroga extraordinària');
  await x.locator('summary').click();
  await expect(x).toContainText('El contracte d’origen no és al catàleg');

  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Exporta venciments i pròrrogues'}).click();
  const text = await fs.readFile((await (await download).path())!, 'utf8');
  expect(text).toContain('"Apartat";"Criteri";"Expedient"');
  expect(text).toContain('"Encadenades"');
  expect(text).toContain('"Estimada des de la formalització"');

  await page.locator('section[aria-labelledby="terms-title"]').getByRole('button', {name: 'Servei de manteniment de prova'}).click();
  await expect(page.getByRole('dialog')).toContainText('Fi del termini inicial');
  await expect(page.getByRole('dialog')).toContainText('(estimada; durada de 2 anys)');
});
