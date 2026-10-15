import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('dades reals, cerca exacta, cronologia, teclat i captura visual', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', {name: 'La informació pública, connectada.'})).toBeVisible();
  await page.screenshot({path: 'test-results/visio-general.png', fullPage: true});
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('textbox', {name: 'Cerca global'})).toBeFocused();
  await page.keyboard.type('CONT2400054');
  const before = Date.now();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', {name: /PSCP · CONT2400054 · lot 1/})).toBeVisible();
  expect(Date.now() - before).toBeLessThan(2000);
  await page.getByRole('button', {name: /PSCP · CONT2400054 · lot 1/}).click();
  const dialog = page.getByRole('dialog', {name: 'Fitxa d’expedient'});
  await expect(dialog.locator('.timeline li').filter({hasText:/31 de març.*2026/}).getByText('Ordre del dia · punt 6')).toBeVisible();
  await expect(dialog.getByText(/31 de març.*2026/)).toBeVisible();
  await expect(dialog.getByText('La menció no acredita un acord aprovat.').first()).toBeVisible();
  await expect(dialog.getByRole('button', {name: /PSCP Lot 2/})).toBeVisible();
  await page.screenshot({path: 'test-results/expedient.png', fullPage: true});
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(errors).toEqual([]);
});

test('CSV reflecteix les mateixes files dels filtres', async ({page}) => {
  await page.goto('/#contracts');
  await page.getByLabel('Exercici', {exact: true}).selectOption('2025');
  await page.getByLabel('Procediment', {exact: true}).selectOption({label:'Obert'});
  const data = await (await page.request.get('/data/catalog.json')).json();
  const filtered = data.contracts.filter((c: any) => c.source === 'PSCP' && c.year === 2025 && c.procedure === 'Obert');
  await expect(page.locator('.table-summary')).toContainText(`${filtered.length}`);
  const promise = page.waitForEvent('download');
  await page.getByRole('button', {name:'Exporta CSV'}).click();
  const downloaded = await promise;
  const text = await fs.readFile((await downloaded.path())!, 'utf8');
  // Els títols es normalitzen a una línia i els imports s’exporten sense falsos zeros.
  expect(text.trim().split('\r\n').length).toBe(filtered.length + 1);
  for (const row of filtered) expect(text).toContain(row.id);
});

test('dossier local: evidència, nota, estat, persistència i còpia restaurada', async ({page}) => {
  await page.goto('/#search?q=CONT2400054');
  await page.getByRole('button', {name:/PSCP · CONT2400054 · lot 1/}).click();
  await page.getByRole('button', {name:'Afegeix al dossier', exact:true}).click();
  const save = page.getByRole('dialog', {name:'Afegeix al dossier'});
  await save.getByLabel('Nom del dossier').fill('Seguiment de prova');
  await save.getByRole('button', {name:'Desa la referència'}).click();
  await expect(save).not.toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', {name:'Dossiers', exact:false}).click();
  await page.getByLabel('Nova nota').fill('Contrastar el punt 6 amb l’acta original.');
  await page.getByRole('button', {name:'Afegeix nota'}).click();
  await page.getByLabel('Estat de revisió de la nota').selectOption('contrastada');
  await page.reload();
  await expect(page.getByText('Contrastar el punt 6 amb l’acta original.')).toBeVisible();
  await expect(page.getByLabel('Estat de revisió de la nota')).toHaveValue('contrastada');
  const promise = page.waitForEvent('download');
  await page.getByRole('button', {name:'Còpia JSON'}).click();
  const downloaded = await promise;
  const payload = JSON.parse(await fs.readFile((await downloaded.path())!, 'utf8'));
  expect(payload.dossier.evidence).toHaveLength(1);
  expect(payload.dossier.evidence[0].capturedAt).toBeTruthy();
  await page.getByRole('button', {name:'Elimina el dossier',exact:true}).click();
  await page.getByRole('button', {name:'Elimina’l',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Comença amb una pregunta'})).toBeVisible();
  await page.getByLabel('Importa un dossier o un paquet JSON').setInputFiles({name:'copia.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
  await page.getByRole('dialog').getByRole('button', {name: 'Confirma la importació', exact: true}).click();
  await expect(page.getByRole('heading', {name:'Seguiment de prova'})).toBeVisible();
  await expect(page.getByText('Contrastar el punt 6 amb l’acta original.')).toBeVisible();
  await expect(page.getByLabel('Estat de revisió de la nota')).toHaveValue('contrastada');
  expect(await page.locator('.evidence-item .original').getAttribute('href')).toBe(payload.dossier.evidence[0].url);
  await page.screenshot({path:'test-results/dossier.png',fullPage:true});
  payload.dossier.evidence[0].url = 'javascript:alert(1)';
  await page.getByLabel('Importa un dossier o un paquet JSON').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
  await expect(page.getByRole('alert')).toContainText('no és un dossier vàlid');
});

test('pressupost reconciliat i mòbil sense desbordament', async ({page}) => {
  await page.goto('/#budget');
  await page.getByLabel('Exercici pressupostari').selectOption('2024');
  const row = page.getByRole('row').filter({hasText:'Despeses de personal'});
  await expect(row).toContainText('12.653.822,61');
  await expect(row).toContainText('11.970.386,53');
  await page.screenshot({path:'test-results/pressupost.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  for (const route of ['overview','contracts','budget','sessions','sources','dossiers']) {
    await page.goto('/#'+route);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.goto('/');
  await page.screenshot({path:'test-results/mobil.png',fullPage:true});
  await page.getByRole('button', {name:'Obre el menú'}).click();
  await page.getByRole('link', {name:'Contractació',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Contractació',exact:true})).toBeVisible();
});

test('estat d’error de captura visible i dades anteriors consultables',async ({page}) => {
  await page.route('**/data/status.json',route => route.fulfill({json:{status:'error',attemptedAt:'2026-10-13'}}));
  await page.goto('/');
  await expect(page.getByText(/La darrera actualització no s’ha completat/)).toBeVisible();
  await expect(page.getByRole('heading', {name:'La informació pública, connectada.'})).toBeVisible();
});
