import {test, expect, type Page} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Agreement, Catalog, Grant, Peers, Session, SupplierYear} from '../../src/types';
import {parseDossierBody} from '../../src/storage';

// Dades inventades: la prova no depèn de la captura real.
const suppliers: SupplierYear[] = [{id: 'supplier-2025-alfa', year: 2025, name: 'EMPRESA ALFA, S.L.', category: 'societat', emitters: 1, invoices: 3, invoicedCents: 2500000, maxInvoiceCents: 1200000, firstDate: '2025-02-01', lastDate: '2025-11-30', url: 'https://example.org/factures/2025', capturedAt: '2026-10-15'}];
const grant = (id: string, values: Partial<Grant>): Grant => ({id, year: 2025, date: '2025-06-01', call: 'Convocatòria inventada 2025', procedure: 'convocatòria', agreement: null, beneficiary: 'ENTITAT ALFA', category: 'entitat', grants: 1, amountCents: 300000, repeated: 0, url: `https://example.org/${id}`, capturedAt: '2026-10-15', ...values});
const grants = [grant('a', {}), grant('b', {beneficiary: 'Entitat Alfa', amountCents: 50000, procedure: 'sense convocatòria', date: '2025-09-01'})];
const agreements: Agreement[] = [{id: 'agreement-CONV2400002', code: 'CONV2400002', title: 'Conveni inventat de col·laboració', description: null, start: '2024-01-01', end: '2025-06-30', endIssue: null, status: 'En curs', extendable: false, url: 'https://example.org/CONV2400002', capturedAt: '2026-10-15'}];
const sessions: Session[] = [{id: 's1', title: 'Sessió 2025-01-28', body: 'Ple', date: '2025-01-28', url: 'https://example.org/s1', capturedAt: '2026-10-14', agenda: [{number: 7, title: 'Moció presentada pel grup municipal d\'Alfa Verd i que porta per títol: Moció per a la millora del parc fluvial', expedients: []}]}];
const nine = (n: number) => Array<number>(9).fill(n);
const peers: Peers = {
  capturedAt: '2026-10-15', range: [15000, 35000], populationYear: 2025, self: '080517',
  populationUrl: 'https://example.org/padro', initialUrl: 'https://example.org/inicial', liquidationUrl: 'https://example.org/liquidacio',
  municipalities: [
    {code: '080517', name: 'Castellar del Vallès', population: {'2024': 20000}, ens: null},
    {code: '080001', name: 'Poble Alfa', population: {'2024': 10000}, ens: null},
    {code: '080002', name: 'Poble Beta', population: {'2024': 40000}, ens: null},
  ],
  rows: ['080517', '080001', '080002'].map(code => ({code, year: 2024, side: 'despeses' as const, initialCents: nine(1000000), finalCents: nine(1000000), executedCents: nine(1000000)})),
};

test.beforeEach(async ({page}) => {
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, suppliers, grants, agreements, sessions, peers}}));
});

async function keep(page: Page, dossier?: string) {
  const save = page.getByRole('dialog', {name: 'Afegeix al dossier'});
  if (dossier) await save.getByLabel('Nom del dossier').fill(dossier);
  await save.getByRole('button', {name: 'Desa la referència'}).click();
  await expect(save).not.toBeVisible();
}

