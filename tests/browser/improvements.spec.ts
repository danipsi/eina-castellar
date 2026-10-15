import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Catalog} from '../../src/types';

const catalog = async (): Promise<Catalog> => JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));

test('un codi exacte no barreja expedients semblants; aproximats només a petició', async ({page}) => {
  const data = await catalog();
  const exactCount = data.contracts.filter(c => c.expedient === 'CONT2400054').length + data.sessions.filter(s => s.agenda.some(a => a.expedients.includes('CONT2400054'))).length;
  await page.goto('/#search?q=cont2400054');
  await expect(page.locator('.search-result')).toHaveCount(exactCount);
  await expect(page.locator('.subtitle')).toContainText(`${exactCount} coincidències exactes del codi`);
  await expect(page.getByRole('button', {name: /PSCP · CONT2600064/})).toHaveCount(0);
  await page.getByRole('button', {name: 'Mostra resultats aproximats'}).click();
  await expect(page.locator('.subtitle')).toContainText('resultats aproximats');
  await expect(page.getByRole('button', {name: /PSCP · CONT2600064/})).toBeVisible();
  await page.getByRole('button', {name: 'Mostra només el codi exacte'}).click();
  await expect(page.locator('.search-result')).toHaveCount(exactCount);
  await page.goto('/#search?q=CONT9900000');
  await expect(page.locator('.search-result')).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Mostra resultats aproximats'})).toBeVisible();
});

test('filtres i fitxa es poden copiar, restaurar i recórrer amb Enrere', async ({page, context}) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {value: {writeText: async () => {throw new Error('Prova sense permís de portapapers');}}}));
  await page.goto('/#contracts');
  await page.getByLabel('Exercici', {exact: true}).selectOption('2025');
  await page.getByLabel('Procediment', {exact: true}).selectOption('Obert');
  await page.getByLabel('Filtra contractes').pressSequentially('piscina');
  await expect(page.getByLabel('Filtra contractes')).toHaveValue('piscina');
  await expect(page.getByLabel('Filtra contractes')).toBeFocused();
  await page.getByLabel('Ordena', {exact: true}).selectOption('amount');
  await page.getByRole('button', {name: 'Obre CONT2400054, lot 1, PSCP'}).click();
  const dialog = page.getByRole('dialog', {name: 'Fitxa d’expedient'});
  await dialog.getByRole('button', {name: 'Copia l’enllaç'}).click();
  const copied = await dialog.getByLabel('Enllaç per compartir').inputValue();
  expect(copied).toBe(page.url());
  const other = await context.newPage();
  await other.goto(copied);
  await expect(other.getByRole('dialog')).toContainText('CONT2400054');
  await other.reload();
  await expect(other.getByRole('dialog')).toContainText('CONT2400054');
  await other.getByRole('button', {name: 'Tanca', exact: true}).click();
  await expect(other.getByLabel('Filtra contractes')).toHaveValue('piscina');
  await expect(other.getByLabel('Exercici', {exact: true})).toHaveValue('2025');
  await expect(other.getByLabel('Procediment', {exact: true})).toHaveValue('Obert');
  await expect(other.getByLabel('Ordena', {exact: true})).toHaveValue('amount');
  await other.close();
  await page.goBack();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel('Filtra contractes')).toHaveValue('piscina');
  await page.goForward();
  await expect(dialog).toBeVisible();
  await page.goto('/#contracts?record=contract:retirat');
  await expect(page.getByText(/Aquest registre no està disponible/)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('dates futures fora de la portada, consultables amb avís i exportació fidel', async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-10-14T12:00:00+02:00'));
  await page.goto('/');
  await expect(page.locator('.recent-contracts table')).not.toContainText('CONT2500110');
  await expect(page.locator('.future-summary')).toContainText('data futura');
  await page.locator('.future-summary a').click();
  await expect(page.getByLabel('Dates dels contractes')).toHaveValue('future');
  await expect(page.locator('.contract-table')).toContainText('CONT2500110');
  await expect(page.locator('.future-date')).toContainText('Data futura pendent de contrast');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Exporta CSV'}).click();
  const text = await fs.readFile((await (await downloadPromise).path())!, 'utf8');
  expect(text).toContain('Adjudicatari');
  expect(text).toContain('Data futura pendent de contrast');
  expect(text).toContain('CONT2500110');
  await page.getByLabel('Dates dels contractes').selectOption('observed');
  await expect(page.locator('.contract-table')).not.toContainText('CONT2500110');
});

