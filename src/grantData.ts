import type {Agreement, Grant, SupplierYear} from './types';
import {normalize} from './lib';
import {companyKey} from './supplierData';
import {addMonths} from './termData';

export type Entity = {key: string; name: string; category: string; amountCents: number; withoutCallCents: number; grants: Grant[]};

// Beneficiaris amb nom d'un exercici, agrupats pel nom normalitzat (com els proveïdors).
export function entitiesFor(rows: Grant[], year: number): Entity[] {
  const map = new Map<string, Entity>();
  for (const g of rows) {
    if (g.year !== year || !g.beneficiary) continue;
    const key = companyKey(g.beneficiary);
    const entity = map.get(key) ?? {key, name: g.beneficiary, category: g.category, amountCents: 0, withoutCallCents: 0, grants: []};
    entity.amountCents += g.amountCents;
    if (g.procedure === 'sense convocatòria') entity.withoutCallCents += g.amountCents;
    entity.grants.push(g);
    map.set(key, entity);
  }
  return [...map.values()].map(e => ({...e, grants: e.grants.sort((a, b) => b.date.localeCompare(a.date) || b.amountCents - a.amountCents)}))
    .sort((a, b) => b.amountCents - a.amountCents || a.name.localeCompare(b.name));
}

export function entityHistory(rows: Grant[], key: string) {
  const years = new Map<number, {year: number; grants: number; amountCents: number}>();
  for (const g of rows) {
    if (!g.beneficiary || companyKey(g.beneficiary) !== key) continue;
    const y = years.get(g.year) ?? {year: g.year, grants: 0, amountCents: 0};
    y.grants += g.grants; y.amountCents += g.amountCents;
    years.set(g.year, y);
  }
  return [...years.values()].sort((a, b) => b.year - a.year);
}

// Facturació del mateix emissor i exercici, per nom normalitzat.
export function invoicesByEntity(suppliers: SupplierYear[]) {
  const map = new Map<string, number>();
  for (const s of suppliers) if (s.name) {
    const key = `${companyKey(s.name)}|${s.year}`;
    map.set(key, (map.get(key) ?? 0) + s.invoicedCents);
  }
  return map;
}

export type Call = {call: string; procedure: Grant['procedure']; first: string; last: string; beneficiaries: number; grants: number; amountCents: number; url: string};

export function callsFor(rows: Grant[], year: number): Call[] {
  const map = new Map<string, Call & {names: Set<string>}>();
  for (const g of rows) {
    if (g.year !== year) continue;
    const c = map.get(g.call) ?? {call: g.call, procedure: g.procedure, first: g.date, last: g.date, beneficiaries: 0, grants: 0, amountCents: 0, url: g.url, names: new Set<string>()};
    if (g.beneficiary) c.names.add(companyKey(g.beneficiary)); else c.beneficiaries += g.grants;
    c.grants += g.grants; c.amountCents += g.amountCents;
    if (g.date < c.first) c.first = g.date;
    if (g.date > c.last) c.last = g.date;
    map.set(g.call, c);
  }
  return [...map.values()].map(({names, ...c}) => ({...c, beneficiaries: c.beneficiaries + names.size})).sort((a, b) => b.amountCents - a.amountCents);
}

export function grantsByAgreement(rows: Grant[]) {
  const map = new Map<string, Grant[]>();
  for (const g of rows) if (g.agreement) map.set(g.agreement, [...(map.get(g.agreement) ?? []), g]);
  return map;
}

// Convenis. L'estat és el que declara l'Ajuntament; no s'actualitza amb la data.
export const isOpen = (a: Agreement) => normalize(a.status) === 'en curs';
const validEnd = (a: Agreement) => a.end !== null && a.endIssue === null;
export const isOverdue = (a: Agreement, reference: string) => isOpen(a) && validEnd(a) && a.end! < reference;
export const isUpcoming = (a: Agreement, reference: string, months = 12) => isOpen(a) && validEnd(a) && a.end! >= reference && a.end! <= addMonths(reference, months);
// Llei 40/2015, art. 49 h): durada no superior a quatre anys, llevat que una norma en prevegi una de superior.
export const isLongTerm = (a: Agreement) => !!a.start && validEnd(a) && a.end! > addMonths(a.start, 48);

export type Issue = 'Vençut i en curs' | 'Venç en 12 mesos' | 'Sense data de fi' | 'Data de fi sentinella' | 'Fi anterior a l’inici' | 'Durada superior a 4 anys';
const END_ISSUE: Record<NonNullable<Agreement['endIssue']>, Issue> = {absent: 'Sense data de fi', sentinella: 'Data de fi sentinella', 'anterior a l’inici': 'Fi anterior a l’inici'};

export function issuesFor(a: Agreement, reference: string): Issue[] {
  return [
    ...(isOverdue(a, reference) ? ['Vençut i en curs' as const] : []),
    ...(isUpcoming(a, reference) ? ['Venç en 12 mesos' as const] : []),
    ...(a.endIssue ? [END_ISSUE[a.endIssue]] : []),
    ...(isLongTerm(a) ? ['Durada superior a 4 anys' as const] : []),
  ];
}

// Vigència a revisar: convenis en curs amb la data de fi absent o incoherent, o amb una durada llarga.
export const needsReview = (a: Agreement) => isOpen(a) && (a.endIssue !== null || isLongTerm(a));

export function elapsed(from: string, to: string) {
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) - (to.slice(8) < from.slice(8) ? 1 : 0);
  if (months >= 24) return `${Math.floor(months / 12)} anys`;
  if (months >= 1) return months === 1 ? '1 mes' : `${months} mesos`;
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
  return days === 1 ? '1 dia' : `${days} dies`;
}
