import type {Dossier} from './types';
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
export function parseDossier(value: unknown): Dossier {
  const bad = () => {throw new Error('Aquest fitxer no és un dossier vàlid de l’Observatori.');};
  if (!value || typeof value !== 'object') return bad();
  const envelope = value as Record<string, unknown>;
  if (envelope.schemaVersion !== 1 || !envelope.dossier || typeof envelope.dossier !== 'object') return bad();
  const d = envelope.dossier as Record<string, unknown>;
  const str = (v: unknown, max = 5000): v is string => typeof v === 'string' && v.length <= max;
  if (!str(d.title, 160) || !d.title.trim() || !str(d.createdAt, 40) || !str(d.updatedAt, 40) || !Array.isArray(d.notes) || !Array.isArray(d.evidence) || d.notes.length > 1000 || d.evidence.length > 2000) return bad();
  const evidence = d.evidence.map(e => {
    if (!e || !str(e.id, 300) || !['contract', 'session', 'budget'].includes(e.kind) || !str(e.title) || !str(e.url, 2000) || safeUrl(e.url) === '#' || !str(e.source) || !str(e.capturedAt, 40) || !str(e.locator)) return bad();
    return {id: e.id, kind: e.kind, title: e.title, url: e.url, source: e.source, capturedAt: e.capturedAt, locator: e.locator};
  });
  const notes = d.notes.map(n => {
    if (!n || !str(n.text, 50000) || !['nota', 'pregunta', 'hipòtesi'].includes(n.kind) || !['pendent', 'contrastada', 'descartada'].includes(n.status)) return bad();
    return {id: crypto.randomUUID(), text: n.text, kind: n.kind, status: n.status};
  });
  return {id: crypto.randomUUID(), title: d.title, createdAt: d.createdAt, updatedAt: d.updatedAt, evidence, notes};
}
