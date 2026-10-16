import MiniSearch from 'minisearch';
import type {Catalog} from './types';
import {compactMoney, expKey, normalize, number} from './lib';
import {companyKey} from './supplierData';
import {extractMotions} from './motionData';

// Tipus de resultat de la cerca transversal. Contractes i sessions s'obren en fitxa; la resta porta a la seva pàgina.
export const SEARCH_KINDS = [['contract', 'Contractació'], ['session', 'Sessions'], ['motion', 'Mocions'], ['supplier', 'Proveïdors'], ['grant', 'Subvencions'], ['agreement', 'Convenis']] as const;
export type SearchKind = typeof SEARCH_KINDS[number][0];
export type SearchHit = {id: string; kind: SearchKind; itemId: string; title?: string; meta?: string; href?: string; date?: string | null};
type SearchDoc = SearchHit & {title: string; expedient: string; text: string};

// Imports grans en milions; la resta en euros sencers, perquè «0,02 M€» no es llegeix bé.
const amount = (cents: number) => cents >= 100_000_000 ? compactMoney(cents) : new Intl.NumberFormat('ca-ES', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0}).format(cents / 100);
const years = (list: number[]) => {const sorted = [...new Set(list)].sort(); return sorted.length > 1 ? `${sorted[0]}–${sorted.at(-1)}` : String(sorted[0]);};

// Proveïdors i beneficiaris s'agrupen pel nom normalitzat de tots els exercicis, com a les seves pàgines.
function suppliers(data: Catalog): SearchDoc[] {
  const map = new Map<string, {name: string; category: string; years: number[]; invoices: number; cents: number}>();
  for (const r of data.suppliers ?? []) {
    if (!r.name) continue;
    const key = companyKey(r.name), e = map.get(key) ?? {name: r.name, category: r.category, years: [], invoices: 0, cents: 0};
    e.years.push(r.year); e.invoices += r.invoices; e.cents += r.invoicedCents;
    map.set(key, e);
  }
  return [...map].map(([key, e]) => ({id: 'supplier:' + key, kind: 'supplier', itemId: key, title: e.name, expedient: '', text: e.category,
    meta: `${number(e.invoices)} factures · ${amount(e.cents)} amb IVA · ${years(e.years)}`,
    href: `#suppliers?year=${Math.max(...e.years)}&name=${encodeURIComponent(e.name)}`}));
}

function grants(data: Catalog): SearchDoc[] {
  const map = new Map<string, {name: string; category: string; years: number[]; grants: number; cents: number; calls: string[]}>();
  for (const g of data.grants ?? []) {
    if (!g.beneficiary) continue;
    const key = companyKey(g.beneficiary), e = map.get(key) ?? {name: g.beneficiary, category: g.category, years: [], grants: 0, cents: 0, calls: []};
    e.years.push(g.year); e.grants += g.grants; e.cents += g.amountCents; e.calls.push(g.call);
    map.set(key, e);
  }
  return [...map].map(([key, e]) => ({id: 'grant:' + key, kind: 'grant', itemId: key, title: e.name, expedient: '', text: `${e.category} ${e.calls.join(' ')}`,
    meta: `${number(e.grants)} concessions · ${amount(e.cents)} · ${years(e.years)}`,
    href: `#grants?year=${Math.max(...e.years)}&name=${encodeURIComponent(e.name)}`}));
}

export function makeSearch(data: Catalog) {
  const index = new MiniSearch<SearchDoc>({fields: ['title', 'expedient', 'text'], storeFields: ['kind', 'itemId', 'title', 'meta', 'href', 'date'], processTerm: t => normalize(t), searchOptions: {prefix: true, fuzzy: 0.15, boost: {expedient: 4, title: 2}, combineWith: 'AND'}});
  index.addAll([
    ...data.contracts.map(c => ({id: 'contract:' + c.id, itemId: c.id, kind: 'contract' as const, title: c.title, expedient: c.expedient, text: `${c.supplier ?? ''} ${c.procedure} ${c.type}`})),
    ...data.sessions.map(s => ({id: 'session:' + s.id, itemId: s.id, kind: 'session' as const, title: s.title, expedient: s.agenda.flatMap(a => a.expedients).join(' '), text: s.agenda.map(a => a.title).join(' ')})),
    ...extractMotions(data).map(m => ({id: 'motion:' + m.id, itemId: m.id, kind: 'motion' as const, title: m.title, expedient: '', text: m.groups.join(' '), date: m.date,
      meta: `${m.groups.join(' · ') || 'Sense grup informat'} · ${m.appearances.length > 1 ? `${m.appearances.length} sessions` : 'Ple'}`, href: `#motions?motion=${m.id}`})),
    ...suppliers(data),
    ...grants(data),
    ...(data.agreements ?? []).map(a => ({id: 'agreement:' + a.id, itemId: a.id, kind: 'agreement' as const, title: a.title, expedient: a.code, text: a.description ?? '', date: a.start,
      meta: `${a.code} · ${a.status}`, href: `#grants?view=convenis&conveni=${encodeURIComponent(a.code)}`})),
  ]);
  return index;
}

export function exactResults(data: Catalog, query: string): SearchHit[] {
  const key = expKey(query);
  if (!key) return [];
  return [
    ...data.contracts.filter(c => expKey(c.expedient) === key).map(c => ({id: 'contract:' + c.id, kind: 'contract' as const, itemId: c.id})),
    ...data.sessions.filter(s => s.agenda.some(a => a.expedients.some(e => expKey(e) === key))).map(s => ({id: 'session:' + s.id, kind: 'session' as const, itemId: s.id})),
    ...(data.agreements ?? []).filter(a => expKey(a.code) === key).map(a => ({id: 'agreement:' + a.id, kind: 'agreement' as const, itemId: a.id, title: a.title, date: a.start,
      meta: `${a.code} · ${a.status}`, href: `#grants?view=convenis&conveni=${encodeURIComponent(a.code)}`})),
  ];
}
