import {ArrowDownToLine, ArrowUpRight, ChevronLeft, ChevronRight, CircleHelp, FolderPlus, Link, TableProperties, X} from 'lucide-react';
import {createContext, useContext, useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import type {Evidence} from './types';
import {createPortal} from 'react-dom';
import {date, number, safeUrl} from './lib';
import {loadSource, parseSource, showValue} from './sourceData';
import type {Shown, SourceField, SourceRecord, SourceResult} from './sourceData';

// L'enllaç continua apuntant a la font en brut (Ctrl+clic, impressió, exportacions);
// un clic normal sobre una font de dades en brut obre el visor llegible.
export function Original({url, children = 'Font original'}: {url: string; children?: ReactNode}) {
  const [open, setOpen] = useState(false), viewable = parseSource(url) !== null;
  if (!viewable) return <a className="original" href={safeUrl(url)} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={14}/><span className="sr-only"> (s’obre en una pestanya nova)</span></a>;
  return <><a className="original" href={safeUrl(url)} target="_blank" rel="noopener noreferrer" aria-haspopup="dialog" onClick={e => {if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); setOpen(true);}}>{children}<TableProperties size={14}/><span className="sr-only"> (obre una vista llegible de la font)</span></a>
    {open && createPortal(<div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}><SourceViewer url={url} onClose={() => setOpen(false)}/></div>, document.body)}</>;
}

