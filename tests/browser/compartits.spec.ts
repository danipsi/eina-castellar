import {test, expect} from '@playwright/test';
import type {BrowserContext, Page} from '@playwright/test';
import fs from 'node:fs/promises';

// Dades fictícies: dos navegadors independents fan de dos membres del grup.
const catalog = {schemaVersion: 1, generatedAt: '2026-10-15T10:00:00Z', contracts: [], events: [], sessions: [], budget: [], sources: [], changes: []};
async function prepare(context: BrowserContext) {
  await context.route('**/data/catalog.json', route => route.fulfill({json: catalog}));
  await context.route('**/data/status.json', route => route.fulfill({json: {status: 'ok'}}));
}
test.beforeEach(async ({context}) => prepare(context));

async function addNote(page: Page, text: string) {
  await page.getByLabel('Nova nota', {exact: true}).fill(text);
  await page.getByRole('button', {name: 'Afegeix nota', exact: true}).click();
  await expect(page.locator('.note p').filter({hasText: text})).toBeVisible();
}
async function downloadJson(page: Page, button: string) {
  const promise = page.waitForEvent('download');
  await page.getByRole('button', {name: button, exact: true}).click();
  const file = await promise;
  return {name: file.suggestedFilename(), payload: JSON.parse(await fs.readFile((await file.path())!, 'utf8'))};
}
async function importJson(page: Page, payload: unknown) {
  await page.getByLabel('Importa un dossier o un paquet JSON').setInputFiles({name: 'rebut.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload))});
  return page.getByRole('dialog', {name: 'Revisa la importació'});
}
const note = (page: Page, text: string) => page.locator('.note').filter({hasText: text});

test('dos membres intercanvien un dossier: fusiona notes, estats i eliminacions sense duplicar', async ({page, browser}) => {
  await page.goto('/#dossiers');
  await page.getByRole('button', {name: 'Nou dossier', exact: true}).click();
  await page.getByLabel('Nom del dossier').fill('Dossier compartit');
  await page.getByRole('button', {name: 'Crea el dossier', exact: true}).click();
  await page.getByLabel('Inicials').fill('AA');
  await addNote(page, 'Nota del membre A');
  await addNote(page, 'Nota que s’eliminarà');
  const first = await downloadJson(page, 'Còpia JSON');
  expect(first.name).toMatch(/^dossier-dossier-compartit-\d{4}-\d{2}-\d{2}\.json$/);
  expect(first.payload.exportedBy).toBe('AA');
  expect(first.payload.dossier.notes[0].author).toBe('AA');

  const otherContext = await browser.newContext({baseURL: test.info().project.use.baseURL});
  await prepare(otherContext);
  const other = await otherContext.newPage();
  await other.goto('/#dossiers');
  let dialog = await importJson(other, first.payload);
  await expect(dialog).toContainText('Enviat per AA');
  await expect(dialog).toContainText('Nou');
  await dialog.getByRole('button', {name: 'Confirma la importació', exact: true}).click();
  await expect(other.getByRole('heading', {name: 'Dossier compartit', exact: true})).toBeVisible();
  await expect(note(other, 'Nota del membre A')).toContainText('AA');
  await other.getByLabel('Inicials').fill('BB');
  await addNote(other, 'Nota del membre B');
  await note(other, 'Nota del membre A').getByLabel('Estat de revisió de la nota').selectOption('contrastada');
  await expect(note(other, 'Nota del membre A').getByLabel('Estat de revisió de la nota')).toHaveValue('contrastada');
  await note(other, 'Nota que s’eliminarà').getByRole('button', {name: 'Elimina la nota'}).click();
  await expect(note(other, 'Nota que s’eliminarà')).toHaveCount(0);
  const pack = await downloadJson(other, 'Paquet del grup');
  expect(pack.name).toMatch(/^paquet-dossiers-/);
  expect(pack.payload.dossiers).toHaveLength(1);
  await otherContext.close();

  pack.payload.motions = {marks: {mprova1: {status: 'aprovada', compliance: 'pendent', note: '', updatedAt: '2026-10-15T09:00:00.000Z'}}, merges: {}};
  dialog = await importJson(page, pack.payload);
  await expect(dialog).toContainText('Ja el tens');
  await expect(dialog).toContainText('1 nota nova · 1 element actualitzat · 1 element eliminat per qui l’ha enviat');
  await expect(dialog).toContainText('1 marca nova o més recent');
  await dialog.getByRole('button', {name: 'Confirma la importació', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: '1 dossier actualitzat'})).toBeVisible();
  await expect(page.locator('.dossier-list button')).toHaveCount(1);
  await expect(page.locator('.note p')).toHaveText(['Nota del membre A', 'Nota del membre B']);
  await expect(note(page, 'Nota del membre A').getByLabel('Estat de revisió de la nota')).toHaveValue('contrastada');
  await expect(note(page, 'Nota del membre B')).toContainText('BB');
  expect(await page.evaluate(() => localStorage.getItem('observatori.mocions.v1'))).toContain('mprova1');

  // Tornar a importar el paquet o la còpia antiga no duplica ni ressuscita la nota eliminada.
  dialog = await importJson(page, pack.payload);
  await expect(dialog).toContainText('Ja tens aquesta versió');
  await dialog.getByRole('button', {name: 'Tanca'}).click();
  dialog = await importJson(page, first.payload);
  await expect(dialog).toContainText('Ja tens aquesta versió');
  await expect(dialog).toContainText('Es conserven 1 canvi teu més recent');
  await dialog.getByRole('button', {name: 'Confirma la importació', exact: true}).click();
  await expect(page.locator('.note p')).toHaveText(['Nota del membre A', 'Nota del membre B']);
  await page.reload();
  await expect(page.locator('.note p')).toHaveText(['Nota del membre A', 'Nota del membre B']);
});

test('una font tornada a afegir després d’eliminar-la es conserva en fusionar', async ({page}) => {
  await page.goto('/#dossiers');
  const base = {id: 'dossier-prova', title: 'Dossier amb fonts', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', notes: [], evidence: []};
  const source = {id: 'contract:prova', kind: 'contract', title: 'Contracte fictici', url: 'https://example.org/contracte', source: 'PSCP', capturedAt: '2026-10-01', locator: 'Expedient X'};
  let dialog = await importJson(page, {schemaVersion: 1, dossier: {...base, deleted: {'evidence:contract:prova': '2026-10-05T10:00:00.000Z'}}});
  await dialog.getByRole('button', {name: 'Confirma la importació', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Dossier amb fonts', exact: true})).toBeVisible();
  dialog = await importJson(page, {schemaVersion: 1, dossier: {...base, evidence: [{...source, addedAt: '2026-10-02T10:00:00.000Z'}]}});
  await expect(dialog).toContainText('Ja tens aquesta versió');
  await dialog.getByRole('button', {name: 'Tanca'}).click();
  dialog = await importJson(page, {schemaVersion: 1, dossier: {...base, evidence: [{...source, addedAt: '2026-10-06T10:00:00.000Z'}]}});
  await expect(dialog).toContainText('1 font nova');
  await dialog.getByRole('button', {name: 'Confirma la importació', exact: true}).click();
  await expect(page.locator('.evidence-item h4')).toHaveText('Contracte fictici');
});

test('rebutja paquets amb dossiers repetits o marques de mocions no vàlides', async ({page}) => {
  await page.goto('/#dossiers');
  const dossier = {id: 'repetit', title: 'Repetit', createdAt: '2026-10-01', updatedAt: '2026-10-01', notes: [], evidence: []};
  await importJson(page, {schemaVersion: 1, kind: 'paquet', dossiers: [dossier, dossier]});
  await expect(page.getByRole('alert')).toContainText('no és un dossier ni un paquet vàlid');
  await importJson(page, {schemaVersion: 1, kind: 'paquet', dossiers: [dossier], motions: {marks: {'<script>': {}}, merges: {}}});
  await expect(page.getByRole('alert')).toContainText('no és un seguiment de mocions vàlid');
  await expect(page.getByRole('dialog', {name: 'Revisa la importació'})).toHaveCount(0);
});
