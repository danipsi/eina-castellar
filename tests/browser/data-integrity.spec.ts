import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('els totals pressupostaris exigeixen exactament els capítols 1–9 del mateix any i costat', async ({page}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const {budgetTotal} = await import('/src/lib.ts');
    const rows = Array.from({length: 9}, (_, index) => ({
      id: String(index), year: 2025, side: 'despeses' as const, chapter: String(index + 1), chapterName: '',
      initialCents: 100, finalCents: 120, executedCents: 90, url: 'https://example.org', capturedAt: '2026-10-13',
    }));
    return {
      complete: budgetTotal(rows, 'executedCents'),
      missingOne: budgetTotal(rows.slice(0, 8), 'executedCents'),
      missingInTwoYears: budgetTotal([...rows.slice(0, 8), {...rows[8], year: 2024}], 'executedCents'),
      duplicate: budgetTotal([...rows.slice(0, 8), {...rows[7], id: 'duplicate'}], 'executedCents'),
      nullValue: budgetTotal(rows.map((row, index) => index === 4 ? {...row, executedCents: null} : row), 'executedCents'),
    };
  });
  expect(result).toEqual({complete: 810, missingOne: null, missingInTwoYears: null, duplicate: null, nullValue: null});
});

test('el CSV conserva negatius numèrics vàlids i neutralitza fórmules de text', async ({page}) => {
  await page.goto('/');
  const output = await page.evaluate(async () => {
    const {csv} = await import('/src/lib.ts');
    return csv([[-42.5, '-42,50', '-1.234,56', '-1+2', '-SUM(A1:A2)', ' -42,50', '=2+2', '+2', '@cmd']]);
  });
  expect(output).toBe('\ufeff"-42.5";"-42,50";"-1.234,56";"\'-1+2";"\'-SUM(A1:A2)";"\' -42,50";"\'=2+2";"\'+2";"\'@cmd"');
});

test('el període compartit manté els valors configurats i rebutja ordres impossibles', async ({page}) => {
  const configured = JSON.parse(await fs.readFile('config/period.json', 'utf8'));
  const years = Array.from({length: configured.endYear - configured.startYear + 1}, (_, i) => configured.startYear + i);
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const period = await import('/src/period.ts');
    let invalid = false;
    try { period.validatePeriod({startYear: 2027, endYear: 2026, latestLiquidationYear: 2026}); }
    catch { invalid = true; }
    return {config: period.PERIOD, years: period.periodYears(), descending: period.periodYears('descending'), invalid};
  });
  expect(result).toEqual({
    config: configured,
    years,
    descending: [...years].reverse(),
    invalid: true,
  });
  await expect(page.locator('.eyebrow')).toContainText(`${configured.startYear}–${configured.endYear}`);
  await page.goto('/#sessions');
  await expect(page.getByLabel('Any de les sessions').locator('option')).toHaveText(['Tots els exercicis', ...[...years].reverse().map(String)]);
});
