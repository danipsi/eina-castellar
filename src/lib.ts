import MiniSearch from 'minisearch';
import type {BudgetRow, Catalog, Contract, Dossier, Evidence, Selection} from './types';

const euros = new Intl.NumberFormat('ca-ES', {style: 'currency', currency: 'EUR', minimumFractionDigits: 2});
export const money = (cents: number | null) => cents === null ? 'No informat' : euros.format(cents / 100);
export const compactMoney = (cents: number | null) => cents === null ? '—' : new Intl.NumberFormat('ca-ES', {maximumFractionDigits: 2}).format(cents / 100000000) + ' M€';
export const number = (n: number) => new Intl.NumberFormat('ca-ES').format(n);
export const date = (s: string | null) => s && !Number.isNaN(Date.parse(s)) ? new Intl.DateTimeFormat('ca-ES', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(s)) : 'Data no informada';
export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ca').trim();
export const expKey = (s: string) => s.trim().toUpperCase();
const localDay = new Intl.DateTimeFormat('en', {timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit'});
export function today() {
  const parts = localDay.formatToParts(new Date());
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)!.value).join('-');
}
export const isFutureDate = (value: string | null, reference = today()) => !!value && !Number.isNaN(Date.parse(value)) && value.slice(0, 10) > reference;
export const looksLikeExpedient = (query: string) => /^[A-Z]{2,}\d{5,}(?:[-/][A-Z0-9]+)*$/i.test(query.trim());
export function exactResults(data: Catalog, query: string) {
  const key = expKey(query);
  if (!key) return [];
  return [
    ...data.contracts.filter(c => expKey(c.expedient) === key).map(c => ({id: 'contract:' + c.id, kind: 'contract', itemId: c.id})),
    ...data.sessions.filter(s => s.agenda.some(a => a.expedients.some(e => expKey(e) === key))).map(s => ({id: 'session:' + s.id, kind: 'session', itemId: s.id})),
  ];
}
export const safeUrl = (s: string) => {try {const u = new URL(s); return ['https:', 'http:'].includes(u.protocol) ? u.href : '#';} catch {return '#';}};
const BUDGET_CHAPTERS = new Set(Array.from({length: 9}, (_, index) => String(index + 1)));
export function budgetTotal(rows: BudgetRow[], field: 'initialCents' | 'finalCents' | 'executedCents') {
  if (rows.length !== BUDGET_CHAPTERS.size) return null;
  const year = rows[0]?.year, side = rows[0]?.side;
  const chapters = new Set(rows.map(row => row.chapter));
  if (chapters.size !== BUDGET_CHAPTERS.size || [...chapters].some(chapter => !BUDGET_CHAPTERS.has(chapter))) return null;
  if (rows.some(row => row.year !== year || row.side !== side || row[field] === null)) return null;
  return rows.reduce((sum, row) => sum + row[field]!, 0);
}
export const ratio = (executed: number | null, total: number | null) => executed !== null && total !== null && total > 0 ? executed / total * 100 : null;
export const pct = (n: number | null) => n === null ? 'No calculable' : new Intl.NumberFormat('ca-ES', {maximumFractionDigits: 1}).format(n) + '%';

export function makeSearch(data: Catalog) {
  const index = new MiniSearch({fields: ['title', 'expedient', 'text'], storeFields: ['kind', 'itemId'], processTerm: t => normalize(t), searchOptions: {prefix: true, fuzzy: 0.15, boost: {expedient: 4, title: 2}, combineWith: 'AND'}});
  index.addAll([
    ...data.contracts.map(c => ({id: 'contract:' + c.id, itemId: c.id, kind: 'contract', title: c.title, expedient: c.expedient, text: `${c.supplier ?? ''} ${c.procedure} ${c.type}`})),
    ...data.sessions.map(s => ({id: 'session:' + s.id, itemId: s.id, kind: 'session', title: s.title, expedient: s.agenda.flatMap(a => a.expedients).join(' '), text: s.agenda.map(a => a.title).join(' ')})),
  ]);
  return index;
}
export function evidenceFor(selection: Selection): Evidence {
  const {item, kind} = selection;
  if (kind === 'contract') {
    const c = selection.item;
    return {id: `${kind}:${c.id}`, kind, title: c.title, url: c.url, source: c.source, capturedAt: c.capturedAt, locator: `Expedient ${c.expedient}${c.lot ? ` · lot ${c.lot}` : ''} · registre ${c.id}`};
  }
  if (kind === 'budget') {
    const b = selection.item;
    return {id: `${kind}:${b.id}`, kind, title: `${b.year} · ${b.chapterName}`, url: b.url, source: 'Pressupost i liquidació · AOC', capturedAt: b.capturedAt, locator: `${b.side} · capítol ${b.chapter} · registre ${b.id}`};
  }
  return {id: `${kind}:${item.id}`, kind, title: selection.item.title, url: item.url, source: 'Portal de sessions municipal', capturedAt: item.capturedAt, locator: `Sessió ${selection.item.title} · ${selection.item.date} · registre ${item.id}`};
}
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: unknown[][]) {
  return '\ufeff' + rows.map(row => row.map(value => {
    let s = value === null || value === undefined ? '' : String(value);
    const validatedNumber = typeof value === 'number'
      ? Number.isFinite(value)
      : typeof value === 'string' && /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(value);
    if (!validatedNumber && /^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  }).join(';')).join('\r\n');
}
export function exportContracts(rows: Contract[]) {
  download('contractacio-filtrada.csv', csv([
    ['Font', 'Expedient', 'Lot', 'Títol', 'Any', 'Procediment', 'Import EUR', 'IVA', 'Data', 'URL', 'Captura', 'Registre', 'Avisos', 'Adjudicatari'],
    ...rows.map(c => [c.source, c.expedient, c.lot, c.title, c.year, c.procedure, c.amountCents === null ? null : (c.amountCents / 100).toFixed(2).replace('.', ','), c.vat, c.date, c.url, c.capturedAt, c.id, [...c.flags, ...(isFutureDate(c.date) ? ['Data futura pendent de contrast'] : [])].join(' | '), c.supplier])
  ]), 'text/csv;charset=utf-8');
}
export function dossierMarkdown(d: Dossier) {
  const escape = (s: string) => s.replace(/[\\`*_{}\[\]<>#]/g, '\\$&');
  return `# ${escape(d.title)}\n\nDossier personal · exportat el ${date(new Date().toISOString())}\n\n## Fonts\n\n` +
    d.evidence.map((e, i) => `${i + 1}. ${escape(e.title)}\n   - Font: ${escape(e.source)}\n   - Original: <${safeUrl(e.url)}>\n   - Localitzador: ${escape(e.locator)}\n   - Captura: ${e.capturedAt}`).join('\n\n') +
    '\n\n## Notes personals\n\n' + d.notes.map(n => `### ${n.kind} · ${n.status}${n.author ? ` · ${escape(n.author)}` : ''}\n\n${escape(n.text)}`).join('\n\n') +
    (d.requests?.length ? '\n\n## Preguntes i sol·licituds formals\n\n' + d.requests.map(r => `### ${r.kind} · ${r.status}${r.presentedAt ? ` · presentada el ${r.presentedAt}` : ''}${r.registry ? ` · registre ${escape(r.registry)}` : ''}\n\n${escape(r.text)}`).join('\n\n') : '') +
    '\n\nLes notes i hipòtesis són personals. Una menció en un ordre del dia no acredita l’aprovació d’un acord.\n';
}
