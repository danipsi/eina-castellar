import rawPeriod from '../config/period.json';

export type PeriodConfig = Readonly<{
  startYear: number;
  endYear: number;
  latestLiquidationYear: number;
}>;

export function validatePeriod(value: unknown): PeriodConfig {
  if (!value || typeof value !== 'object') throw new Error('La configuració del període ha de ser un objecte.');
  const candidate = value as Record<string, unknown>;
  const keys = ['startYear', 'endYear', 'latestLiquidationYear'] as const;
  if (Object.keys(candidate).length !== keys.length || keys.some(key => !Number.isSafeInteger(candidate[key]))) {
    throw new Error('La configuració del període ha de contenir tres anys enters.');
  }
  const startYear = candidate.startYear as number;
  const endYear = candidate.endYear as number;
  const latestLiquidationYear = candidate.latestLiquidationYear as number;
  if (startYear < 1900 || endYear > 9999 || startYear > latestLiquidationYear || latestLiquidationYear > endYear) {
    throw new Error('L’ordre dels anys del període no és vàlid.');
  }
  return Object.freeze({startYear, endYear, latestLiquidationYear});
}

export const PERIOD = validatePeriod(rawPeriod);
export const PERIOD_START_YEAR = PERIOD.startYear;
export const PERIOD_END_YEAR = PERIOD.endYear;
export const LATEST_LIQUIDATION_YEAR = PERIOD.latestLiquidationYear;
export const PERIOD_LABEL = `${PERIOD_START_YEAR}–${PERIOD_END_YEAR}`;
export const LIQUIDATION_PERIOD_LABEL = `${PERIOD_START_YEAR}–${LATEST_LIQUIDATION_YEAR}`;

export function periodYears(order: 'ascending' | 'descending' = 'ascending'): number[] {
  const years = Array.from({length: PERIOD_END_YEAR - PERIOD_START_YEAR + 1}, (_, index) => PERIOD_START_YEAR + index);
  return order === 'descending' ? years.reverse() : years;
}

export function liquidationYears(order: 'ascending' | 'descending' = 'ascending'): number[] {
  const years = Array.from({length: LATEST_LIQUIDATION_YEAR - PERIOD_START_YEAR + 1}, (_, index) => PERIOD_START_YEAR + index);
  return order === 'descending' ? years.reverse() : years;
}

export function isPeriodYear(year: number): boolean {
  return Number.isInteger(year) && year >= PERIOD_START_YEAR && year <= PERIOD_END_YEAR;
}
