import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import fs from 'node:fs/promises';

// Dades fictícies: les proves no utilitzen dossiers del perfil personal.
const catalog = {schemaVersion: 1, generatedAt: '2026-10-15T10:00:00Z', contracts: [], events: [], sessions: [], budget: [], sources: [], changes: []};
test.beforeEach(async ({context}) => {
  await context.route('**/data/catalog.json', route => route.fulfill({json: catalog}));
  await context.route('**/data/status.json', route => route.fulfill({json: {status: 'ok'}}));
});

async function create(page: Page, title = 'Dossier de prova') {
  await page.getByRole('button', {name: 'Nou dossier', exact: true}).click();
  await page.getByLabel('Nom del dossier').fill(title);
  await page.getByRole('button', {name: 'Crea el dossier', exact: true}).click();
  await expect(page.getByRole('heading', {name: title, exact: true})).toBeVisible();
}
async function addNote(page: Page, text: string) {
  await page.getByLabel('Nova nota', {exact: true}).fill(text);
  await page.getByRole('button', {name: 'Afegeix nota', exact: true}).click();
}

test('dues pestanyes: rebutja la còpia antiga, conserva l’esborrany i permet afegir les dues notes', async ({page, context}) => {
  await page.goto('/#dossiers');
  await create(page);
  const other = await context.newPage();
  await other.goto('/#dossiers');
  await expect(other.getByRole('heading', {name: 'Dossier de prova', exact: true})).toBeVisible();
  await addNote(page, 'Nota fictícia A');
  await expect(page.locator('.note p')).toHaveText('Nota fictícia A');
  await addNote(other, 'Nota fictícia B');
  await expect(other.getByRole('alert')).toContainText('ha canviat');
  await expect(other.getByLabel('Nova nota', {exact: true})).toHaveValue('Nota fictícia B');
  await expect(other.locator('.note p')).toHaveText('Nota fictícia A');
  await other.getByRole('button', {name: 'Afegeix nota', exact: true}).click();
  await expect(other.locator('.note p')).toHaveText(['Nota fictícia A', 'Nota fictícia B']);
  await page.reload();
  await expect(page.locator('.note p')).toHaveText(['Nota fictícia A', 'Nota fictícia B']);
});

test('no elimina canvis d’una altra pestanya ni ressuscita un dossier eliminat', async ({page, context}) => {
  await page.goto('/#dossiers');
  await create(page);
  const other = await context.newPage();
  await other.goto('/#dossiers');
  await expect(other.getByRole('heading', {name: 'Dossier de prova', exact: true})).toBeVisible();
  await addNote(page, 'Canvi que cal conservar');
  await expect(page.locator('.note p')).toHaveText('Canvi que cal conservar');
  await other.getByRole('button', {name: 'Elimina el dossier', exact: true}).click();
  await other.getByRole('button', {name: 'Elimina’l', exact: true}).click();
  await expect(other.getByRole('alert')).toContainText('ha canviat');
  await expect(other.locator('.note p')).toHaveText('Canvi que cal conservar');
  // Ara la versió és actual: l’eliminació explícita pot continuar.
  await other.getByRole('button', {name: 'Elimina’l', exact: true}).click();
  await expect(other.getByRole('heading', {name: 'Comença amb una pregunta'})).toBeVisible();
  await addNote(page, 'Esborrany recuperable');
  await expect(page.getByRole('alert')).toContainText('ha canviat o s’ha eliminat');
  await expect(page.getByLabel('Esborrany d’un dossier que ja no és a la llista')).toHaveValue('Esborrany recuperable');
  await expect(page.getByRole('heading', {name: 'Comença amb una pregunta'})).toBeVisible();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', {name: 'Descarta l’esborrany'}).click();
  await expect(page.getByLabel('Esborrany d’un dossier que ja no és a la llista')).toHaveValue('Esborrany recuperable');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: 'Descarta l’esborrany'}).click();
  await expect(page.getByLabel('Esborrany d’un dossier que ja no és a la llista')).toHaveCount(0);
});

test('esborrany i tipus per dossier: canvi de secció, de dossier i recàrrega', async ({page}) => {
  await page.goto('/#dossiers');
  await create(page, 'Dossier A');
  await page.getByLabel('Nova nota', {exact: true}).fill('Esborrany A');
  await page.getByLabel('Tipus de nota').selectOption('hipòtesi');
  await create(page, 'Dossier B');
  await expect(page.getByLabel('Nova nota', {exact: true})).toHaveValue('');
  await page.getByLabel('Nova nota', {exact: true}).fill('Esborrany B');
  await page.getByRole('link', {name: 'Pressupost', exact: true}).click();
  await page.getByRole('link', {name: /^Dossiers/}).click();
  await expect(page.getByLabel('Nova nota', {exact: true})).toHaveValue('Esborrany B');
  page.on('dialog', dialog => dialog.accept());
  await page.reload();
  await expect(page.getByLabel('Nova nota', {exact: true})).toHaveValue('Esborrany B');
  await page.getByRole('button', {name: /Dossier A.*fonts/}).click();
  await expect(page.getByLabel('Nova nota', {exact: true})).toHaveValue('Esborrany A');
  await expect(page.getByLabel('Tipus de nota')).toHaveValue('hipòtesi');
  await page.getByRole('button', {name: 'Afegeix nota', exact: true}).click();
  await expect(page.getByLabel('Nova nota', {exact: true})).toHaveValue('');
  await page.reload();
  await expect(page.locator('.note p')).toHaveText('Esborrany A');
  await expect(page.getByLabel('Nova nota', {exact: true})).toHaveValue('');
});

