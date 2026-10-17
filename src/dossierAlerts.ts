import {useEffect, useState} from 'react';
import type {Dossier} from './types';

// Avisos de la llista de dossiers, només en aquest navegador: quan es va exportar (o rebre) cada dossier
// i quines notes han arribat amb una importació i encara no s'han vist. No viatgen amb l'exportació.
const KEY = 'observatori.dossiers.avisos';
const EVENT = 'observatori-avisos';
const STALE_DAYS = 7;
type Alerts = {exported: Record<string, string>; received: Record<string, string[]>};
const empty = (): Alerts => ({exported: {}, received: {}});

function read(): Alerts {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const exported = Object.fromEntries(Object.entries(v.exported ?? {}).filter(([, when]) => typeof when === 'string')) as Record<string, string>;
    const received = Object.fromEntries(Object.entries(v.received ?? {}).filter(([, ids]) => Array.isArray(ids)).map(([id, ids]) => [id, (ids as unknown[]).filter(x => typeof x === 'string')])) as Record<string, string[]>;
    return {exported, received};
  } catch {return empty();}
}
function update(change: (a: Alerts) => Alerts) {
  try {localStorage.setItem(KEY, JSON.stringify(change(read())));} catch {/* sense emmagatzematge: no hi ha avisos */}
  window.dispatchEvent(new Event(EVENT));
}

// Exportar o rebre un dossier sencer el deixa al dia amb el grup.
export const markExported = (ids: string[]) => update(a => ({...a, exported: {...a.exported, ...Object.fromEntries(ids.map(id => [id, new Date().toISOString()]))}}));
export function markReceived(id: string, noteIds: string[]) {
  if (noteIds.length) update(a => ({...a, received: {...a.received, [id]: [...new Set([...(a.received[id] ?? []), ...noteIds])].slice(-1000)}}));
}
export const clearReceived = (id: string) => update(a => {const received = {...a.received}; delete received[id]; return {...a, received};});
export const forgetDossier = (id: string) => update(a => {const exported = {...a.exported}, received = {...a.received}; delete exported[id]; delete received[id]; return {exported, received};});

export function useDossierAlerts() {
  const [alerts, setAlerts] = useState(read);
  useEffect(() => {
    const sync = () => setAlerts(read());
    const fromTab = (e: StorageEvent) => {if (e.key === KEY) sync();};
    window.addEventListener(EVENT, sync); window.addEventListener('storage', fromTab);
    return () => {window.removeEventListener(EVENT, sync); window.removeEventListener('storage', fromTab);};
  }, []);
  return alerts;
}

// Notes rebudes que encara són al dossier (una nota eliminada després no compta).
export const freshNotes = (d: Dossier, alerts: Alerts) => (alerts.received[d.id] ?? []).filter(id => d.notes.some(n => n.id === id));

// Avisa quan hi ha canvis posteriors a la darrera exportació i aquesta (o la creació, si no s'ha exportat mai) fa 7 dies o més.
export function exportAlert(d: Dossier, exportedAt: string | undefined, nowMs = Date.now()): {days: number; never: boolean} | null {
  const pending = exportedAt ? d.updatedAt > exportedAt : d.evidence.length + d.notes.length + (d.requests?.length ?? 0) > 0;
  if (!pending) return null;
  const days = Math.floor((nowMs - Date.parse(exportedAt ?? d.createdAt)) / 86400000);
  return days >= STALE_DAYS ? {days, never: !exportedAt} : null;
}
