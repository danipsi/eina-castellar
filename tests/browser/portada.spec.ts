import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Agreement, Catalog, Contract, ContractEvent, Peers} from '../../src/types';
import {latestPeerYear} from '../../src/PeerComparison';

// Dades inventades amb data de referència fixa: la prova no depèn de la captura real.
const contract = (id: string, values: Partial<Contract>): Contract => ({id, source: 'PSCP', expedient: id.toUpperCase(), title: `Objecte ${id}`, year: 2025, lot: null, procedure: 'Obert', type: 'Serveis', status: 'Adjudicació', amountCents: 5000000, vat: 'sense IVA', supplier: null, cpv: null, date: '2025-01-15', url: `https://example.org/${id}`, capturedAt: '2026-10-15', flags: [], ...values});
const contracts = [
  contract('a', {termEnd: '2026-12-31', supplier: 'EMPRESA ALFA SL', title: 'Servei de neteja de prova'}),
  contract('b', {termEnd: '2027-06-30', title: 'Servei fora de l’horitzó'}),
  contract('c', {procedure: 'Contracte menor', termEnd: '2026-11-30', title: 'Menor que no es prorroga'}),
];
const events: ContractEvent[] = [{id: 'p1', expedient: 'A', lot: '0', type: 'Pròrroga', title: '1a pròrroga', date: '2025-12-31', amountCents: null, url: 'https://example.org/p1', capturedAt: '2026-10-15'}];
const agreement = (code: string, values: Partial<Agreement>): Agreement => ({id: code, code, title: `Conveni ${code}`, description: null, start: '2024-01-01', end: '2027-01-31', endIssue: null, status: 'En curs', extendable: true, url: `https://example.org/${code}`, capturedAt: '2026-10-15', ...values});
const agreements = [
  agreement('CONV-1', {title: 'Conveni de col·laboració de prova'}),
  agreement('CONV-2', {end: '2026-01-31', extendable: false}),
  agreement('CONV-3', {end: '2026-12-01', status: 'Finalitzat'}),
];
const nine = (first: number) => [first, 100000, 100000, 100000, 0, 100000, 0, 0, 0];
const none = Array<null>(9).fill(null);
const peers: Peers = {
  capturedAt: '2026-10-15', range: [15000, 35000], populationYear: 2025, self: '080517',
  populationUrl: 'https://example.org/padro', initialUrl: 'https://example.org/inicial', liquidationUrl: 'https://example.org/liquidacio',
  municipalities: [
    {code: '080517', name: 'Castellar del Vallès', population: {'2025': 25000}, ens: '805170005'},
    {code: '080001', name: 'Poble Alfa', population: {'2025': 10000}, ens: '800010001'},
    {code: '080002', name: 'Poble Beta', population: {'2025': 40000}, ens: '800020001'},
  ],
  rows: [
    // Total: Castellar 15.000 € / 25.000 hab. = 0,6; Alfa 1,5; Beta 0,375. Castellar és el segon.
    ...['080517', '080001', '080002'].map(code => ({code, year: 2025, side: 'despeses' as const, initialCents: nine(1000000), finalCents: nine(1000000), executedCents: nine(1000000)})),
    ...['080517', '080001'].map(code => ({code, year: 2026, side: 'despeses' as const, initialCents: nine(1000000), finalCents: none, executedCents: none})),
  ],
};

test('portada: exercici de la comparació, liquidat abans que inicial', () => {
  expect(latestPeerYear(peers)).toEqual({year: 2025, metric: 'executedCents'});
  expect(latestPeerYear({...peers, rows: peers.rows.filter(r => r.year === 2026)})).toEqual({year: 2026, metric: 'initialCents'});
  expect(latestPeerYear({...peers, rows: []})).toBeNull();
});

test.beforeEach(async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00+02:00'));
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, contracts, events, agreements, peers}}));
});

test('portada: venciments pròxims de contractes i convenis', async ({page}) => {
  await page.goto('/#overview');
  const panel = page.locator('.deadlines');
  await expect(panel.getByRole('heading', {name: 'Venciments pròxims'})).toBeVisible();
  await expect(panel).toContainText('Fins al 15 d’abr. del 2027');
  const counts = panel.locator('.deadline-counts');
  await expect(counts).toContainText('1 contracte');
  await expect(counts).toContainText('1 conveni');
  await expect(counts).toContainText('1 conveni en curs amb la data de fi passada (de 2 en curs)');
  const items = panel.locator('.recent-sessions > *');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText('Servei de neteja de prova');
  await expect(items.nth(0)).toContainText('1 pròrroga');
  await expect(items.nth(1)).toContainText('Conveni de col·laboració de prova');
  await expect(items.nth(1)).toContainText('Prorrogable');
  await expect(panel).not.toContainText('Servei fora de l’horitzó');
  await expect(panel).not.toContainText('Menor que no es prorroga');
  await items.nth(0).click();
  await expect(page.getByRole('dialog')).toContainText('Servei de neteja de prova');
  await page.keyboard.press('Escape');
  await items.nth(1).click();
  await expect(page).toHaveURL(/#grants\?view=convenis&conveni=CONV-1/);
  await expect(page.getByRole('heading', {name: 'Tots els convenis'})).toBeVisible();
});

test('portada: resum entre municipis similars i enllaç a la comparació completa', async ({page}) => {
  await page.goto('/#overview');
  const panel = page.locator('.peer-snapshot');
  await expect(panel).toContainText('Despesa liquidada per habitant · 2025');
  const total = panel.locator('tr.total-row');
  await expect(total).toContainText('0,6 €/hab.');
  await expect(total).toContainText('2 de 3');
  await expect(panel.locator('tbody tr')).toHaveCount(4);
  await panel.getByRole('link', {name: 'Comparació completa'}).click();
  await expect(page).toHaveURL(/#budget\?year=2025&peer=executedCents/);
  await expect(page.locator('#municipis')).toBeInViewport();
});
