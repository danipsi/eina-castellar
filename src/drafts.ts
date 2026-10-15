import {useEffect, useRef, useState} from 'react';
import type {Note} from './types';

export type NoteDraft = {text: string; kind: Note['kind']};
type Drafts = Record<string, NoteDraft>;
const key = 'observatori-castellar:note-drafts:v1';
const warning = 'No s’han pogut conservar els esborranys per a una recàrrega. Es mantenen mentre aquesta pàgina sigui oberta; afegeix les notes abans de recarregar o tancar.';

function initialDrafts(): {drafts: Drafts; error: string} {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    const drafts: Drafts = {};
    for (const [id, draft] of Object.entries(value)) {
      if (!draft || typeof draft.text !== 'string' || draft.text.length > 50000 || !['nota', 'pregunta', 'hipòtesi'].includes(draft.kind)) throw new Error();
      Object.defineProperty(drafts, id, {value: {text: draft.text, kind: draft.kind}, enumerable: true, writable: true, configurable: true});
    }
    return {drafts, error: ''};
  } catch {return {drafts: {}, error: warning};}
}

export function useNoteDrafts() {
  const [state, setState] = useState(initialDrafts);
  const currentDrafts = useRef(state.drafts);
  function changeDraft(id: string, draft: NoteDraft | null) {
    // Un desament lent pot acabar després de navegar i escriure en un altre dossier.
    const drafts = {...currentDrafts.current};
    if (draft) drafts[id] = draft; else delete drafts[id];
    let error = '';
    try {sessionStorage.setItem(key, JSON.stringify(drafts));} catch {error = warning;}
    currentDrafts.current = drafts;
    setState({drafts, error});
  }
  const pending = Object.values(state.drafts).some(d => d.text.trim());
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => {event.preventDefault(); event.returnValue = '';};
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pending]);
  return {...state, changeDraft};
}
