import type {Catalog, Contract, ContractEvent} from './types';
import {date, expKey, normalize} from './lib';
import {isMinor} from './minorData';

// Fi del termini inicial. Si la font dona la data de fi, s'usa tal qual; si només dona la durada,
// s'estima des de la formalització (o, si manca, des de l'adjudicació): inici + durada − 1 dia.
export type EndBasis = 'font' | 'formalització' | 'adjudicació';
export type TermEnd = {end: string; basis: EndBasis};
export type Horizon = '6' | '12' | '24' | 'passat';
export const HORIZONS: {id: Horizon; label: string}[] = [{id: '6', label: 'Pròxims 6 mesos'}, {id: '12', label: 'Pròxims 12 mesos'}, {id: '24', label: 'Pròxims 24 mesos'}, {id: 'passat', label: 'Vençuts els darrers 12 mesos'}];
export const BASIS_LABEL: Record<EndBasis, string> = {font: 'Data de fi publicada', formalització: 'Estimada des de la formalització', adjudicació: 'Estimada des de l’adjudicació'};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const validDay = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function parseDuration(value: string | null | undefined) {
  const found = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/.exec(value ?? '');
  if (!found || value === 'P') return null;
  const [years, months, days] = found.slice(1).map(n => Number(n ?? 0));
  return years || months || days ? {years, months, days} : null;
}

// Suma mesos sense desbordar: 31 de gener + 1 mes = 28 o 29 de febrer.
export function addMonths(day: string, months: number) {
  const [y, m, d] = day.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return isoDay(target);
}
export const addDays = (day: string, days: number) => isoDay(new Date(Date.parse(day) + days * 86_400_000));

export function contractEnd(c: Contract): TermEnd | null {
  if (validDay(c.termEnd)) return {end: c.termEnd, basis: 'font'};
  const duration = parseDuration(c.duration);
  const start = validDay(c.termStart) ? c.termStart : validDay(c.formalizedDate) ? c.formalizedDate : validDay(c.date) ? c.date : null;
  if (!duration || !start) return null;
  const basis: EndBasis = start === c.date && start !== c.formalizedDate && start !== c.termStart ? 'adjudicació' : 'formalització';
  return {end: addDays(addDays(addMonths(start, duration.years * 12 + duration.months), duration.days), -1), basis};
}

export const durationLabel = (c: Contract) => {
  if (validDay(c.termStart) && validDay(c.termEnd)) return `Del ${date(c.termStart)} al ${date(c.termEnd)}`;
  const d = parseDuration(c.duration);
  if (!d) return null;
  return [[d.years, 'any', 'anys'], [d.months, 'mes', 'mesos'], [d.days, 'dia', 'dies']].filter(([n]) => n).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`).join(' i ');
};

export const isExtension = (e: ContractEvent) => normalize(e.type).includes('prorroga');
export const isExtraordinary = (e: ContractEvent) => normalize(e.title).includes('extraordin');
const lotKey = (lot: string | null) => lot && lot !== '0' ? lot : '';

export type Chain = {id: string; expedient: string; lot: string | null; events: ContractEvent[]; contract: Contract | null; extraordinary: number};

// Pròrrogues de l'execució contractual agrupades per expedient i lot. El mateix document repetit compta una vegada.
export function extensionChains(data: Catalog, source: Contract['source']): Chain[] {
  const groups = new Map<string, Chain>();
  for (const event of data.events.filter(isExtension)) {
    const id = `${expKey(event.expedient)}|${lotKey(event.lot)}`;
    const chain = groups.get(id) ?? {id, expedient: event.expedient, lot: lotKey(event.lot) || null, events: [], contract: null, extraordinary: 0};
    if (!chain.events.some(e => e.date === event.date && e.title === event.title)) chain.events.push(event);
    groups.set(id, chain);
  }
  const contracts = data.contracts.filter(c => !isMinor(c)).sort((a, b) => Number(b.source === source) - Number(a.source === source) || Number(!!b.supplier) - Number(!!a.supplier) || a.id.localeCompare(b.id));
  return [...groups.values()].map(chain => {
    const same = contracts.filter(c => chain.expedient && expKey(c.expedient) === expKey(chain.expedient));
    const contract = same.find(c => lotKey(c.lot) === (chain.lot ?? '')) ?? same[0] ?? null;
    const events = [...chain.events].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    return {...chain, events, contract, extraordinary: events.filter(isExtraordinary).length};
  }).sort((a, b) => b.events.length - a.events.length || (b.events.at(-1)?.date ?? '').localeCompare(a.events.at(-1)?.date ?? '') || a.id.localeCompare(b.id));
}

export type TermRow = {contract: Contract; term: TermEnd; extensions: ContractEvent[]};
const basisRank: Record<EndBasis, number> = {font: 0, formalització: 1, adjudicació: 2};

// Un contracte per expedient i lot dins de la font triada. Els menors no es poden prorrogar i en queden fora.
export function termRows(data: Catalog, source: Contract['source']) {
  const kept = new Map<string, TermRow>();
  let minors = 0;
  const chains = new Map(extensionChains(data, source).map(c => [c.id, c.events]));
  for (const contract of data.contracts) {
    if (contract.source !== source) continue;
    if (isMinor(contract)) {minors++; continue;}
    const term = contractEnd(contract);
    const key = contract.expedient ? `${expKey(contract.expedient)}|${lotKey(contract.lot)}` : contract.id;
    if (!term) continue;
    const previous = kept.get(key);
    const row = {contract, term, extensions: chains.get(key) ?? (lotKey(contract.lot) ? [] : chains.get(`${expKey(contract.expedient)}|`) ?? [])};
    if (!previous || basisRank[term.basis] < basisRank[previous.term.basis] || (basisRank[term.basis] === basisRank[previous.term.basis] && term.end > previous.term.end)) kept.set(key, row);
  }
  const rows = [...kept.values()];
  const withTerm = new Set(rows.map(r => r.contract.expedient ? `${expKey(r.contract.expedient)}|${lotKey(r.contract.lot)}` : r.contract.id));
  // Un expedient amb una observació sense durada i una altra amb durada no compta com a desconegut.
  const unknown = new Set(data.contracts.filter(c => c.source === source && !isMinor(c) && !contractEnd(c)).map(c => c.expedient ? `${expKey(c.expedient)}|${lotKey(c.lot)}` : c.id).filter(k => !withTerm.has(k))).size;
  return {rows, minors, unknown};
}

export function inHorizon(rows: TermRow[], horizon: Horizon, reference: string) {
  const [from, to] = horizon === 'passat' ? [addMonths(reference, -12), addDays(reference, -1)] : [reference, addMonths(reference, Number(horizon))];
  return rows.filter(r => r.term.end >= from && r.term.end <= to).sort((a, b) => horizon === 'passat' ? b.term.end.localeCompare(a.term.end) : a.term.end.localeCompare(b.term.end));
}

export const monthLabel = (day: string) => new Intl.DateTimeFormat('ca-ES', {month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(day.slice(0, 7) + '-01'));