test('comparació pressupostària amb diferències exactes, fonts, CSV i dades absents', async ({page}) => {
  await page.goto('/#budget?year=2025');
  await page.getByRole('button', {name: 'Compara exercicis'}).click();
  const comparison = page.getByRole('region', {name: 'Comparació pressupostària'});
  await expect(comparison.getByRole('heading', {name: '2024 → 2025'})).toBeVisible();
  const personal = comparison.getByRole('row').filter({hasText: 'Despeses de personal'});
  await expect(personal).toContainText('+652.559,34');
  await expect(personal).toContainText('5,5%');
  await expect(comparison.locator('.comparison-total')).toContainText('No calculable');
  const downloadPromise = page.waitForEvent('download');
  await comparison.getByRole('button', {name: 'Exporta comparació'}).click();
  const text = await fs.readFile((await (await downloadPromise).path())!, 'utf8');
  expect(text).toContain('652559,34');
  expect(text).toContain('Font base');
  await personal.getByRole('button', {name: 'Consulta 2024, Despeses de personal, Liquidat'}).click();
  await expect(page.getByRole('dialog')).toContainText('11.970.386,53');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(comparison).toBeVisible();
  await page.screenshot({path: 'test-results/comparacio-anual.png', fullPage: true});
  await page.getByLabel('Exercici pressupostari').selectOption('2026');
  await expect(personal).toContainText('No informat');
  await expect(personal).toContainText('No calculable');
  await comparison.getByLabel('Magnitud de comparació').selectOption('initialCents');
  await expect(personal).not.toContainText('No informat');
  await page.setViewportSize({width: 390, height: 844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('base pressupostària zero: diferència en euros però percentatge no calculable', async ({page}) => {
  const data = await catalog();
  data.budget.find(r => r.year === 2024 && r.side === 'despeses' && r.chapter === '1')!.executedCents = 0;
  await page.route('**/data/catalog.json', route => route.fulfill({json: data}));
  await page.goto('/#budget?year=2025&compare=2024&metric=executedCents');
  const row = page.getByRole('region', {name: 'Comparació pressupostària'}).getByRole('row').filter({hasText: 'Despeses de personal'});
  await expect(row).toContainText('+12.622.945,87');
  await expect(row).toContainText('No calculable');
});

test('novetats consultables amb abans/després, filtres i compatibilitat antiga', async ({page}) => {
  const data = await catalog();
  const item = data.contracts.find(c => c.expedient === 'CONT2400054' && c.source === 'PSCP' && c.lot === '1')!;
  data.changes = [
    {date: '2026-10-14', source: 'contracts', kind: 'modificats', description: 'Registre modificat.', recordId: item.id, fields: [{field: 'amountCents', before: 10000, after: item.amountCents}, {field: 'title'}]},
    {date: '2026-10-14', source: 'sessions', kind: 'no observats', description: '1 registres no observats.'},
  ];
  await page.route('**/data/catalog.json', route => route.fulfill({json: data}));
  await page.goto('/#sources');
  const changes = page.getByRole('region', {name: 'Canvis entre captures'});
  await changes.getByText('Veure 2 camps modificats').click();
  await expect(changes.getByRole('row').filter({hasText: 'Import'})).toContainText('100,00');
  await expect(changes.getByRole('row').filter({hasText: 'Import'})).toContainText('1.431.531,48');
  await expect(changes).toContainText('no es conserva aquí el text anterior');
  await changes.getByRole('button', {name: 'Obre la fitxa'}).click();
  await expect(page.getByRole('dialog')).toContainText('CONT2400054');
  await page.keyboard.press('Escape');
  await changes.getByLabel('Font dels canvis').selectOption('sessions');
  await page.reload();
  await expect(changes.getByLabel('Font dels canvis')).toHaveValue('sessions');
  await expect(changes.getByRole('button', {name: 'Obre la fitxa'})).toHaveCount(0);
  await expect(changes).toContainText('No s’hi reprodueixen identificadors');
  await page.unroute('**/data/catalog.json');
  // Format antic de les captures anteriors al detall per registre: només recomptes.
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, changes: [{date: '2026-10-13T18:29:20+00:00', source: 'sessions', kind: 'modificats', description: '13 registres modificats.'}]}}));
  await page.goto('/#sources');
  await page.reload();
  await expect(changes).toContainText('Aquesta captura només conserva recomptes');
});