function Value({value, compact = false}: {value: Shown; compact?: boolean}) {
  if (!value.href) return <>{value.text}</>;
  const href = safeUrl(value.href), label = compact && href !== '#' ? new URL(href).hostname : value.text;
  return <a href={href} title={value.text} target="_blank" rel="noopener noreferrer">{label}</a>;
}
function FieldList({fields, record}: {fields: SourceField[]; record: SourceRecord}) {
  return <dl className="source-fields">{fields.map(f => <div key={f.id}><dt>{f.label} <code>{f.id}</code></dt><dd><Value value={showValue(f, record[f.id])}/></dd></div>)}</dl>;
}
function SourceViewer({url, onClose}: {url: string; onClose: () => void}) {
  const [state, setState] = useState<{data?: SourceResult; error?: string}>({});
  useEffect(() => {let live = true; loadSource(url).then(data => live && setState({data}), (e: Error) => live && setState({error: e.message})); return () => {live = false;};}, [url]);
  const {data, error} = state, raw = <a className="original" href={safeUrl(url)} target="_blank" rel="noopener noreferrer">Resposta en brut (JSON)<ArrowUpRight size={14}/><span className="sr-only"> (s’obre en una pestanya nova)</span></a>;
  if (error) return <Modal title="Font original" onClose={onClose}><div className="notice warning"><CircleHelp size={20}/><p>{error}. Pots obrir la resposta directament al portal.</p></div>{raw}</Modal>;
  if (!data) return <Modal title="Font original" onClose={onClose}><p role="status" className="muted">Consultant el portal de dades obertes…</p></Modal>;
  const {fields, records, total, conditions} = data;
  // Amb diversos registres, els camps idèntics a tots es mostren un sol cop i la taula conserva només el que varia.
  const common = records.length > 1 ? fields.filter(f => records.every(r => String(r[f.id]) === String(records[0][f.id]))) : fields;
  const varying = fields.filter(f => !common.includes(f));
  return <Modal title="Font original" onClose={onClose} wide>
    <h3 className="detail-title">{data.title}</h3>
    <p className="small muted">{data.portal}{data.modified ? ` · dades actualitzades el ${date(data.modified.slice(0, 10))}` : ''}. Consulta feta ara mateix: el resultat pot diferir de la captura de l’observatori.</p>
    {conditions.length > 0 && <div className="source-filters"><span>Filtres de la consulta</span>{conditions.map(c => <Badge key={c.label + c.value} tone="blue">{c.label}: {c.value}</Badge>)}</div>}
    <p className="small">{total === 1 ? '1 registre trobat' : `${number(total)} registres trobats`}{records.length < total ? ` · se’n mostren els primers ${number(records.length)}` : ''}</p>
    {records.length === 0 ? <Empty title="Cap registre">La consulta no retorna cap fila al portal.</Empty>
      : records.length === 1 ? <FieldList fields={fields} record={records[0]}/>
      : <>{common.length > 0 && <><h3>Comú a tots els registres</h3><FieldList fields={common} record={records[0]}/></>}
        <h3>Registres</h3><div className="table-scroll source-table"><table><thead><tr>{varying.map(f => <th key={f.id} title={f.id}>{f.label}</th>)}</tr></thead>
          <tbody>{records.map((r, i) => <tr key={String(r._id ?? i)}>{varying.map(f => <td key={f.id}><Value value={showValue(f, r[f.id])} compact/></td>)}</tr>)}</tbody></table></div></>}
    <div className="source-links">{raw}{data.datasetUrl && <a className="original" href={safeUrl(data.datasetUrl)} target="_blank" rel="noopener noreferrer">Fitxa del conjunt de dades<ArrowUpRight size={14}/><span className="sr-only"> (s’obre en una pestanya nova)</span></a>}</div>
  </Modal>;
}
export function Badge({children, tone = ''}: {children: ReactNode; tone?: string}) {return <span className={`badge ${tone}`}>{children}</span>;}
export function Empty({title, children}: {title: string; children?: ReactNode}) {return <div className="empty"><CircleHelp size={25}/><h3>{title}</h3><div>{children}</div></div>;}
export function PageTitle({eyebrow, title, children, actions}: {eyebrow: string; title: string; children?: ReactNode; actions?: ReactNode}) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1 tabIndex={-1}>{title}</h1>{children && <p className="subtitle">{children}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}
export function DownloadButton({onClick, children = 'Exporta CSV'}: {onClick: () => void; children?: ReactNode}) {return <button className="button secondary" onClick={onClick}><ArrowDownToLine size={16}/>{children}</button>;}
export function ShareLink() {
  const [message, setMessage] = useState(''), [fallback, setFallback] = useState('');
  useEffect(() => {if (!message) return; const timer = setTimeout(() => setMessage(''), 3500); return () => clearTimeout(timer);}, [message]);
  async function copy() {
    try {await navigator.clipboard.writeText(location.href); setFallback(''); setMessage('Enllaç copiat');}
    catch {setFallback(location.href); setMessage('Selecciona i copia aquest enllaç.');}
  }
  return <div className="share-link"><button className="button secondary" onClick={copy}><Link size={15}/>Copia l’enllaç</button>{message && <span role="status">{message}</span>}{fallback && <input readOnly aria-label="Enllaç per compartir" value={fallback} onFocus={e => e.target.select()}/>}</div>;
}
export function Pagination({page, total, size = 20, setPage}: {page: number; total: number; size?: number; setPage: (page: number) => void}) {
  const count = Math.max(1, Math.ceil(total / size));
  return <div className="pagination"><span>{total ? (page - 1) * size + 1 : 0}–{Math.min(page * size, total)} de {total}</span><div><button aria-label="Pàgina anterior" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={17}/></button><span>{page} / {count}</span><button aria-label="Pàgina següent" disabled={page >= count} onClick={() => setPage(page + 1)}><ChevronRight size={17}/></button></div></div>;
}
export function Citation({url, capturedAt, id, source}: {url: string; capturedAt: string; id: string; source: string}) {
  return <div className="citation"><div><strong>{source}</strong><Original url={url}/></div><span>Captura: {date(capturedAt)}</span><code>Registre: {id}</code></div>;
}
export function Modal({title, children, onClose, wide = false}: {title: string; children: ReactNode; onClose: () => void; wide?: boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {const dialog = ref.current!; dialog.showModal(); const before = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => {dialog.close(); document.body.style.overflow = before;};}, []);
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} aria-label={title} onCancel={e => {e.preventDefault(); e.stopPropagation(); onClose();}} onClick={e => {if (e.target === e.currentTarget) onClose();}}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Tanca"><X size={20}/></button></div><div className="modal-content">{children}</div></dialog>;
}

// L'App obre el diàleg «Afegeix al dossier»; les pàgines només hi passen la referència.
export const SaveEvidenceContext = createContext<((evidence: Evidence) => void) | null>(null);
export function SaveToDossier({evidence, name}: {evidence: () => Evidence; name?: string}) {
  const save = useContext(SaveEvidenceContext);
  if (!save) return null;
  return <button type="button" className="text-button save-evidence no-print" aria-label={name ? `Afegeix al dossier: ${name}` : undefined} onClick={() => save(evidence())}><FolderPlus size={14}/>Afegeix al dossier</button>;
}
