import {useSyncExternalStore} from 'react';
import type {Page, Selection, Catalog} from './types';

const pages: Page[] = ['overview', 'contracts', 'budget', 'sessions', 'dossiers', 'sources', 'search'];
const subscribe = (callback: () => void) => {window.addEventListener('hashchange', callback); return () => window.removeEventListener('hashchange', callback);};
const snapshot = () => location.hash;

export function readRoute(hash = location.hash) {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  return {page: pages.includes(path as Page) ? path as Page : 'overview' as Page, q: params.get('q') ?? '', params};
}

export function useRoute() {return readRoute(useSyncExternalStore(subscribe, snapshot));}

// Els filtres substitueixen l'URL actual; obrir una fitxa crea un pas a l'historial.
export function updateRoute(values: Record<string, string | null>, push = false) {
  const {page, params} = readRoute();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === '') params.delete(key); else params.set(key, value);
  }
  const hash = '#' + page + (params.size ? '?' + params.toString() : '');
  if (hash === location.hash) return;
  if (push) location.hash = hash;
  else {history.replaceState(null, '', hash); window.dispatchEvent(new HashChangeEvent('hashchange'));}
}

export function selectRecord(selection: Selection) {updateRoute({record: selection.kind + ':' + selection.item.id}, true);}

export function routeSelection(data: Catalog | null, record: string | null): Selection | null {
  if (!data || !record) return null;
  const colon = record.indexOf(':'), kind = record.slice(0, colon), id = record.slice(colon + 1);
  if (kind === 'contract') {const item = data.contracts.find(c => c.id === id); return item ? {kind, item} : null;}
  if (kind === 'session') {const item = data.sessions.find(s => s.id === id); return item ? {kind, item} : null;}
  if (kind === 'budget') {const item = data.budget.find(b => b.id === id); return item ? {kind, item} : null;}
  return null;
}
