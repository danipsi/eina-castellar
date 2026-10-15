import type {Dossier, Evidence, FormalRequest, Note} from './types';
import {parseDossierBody} from './storage';
import {parseMotionState} from './motionData';
import type {MotionState} from './motionData';
import {normalize, today} from './lib';

// Intercanvi de dossiers dins del grup per fitxer JSON: cada element té un identificador estable
// i una data de canvi; les eliminacions es registren perquè no tornin a aparèixer en fusionar.
type Kind = 'evidence' | 'note' | 'request';
const MAX_DELETED = 5000;

export const now = () => new Date().toISOString();

// Treu un element i en deixa constància amb la data, per propagar l'eliminació en la propera fusió.
export function withoutItem(d: Dossier, kind: Kind, id: string): Dossier {
  const deleted = {...d.deleted, [`${kind}:${id}`]: now()};
  if (kind === 'evidence') return {...d, evidence: d.evidence.filter(e => e.id !== id), deleted};
  if (kind === 'note') return {...d, notes: d.notes.filter(n => n.id !== id), deleted};
  return {...d, requests: (d.requests ?? []).filter(r => r.id !== id), deleted};
}
// Una font afegida de nou preval sobre una eliminació anterior.
export function withEvidence(d: Dossier, evidence: Evidence): Dossier {
  if (d.evidence.some(e => e.id === evidence.id)) return d;
  const deleted = {...d.deleted};
  delete deleted[`evidence:${evidence.id}`];
  return {...d, evidence: [...d.evidence, {...evidence, addedAt: now()}], deleted};
}

export type MergeSummary = {added: Record<Kind, number>; updated: number; removed: number; keptLocal: number; otherTitle: string | null};
export const changed = (s: MergeSummary) => s.added.evidence + s.added.note + s.added.request + s.updated + s.removed > 0;

const canon = (o: object) => JSON.stringify(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

function mergeItems<T extends {id: string}>(kind: Kind, stamp: (item: T) => string, local: T[], incoming: T[], deleted: Record<string, string>, summary: MergeSummary): T[] {
  const pending = new Map(incoming.map(item => [item.id, item]));
  const gone = (item: T) => {const when = deleted[`${kind}:${item.id}`]; return !!when && when >= stamp(item);};
  const out: T[] = [];
  for (const mine of local) {
    const theirs = pending.get(mine.id);
    pending.delete(mine.id);
    let winner = mine;
    if (theirs && canon(theirs) !== canon(mine)) {
      if (stamp(theirs) > stamp(mine)) {winner = theirs; summary.updated++;} else summary.keptLocal++;
    }
    if (gone(winner)) {summary.removed++; continue;}
    out.push(winner);
  }
  for (const theirs of pending.values()) if (!gone(theirs)) {out.push(theirs); summary.added[kind]++;}
  return out;
}

// Fusiona element a element: guanya la versió amb el canvi més recent; amb la mateixa data, la teva.
export function mergeDossier(local: Dossier, incoming: Dossier): {dossier: Dossier; summary: MergeSummary} {
  const summary: MergeSummary = {added: {evidence: 0, note: 0, request: 0}, updated: 0, removed: 0, keptLocal: 0, otherTitle: incoming.title !== local.title ? incoming.title : null};
  const deleted: Record<string, string> = {...local.deleted};
  for (const [key, when] of Object.entries(incoming.deleted ?? {})) if (!deleted[key] || when > deleted[key]) deleted[key] = when;
  const kept = Object.entries(deleted).sort((a, b) => b[1].localeCompare(a[1])).slice(0, MAX_DELETED);
  const tombs = Object.fromEntries(kept);
  const evidence = mergeItems('evidence', (e: Evidence) => e.addedAt ?? '', local.evidence, incoming.evidence, tombs, summary);
  const notes = mergeItems('note', (n: Note) => n.updatedAt ?? '', local.notes, incoming.notes, tombs, summary);
  const requests = mergeItems('request', (r: FormalRequest) => r.updatedAt ?? r.createdAt, local.requests ?? [], incoming.requests ?? [], tombs, summary);
  const dossier: Dossier = {...local, evidence, notes, requests, deleted: tombs, updatedAt: changed(summary) ? now() : local.updatedAt};
  if (!requests.length) delete dossier.requests;
  return {dossier, summary};
}

// Una còpia separada no comparteix identificadors amb l'original.
export function asCopy(d: Dossier): Dossier {
  return {id: crypto.randomUUID(), title: d.title, createdAt: d.createdAt, updatedAt: now(), evidence: d.evidence, notes: d.notes.map(n => ({...n, id: crypto.randomUUID()})), ...(d.requests?.length ? {requests: d.requests.map(r => ({...r, id: crypto.randomUUID()}))} : {})};
}

const exportable = ({revision: _revision, ...d}: Dossier) => d;
const slug = (s: string) => normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'dossier';
export function dossierFile(d: Dossier, author: string) {
  return {name: `dossier-${slug(d.title)}-${today()}.json`, content: JSON.stringify({schemaVersion: 1, exportedAt: now(), ...(author ? {exportedBy: author} : {}), dossier: exportable(d)}, null, 2)};
}
export function packageFile(dossiers: Dossier[], motions: MotionState, author: string) {
  return {name: `paquet-dossiers-${today()}.json`, content: JSON.stringify({schemaVersion: 1, kind: 'paquet', exportedAt: now(), ...(author ? {exportedBy: author} : {}), dossiers: dossiers.map(exportable), motions}, null, 2)};
}

export type Received = {dossiers: Dossier[]; motions: MotionState | null; exportedBy: string; exportedAt: string};
export function parseShared(value: unknown): Received {
  const bad = (): never => {throw new Error('Aquest fitxer no és un dossier ni un paquet vàlid de l’Observatori.');};
  if (!value || typeof value !== 'object') return bad();
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1) return bad();
  const meta = {exportedBy: typeof v.exportedBy === 'string' ? v.exportedBy.slice(0, 40) : '', exportedAt: typeof v.exportedAt === 'string' ? v.exportedAt.slice(0, 40) : ''};
  if (v.kind !== 'paquet') {
    if (!v.dossier || typeof v.dossier !== 'object') return bad();
    return {dossiers: [parseDossierBody(v.dossier as Record<string, unknown>)], motions: null, ...meta};
  }
  if (!Array.isArray(v.dossiers) || v.dossiers.length > 500 || v.dossiers.some(d => !d || typeof d !== 'object')) return bad();
  const dossiers = (v.dossiers as Record<string, unknown>[]).map(parseDossierBody);
  if (new Set(dossiers.map(d => d.id)).size < dossiers.length) return bad();
  const motions = v.motions === undefined ? null : parseMotionState({schemaVersion: 1, ...(v.motions as object)});
  return {dossiers, motions, ...meta};
}

// Inicials o àlies que acompanyen les notes noves: preferència d'aquest navegador.
const AUTHOR_KEY = 'observatori.dossiers.autor';
export function readAuthor() {try {return (localStorage.getItem(AUTHOR_KEY) ?? '').slice(0, 40);} catch {return '';}}
export function writeAuthor(value: string) {try {localStorage.setItem(AUTHOR_KEY, value);} catch {/* sense emmagatzematge: cal tornar-les a escriure */}}
