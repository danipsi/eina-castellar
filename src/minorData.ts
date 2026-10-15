import type {Contract} from './types';
import {normalize} from './lib';

// LCSP art. 118.1: contracte menor si el valor estimat és inferior a 40.000 € (obres)
// o a 15.000 € (serveis i subministraments), sense IVA. Imports en cèntims.
export type ThresholdKind = 'obres' | 'serveis i subministraments';
export const THRESHOLDS: Record<ThresholdKind, number> = {obres: 4_000_000, 'serveis i subministraments': 1_500_000};
export const NEAR_SHARE = 0.9;
export const CPV_LEVELS = [{digits: 3, label: 'Grup (3 xifres)'}, {digits: 4, label: 'Classe (4 xifres)'}, {digits: 5, label: 'Categoria (5 xifres)'}, {digits: 8, label: 'Codi complet'}] as const;
export const DEFAULT_CPV_DIGITS = 4;

export type MinorRow = {contract: Contract; kind: ThresholdKind; limit: number; share: number | null};
export type MinorGroup = {id: string; label: string; year: number; kind: ThresholdKind; limit: number; rows: MinorRow[]; totalCents: number; suppliers: number};

export const isMinor = (c: Contract) => /\bmenor\b/i.test(c.procedure);

// Només obres, serveis i subministraments tenen llindar de contracte menor; la resta queda fora.
export function thresholdKind(c: Contract): ThresholdKind | null {
  const t = normalize(c.type);
  if (t.includes('concessio')) return null;
  if (t.includes('obres')) return 'obres';
  if (t.includes('serveis') || t.includes('subministrament')) return 'serveis i subministraments';
  return null;
}

// La font pot publicar el mateix contracte dues vegades (adjudicació i publicació agregada):
// mateix expedient i import compten una sola vegada. Es prefereix el registre amb adjudicatari visible.
const preference = (a: Contract, b: Contract) => Number(!a.supplier) - Number(!b.supplier) || (a.date ?? '9').localeCompare(b.date ?? '9') || a.id.localeCompare(b.id);

export function minorRows(contracts: Contract[], source: Contract['source']): {rows: MinorRow[]; duplicates: number} {
  const kept = new Map<string, Contract>();
  let duplicates = 0;
  for (const contract of contracts) {
    if (contract.source !== source || !isMinor(contract) || !thresholdKind(contract)) continue;
    const key = contract.expedient && contract.amountCents !== null ? `${contract.expedient}|${contract.amountCents}` : contract.id;
    const previous = kept.get(key);
    if (previous) duplicates++;
    if (!previous || preference(contract, previous) < 0) kept.set(key, contract);
  }
  const rows = [...kept.values()].sort((a, b) => a.id.localeCompare(b.id)).map(contract => {
    const kind = thresholdKind(contract)!, limit = THRESHOLDS[kind];
    return {contract, kind, limit, share: contract.amountCents === null ? null : contract.amountCents / limit};
  });
  return {rows, duplicates};
}

export const isNear = (r: MinorRow) => r.share !== null && r.share >= NEAR_SHARE && r.share < 1;
export const isAtOrAbove = (r: MinorRow) => r.share !== null && r.share >= 1;
export const cpvPrefix = (cpv: string | null | undefined, digits: number) => cpv && /^\d{8}/.test(cpv) ? cpv.slice(0, digits) : null;

// Grups de dos o més contractes menors del mateix exercici i tipus de llindar que, sumats, hi arriben.
export function repeatedGroups(rows: MinorRow[], key: (c: Contract) => string | null): MinorGroup[] {
  const groups = new Map<string, MinorGroup>();
  for (const row of rows) {
    const label = key(row.contract), year = row.contract.year;
    if (!label || year === null) continue;
    const id = `${label}|${year}|${row.kind}`;
    const group = groups.get(id) ?? {id, label, year, kind: row.kind, limit: row.limit, rows: [], totalCents: 0, suppliers: 0};
    group.rows.push(row);
    group.totalCents += row.contract.amountCents ?? 0;
    groups.set(id, group);
  }
  return [...groups.values()]
    .filter(g => g.rows.length > 1 && g.totalCents >= g.limit)
    .map(g => ({...g, suppliers: new Set(g.rows.map(r => r.contract.supplier).filter(Boolean)).size, rows: [...g.rows].sort((a, b) => (a.contract.date ?? '').localeCompare(b.contract.date ?? ''))}))
    .sort((a, b) => b.totalCents / b.limit - a.totalCents / a.limit);
}

export function yearSummary(rows: MinorRow[]) {
  const years = [...new Set(rows.map(r => r.contract.year).filter((y): y is number => y !== null))].sort((a, b) => b - a);
  return years.map(year => {
    const own = rows.filter(r => r.contract.year === year && r.share !== null);
    return {year, total: own.length, near: own.filter(isNear).length, above: own.filter(isAtOrAbove).length};
  });
}