test('dossiers locals accessibles i exportables amb error o espera del catàleg', async ({page}) => {
  await page.goto('/#dossiers');
  await create(page);
  await addNote(page, 'Nota local de prova');
  await expect(page.locator('.note p')).toHaveText('Nota local de prova');
  await page.route('**/data/catalog.json', route => route.fulfill({status: 503, body: 'unavailable'}));
  await page.reload();
  await expect(page.getByRole('status').filter({hasText: 'Les dades públiques no estan disponibles'})).toBeVisible();
  await expect(page.locator('.note p')).toHaveText('Nota local de prova');
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Còpia JSON', exact: true}).click();
  const payload = JSON.parse(await fs.readFile((await (await download).path())!, 'utf8'));
  expect(payload.dossier.notes[0].text).toBe('Nota local de prova');
  await page.route('**/data/catalog.json', () => {});
  await page.reload({waitUntil: 'domcontentloaded'});
  await expect(page.locator('.note p')).toHaveText('Nota local de prova');
  await expect(page.getByRole('button', {name: 'Còpia JSON', exact: true})).toBeEnabled();
});

test('un desament endarrerit no esborra l’esborrany escrit després en un altre dossier', async ({page}) => {
  await page.goto('/#dossiers');
  await create(page, 'Dossier A');
  await create(page, 'Dossier B');
  await page.getByRole('button', {name: /Dossier A.*fonts/}).click();
  await page.getByLabel('Nova nota', {exact: true}).fill('Nota A pendent de desar');
  // Mantenim una transacció anterior oberta per simular un emmagatzematge lent.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const state = window as Window & {releaseDossierTest?: boolean};
    state.releaseDossierTest = false;
    const request = indexedDB.open('observatori-castellar', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('dossiers', 'readwrite');
      const store = tx.objectStore('dossiers');
      const started = Date.now();
      const keepOpen = () => {
        const r = store.get('test-lock');
        r.onsuccess = () => {resolve(); if (!state.releaseDossierTest && Date.now() - started < 15000) keepOpen();};
      };
      tx.oncomplete = () => db.close();
      keepOpen();
    };
  }));
  try {
    await page.getByRole('button', {name: 'Afegeix nota', exact: true}).click();
    await page.getByRole('link', {name: 'Pressupost', exact: true}).click();
    await page.getByRole('link', {name: /^Dossiers/}).click();
    await page.getByRole('button', {name: /Dossier B.*fonts/}).click();
    await page.getByLabel('Nova nota', {exact: true}).fill('Esborrany B més recent');
  } finally {
    await page.evaluate(() => {(window as Window & {releaseDossierTest?: boolean}).releaseDossierTest = true;});
  }
  await expect(page.getByRole('button', {name: /Dossier A.*1 notes/})).toBeVisible();
  await expect(page.getByLabel('Nova nota', {exact: true})).toHaveValue('Esborrany B més recent');
  await page.getByRole('button', {name: 'Afegeix nota', exact: true}).click();
  await expect(page.locator('.note p')).toHaveText('Esborrany B més recent');
});

test('sense sessionStorage conserva el text durant la navegació i avisa del límit', async ({page}) => {
  await page.addInitScript(() => {Storage.prototype.setItem = () => {throw new DOMException('Denied', 'SecurityError');};});
  await page.goto('/#dossiers');
  await create(page);
  await page.getByLabel('Nova nota', {exact: true}).fill('Esborrany en memòria');
  await expect(page.getByRole('alert')).toContainText('No s’han pogut conservar els esborranys');
  await page.getByRole('link', {name: 'Pressupost', exact: true}).click();
  await page.getByRole('link', {name: /^Dossiers/}).click();
  await expect(page.getByLabel('Nova nota', {exact: true})).toHaveValue('Esborrany en memòria');
  await page.getByRole('button', {name: 'Afegeix nota', exact: true}).click();
  await expect(page.locator('.note p')).toHaveText('Esborrany en memòria');
});

test('dossiers anteriors sense versió continuen editables', async ({page}) => {
  await page.goto('/#dossiers');
  await page.getByRole('heading', {name: 'Comença amb una pregunta'}).waitFor();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('observatori-castellar', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('dossiers', 'readwrite');
        tx.objectStore('dossiers').put({id: 'legacy-test', title: 'Dossier anterior', createdAt: '2026-10-13', updatedAt: '2026-10-13', notes: [], evidence: []});
        tx.oncomplete = () => {db.close(); resolve();};
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Dossier anterior'})).toBeVisible();
  await addNote(page, 'Nota després de l’actualització');
  await expect(page.locator('.note p')).toHaveText('Nota després de l’actualització');
  await page.reload();
  await expect(page.locator('.note p')).toHaveText('Nota després de l’actualització');
});

test('text secundari de les targetes mòbils amb contrast AA i mida llegible', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/');
  await page.locator('.stat small').first().waitFor();
  const styles = await page.locator('.stat small, .stat > span').evaluateAll(elements => elements.map(el => {
    const style = getComputedStyle(el);
    const background = getComputedStyle(el.closest('.stat')!).backgroundColor;
    const luminance = (color: string) => {
      const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => {v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;});
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    const a = luminance(style.color), b = luminance(background);
    return {size: parseFloat(style.fontSize), contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05)};
  }));
  for (const style of styles) {expect(style.size).toBeGreaterThanOrEqual(12); expect(style.contrast).toBeGreaterThanOrEqual(4.5);}
});
