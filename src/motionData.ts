import {useEffect, useState} from 'react';
import type {Catalog} from './types';
import {normalize} from './lib';

// Mocions extretes dels ordres del dia del Ple. El grup i el títol surten del text
// publicat; l'estat i el compliment els marca qui fa servir l'eina, en aquest navegador.
export const ALL_GROUPS = 'Tots els grups';
export const NO_GROUP = 'Sense grup informat';
export const MOTION_STATUSES = ['', 'aprovada', 'aprovada amb esmenes', 'rebutjada', 'retirada', 'sobre la taula'] as const;
export const COMPLIANCE = ['', 'pendent', 'en curs', 'complerta', 'parcial', 'incomplerta'] as const;
export type MotionStatus = typeof MOTION_STATUSES[number];
export type Compliance = typeof COMPLIANCE[number];
export type MotionMark = {status: MotionStatus; compliance: Compliance; note: string; updatedAt: string};
export type Appearance = {sessionId: string; date: string; number: string; text: string; url: string; carriedOver: boolean; withdrawn: boolean};
export type Motion = {id: string; title: string; groups: string[]; appearances: Appearance[]; date: string};

const APOS = '[\'’]';
const ARTICLE = new RegExp(`^(?:de\\s+la\\s+|de\\s+l${APOS}|del\\s+|de\\s+|d${APOS}|la\\s+|el\\s+|l${APOS})`, 'i');
const PROPOSER = /(?:presentada|formulada)\s+(?:conjuntament\s+)?(?:pels?|per)\s+(?:els\s+)?grups?\s+municipals?\s+/i;
// El nom del grup acaba en un signe, en la fórmula del títol o en una preposició seguida de minúscula
// («per a la…», «sobre el…»): així «… per Castellar» continua formant part del nom.
// Sense /i: la minúscula que segueix la preposició és el que distingeix descripció i nom.
const GROUP_END = /,|\s+i\s+que\s|\s+que\s+(?:porta|t[ée])\s|\s+amb\s+el\s+t[íi]tol|\s+en\s+data\s|\s+[-–]\s+|\.-|\s+\(|\s+(?:per|en|sobre|pel|amb|de|contra)\s+(?=[a-zà-ÿ])/;
const TITLE_START = /(?:porta|t[ée])\s+(?:com\s+a\s+|per\s+)?t[íi]tol(?:\s+de)?\s*:?\s*|amb\s+el\s+t[íi]tol(?:\s+de)?\s*:?\s*/i;
const CARRIED = /\((?:assumpte que va quedar|es va quedar)[^)]*sobre la taula[^)]*\)/i;
const WITHDRAWN = new RegExp(`[.\\s-]*retirat?d?a?\\s+de\\s+l${APOS}ordre\\s+del\\s+dia.*$`, 'i');
const TRIM = /^[\s"“”«»‘’'.:,–/-]+|[\s"“”«»‘’'.:,–/-]+$/g;

export function parseMotion(raw: string) {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (/mocions\s+sobrevingudes/i.test(text)) return null;
  if (!PROPOSER.test(text) && !/^(?:\d+[.\s-]*)?moci[óo]\b/i.test(text)) return null;
  const carriedOver = CARRIED.test(text), withdrawn = WITHDRAWN.test(text);
  const clean = text.replace(CARRIED, '').replace(WITHDRAWN, '').trim();
  let groups: string[] = [], rest = '';
  const proposer = PROPOSER.exec(clean);
  if (/(?:presentada|formulada)\s+(?:conjuntament\s+)?per\s+tots\s+els\s+grups/i.test(clean)) groups = [ALL_GROUPS];
  else if (proposer) {
    const after = clean.slice(proposer.index + proposer[0].length).replace(ARTICLE, '');
    const end = GROUP_END.exec(after);
    const name = end ? after.slice(0, end.index) : after;
    rest = end ? after.slice(end.index) : '';
    groups = name.split(/\s+i\s+|\s*,\s*/).map(g => g.replace(ARTICLE, '').replace(TRIM, '').trim()).filter(Boolean);
  }
  const titled = TITLE_START.exec(clean);
  let title = titled ? clean.slice(titled.index + titled[0].length)
    : proposer && /^[\s,.–-]*(?:per|en|sobre|pel|amb|contra)\s/i.test(rest) ? rest
    : clean.replace(/^\d+[.\s-]*/, '');
  title = title.replace(new RegExp(`,\\s+s${APOS}incorpora\\b.*$`, 'i'), '').replace(TRIM, '');
  title = title.charAt(0).toLocaleUpperCase('ca') + title.slice(1);
  return {groups: groups.length ? groups : [NO_GROUP], title, carriedOver, withdrawn};
}

export const motionKey = (title: string) => normalize(title).replace(/^mocio\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
function hash(s: string) {let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36);}
const motionId = (parsed: {title: string; groups: string[]}) => {
  const key = motionKey(parsed.title) + '|' + parsed.groups.map(groupKey).sort().join('+');
  return 'm' + hash(key) + key.length.toString(36);
};
// Identificador estable d'un punt de l'ordre del dia, per enllaçar-lo des de la fitxa de la sessió.
export function agendaMotionId(text: string) {const parsed = parseMotion(text); return parsed ? motionId(parsed) : null;}

// Una moció que queda sobre la taula torna a l'ordre del dia: s'agrupa per títol normalitzat i grup.
export function extractMotions(data: Catalog): Motion[] {
  const byId = new Map<string, Motion>();
  for (const s of [...data.sessions].filter(s => s.body === 'Ple').sort((a, b) => a.date.localeCompare(b.date))) {
    for (const item of s.agenda) {
      const parsed = parseMotion(item.title);
      if (!parsed) continue;
      const id = motionId(parsed);
      const appearance = {sessionId: s.id, date: s.date, number: String(item.number), text: item.title, url: s.url, carriedOver: parsed.carriedOver, withdrawn: parsed.withdrawn};
      const found = byId.get(id);
      if (found) {if (!found.appearances.some(a => a.sessionId === s.id)) found.appearances.push(appearance);}
      else byId.set(id, {id, title: parsed.title, groups: parsed.groups, appearances: [appearance], date: s.date});
    }
  }
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'ca'));
}

