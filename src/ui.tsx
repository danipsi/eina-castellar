import {ArrowDownToLine, ArrowUpRight, ChevronLeft, ChevronRight, CircleHelp, X} from 'lucide-react';
import {useEffect, useRef} from 'react';
import type {ReactNode} from 'react';
import {date, safeUrl} from './lib';

export function Original({url, children = 'Font original'}: {url: string; children?: ReactNode}) {
  return <a className="original" href={safeUrl(url)} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={14}/><span className="sr-only"> (s’obre en una pestanya nova)</span></a>;
}
export function Badge({children, tone = ''}: {children: ReactNode; tone?: string}) {return <span className={`badge ${tone}`}>{children}</span>;}
export function Empty({title, children}: {title: string; children?: ReactNode}) {return <div className="empty"><CircleHelp size={25}/><h3>{title}</h3><div>{children}</div></div>;}
export function PageTitle({eyebrow, title, children, actions}: {eyebrow: string; title: string; children?: ReactNode; actions?: ReactNode}) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1 tabIndex={-1}>{title}</h1>{children && <p className="subtitle">{children}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}
export function DownloadButton({onClick, children = 'Exporta CSV'}: {onClick: () => void; children?: ReactNode}) {return <button className="button secondary" onClick={onClick}><ArrowDownToLine size={16}/>{children}</button>;}
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
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} aria-label={title} onCancel={e => {e.preventDefault(); onClose();}} onClick={e => {if (e.target === e.currentTarget) onClose();}}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Tanca"><X size={20}/></button></div><div className="modal-content">{children}</div></dialog>;
}
