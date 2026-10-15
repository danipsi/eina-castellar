import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import type {Catalog} from '../../src/types';

const catalog = async (): Promise<Catalog> => JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
const pct = (n: number) => new Intl.NumberFormat('ca-ES', {maximumFractionDigits: 1}).format(n) + '%';

test('inversions: execució del capítol 6 per exercici, a la portada i al pressupost', async ({page}) => {
  const data = await catalog();
  const rows = data.budget.filter(r => r.side === 'despeses' && r.chapter === '6').sort((a, b) => a.year - b.year);
  const closed = rows.filter(r => r.executedCents !== null && r.finalCents !== null);
  expect(closed.length).toBeGreaterThan(0);
  await page.goto('/#budget');
  const panel = page.locator('#inversions');
  await expect(panel.getByRole('heading', {name: 'Inversions: pressupostat i executat'})).toBeVisible();
  await expect(panel.locator('tbody tr')).toHaveCount(rows.length);
  for (const r of closed) {
    const row = panel.locator('tbody tr', {hasText: String(r.year)});
    await expect(row).toContainText(pct(r.executedCents! / r.finalCents! * 100));
  }
  const open = rows.find(r => r.executedCents === null);
  if (open) await expect(panel.locator('tbody tr', {hasText: String(open.year)})).toContainText('No calculable');
  await panel.locator('tbody tr').first().getByRole('button', {name: 'Consulta'}).click();
  await expect(page.getByRole('dialog', {name: 'Detall pressupostari'})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/#budget?side=ingressos');
  await expect(page.locator('#inversions')).toHaveCount(0);
  await page.goto('/#overview');
  await expect(page.locator('#inversions')).toContainText('Crèdit definitiu no liquidat acumulat');
});

test('dossier: pregunta formal amb notes i fonts, seguiment i còpia restaurada', async ({page}) => {
  await page.goto('/#search?q=CONT2400054');
  await page.getByRole('button', {name: /PSCP · CONT2400054 · lot 1/}).click();
  await page.getByRole('button', {name: 'Afegeix al dossier', exact: true}).click();
  const save = page.getByRole('dialog', {name: 'Afegeix al dossier'});
  await save.getByLabel('Nom del dossier').fill('Obra de la piscina');
  await save.getByRole('button', {name: 'Desa la referència'}).click();
  await expect(save).not.toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', {name: 'Dossiers', exact: false}).click();
  await page.getByLabel('Nova nota').fill('Quin és l’import final del lot 1 després de la modificació?');
  await page.getByRole('button', {name: 'Afegeix nota'}).click();
  await page.getByLabel('Tipus de nota').selectOption('hipòtesi');
  await page.getByLabel('Nova nota').fill('La modificació podria superar el 20 %.');
  await page.getByRole('button', {name: 'Afegeix nota'}).click();

  await page.getByRole('button', {name: 'Prepara una pregunta formal'}).click();
  const composer = page.getByRole('dialog', {name: 'Prepara una pregunta formal'});
  await composer.getByRole('button', {name: 'Sol·licitud d’informació'}).click();
  await composer.getByLabel('Signant', {exact: true}).fill('Persona de prova');
  await composer.getByLabel('Grup municipal', {exact: true}).fill('Grup de prova');
  const text = composer.getByLabel('Text de la petició');
  await expect(text).toHaveValue(/SOL·LICITUD D’INFORMACIÓ/);
  await expect(text).toHaveValue(/article 77 de la Llei 7\/1985/);
  await expect(text).toHaveValue(/1\. Quin és l’import final del lot 1/);
  await expect(text).not.toHaveValue(/podria superar/);
  await expect(text).toHaveValue(/CONT2400054/);
  await expect(text).not.toHaveValue(/registre pscp-/);
  await composer.getByLabel('Cita les fonts del dossier com a antecedents (1)').uncheck();
  await expect(text).not.toHaveValue(/CONT2400054/);
  await composer.getByRole('button', {name: 'Pregunta al Ple'}).click();
  await expect(text).toHaveValue(/^PREGUNTA PER AL PLE/);
  await text.fill(await text.inputValue() + '\nAfegit a mà.');
  await composer.getByRole('button', {name: 'Desa al seguiment'}).click();
  await expect(composer).not.toBeVisible();

  const item = page.locator('.request-item');
  await expect(item).toHaveCount(1);
  await expect(item.getByLabel('Estat de la petició')).toHaveValue('esborrany');
  await item.getByLabel('Estat de la petició').selectOption('presentada');
  await expect(item).toContainText('presentada avui');
  await expect(item.getByLabel('Data de presentació')).not.toHaveValue('');
  await item.getByLabel('Núm. de registre').fill('E/2026/123');
  await item.getByRole('button', {name: 'Desa'}).click();
  await page.reload();
  await expect(page.locator('.request-item').getByLabel('Núm. de registre')).toHaveValue('E/2026/123');
  await page.locator('.request-item').getByRole('button', {name: 'Mostra el text'}).click();
  await expect(page.locator('.request-preview')).toContainText('Afegit a mà.');

  const promise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Còpia JSON'}).click();
  const payload = JSON.parse(await fs.readFile((await (await promise).path())!, 'utf8'));
  expect(payload.dossier.requests).toHaveLength(1);
  await page.getByLabel('Importa un dossier o un paquet JSON').setInputFiles({name: 'copia.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload))});
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Ja tens aquesta versió');
  await dialog.getByLabel(/^Importació de/).selectOption('copy');
  await dialog.getByRole('button', {name: 'Confirma la importació', exact: true}).click();
  await expect(page.getByRole('button', {name: /Obra de la piscina/})).toHaveCount(2);
  payload.dossier.requests[0].status = 'inventat';
  await page.getByLabel('Importa un dossier o un paquet JSON').setInputFiles({name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload))});
  await expect(page.getByRole('alert')).toContainText('no és un dossier vàlid');
});

test('canal RSS del Ple: XML vàlid amb els plens més recents i enllaç des de Sessions', async ({page, request}) => {
  const data = await catalog();
  const latest = data.sessions.filter(s => s.body === 'Ple').sort((a, b) => b.date.localeCompare(a.date))[0];
  await page.goto('/#sessions');
  const href = await page.getByRole('link', {name: 'Canal RSS del Ple'}).getAttribute('href');
  const response = await request.get(href!);
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();
  expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0">/);
  expect(xml).toContain(`<guid isPermaLink="false">sessio-${latest.id}</guid>`);
  expect(xml.match(/<item>/g)?.length).toBe(Math.min(25, data.sessions.filter(s => s.body === 'Ple').length));
  expect(xml).not.toContain('Junta de Govern Local del');
});