// Variants d'un mateix grup («X», «X Castellar», «X-Y»): s'agrupen quan una forma compacta és
// el començament d'una altra. La resta d'unions les decideix l'usuari i es desen al navegador.
export const groupKey = (name: string) => normalize(name).replace(/[^a-z0-9]/g, '');
export type GroupIndex = {resolve: (name: string) => string; label: (key: string) => string; name: (key: string) => string; variants: (key: string) => string[]; keys: string[]};
export function groupIndex(motions: Motion[], merges: Record<string, string>): GroupIndex {
  const counts = new Map<string, Map<string, number>>();
  for (const m of motions) for (const g of m.groups) {
    const k = groupKey(g), forms = counts.get(k) ?? new Map<string, number>();
    forms.set(g, (forms.get(g) ?? 0) + 1); counts.set(k, forms);
  }
  const special = new Set([groupKey(ALL_GROUPS), groupKey(NO_GROUP)]);
  const roots = new Map<string, string>();
  for (const k of [...counts.keys()].sort((a, b) => a.length - b.length || a.localeCompare(b))) {
    const root = special.has(k) ? undefined : [...new Set(roots.values())].find(r => r.length >= 3 && !special.has(r) && k.startsWith(r));
    roots.set(k, root ?? k);
  }
  const resolveKey = (k: string) => {
    let current = roots.get(k) ?? k;
    for (let i = 0; i < 20 && merges[current] && merges[current] !== current; i++) current = roots.get(merges[current]) ?? merges[current];
    return current;
  };
  const members = new Map<string, Map<string, number>>();
  for (const [k, forms] of counts) {
    const root = resolveKey(k), all = members.get(root) ?? new Map<string, number>();
    for (const [form, n] of forms) all.set(form, (all.get(form) ?? 0) + n);
    members.set(root, all);
  }
  const ranked = (k: string) => [...(members.get(k) ?? new Map([[k, 1]])).entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).map(([form]) => form);
  const own = (k: string) => [...(counts.get(k) ?? new Map([[k, 1]])).entries()].sort((a, b) => b[1] - a[1])[0][0];
  return {resolve: name => resolveKey(groupKey(name)), label: k => ranked(k)[0], name: own, variants: ranked, keys: [...members.keys()].sort((a, b) => ranked(a)[0].localeCompare(ranked(b)[0], 'ca'))};
}

