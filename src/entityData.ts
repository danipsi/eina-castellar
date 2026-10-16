import type {Agreement, Catalog, Contract, Grant, Session, SupplierYear} from './types';
import {normalize} from './lib';
import {companyKey} from './supplierData';
import {agendaMotionId} from './motionData';

// Rastre d'una entitat o empresa a totes les fonts, relacionat pel nom normalitzat (companyKey).
// Factures, contractes i subvencions coincideixen pel nom del camp; convenis i sessions, pel text.
export type Mention = {session: Session; number: string | number; title: string; motionId: string | null};
export type EntityYear = {year: number; invoices: number; invoicedCents: number; pscp: number; pscpCents: number; rpc: number; grants: number; grantCents: number; agreements: number; mentions: number};
export type EntityTrail = {key: string; name: string; category: string | null; invoices: SupplierYear[]; contracts: Contract[]; grants: Grant[];
  agreements: {agreement: Agreement; basis: 'codi' | 'text'}[]; mentions: Mention[]; searchable: boolean; years: EntityYear[]};

// Paraules del text separades per espais, per buscar-hi el nom sencer i no un tros de paraula.
const words = (text: string) => ` ${normalize(text).replace(/[.,]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
// Un nom d'una sola paraula o molt curt («Aigües», «Arc») trobaria massa textos que no hi tenen res a veure.
export const isSearchable = (key: string) => key.length >= 8 && key.includes(' ');

// La font pot publicar el mateix contracte dues vegades (adjudicació i publicació agregada): es compta una vegada.
const contractKey = (c: Contract) => c.expedient && c.amountCents !== null ? `${c.source}|${c.expedient}|${c.lot ?? ''}|${c.amountCents}` : c.id;
const contractYear = (c: Contract) => c.year ?? (c.date ? Number(c.date.slice(0, 4)) : null);

export function entityTrail(data: Catalog, name: string): EntityTrail {
  const key = companyKey(name), searchable = isSearchable(key), needle = ` ${key} `;
  const same = (value: string | null) => !!value && companyKey(value) === key;
  const invoices = (data.suppliers ?? []).filter(r => same(r.name)).sort((a, b) => b.year - a.year);
  const contracts = data.contracts.filter(c => same(c.supplier)).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const grants = (data.grants ?? []).filter(g => same(g.beneficiary)).sort((a, b) => b.date.localeCompare(a.date));
  const codes = new Set(grants.map(g => g.agreement).filter(Boolean));
  const agreements = (data.agreements ?? []).flatMap((a): EntityTrail['agreements'] => codes.has(a.code) ? [{agreement: a, basis: 'codi' as const}]
    : searchable && words(`${a.title} ${a.description ?? ''}`).includes(needle) ? [{agreement: a, basis: 'text' as const}] : [])
    .sort((a, b) => (b.agreement.start ?? '').localeCompare(a.agreement.start ?? ''));
  const mentions = searchable ? data.sessions.flatMap(s => s.agenda.filter(a => words(a.title).includes(needle)).map(a => ({session: s, number: a.number, title: a.title, motionId: agendaMotionId(a.title)})))
    .sort((a, b) => b.session.date.localeCompare(a.session.date)) : [];
  const shown = invoices[0]?.name ?? grants[0]?.beneficiary ?? contracts[0]?.supplier ?? name;
  return {key, name: shown, category: invoices[0]?.category ?? grants[0]?.category ?? null, invoices, contracts, grants, agreements, mentions, searchable,
    years: yearsFor(invoices, contracts, grants, agreements.map(a => a.agreement), mentions)};
}

function yearsFor(invoices: SupplierYear[], contracts: Contract[], grants: Grant[], agreements: Agreement[], mentions: Mention[]): EntityYear[] {
  const map = new Map<number, EntityYear>();
  const get = (year: number) => {const y = map.get(year) ?? {year, invoices: 0, invoicedCents: 0, pscp: 0, pscpCents: 0, rpc: 0, grants: 0, grantCents: 0, agreements: 0, mentions: 0}; map.set(year, y); return y;};
  for (const r of invoices) {const y = get(r.year); y.invoices += r.invoices; y.invoicedCents += r.invoicedCents;}
  const seen = new Set<string>();
  for (const c of contracts) {
    const year = contractYear(c), id = contractKey(c);
    if (year === null || seen.has(id)) continue;
    seen.add(id);
    const y = get(year);
    if (c.source === 'PSCP') {y.pscp++; y.pscpCents += c.amountCents ?? 0;} else y.rpc++;
  }
  for (const g of grants) {const y = get(g.year); y.grants += g.grants; y.grantCents += g.amountCents;}
  for (const a of agreements) if (a.start) get(Number(a.start.slice(0, 4))).agreements++;
  for (const m of mentions) get(Number(m.session.date.slice(0, 4))).mentions++;
  return [...map.values()].sort((a, b) => b.year - a.year);
}

// L'apòstrof també es codifica: la importació de dossiers rebutja els enllaços interns que en porten.
export const entityHref = (name: string) => `#entity?name=${encodeURIComponent(name).replace(/'/g, '%27')}`;
