import type {Dossier, RequestKind, RequestStatus} from './types';
import {EVIDENCE_KINDS} from './types';

export const REQUEST_KINDS: RequestKind[] = ['informacio', 'pregunta', 'prec'];
export const REQUEST_STATUSES: RequestStatus[] = ['esborrany', 'presentada', 'resposta', 'resposta parcial', 'sense resposta'];
import {safeUrl} from './lib';

let dbPromise: Promise<IDBDatabase> | undefined;
function database() {
  return dbPromise ??= new Promise((resolve, reject) => {
    const r = indexedDB.open('observatori-castellar', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('dossiers', {keyPath: 'id'});
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => {dbPromise = undefined; reject(new Error('No es pot accedir als dossiers d’aquest navegador.'));};
    r.onblocked = () => {dbPromise = undefined; reject(new Error('Tanca les altres pestanyes de l’Observatori i torna-ho a provar.'));};
  });
}
export async function readDossiers(): Promise<Dossier[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('dossiers', 'readonly');
    const r = tx.objectStore('dossiers').getAll();
    r.onsuccess = () => resolve(r.result.map((d: Dossier) => ({...d, revision: d.revision ?? 0})).sort((a: Dossier, b: Dossier) => b.updatedAt.localeCompare(a.updatedAt)));
    r.onerror = () => reject(new Error('No s’han pogut llegir els dossiers.'));
  });
}
export class DossierConflict extends Error {
  constructor() {super('El dossier ha canviat o s’ha eliminat en una altra pestanya. Hem actualitzat la llista. Revisa els canvis i torna-ho a provar; l’esborrany de la nota es conserva.');}
}

