import type {Agreement, BudgetRow, Evidence, Peers, SupplierYear} from './types';
import {date, money, number} from './lib';
import {companyKey} from './supplierData';
import type {Entity} from './grantData';
import {MAJORITY_LABEL, actaResult, type Motion} from './motionData';
import {entityHref, type EntityTrail} from './entityData';
import {perCapita, versusMedian, type PeerChapter, type PeerMetric, type PeerStats} from './peerData';

// Referències per als dossiers de les pàgines agregades. El localitzador desa les xifres tal com
// es veien en desar-les: la captura següent pot canviar-les. `href` torna a la vista de l'Observatori.
const plural = (n: number, one: string, many: string) => `${number(n)} ${n === 1 ? one : many}`;
// L'apòstrof també es codifica: la importació de dossiers rebutja els enllaços interns que en porten.
const q = (s: string) => encodeURIComponent(s).replace(/'/g, '%27');

export function supplierEvidence(row: SupplierYear & {name: string}): Evidence {
  return {id: `supplier:${companyKey(row.name)}:${row.year}`, kind: 'supplier', title: `${row.name} · factures ${row.year}`, url: row.url, source: 'Registre de factures · Ajuntament', capturedAt: row.capturedAt,
    locator: `Emissor ${row.name} · exercici ${row.year} · ${plural(row.invoices, 'factura', 'factures')} · ${money(row.invoicedCents)} amb IVA · registre ${row.id}`,
    href: `#suppliers?year=${row.year}&name=${q(row.name)}`};
}

export function grantEvidence(entity: Entity): Evidence {
  const latest = entity.grants[0], year = latest.year, count = entity.grants.reduce((s, g) => s + g.grants, 0);
  return {id: `grant:${entity.key}:${year}`, kind: 'grant', title: `${entity.name} · subvencions ${year}`, url: latest.url, source: 'Concessions de subvencions · BDNS i AOC', capturedAt: latest.capturedAt,
    locator: `Beneficiari ${entity.name} · exercici ${year} · ${plural(count, 'concessió', 'concessions')} · ${money(entity.amountCents)}${entity.withoutCallCents ? ` (${money(entity.withoutCallCents)} sense convocatòria al títol)` : ''} · registre ${latest.id}`,
    href: `#grants?year=${year}&name=${q(entity.name)}`};
}

export function agreementEvidence(a: Agreement): Evidence {
  const term = `${a.start ? date(a.start) : 'inici no informat'} – ${a.end ? date(a.end) : 'fi no informada'}`;
  return {id: `agreement:${a.id}`, kind: 'agreement', title: a.title, url: a.url, source: 'Catàleg municipal de convenis', capturedAt: a.capturedAt,
    locator: `Conveni ${a.code} · ${a.status} · vigència declarada ${term} · registre ${a.id}`,
    href: `#grants?view=convenis&conveni=${q(a.code)}`};
}

export function motionEvidence(m: Motion, groups: string[], capturedAt: string): Evidence {
  const first = m.appearances[0], acta = actaResult(m);
  return {id: `motion:${m.id}`, kind: 'motion', title: m.title, url: first.url, source: 'Ordres del dia del Ple', capturedAt,
    locator: `Moció${groups.length ? ` · ${groups.join(' i ')}` : ''} · Ple del ${date(first.date)}, punt ${first.number}${m.appearances.length > 1 ? ` · ${m.appearances.length} sessions` : ''}${acta ? ` · segons l’acta del ${date(acta.date)}: ${acta.result}${acta.majority ? ' ' + MAJORITY_LABEL[acta.majority] : ''}` : ''} · registre ${first.sessionId}`,
    href: `#motions?motion=${q(m.id)}`};
}

// La fitxa d'entitat desa el resum de totes les fonts; l'URL és la font més recent amb el nom.
export function entityEvidence(t: EntityTrail, capturedAt: string): Evidence {
  const years = t.years.map(y => y.year), span = years.length > 1 ? `${years.at(-1)}–${years[0]}` : String(years[0] ?? '');
  const invoiced = t.invoices.reduce((s, r) => s + r.invoicedCents, 0), granted = t.grants.reduce((s, g) => s + g.amountCents, 0);
  const pscp = t.years.reduce((s, y) => s + y.pscp, 0), rpc = t.years.reduce((s, y) => s + y.rpc, 0);
  const url = t.invoices[0]?.url ?? t.grants[0]?.url ?? t.contracts[0]?.url ?? t.agreements[0]?.agreement.url ?? t.mentions[0]?.session.url ?? '';
  return {id: `entity:${t.key}`, kind: 'entity', title: `${t.name} · fitxa d’entitat`, url, source: 'Fitxa d’entitat · factures, contractes, subvencions, convenis i sessions', capturedAt,
    locator: [`Entitat ${t.name} (nom normalitzat «${t.key}»)${span ? ` · ${span}` : ''}`, `factures: ${plural(t.invoices.reduce((s, r) => s + r.invoices, 0), 'factura', 'factures')}, ${money(invoiced)} amb IVA`,
      `contractes: PSCP ${number(pscp)} · RPC ${number(rpc)}`, `subvencions: ${plural(t.grants.reduce((s, g) => s + g.grants, 0), 'concessió', 'concessions')}, ${money(granted)}`,
      `convenis: ${number(t.agreements.length)}`, `mencions a sessions: ${t.searchable ? number(t.mentions.length) : 'no cercades (nom massa curt)'}`].join(' · '),
    href: entityHref(t.name)};
}

const METRIC_LABEL: Record<PeerMetric, string> = {initialCents: 'Pressupost inicial', finalCents: 'Crèdit definitiu', executedCents: 'Liquidat'};

export function peerEvidence(peers: Peers, stats: PeerStats, {year, side, metric, chapterName}: {year: number; side: BudgetRow['side']; metric: PeerMetric; chapterName: string}): Evidence {
  const chapter: PeerChapter = stats.chapter, diff = versusMedian(stats.self?.perCapita ?? null, stats.median);
  const diffText = diff === null ? '' : ` (${diff > 0 ? '+' : ''}${new Intl.NumberFormat('ca-ES', {maximumFractionDigits: 1}).format(diff)} %)`;
  return {id: `peer:${year}:${side}:${metric}:${chapter}`, kind: 'peer', title: `Castellar entre municipis similars · ${side} ${year} · ${chapterName}`,
    url: metric === 'initialCents' ? peers.initialUrl : peers.liquidationUrl, source: 'Comparació amb municipis · Idescat i AOC', capturedAt: peers.capturedAt,
    locator: `${METRIC_LABEL[metric]} per habitant · Castellar ${perCapita(stats.self?.perCapita ?? null)} · mediana ${perCapita(stats.median)}${diffText} · posició ${stats.rank ? `${stats.rank} de ${stats.values.length}` : 'no calculable'} · ${number(peers.municipalities.length)} municipis de ${number(peers.range[0])} a ${number(peers.range[1])} habitants (padró ${peers.populationYear})`,
    href: `#budget?year=${year}${side === 'ingressos' ? '&side=ingressos' : ''}&peer=${metric}${chapter === 'total' ? '' : `&peerChapter=${chapter}`}&seccio=municipis`};
}
