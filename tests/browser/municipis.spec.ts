import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Catalog, Peers} from '../../src/types';
import {chapterCents, peerStats, populationFor, quantile} from '../../src/peerData';

// Dades inventades: la prova no depèn de la captura real.
const nine = (first: number | null, rest: number | null = 0) => [first, 100000, 100000, 100000, rest, 100000, rest, rest, rest];
const none = Array<null>(9).fill(null);
const peers: Peers = {
  capturedAt: '2026-10-15', range: [15000, 35000], populationYear: 2025, self: '080517',
  populationUrl: 'https://example.org/padro', initialUrl: 'https://example.org/inicial', liquidationUrl: 'https://example.org/liquidacio',
  municipalities: [
    {code: '080517', name: 'Castellar del Vallès', population: {'2024': 20000, '2025': 25000}, ens: '805170005'},
    {code: '080001', name: 'Poble Alfa', population: {'2024': 10000, '2025': 10000}, ens: '800010001'},
    {code: '080002', name: 'Poble Beta', population: {'2024': 40000, '2025': 40000}, ens: '800020001'},
    {code: '080003', name: 'Poble Gamma', population: {'2024': 20000, '2025': 20000}, ens: '800030001'},
  ],
  rows: [
    {code: '080517', year: 2024, side: 'despeses', initialCents: nine(1000000), finalCents: nine(1000000), executedCents: nine(1000000)},
    {code: '080001', year: 2024, side: 'despeses', initialCents: nine(1000000, null), finalCents: nine(1000000, null), executedCents: nine(1000000, null)},
    {code: '080002', year: 2024, side: 'despeses', initialCents: nine(1000000), finalCents: nine(1000000), executedCents: nine(1000000)},
    {code: '080003', year: 2024, side: 'despeses', initialCents: nine(null), finalCents: nine(null), executedCents: nine(null)},
    {code: '080517', year: 2026, side: 'despeses', initialCents: nine(5000000), finalCents: none, executedCents: none},
    {code: '080001', year: 2026, side: 'despeses', initialCents: nine(1000000), finalCents: none, executedCents: none},
  ],
};

test('comparació: població, quantils, capítols no informats i posició', () => {
  expect(populationFor(peers.municipalities[0], 2026)).toEqual({value: 25000, year: '2025'});
  expect(populationFor(peers.municipalities[0], 2024)).toEqual({value: 20000, year: '2024'});
  expect(quantile([1, 2, 3, 4], .5)).toBe(2.5);
  expect(quantile([], .5)).toBeNull();
  expect(chapterCents(nine(100, null), 'total')).toBe(100 + 4 * 100000);
  expect(chapterCents(nine(null), 'total')).toBeNull();
  const chapter1 = peerStats(peers, 2024, 'despeses', 'executedCents', '1');
  // 10.000 € / 20.000 hab. = 0,5; Alfa 1; Beta 0,25. Gamma no informa el capítol 1.
  expect(chapter1.values.map(v => [v.name, v.perCapita])).toEqual([['Poble Alfa', 1], ['Castellar del Vallès', .5], ['Poble Beta', .25]]);
  expect([chapter1.rank, chapter1.median, chapter1.missing]).toEqual([2, .5, 1]);
  const chapter5 = peerStats(peers, 2024, 'despeses', 'executedCents', '5');
  expect(chapter5.values.map(v => v.code)).toEqual(['080517', '080002', '080003']);
  // Tots a zero: empat a la primera posició.
  expect(chapter5.rank).toBe(1);
});

test.beforeEach(async ({page}) => {
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, peers}}));
});

test('pressupost: Castellar entre municipis similars amb rànquing exportable', async ({page}) => {
  await page.goto('/#budget?year=2024');
  const section = page.locator('#municipis');
  await expect(section.getByRole('heading', {name: 'Castellar entre municipis similars'})).toBeVisible();
  await expect(section).toContainText('4 municipis de 15.000 a 35.000 habitants (padró 2025)');
  await expect(section.getByLabel('Magnitud de la comparació entre municipis')).toHaveValue('executedCents');
  const firstRow = section.locator('.peer-table tbody tr').first();
  await expect(firstRow).toContainText('0,5 €/hab.');
  await expect(firstRow).toContainText('2 de 3');
  await expect(firstRow).toContainText('1 sense dada');
  await firstRow.getByRole('button', {name: 'Rànquing'}).click();
  await expect(page).toHaveURL(/peerChapter=1/);
  const items = section.locator('.peer-ranking li');
  await expect(items).toHaveCount(3);
  await expect(items.nth(1)).toHaveClass(/self/);
  await expect(section.locator('.peer-ranking')).toContainText('1 municipi no informa');
  const download = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Exporta rànquing'}).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('municipis-despeses-2024-1.csv');
  const content = await fs.readFile(await file.path(), 'utf8');
  expect(content).toContain('"2";"Castellar del Vallès";"080517";"2024"');
  expect(content).toContain('"0,50"');
});

test('pressupost: sense liquidació es compara el pressupost inicial amb la població més recent', async ({page}) => {
  await page.goto('/#budget?year=2026');
  const section = page.locator('#municipis');
  await expect(section.getByLabel('Magnitud de la comparació entre municipis')).toHaveValue('initialCents');
  await expect(section).toContainText('Per a 2026 s’usa la població de 2025');
  await section.getByLabel('Magnitud de la comparació entre municipis').selectOption('executedCents');
  await expect(section).toContainText('No hi ha prou municipis amb dades de liquidat per a 2026');
});
