import {useEffect, useId, useState} from 'react';
import {ArrowDownToLine, Copy, FilePenLine, RotateCcw, Save, Trash2} from 'lucide-react';
import type {Dossier, FormalRequest, Note, RequestKind, RequestStatus} from './types';
import {date, download, safeUrl, today} from './lib';
import {REQUEST_STATUSES} from './storage';
import {now, withoutItem} from './share';
import {Badge, Modal} from './ui';

export const REQUEST_LABELS: Record<RequestKind, string> = {informacio: 'Sol·licitud d’informació', pregunta: 'Pregunta al Ple', prec: 'Prec'};
const STATUS_LABELS: Record<RequestStatus, string> = {esborrany: 'Esborrany', presentada: 'Presentada, sense resposta', resposta: 'Resposta rebuda', 'resposta parcial': 'Resposta parcial', 'sense resposta': 'Termini esgotat sense resposta'};
const longDate = (iso: string) => new Intl.DateTimeFormat('ca-ES', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(iso.slice(0, 10) + 'T00:00:00Z'));

// Preferència d'aquest navegador: no surt del dispositiu i pot fallar en mode privat.
const SIGNER_KEY = 'observatori.peticions.signant';
function readSigner(): {name: string; group: string} {
  try {const v = JSON.parse(localStorage.getItem(SIGNER_KEY) ?? '{}'); return {name: typeof v.name === 'string' ? v.name : '', group: typeof v.group === 'string' ? v.group : ''};} catch {return {name: '', group: ''};}
}
function writeSigner(value: {name: string; group: string}) {try {localStorage.setItem(SIGNER_KEY, JSON.stringify(value));} catch {/* sense emmagatzematge: es torna a escriure */}}

export function requestText({kind, dossier, notes, includeSources, name, group, day}: {kind: RequestKind; dossier: Dossier; notes: Note[]; includeSources: boolean; name: string; group: string; day: string}) {
  const signer = name.trim() || '[Nom i cognoms]';
  const groupName = group.trim() || '[nom del grup]';
  const items = notes.length ? notes.map((n, i) => `${i + 1}. ${n.text.trim()}`).join('\n') : '1. [Concreta aquí la pregunta o la informació que demanes]';
  const sources = dossier.evidence.map((e, i) => `${i + 1}. ${e.title}. ${e.source}. ${e.locator.replace(/ · registre .*$/, '')}. Disponible a: ${safeUrl(e.url)} (consulta: ${date(e.capturedAt)}).`).join('\n');
  const antecedents = includeSources && sources ? `A partir de la informació pública consultada en relació amb «${dossier.title}»:\n\n${sources}` : `En relació amb «${dossier.title}».`;
  const closing = `\n\nCastellar del Vallès, ${longDate(day)}\n\n\n${signer}`;
  if (kind === 'informacio') return `SOL·LICITUD D’INFORMACIÓ\n\n${signer}, regidor/a del grup municipal ${groupName} a l’Ajuntament de Castellar del Vallès, en exercici del dret d’accés a la informació que reconeixen als membres de la corporació l’article 77 de la Llei 7/1985, de 2 d’abril, reguladora de les bases del règim local, i l’article 164 del Decret legislatiu 2/2003, de 28 d’abril, pel qual s’aprova el Text refós de la Llei municipal i de règim local de Catalunya,\n\nEXPOSA\n\n${antecedents}\n\nSOL·LICITA\n\nQue se li faciliti l’accés a la informació i la documentació següents, necessàries per a l’exercici de la seva funció:\n\n${items}` + closing;
  if (kind === 'pregunta') return `PREGUNTA PER AL PLE\n\nEl grup municipal ${groupName}, mitjançant el regidor/a ${signer}, formula a l’equip de govern les preguntes següents per a la propera sessió ordinària del Ple de l’Ajuntament de Castellar del Vallès.\n\nANTECEDENTS\n\n${antecedents}\n\nPREGUNTES\n\n${items}` + closing;
  return `PREC\n\nEl grup municipal ${groupName}, mitjançant el regidor/a ${signer}, formula el prec següent per a la propera sessió ordinària del Ple de l’Ajuntament de Castellar del Vallès.\n\nANTECEDENTS\n\n${antecedents}\n\nPer tot això, es prega a l’equip de govern:\n\n${items}` + closing;
}

