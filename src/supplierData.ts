import type {Contract, SupplierYear} from './types';
import {normalize} from './lib';

// Les factures porten l'IVA i el llindar no: 15.000 € (LCSP art. 118, serveis i subministraments) + 21 % d'IVA.
export const INVOICE_THRESHOLD = 1_815_000;
export const PUBLIC_BODY = 'administració o ens públic';

const LEGAL_FORM = /(?:\s(?:sociedad limitada|sociedad anonima|societat limitada|societat anonima|s ?c ?c ?l|s ?coop|s ?l ?u|s ?l ?l|s ?l ?p|s ?a ?u|s ?c ?p|s ?l|s ?a|ute))+$/;

// Nom comparable entre fonts: sense accents, puntuació ni forma societària final.
export function companyKey(name: string) {
  const plain = normalize(name).replace(/[.,]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return (' ' + plain).replace(LEGAL_FORM, '').trim() || plain;
}

export function contractsBySupplier(contracts: Contract[]) {
  const map = new Map<string, Contract[]>();
  for (const c of contracts) {
    if (!c.supplier) continue;
    const key = companyKey(c.supplier);
    map.set(key, [...(map.get(key) ?? []), c]);
  }
  return map;
}

export const matchesFor = (map: Map<string, Contract[]>, row: SupplierYear) => row.name ? map.get(companyKey(row.name)) ?? [] : [];

// Patró a revisar: facturació anual per sobre del llindar d'un emissor amb nom, que no és una administració,
// i sense cap contracte al catàleg amb el mateix nom normalitzat.
export const isFlagged = (row: SupplierYear, matches: Contract[]) => row.name !== null && row.category !== PUBLIC_BODY && row.invoicedCents >= INVOICE_THRESHOLD && !matches.length;

// Per defecte, el darrer exercici tancat: el de l'any en curs és parcial.
export function defaultYear(years: number[], current = new Date().getFullYear()) {
  return years.find(y => y < current) ?? years[0];
}

export function history(rows: SupplierYear[], name: string) {
  const key = companyKey(name);
  return rows.filter(r => r.name && companyKey(r.name) === key).sort((a, b) => b.year - a.year);
}
