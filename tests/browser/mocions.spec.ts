import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Catalog, Session} from '../../src/types';

// Grups i mocions inventats: la prova no depèn de la captura real.
const ple = (id: string, date: string, agenda: string[], body: Session['body'] = 'Ple'): Session => ({id, title: `Sessió ${date}`, body, date, url: `https://example.org/${id}`, capturedAt: '2026-10-15', agenda: agenda.map((title, i) => ({number: i + 1, title, expedients: []}))});
const sessions = [
  ple('s1', '2025-01-28', ['Moció presentada pel grup municipal d\'Alfa Verd i que porta per títol: Moció per a la millora del parc fluvial', 'Proposicions i mocions sobrevingudes']),
  ple('s2', '2025-02-25', ['Moció presentada pel grup municipal d\'Alfa Verd i que porta per títol: Moció per a la millora del parc fluvial (assumpte que va quedar sobre la taula en la sessió anterior)', 'Moció presentada pel grup municipal Alfa Verd Castellar que porta per títol: Moció per a la millora de l’enllumenat']),
  ple('s3', '2026-03-31', ['Moció presentada pel grup municipal AV-Plataforma per prendre mesures sobre el parc infantil', 'Moció presentada pel grup municipal de Beta per Castellar, amb el títol "Moció del parc del riu".- RETIRAT DE L\'ORDRE DEL DIA']),
  ple('s4', '2026-04-02', ['Moció presentada pel grup municipal Gamma que porta per títol: Moció que no és del Ple'], 'Junta de Govern'),
];

test.beforeEach(async ({page}) => {
  const data: Catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
  await page.route('**/data/catalog.json', route => route.fulfill({json: {...data, sessions}}));
});

test('mocions: extracció per grup i any, temes recurrents i aparicions repetides', async ({page}) => {
  await page.goto('/#motions');
  await expect(page.getByRole('heading', {name: 'Seguiment de mocions'})).toBeVisible();
  const rows = page.locator('.session-row');
  await expect(rows).toHaveCount(4);
  const matrix = page.locator('.motion-matrix tbody tr');
  await expect(matrix).toHaveCount(3);
  await expect(matrix.filter({hasText: 'Alfa Verd'}).locator('td').last()).toHaveText('2');
  await expect(page.locator('.motion-matrix')).not.toContainText('Gamma');
  await expect(page.locator('.topic-chip', {hasText: 'parc'})).toContainText('3');
  await expect(page.locator('.topic-chip', {hasText: 'enllumenat'})).toHaveCount(0);
  await expect(rows.filter({hasText: 'parc fluvial'})).toContainText('2 sessions');
  await expect(rows.filter({hasText: 'Per prendre mesures sobre el parc infantil'})).toContainText('AV-Plataforma');
  await expect(rows.filter({hasText: 'Moció del parc del riu'})).toContainText('Retirada segons l’ordre del dia');
  await matrix.filter({hasText: 'Beta per Castellar'}).getByRole('button', {name: 'Beta per Castellar', exact: true}).click();
  await expect(rows).toHaveCount(1);
  await expect(page).toHaveURL(/group=betapercastellar/);
  await rows.first().click();
  const editor = page.getByRole('dialog', {name: 'Seguiment de la moció'});
  await expect(editor.getByLabel('Resultat de la votació')).toHaveValue('retirada');
  await editor.getByRole('button', {name: 'Obre la sessió'}).click();
  await expect(page).toHaveURL(/record=session%3As3/);
  const agenda = page.locator('.agenda li');
  await expect(agenda.filter({hasText: 'parc infantil'}).getByRole('link', {name: 'Seguiment de la moció'})).toBeVisible();
  await agenda.filter({hasText: 'parc del riu'}).getByRole('link', {name: 'Seguiment de la moció'}).click();
  await expect(page.getByRole('dialog', {name: 'Seguiment de la moció'}).getByRole('heading', {name: 'Moció del parc del riu'})).toBeVisible();
});

test('mocions: marques locals, filtres, unió de grups i còpia restaurada', async ({page}) => {
  await page.goto('/#motions');
  await page.locator('.session-row', {hasText: 'parc fluvial'}).click();
  const editor = page.getByRole('dialog', {name: 'Seguiment de la moció'});
  await expect(editor.locator('.timeline li')).toHaveCount(2);
  await editor.getByLabel('Resultat de la votació').selectOption('aprovada');
  await editor.getByLabel('Compliment de l’acord').selectOption('en curs');
  await editor.getByLabel('Notes de seguiment').fill('Compromís de redactar el projecte el 2025.');
  await editor.getByRole('button', {name: 'Desa el seguiment'}).click();
  await expect(editor).not.toBeVisible();
  await page.reload();
  const row = page.locator('.session-row', {hasText: 'parc fluvial'});
  await expect(row).toContainText('Aprovada');
  await expect(row).toContainText('Compliment: en curs');
  await expect(page.locator('.stat', {hasText: 'Amb estat marcat'})).toContainText('1 de 4');
  await expect(page.locator('.stat', {hasText: 'Aprovades per complir'})).toContainText('1');
  await page.goto('/#overview');
  const pending = page.locator('.pending-motions');
  await expect(pending).toContainText('1 de 4 mocions amb estat marcat');
  await pending.getByRole('link', {name: /parc fluvial/}).click();
  await expect(page.getByRole('dialog', {name: 'Seguiment de la moció'})).toContainText('Compromís de redactar');
  await page.keyboard.press('Escape');
  await page.getByLabel('Estat de la votació').selectOption('aprovada');
  await expect(page.locator('.session-row')).toHaveCount(1);
  await page.getByLabel('Estat de la votació').selectOption('cap');
  await expect(page.locator('.session-row')).toHaveCount(3);

  await page.getByRole('button', {name: 'Unifica noms'}).click();
  const merge = page.getByRole('dialog', {name: 'Unifica noms de grup'});
  await merge.getByLabel('Uneix AV-Plataforma amb').selectOption({label: 'Alfa Verd'});
  await expect(page.locator('.motion-matrix tbody tr')).toHaveCount(2);
  await expect(merge.getByText('AV-Plataforma → Alfa Verd')).toBeVisible();
  await merge.getByRole('button', {name: 'Desfés'}).click();
  await expect(page.locator('.motion-matrix tbody tr')).toHaveCount(3);
  await merge.getByLabel('Uneix AV-Plataforma amb').selectOption({label: 'Alfa Verd'});
  await page.keyboard.press('Escape');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Exporta seguiment'}).click();
  const file = (await (await downloadPromise).path())!;
  const exported = JSON.parse(await fs.readFile(file, 'utf8'));
  expect(exported.schemaVersion).toBe(1);
  expect(Object.values(exported.marks)).toHaveLength(1);
  await page.evaluate(() => localStorage.clear());
  await page.goto('/#motions');
  await page.reload();
  await expect(page.locator('.session-row', {hasText: 'parc fluvial'})).toContainText('Estat sense marcar');
  await page.getByLabel('Importa seguiment de mocions JSON').setInputFiles(file);
  await expect(page.getByRole('status').filter({hasText: 'S’han incorporat 1 marques'})).toBeVisible();
  await expect(page.locator('.session-row', {hasText: 'parc fluvial'})).toContainText('Aprovada');
  await expect(page.locator('.motion-matrix tbody tr')).toHaveCount(2);
  await page.getByLabel('Importa seguiment de mocions JSON').setInputFiles({name: 'dolent.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":1,"marks":{"x":{}}}')});
  await expect(page.getByRole('status').filter({hasText: 'no és un seguiment de mocions vàlid'})).toBeVisible();
});