const STOP = new Set('a al als amb aquest aquesta com contra cap del dels des dins els entre fins front mes mocio mocions municipal municipals nostra nostre obrir pel pels per perque presentada poble pugui puguin que relacio relativa respecte se ses seva seu seus sobre son tambe tots totes una unes uns castellar valles ajuntament grup grups ple vila davant defensa suport creacio millora millorar millores local locals catalunya garantir publica publiques publics public acord acords actuacio actuacions any anys atencio implementacio impuls impulsar aplicacio mesura mesures desenvolupament foment proposta reduida nova nous noves necessitat diferents general'.split(' '));
export function recurringTopics(motions: Motion[], min = 3, limit = 18) {
  const counts = new Map<string, {word: string; ids: Set<string>; forms: Map<string, number>}>();
  for (const m of motions) for (const word of m.title.toLocaleLowerCase('ca').match(/[a-zà-ÿ·]+/g) ?? []) {
    const k = normalize(word);
    if (k.length < 4 || STOP.has(k)) continue;
    const entry = counts.get(k) ?? {word, ids: new Set(), forms: new Map()};
    entry.ids.add(m.id); entry.forms.set(word, (entry.forms.get(word) ?? 0) + 1); counts.set(k, entry);
  }
  return [...counts.values()].filter(e => e.ids.size >= min).map(e => ({word: [...e.forms.entries()].sort((a, b) => b[1] - a[1])[0][0], count: e.ids.size}))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, 'ca')).slice(0, limit);
}

// Marques i unions de grups: preferència local, com els esborranys. Es pot exportar i importar.
const KEY = 'observatori.mocions.v1';
export type MotionState = {marks: Record<string, MotionMark>; merges: Record<string, string>};
const empty = (): MotionState => ({marks: {}, merges: {}});
export function parseMotionState(value: unknown): MotionState {
  const bad = () => {throw new Error('Aquest fitxer no és un seguiment de mocions vàlid de l’Observatori.');};
  if (!value || typeof value !== 'object') return bad();
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1 || !v.marks || typeof v.marks !== 'object' || (v.merges !== undefined && (!v.merges || typeof v.merges !== 'object'))) return bad();
  const marks: Record<string, MotionMark> = {}, merges: Record<string, string> = {};
  const entries = Object.entries(v.marks as Record<string, unknown>);
  if (entries.length > 5000) return bad();
  for (const [id, raw] of entries) {
    const m = raw as Record<string, unknown>;
    if (!/^m[a-z0-9]{1,20}$/.test(id) || !m || !MOTION_STATUSES.includes(m.status as MotionStatus) || !COMPLIANCE.includes(m.compliance as Compliance) || typeof m.note !== 'string' || m.note.length > 5000 || typeof m.updatedAt !== 'string' || m.updatedAt.length > 40) return bad();
    marks[id] = {status: m.status as MotionStatus, compliance: m.compliance as Compliance, note: m.note, updatedAt: m.updatedAt};
  }
  for (const [from, to] of Object.entries((v.merges ?? {}) as Record<string, unknown>)) {
    if (!/^[a-z0-9]{1,80}$/.test(from) || typeof to !== 'string' || !/^[a-z0-9]{1,80}$/.test(to)) return bad();
    merges[from] = to;
  }
  return {marks, merges};
}
function read(): MotionState {
  try {const raw = localStorage.getItem(KEY); return raw ? parseMotionState({schemaVersion: 1, ...JSON.parse(raw)}) : empty();} catch {return empty();}
}
export function mergeStates(current: MotionState, incoming: MotionState): MotionState {
  const marks = {...current.marks};
  for (const [id, mark] of Object.entries(incoming.marks)) if (!marks[id] || mark.updatedAt > marks[id].updatedAt) marks[id] = mark;
  return {marks, merges: {...current.merges, ...incoming.merges}};
}
export function useMotionState() {
  const [state, setState] = useState(read);
  const [error, setError] = useState('');
  useEffect(() => {
    const sync = (e: StorageEvent) => {if (e.key === KEY) setState(read());};
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, []);
  function save(next: MotionState) {
    setState(next);
    try {localStorage.setItem(KEY, JSON.stringify(next)); setError('');}
    catch {setError('No s’ha pogut desar en aquest navegador. Exporta una còpia abans de tancar la pestanya.');}
  }
  return {state, error, save};
}
