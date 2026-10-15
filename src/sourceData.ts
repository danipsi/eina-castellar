import {date, money} from './lib';

// Visor de fonts en brut. L'AOC (CKAN) no envia capçaleres CORS però accepta JSONP;
// Socrata (Generalitat) sí que permet fetch. Tots dos funcionen des d'un allotjament estàtic.
const AOC = 'dadesobertes.seu-e.cat', GENCAT = 'analisi.transparenciacatalunya.cat', PSCP = 'contractaciopublica.cat';
const MAX_ROWS = 100;

export type SourceField = {id: string; label: string; type: string};
export type SourceRecord = Record<string, unknown>;
export type SourceResult = {portal: string; title: string; modified?: string; datasetUrl?: string; conditions: {label: string; value: string}[]; fields: SourceField[]; records: SourceRecord[]; total: number};
type Parsed = {kind: 'ckan'; url: URL; resourceId: string; filters: Record<string, unknown>} | {kind: 'socrata'; url: URL; dataset: string} | {kind: 'pscp'; url: URL};

export function parseSource(url: string): Parsed | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    if (u.hostname === AOC && u.pathname === '/api/3/action/datastore_search') {
      const resourceId = u.searchParams.get('resource_id') ?? '';
      const filters: unknown = JSON.parse(u.searchParams.get('filters') || '{}');
      if (!/^[0-9a-f-]{36}$/i.test(resourceId) || !filters || typeof filters !== 'object' || Array.isArray(filters)) return null;
      return {kind: 'ckan', url: u, resourceId, filters: filters as Record<string, unknown>};
    }
    const socrata = u.hostname === GENCAT && u.pathname.match(/^\/resource\/([a-z0-9]{4}-[a-z0-9]{4})\.json$/);
    if (socrata) return {kind: 'socrata', url: u, dataset: socrata[1]};
    if (u.hostname === PSCP && /^\/portal-api\/documents-publicacio\/json\/\d+$/.test(u.pathname)) return {kind: 'pscp', url: u};
    return null;
  } catch {return null;}
}

let sequence = 0;
function jsonp<T>(url: URL, timeout = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const name = `__font${Date.now().toString(36)}${sequence++}`, slot = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    const finish = () => {clearTimeout(timer); script.remove(); slot[name] = () => {};};
    const timer = setTimeout(() => {finish(); reject(new Error('El portal no ha respost a temps'));}, timeout);
    slot[name] = (data: T) => {finish(); resolve(data);};
    script.onerror = () => {finish(); reject(new Error('No s’ha pogut connectar amb el portal'));};
    const target = new URL(url); target.searchParams.set('callback', name);
    script.src = target.href; script.referrerPolicy = 'no-referrer';
    document.head.append(script);
  });
}
async function getJson<T>(url: URL, timeout = 15000): Promise<T> {
  const response = await fetch(url, {signal: AbortSignal.timeout(timeout), referrerPolicy: 'no-referrer'}).catch(() => {throw new Error('No s’ha pogut connectar amb el portal');});
  if (!response.ok) throw new Error('El portal ha retornat un error');
  return response.json() as Promise<T>;
}

export async function loadSource(url: string): Promise<SourceResult> {
  const source = parseSource(url);
  if (!source) throw new Error('Aquesta font no es pot mostrar al visor');
  if (source.kind === 'pscp') throw new Error('La Plataforma de Serveis de Contractació Pública no permet llegir aquest document des d’una altra web');
  return source.kind === 'ckan' ? loadCkan(source) : loadSocrata(source);
}

type CkanResponse<T> = {success: boolean; result: T};
async function loadCkan({url, resourceId, filters}: Extract<Parsed, {kind: 'ckan'}>): Promise<SourceResult> {
  const query = new URL(url);
  query.searchParams.set('limit', String(Math.min(Number(query.searchParams.get('limit')) || 100, MAX_ROWS)));
  const [data, resource] = await Promise.all([
    jsonp<CkanResponse<{fields: {id: string; type: string}[]; records: SourceRecord[]; total: number}>>(query),
    jsonp<CkanResponse<{name?: string; package_id?: string; last_modified?: string; metadata_modified?: string}>>(new URL(`https://${AOC}/api/3/action/resource_show?id=${resourceId}`)).catch(() => null),
  ]);
  if (!data?.success) throw new Error('El portal ha retornat un error');
  const meta = resource?.success ? resource.result : undefined;
  const fields = data.result.fields.filter(f => f.id !== '_id').map(f => ({id: f.id, label: ckanLabel(f.id), type: f.type}));
  const typed = (id: string) => fields.find(f => f.id === id) ?? {id, label: ckanLabel(id), type: 'text'};
  return {
    portal: 'Portal de dades obertes de l’AOC', title: meta?.name ?? 'Conjunt de dades de l’AOC',
    modified: meta?.last_modified ?? meta?.metadata_modified, datasetUrl: meta?.package_id ? `https://${AOC}/dataset/${encodeURIComponent(meta.package_id)}` : undefined,
    conditions: Object.entries(filters).map(([id, v]) => ({label: typed(id).label, value: showValue(typed(id), v).text})),
    fields, records: data.result.records, total: data.result.total,
  };
}

