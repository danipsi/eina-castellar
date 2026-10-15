import type {BudgetRow, PeerMunicipality, Peers} from './types';

export type PeerMetric = 'initialCents' | 'finalCents' | 'executedCents';
export type PeerChapter = string; // '1'…'9' o 'total'
export type PeerValue = {code: string; name: string; population: number; populationYear: string; cents: number; perCapita: number};
export type PeerStats = {chapter: PeerChapter; values: PeerValue[]; self: PeerValue | null; rank: number | null; median: number | null; p25: number | null; p75: number | null; missing: number};

export const CORE_CHAPTERS = [0, 1, 2, 3];

// Població a 1 de gener del mateix any; si encara no s'ha publicat, la més recent anterior.
export function populationFor(m: PeerMunicipality, year: number): {value: number; year: string} | null {
  const years = Object.keys(m.population).filter(y => Number(y) <= year).sort();
  const chosen = years.at(-1);
  return chosen ? {value: m.population[chosen], year: chosen} : null;
}

// Quantil amb interpolació lineal (mètode habitual dels fulls de càlcul).
export function quantile(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * q, low = Math.floor(position), high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

// Import d'un capítol, o el total dels capítols informats si el municipi informa els capítols 1–4 de l'exercici.
export function chapterCents(values: (number | null)[], chapter: PeerChapter): number | null {
  if (chapter !== 'total') return values[Number(chapter) - 1] ?? null;
  if (CORE_CHAPTERS.some(i => values[i] === null)) return null;
  return values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
}

export function peerStats(peers: Peers, year: number, side: BudgetRow['side'], metric: PeerMetric, chapter: PeerChapter): PeerStats {
  const rows = new Map(peers.rows.filter(r => r.year === year && r.side === side).map(r => [r.code, r]));
  const values: PeerValue[] = [];
  let missing = 0;
  for (const m of peers.municipalities) {
    const row = rows.get(m.code), population = populationFor(m, year);
    const cents = row ? chapterCents(row[metric], chapter) : null;
    if (cents === null || !population) {missing++; continue;}
    values.push({code: m.code, name: m.name, population: population.value, populationYear: population.year, cents, perCapita: cents / 100 / population.value});
  }
  values.sort((a, b) => b.perCapita - a.perCapita || a.name.localeCompare(b.name, 'ca'));
  const ascending = values.map(v => v.perCapita).sort((a, b) => a - b);
  const self = values.find(v => v.code === peers.self) ?? null;
  // Els empats comparteixen posició: 1 + municipis amb un valor estrictament més alt.
  const rank = self ? values.filter(v => v.perCapita > self.perCapita).length + 1 : null;
  return {chapter, values, self, rank, median: quantile(ascending, .5), p25: quantile(ascending, .25), p75: quantile(ascending, .75), missing};
}

export const perCapita = (n: number | null) => n === null ? 'No calculable' : new Intl.NumberFormat('ca-ES', {maximumFractionDigits: Math.abs(n) < 10 ? 1 : 0, minimumFractionDigits: 0}).format(n) + ' €/hab.';
export const versusMedian = (value: number | null, median: number | null) => value !== null && median !== null && median > 0 ? (value - median) / median * 100 : null;