test('dossiers: proveïdor, subvenció, conveni, moció i comparació, amb enllaç de tornada', async ({page}) => {
  await page.goto('/#suppliers?year=2025');
  await page.locator('summary', {hasText: 'EMPRESA ALFA'}).first().click();
  await page.getByRole('button', {name: 'Afegeix al dossier: EMPRESA ALFA, S.L., factures 2025'}).click();
  await keep(page, 'Seguiment de proves');

  await page.goto('/#grants?year=2025');
  await page.locator('summary', {hasText: 'ENTITAT ALFA'}).first().click();
  await page.getByRole('button', {name: 'Afegeix al dossier: ENTITAT ALFA, subvencions 2025'}).click();
  await keep(page);

  await page.goto('/#grants?view=convenis&llista=tots');
  await page.getByRole('button', {name: 'Afegeix al dossier: conveni CONV2400002'}).click();
  await keep(page);

  await page.goto('/#motions');
  await page.locator('.session-row', {hasText: 'parc fluvial'}).click();
  await page.getByRole('dialog', {name: 'Seguiment de la moció'}).getByRole('button', {name: 'Afegeix al dossier'}).click();
  await keep(page);

  await page.goto('/#budget?year=2024&seccio=municipis');
  await page.getByRole('button', {name: 'Afegeix al dossier: comparació, Total'}).click();
  await keep(page);

  // Desar dues vegades la mateixa referència no la duplica.
  await page.getByRole('button', {name: 'Afegeix al dossier: comparació, Total'}).click();
  await keep(page);

  await page.goto('/#dossiers');
  const items = page.locator('.evidence-item');
  await expect(items).toHaveCount(5);
  await expect(items.nth(0)).toContainText('EMPRESA ALFA, S.L. · factures 2025');
  await expect(items.nth(0)).toContainText('3 factures');
  await expect(items.nth(1)).toContainText('2 concessions');
  await expect(items.nth(1)).toContainText('sense convocatòria al títol');
  await expect(items.nth(2)).toContainText('Conveni CONV2400002 · En curs');
  await expect(items.nth(3)).toContainText('Moció · Alfa Verd · Ple del');
  await expect(items.nth(3)).toContainText('punt 7');
  await expect(items.nth(4)).toContainText('posició 2 de 3');
  await items.nth(2).getByRole('link', {name: 'Obre a l’Observatori'}).click();
  await expect(page).toHaveURL(/#grants\?view=convenis&conveni=CONV2400002/);
  await expect(page.locator('.agreement-table')).toContainText('Conveni inventat de col·laboració');

  // La pregunta formal cita la font sense el localitzador intern.
  await page.goto('/#dossiers');
  await page.getByRole('button', {name: 'Prepara una pregunta formal'}).click();
  const text = page.getByRole('dialog', {name: 'Prepara una pregunta formal'}).getByLabel('Text de la petició');
  await expect(text).toHaveValue(/Emissor EMPRESA ALFA, S\.L\. · exercici 2025/);
  await expect(text).not.toHaveValue(/registre supplier-/);
});

test('dossiers: importació de les evidències noves i enllaços interns segurs', () => {
  const evidence = (values: Record<string, unknown>) => ({id: 'peer:2024:despeses:executedCents:total', kind: 'peer', title: 'Comparació', url: 'https://example.org/liquidacio', source: 'Idescat i AOC', capturedAt: '2026-10-15', locator: 'Total', ...values});
  const dossier = (e: Record<string, unknown>) => ({id: 'd1', title: 'Prova', createdAt: '2026-10-16', updatedAt: '2026-10-16', notes: [], evidence: [e]});
  const parsed = parseDossierBody(dossier(evidence({href: '#budget?year=2024&peer=executedCents&seccio=municipis'})));
  expect(parsed.evidence[0]).toMatchObject({kind: 'peer', href: '#budget?year=2024&peer=executedCents&seccio=municipis'});
  expect(parseDossierBody(dossier(evidence({}))).evidence[0].href).toBeUndefined();
  expect(parseDossierBody(dossier(evidence({href: "#suppliers?year=2025&name=L'ARCA"}))).evidence[0].href).toBe('#suppliers?year=2025&name=L%27ARCA');
  for (const href of ['https://example.org', 'javascript:alert(1)', '#budget?x="><script>', '//example.org']) expect(() => parseDossierBody(dossier(evidence({href})))).toThrow();
  expect(() => parseDossierBody(dossier(evidence({kind: 'desconegut'})))).toThrow();
});