// La lectura de versió i l’escriptura comparteixen transacció: cap altra pestanya
// pot intercalar un canvi entre la comprovació i el desament.
export async function writeDossier(dossier: Dossier): Promise<Dossier> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('dossiers', 'readwrite');
    const store = tx.objectStore('dossiers');
    const request = store.get(dossier.id);
    let conflict = false;
    let saved: Dossier;
    request.onsuccess = () => {
      const current = request.result as Dossier | undefined;
      const expected = dossier.revision;
      if (current ? expected !== (current.revision ?? 0) : expected !== undefined) {
        conflict = true; tx.abort(); return;
      }
      saved = {...dossier, revision: (current?.revision ?? 0) + 1};
      store.put(saved);
    };
    tx.oncomplete = () => resolve(saved);
    tx.onerror = tx.onabort = () => reject(conflict ? new DossierConflict() : new Error('No s’ha desat el dossier. Comprova l’espai del navegador i exporta una còpia.'));
  });
}
export async function removeDossier(dossier: Dossier) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('dossiers', 'readwrite');
    const store = tx.objectStore('dossiers');
    const request = store.get(dossier.id);
    let conflict = false;
    request.onsuccess = () => {
      const current = request.result as Dossier | undefined;
      if (!current || dossier.revision !== (current.revision ?? 0)) {conflict = true; tx.abort(); return;}
      store.delete(dossier.id);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(conflict ? new DossierConflict() : new Error('No s’ha pogut eliminar el dossier.'));
  });
}
const ID = /^[A-Za-z0-9_-]{1,100}$/;
// Només enllaços interns a una pàgina de l'Observatori, mai a un altre lloc.
const INTERNAL = /^#[a-z]+(?:\?[^\s<>"']*)?$/;
const STAMP = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;
// Conserva els identificadors vàlids perquè una segona importació del mateix dossier es fusioni en lloc de duplicar-se.
export function parseDossier(value: unknown): Dossier {
  const bad = () => {throw new Error('Aquest fitxer no és un dossier vàlid de l’Observatori.');};
  if (!value || typeof value !== 'object') return bad();
  const envelope = value as Record<string, unknown>;
  if (envelope.schemaVersion !== 1 || !envelope.dossier || typeof envelope.dossier !== 'object') return bad();
  return parseDossierBody(envelope.dossier as Record<string, unknown>);
}
export function parseDossierBody(d: Record<string, unknown>): Dossier {
  const bad = (): never => {throw new Error('Aquest fitxer no és un dossier vàlid de l’Observatori.');};
  const str = (v: unknown, max = 5000): v is string => typeof v === 'string' && v.length <= max;
  const id = (v: unknown) => typeof v === 'string' && ID.test(v) ? v : crypto.randomUUID();
  const stamp = (v: unknown): string | undefined => v === undefined ? undefined : typeof v === 'string' && STAMP.test(v) ? v : bad();
  if (!str(d.title, 160) || !d.title.trim() || !str(d.createdAt, 40) || !str(d.updatedAt, 40) || !Array.isArray(d.notes) || !Array.isArray(d.evidence) || d.notes.length > 1000 || d.evidence.length > 2000) return bad();
  const evidence = d.evidence.map(e => {
    if (!e || !str(e.id, 300) || !EVIDENCE_KINDS.includes(e.kind) || !(e.href === undefined || (str(e.href, 1000) && INTERNAL.test(e.href))) || !str(e.title) || !str(e.url, 2000) || safeUrl(e.url) === '#' || !str(e.source) || !str(e.capturedAt, 40) || !str(e.locator)) return bad();
    const addedAt = stamp(e.addedAt);
    return {id: e.id, kind: e.kind, title: e.title, url: e.url, source: e.source, capturedAt: e.capturedAt, locator: e.locator, ...(e.href ? {href: e.href} : {}), ...(addedAt ? {addedAt} : {})};
  });
  const notes = d.notes.map(n => {
    if (!n || !str(n.text, 50000) || !['nota', 'pregunta', 'hipòtesi'].includes(n.kind) || !['pendent', 'contrastada', 'descartada'].includes(n.status) || (n.author !== undefined && !str(n.author, 40))) return bad();
    const updatedAt = stamp(n.updatedAt);
    return {id: id(n.id), text: n.text, kind: n.kind, status: n.status, ...(n.author?.trim() ? {author: n.author.trim()} : {}), ...(updatedAt ? {updatedAt} : {})};
  });
  if (d.requests !== undefined && (!Array.isArray(d.requests) || d.requests.length > 500)) return bad();
  const requests = ((d.requests ?? []) as Record<string, unknown>[]).map(r => {
    if (!r || !REQUEST_KINDS.includes(r.kind as RequestKind) || !str(r.text, 100000) || !str(r.createdAt, 40) || !REQUEST_STATUSES.includes(r.status as RequestStatus) || !(r.presentedAt === null || (str(r.presentedAt, 10) && /^\d{4}-\d{2}-\d{2}$/.test(r.presentedAt))) || !str(r.registry, 120)) return bad();
    const updatedAt = stamp(r.updatedAt);
    return {id: id(r.id), kind: r.kind as RequestKind, text: r.text, createdAt: r.createdAt, status: r.status as RequestStatus, presentedAt: r.presentedAt as string | null, registry: r.registry, ...(updatedAt ? {updatedAt} : {})};
  });
  if (new Set(notes.map(n => n.id)).size < notes.length || new Set(evidence.map(e => e.id)).size < evidence.length || new Set(requests.map(r => r.id)).size < requests.length) return bad();
  const deleted: Record<string, string> = {};
  if (d.deleted !== undefined) {
    if (!d.deleted || typeof d.deleted !== 'object' || Array.isArray(d.deleted)) return bad();
    const entries = Object.entries(d.deleted as Record<string, unknown>);
    if (entries.length > 5000) return bad();
    for (const [key, when] of entries) {
      if (!/^(evidence|note|request):.{1,300}$/.test(key) || typeof when !== 'string' || !STAMP.test(when)) return bad();
      deleted[key] = when;
    }
  }
  return {id: id(d.id), title: d.title, createdAt: d.createdAt, updatedAt: d.updatedAt, evidence, notes, ...(requests.length ? {requests} : {}), ...(Object.keys(deleted).length ? {deleted} : {})};
}
