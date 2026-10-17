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

async function createDossier(page: Page, title: string) {
  await page.getByRole('button', {name: 'Nou dossier', exact: true}).click();
  await page.getByLabel('Nom del dossier').fill(title);
  await page.getByRole('button', {name: 'Crea el dossier', exact: true}).click();
  await expect(page.getByRole('heading', {name: title, exact: true})).toBeVisible();
}
async function addNote(page: Page, text: string) {
  await page.getByLabel('Nova nota', {exact: true}).fill(text);
  await page.getByRole('button', {name: 'Afegeix nota', exact: true}).click();
  await expect(page.locator('.note p').filter({hasText: text})).toBeVisible();
}
async function downloadJson(page: Page, button: string) {
  const promise = page.waitForEvent('download');
  await page.getByRole('button', {name: button, exact: true}).click();
  return JSON.parse(await fs.readFile((await (await promise).path())!, 'utf8'));
}
async function importJson(page: Page, payload: unknown) {
  await page.getByLabel('Importa un dossier o un paquet JSON').setInputFiles({name: 'rebut.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload))});
  await page.getByRole('dialog', {name: 'Revisa la importació'}).getByRole('button', {name: 'Confirma la importació', exact: true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
const listItem = (page: Page, title: string) => page.locator('.dossier-list button').filter({hasText: title});
const note = (page: Page, text: string) => page.locator('.note').filter({hasText: text});

test('la llista avisa de les notes rebudes d’altres membres fins que s’obre el dossier', async ({page, browser}) => {
  await page.goto('/#dossiers');
  await createDossier(page, 'Dossier compartit');
  await page.getByLabel('Inicials').fill('AA');
  await addNote(page, 'Nota del membre A');
  const first = await downloadJson(page, 'Còpia JSON');
  await expect(page.locator('.dossier-header')).toContainText('exportat o rebut per darrera vegada');

  const otherContext = await browser.newContext({baseURL: test.info().project.use.baseURL});
  await prepare(otherContext);
  const other = await otherContext.newPage();
  await other.goto('/#dossiers');
  await importJson(other, first);
  // El dossier rebut és nou: la nota d'AA es marca com a nova i no demana exportar-lo.
  await expect(note(other, 'Nota del membre A')).toContainText('Nova');
  await expect(listItem(other, 'Dossier compartit')).toContainText('Notes de AA');
  await expect(listItem(other, 'Dossier compartit')).not.toContainText('exportat');
  await other.getByLabel('Inicials').fill('BB');
  await addNote(other, 'Nota del membre B');
  const pack = await downloadJson(other, 'Paquet del grup');
  await otherContext.close();

  // Un segon dossier rebut en el mateix paquet queda a la llista amb l'avís, sense obrir-lo.
  pack.dossiers.push({...first.dossier, id: 'rebut-segon', title: 'Dossier de BB', notes: [{id: 'nota-bb', text: 'Pregunta de BB', kind: 'pregunta', status: 'pendent', author: 'BB', updatedAt: '2026-10-15T09:00:00.000Z'}]});
  await createDossier(page, 'Dossier propi');
  await importJson(page, pack);
  await expect(page.getByRole('heading', {name: 'Dossier compartit', exact: true})).toBeVisible();
  await expect(note(page, 'Nota del membre B')).toContainText('Nova');
  await expect(note(page, 'Nota del membre A')).not.toContainText('Nova');
  await expect(listItem(page, 'Dossier compartit')).toContainText('Notes de BB');
  await expect(listItem(page, 'Dossier compartit')).not.toContainText('nota nova');
  await expect(listItem(page, 'Dossier de BB')).toContainText('1 nota nova');
  await expect(listItem(page, 'Dossier propi')).not.toContainText('Notes de');

  // En obrir-lo, l'avís desapareix de la llista i no torna en recarregar.
  await listItem(page, 'Dossier de BB').click();
  await expect(note(page, 'Pregunta de BB')).toContainText('Nova');
  await expect(listItem(page, 'Dossier de BB')).not.toContainText('nota nova');
  await listItem(page, 'Dossier compartit').click();
  await expect(note(page, 'Nota del membre B')).not.toContainText('Nova');
  await page.reload();
  await expect(listItem(page, 'Dossier de BB')).toBeVisible();
  await expect(page.locator('.dossier-list')).not.toContainText('nota nova');
  await expect(page.locator('.note').filter({hasText: 'Nova'})).toHaveCount(0);
});

test('avisa dels canvis sense exportar quan la darrera còpia fa 7 dies o més', async ({page}) => {
  await page.clock.install({time: new Date('2026-10-01T10:00:00Z')});
  await page.goto('/#dossiers');
  await createDossier(page, 'Dossier vell');
  await expect(listItem(page, 'Dossier vell')).not.toContainText('Mai exportat');
  await addNote(page, 'Primera nota');
  await createDossier(page, 'Dossier exportat');
  await addNote(page, 'Nota exportada');
  await downloadJson(page, 'Còpia JSON');

  // Sis dies després encara no avisa; als set, sí.
  await page.clock.setSystemTime(new Date('2026-10-07T11:00:00Z'));
  await page.reload();
  await expect(listItem(page, 'Dossier vell')).toBeVisible();
  await expect(page.locator('.dossier-list')).not.toContainText('Mai exportat');
  await page.clock.setSystemTime(new Date('2026-10-09T11:00:00Z'));
  await page.reload();
  await expect(listItem(page, 'Dossier vell')).toContainText('Mai exportat');
  // Sense canvis posteriors a la còpia no hi ha res a enviar.
  await expect(listItem(page, 'Dossier exportat')).not.toContainText('exportar');
  await listItem(page, 'Dossier exportat').click();
  await addNote(page, 'Nota posterior');
  await expect(listItem(page, 'Dossier exportat')).toContainText('Canvis sense exportar · 8 dies');

  // El paquet del grup deixa al dia tots els dossiers.
  await downloadJson(page, 'Paquet del grup');
  await expect(page.locator('.dossier-list .badge')).toHaveCount(0);
});