export function RequestComposer({dossier, onSave, onClose}: {dossier: Dossier; onSave: (d: Dossier) => Promise<void>; onClose: () => void}) {
  const usable = dossier.notes.filter(n => n.status !== 'descartada');
  const [kind, setKind] = useState<RequestKind>('pregunta');
  const [signer, setSigner] = useState(readSigner);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(usable.filter(n => n.kind === 'pregunta').map(n => n.id)));
  const [includeSources, setIncludeSources] = useState(true);
  const [edited, setEdited] = useState<string | null>(null);
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const generated = requestText({kind, dossier, notes: usable.filter(n => chosen.has(n.id)), includeSources, name: signer.name, group: signer.group, day: today()});
  const text = edited ?? generated;
  const textId = useId();
  function changeSigner(value: {name: string; group: string}) {setSigner(value); writeSigner(value);}
  function toggle(id: string) {setChosen(old => {const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next;});}
  async function copy() {try {await navigator.clipboard.writeText(text); setMessage('Text copiat');} catch {setMessage('No s’ha pogut copiar. Selecciona el text i copia’l manualment.');}}
  async function save() {
    setBusy(true); setError('');
    const request: FormalRequest = {id: crypto.randomUUID(), kind, text, createdAt: now(), status: 'esborrany', presentedAt: null, registry: '', updatedAt: now()};
    try {await onSave({...dossier, updatedAt: new Date().toISOString(), requests: [...(dossier.requests ?? []), request]}); onClose();} catch (e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  return <Modal title="Prepara una pregunta formal" wide onClose={onClose}>
    <p className="muted small">Es genera a partir de les fonts i les notes del dossier. Revisa’l i adapta’l al Reglament orgànic municipal abans de presentar-lo. El text no s’envia enlloc: es desa només en aquest navegador.</p>
    <div className="segmented request-kinds">{(Object.keys(REQUEST_LABELS) as RequestKind[]).map(k => <button key={k} type="button" aria-pressed={kind === k} className={kind === k ? 'active' : ''} onClick={() => {setKind(k); setEdited(null);}}>{REQUEST_LABELS[k]}</button>)}</div>
    <div className="request-grid">
      <div>
        <label className="field">Signant<input value={signer.name} maxLength={120} onChange={e => {changeSigner({...signer, name: e.target.value}); setEdited(null);}} placeholder="Nom i cognoms"/></label>
        <label className="field">Grup municipal<input value={signer.group} maxLength={120} onChange={e => {changeSigner({...signer, group: e.target.value}); setEdited(null);}} placeholder="Nom del grup"/></label>
        <fieldset className="request-notes"><legend>Notes que s’hi inclouen</legend>{usable.length ? usable.map(n => <label key={n.id}><input type="checkbox" checked={chosen.has(n.id)} onChange={() => {toggle(n.id); setEdited(null);}}/><span><Badge tone={n.kind === 'hipòtesi' ? 'amber' : 'blue'}>{n.kind}</Badge> {n.text.length > 140 ? n.text.slice(0, 140) + '…' : n.text}</span></label>) : <p className="muted small">El dossier no té notes. Afegeix-hi preguntes o escriu-les directament al text.</p>}</fieldset>
        <label className="check-line"><input type="checkbox" checked={includeSources} onChange={e => {setIncludeSources(e.target.checked); setEdited(null);}}/>Cita les fonts del dossier com a antecedents ({dossier.evidence.length})</label>
        {chosen.size > 0 && usable.some(n => chosen.has(n.id) && n.kind === 'hipòtesi') && <p className="notice warning small">Hi has inclòs una hipòtesi. Formula-la com a pregunta: el text es presentarà com a document oficial.</p>}
      </div>
      <div>
        <div className="field"><label htmlFor={textId}>Text</label><textarea id={textId} aria-label="Text de la petició" className="request-text" rows={18} value={text} onChange={e => setEdited(e.target.value)}/></div>
        {edited !== null && <button type="button" className="text-button" onClick={() => setEdited(null)}><RotateCcw size={14}/>Descarta els canvis i torna a generar</button>}
      </div>
    </div>
    {error && <p role="alert" className="error-text">{error}</p>}
    <div className="request-actions"><button type="button" className="button secondary" onClick={copy}><Copy size={15}/>Copia</button><button type="button" className="button secondary" onClick={() => download(`${kind}-${today()}.txt`, text, 'text/plain;charset=utf-8')}><ArrowDownToLine size={15}/>Descarrega .txt</button><button type="button" className="button primary" disabled={busy} onClick={save}><Save size={15}/>{busy ? 'Desant…' : 'Desa al seguiment'}</button>{message && <span role="status" className="small muted">{message}</span>}</div>
  </Modal>;
}

const daysSince = (day: string) => Math.floor((Date.parse(today() + 'T00:00:00Z') - Date.parse(day + 'T00:00:00Z')) / 86400000);

function RequestItem({request, busy, onChange, onRemove}: {request: FormalRequest; busy: boolean; onChange: (r: FormalRequest) => void; onRemove: () => void}) {
  const [presentedAt, setPresentedAt] = useState(request.presentedAt ?? ''), [registry, setRegistry] = useState(request.registry);
  useEffect(() => {setPresentedAt(request.presentedAt ?? ''); setRegistry(request.registry);}, [request.presentedAt, request.registry]);
  const [open, setOpen] = useState(false), [message, setMessage] = useState('');
  const dirty = presentedAt !== (request.presentedAt ?? '') || registry !== request.registry;
  const first = request.text.split('\n').find(l => l.trim()) ?? '';
  const elapsed = request.presentedAt && ['presentada', 'sense resposta'].includes(request.status) ? daysSince(request.presentedAt) : null;
  async function copy() {try {await navigator.clipboard.writeText(request.text); setMessage('Text copiat');} catch {setMessage('No s’ha pogut copiar.');}}
  return <div className="request-item">
    <div className="note-heading"><Badge tone="green">{REQUEST_LABELS[request.kind]}</Badge><select aria-label="Estat de la petició" disabled={busy} value={request.status} onChange={e => onChange({...request, status: e.target.value as RequestStatus, presentedAt: e.target.value !== 'esborrany' && !request.presentedAt ? today() : request.presentedAt})}>{REQUEST_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select><button className="icon-button no-print" disabled={busy} aria-label="Elimina la petició" onClick={() => {if (window.confirm('Vols eliminar aquesta petició del seguiment?')) onRemove();}}><Trash2 size={14}/></button></div>
    <p className="small muted">{first} · creada el {date(request.createdAt)}{elapsed !== null && <strong> · presentada {elapsed <= 0 ? 'avui' : `fa ${elapsed} ${elapsed === 1 ? 'dia' : 'dies'}`}</strong>}</p>
    {request.status !== 'esborrany' && <form className="request-meta no-print" onSubmit={e => {e.preventDefault(); onChange({...request, presentedAt: presentedAt || null, registry: registry.trim()});}}><label className="field">Data de presentació<input type="date" value={presentedAt} max={today()} onChange={e => setPresentedAt(e.target.value)}/></label><label className="field">Núm. de registre<input value={registry} maxLength={120} onChange={e => setRegistry(e.target.value)} placeholder="Opcional"/></label>{dirty && <button className="button secondary" disabled={busy}><Save size={14}/>Desa</button>}</form>}
    <div className="request-toolbar no-print"><button type="button" className="text-button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Amaga el text' : 'Mostra el text'}</button><button type="button" className="text-button" onClick={copy}><Copy size={13}/>Copia</button>{message && <span role="status" className="small muted">{message}</span>}</div>
    {open && <pre className="request-preview">{request.text}</pre>}
  </div>;
}

export function RequestList({dossier, busy, onSave, onCompose}: {dossier: Dossier; busy: boolean; onSave: (d: Dossier) => void; onCompose: () => void}) {
  const requests = dossier.requests ?? [];
  const update = (next: FormalRequest[]) => onSave({...dossier, requests: next});
  return <div className="document-section"><h3>Preguntes i sol·licituds formals <span className="count">{requests.length}</span></h3>
    {!requests.length && <p className="muted">Converteix les notes i les fonts d’aquest dossier en una pregunta al Ple, un prec o una sol·licitud d’informació, i segueix-ne la resposta.</p>}
    {requests.map(r => <RequestItem key={r.id} request={r} busy={busy} onChange={changed => update(requests.map(x => x.id === r.id ? {...changed, updatedAt: now()} : x))} onRemove={() => onSave(withoutItem(dossier, 'request', r.id))}/>)}
    <button className="button secondary no-print" onClick={onCompose}><FilePenLine size={15}/>Prepara una pregunta formal</button>
  </div>;
}