type SocrataView = {name?: string; rowsUpdatedAt?: number; columns?: {fieldName: string; name: string; dataTypeName: string}[]};
async function loadSocrata({url, dataset}: Extract<Parsed, {kind: 'socrata'}>): Promise<SourceResult> {
  const query = new URL(url), where = query.searchParams.get('$where');
  query.searchParams.set('$limit', String(Math.min(Number(query.searchParams.get('$limit')) || MAX_ROWS, MAX_ROWS)));
  const count = new URL(`https://${GENCAT}/resource/${dataset}.json`);
  count.searchParams.set('$select', 'count(*) as n'); if (where) count.searchParams.set('$where', where);
  const [records, view, counted] = await Promise.all([
    getJson<SourceRecord[]>(query),
    getJson<SocrataView>(new URL(`https://${GENCAT}/api/views/${dataset}.json`)).catch(() => null),
    getJson<{n: string}[]>(count).catch(() => null),
  ]);
  if (!Array.isArray(records)) throw new Error('El portal ha retornat un error');
  // Socrata omet els camps buits: es mostren les columnes que tenen valor en algun registre.
  const present = new Set(records.flatMap(r => Object.keys(r)));
  const columns = view?.columns?.filter(c => present.has(c.fieldName)) ?? [];
  const fields = columns.length ? columns.map(c => ({id: c.fieldName, label: c.name, type: c.dataTypeName})) : [...present].map(id => ({id, label: id, type: 'text'}));
  return {
    portal: 'Portal de dades obertes de la Generalitat', title: view?.name ?? `Conjunt de dades ${dataset}`,
    modified: view?.rowsUpdatedAt ? new Date(view.rowsUpdatedAt * 1000).toISOString() : undefined, datasetUrl: `https://${GENCAT}/d/${dataset}`,
    conditions: where ? [{label: 'Condició', value: socrataWhere(where, fields)}] : [],
    fields, records, total: Number(counted?.[0]?.n) || records.length,
  };
}
function socrataWhere(where: string, fields: SourceField[]) {
  const row = where.match(/^:id\s*=\s*'([^']+)'$/);
  if (row) return `registre ${row[1]}`;
  return fields.reduce((text, f) => text.replace(new RegExp(`\\b${f.id}\\b`, 'g'), f.label), where).replace(/\s+AND\s+/gi, ' i ');
}

const LABELS: Record<string, string> = {
  CODI_ENS: 'Codi de l’ens', NOM_ENS: 'Ens', NOM_COMPLERT: 'Ens', ANY_EXERCICI: 'Exercici', EXERCICI: 'Exercici',
  TIPUS_PARTIDA: 'Tipus de partida', TIPUS_CLASSIF: 'Classificació', CODI_PANTALLA: 'Codi de classificació', NIVELL: 'Nivell',
  DESCRIPCIO: 'Descripció', IMPORT: 'Import', ID_ESTRUCTURA: 'Identificador d’estructura', ESTRUCTURA: 'Estructura',
  CODI_CAPITOL: 'Capítol', CAPITOL: 'Nom del capítol', IMPORT_PRESSU_FINAL: 'Pressupost definitiu', IMPORT_LIQUIDAT: 'Import liquidat',
  DATA_FACTURA: 'Data de la factura', DATA_REGISTRE: 'Data de registre', NUM_FACTURA: 'Número de factura', NOM_EMISSOR: 'Emissor',
  IMPORT_FACTURA: 'Import de la factura', DATA_DE_CONCESSIO: 'Data de concessió', TITOL: 'Títol', BASES_REGULADORES: 'Bases reguladores',
  BENEFICIARI: 'Beneficiari', INSTRUMENT: 'Instrument', AJUDA_EQUIVALENT: 'Ajuda equivalent', APLICACIO_PRESSUPOSTARIA: 'Aplicació pressupostària',
  CODI_EXPEDIENT: 'Codi d’expedient', DATA_INICI: 'Data d’inici', DATA_FINAL: 'Data final', ESTAT: 'Estat', PRORROGABLE: 'Prorrogable',
};
const CODES: Record<string, Record<string, string>> = {
  TIPUS_PARTIDA: {D: 'Despeses', I: 'Ingressos'},
  TIPUS_CLASSIF: {E: 'Econòmica', F: 'Funcional (per programes)'},
};

function ckanLabel(id: string) {
  if (LABELS[id]) return LABELS[id];
  const text = id.toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Els imports arriben com a número (10441342.79) o com a text amb coma decimal ("10069637,99", "3.375,00 €").
function amount(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const text = value.replace(/[€\s]/g, '');
  const n = Number(text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text);
  return text && Number.isFinite(n) ? n : null;
}

export type Shown = {text: string; href?: string};
export function showValue(field: SourceField, value: unknown): Shown {
  if (value === null || value === undefined || value === '') return {text: '—'};
  if (typeof value === 'object') {
    const link = (value as {url?: unknown}).url;
    return typeof link === 'string' ? {text: link, href: link} : {text: JSON.stringify(value)};
  }
  const text = String(value);
  if (/^(import|ajuda_equivalent)/i.test(field.id)) {const n = amount(value); if (n !== null) return {text: money(Math.round(n * 100))};}
  if ((field.type === 'timestamp' || field.type === 'calendar_date') && !Number.isNaN(Date.parse(text))) {
    const time = text.slice(11, 16);
    return {text: date(text.slice(0, 10)) + (time && time !== '00:00' ? ` · ${time}` : '')};
  }
  const code = CODES[field.id]?.[text];
  if (code) return {text: `${code} (${text})`};
  if (/^https?:\/\//.test(text)) return {text, href: text};
  return {text};
}
