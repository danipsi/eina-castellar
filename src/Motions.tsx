import {useMemo, useRef, useState} from 'react';
import {ArrowRight, CalendarDays, Gavel, Merge, Save, Search, Trash2, Upload} from 'lucide-react';
import type {Catalog, Selection} from './types';
import {csv, date, download, normalize, number, today} from './lib';
import {COMPLIANCE, MOTION_STATUSES, extractMotions, groupIndex, mergeStates, parseMotionState, recurringTopics, suggestGroupMerges, useMotionState} from './motionData';
import type {Compliance, GroupIndex, Motion, MotionMark, MotionState, MotionStatus} from './motionData';
import {Badge, DownloadButton, Empty, Modal, Original, PageTitle, Pagination, SaveToDossier, ShareLink} from './ui';
import {motionEvidence} from './evidence';
import {Stat} from './Explorer';
import {updateRoute, useRoute} from './routes';

const STATUS_LABEL: Record<MotionStatus, string> = {'': 'Sense marcar', aprovada: 'Aprovada', 'aprovada amb esmenes': 'Aprovada amb esmenes', rebutjada: 'Rebutjada', retirada: 'Retirada', 'sobre la taula': 'Sobre la taula'};
const STATUS_TONE: Record<MotionStatus, string> = {'': '', aprovada: 'green', 'aprovada amb esmenes': 'green', rebutjada: 'red', retirada: 'amber', 'sobre la taula': 'amber'};
const COMPLIANCE_LABEL: Record<Compliance, string> = {'': 'Sense seguiment', pendent: 'Pendent', 'en curs': 'En curs', complerta: 'Complerta', parcial: 'Complerta en part', incomplerta: 'Incomplerta'};
const COMPLIANCE_TONE: Record<Compliance, string> = {'': '', pendent: 'amber', 'en curs': 'blue', complerta: 'green', parcial: 'amber', incomplerta: 'red'};
const NONE = 'cap';
const approved = (m?: MotionMark) => m?.status === 'aprovada' || m?.status === 'aprovada amb esmenes';

export function Motions({data, onSelect}: {data: Catalog; onSelect: (s: Selection) => void}) {
  const {params} = useRoute();
  const q = params.get('q') ?? '', group = params.get('group') ?? '', year = params.get('year') ?? '', status = params.get('status') ?? '', follow = params.get('follow') ?? '';
  const set = (values: Record<string, string | null>) => updateRoute({...values, p: null});
  const {state, error, save} = useMotionState();
  const motions = useMemo(() => extractMotions(data), [data]);
  const groups = useMemo(() => groupIndex(motions, state.merges), [motions, state.merges]);
  const topics = useMemo(() => recurringTopics(motions), [motions]);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const suggestions = useMemo(() => suggestGroupMerges(motions, groups, dismissed), [motions, groups, dismissed]);
  const dismiss = (a: string, b: string) => {const next = [...dismissed, [a, b].sort().join('|')]; setDismissed(next); try {localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));} catch { /* es descarta només en aquesta sessió */ }};
  const years = useMemo(() => [...new Set(motions.map(m => m.date.slice(0, 4)))].sort(), [motions]);
  const open = motions.find(m => m.id === params.get('motion')) ?? null;
  const setOpen = (m: Motion | null) => updateRoute({motion: m?.id ?? null}, !!m);
  const [merging, setMerging] = useState(false), [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const mark = (m: Motion) => state.marks[m.id];
  const rows = motions.filter(m => {
    const k = mark(m);
    return (!q || normalize(m.title + ' ' + m.groups.join(' ')).includes(normalize(q)))
      && (!group || m.groups.some(g => groups.resolve(g) === group))
      && (!year || m.date.startsWith(year))
      && (!status || (status === NONE ? !k?.status : k?.status === status))
      && (!follow || (follow === NONE ? !k?.compliance : k?.compliance === follow));
  });
  const page = Math.max(1, Math.min(Math.ceil(rows.length / 20) || 1, Math.floor(Number(params.get('p'))) || 1));
  const marked = motions.filter(m => mark(m)?.status).length;
  const toFollow = motions.filter(m => approved(mark(m)) && mark(m)!.compliance !== 'complerta').length;

  function exportState() {
    download(`seguiment-mocions-${today()}.json`, JSON.stringify({schemaVersion: 1, exportedAt: new Date().toISOString(), ...state}, null, 2), 'application/json');
  }
  async function importState(file?: File) {
    if (!file) return;
    try {
      const incoming = parseMotionState(JSON.parse(await file.text()));
      save(mergeStates(state, incoming));
      setMessage(`S’han incorporat ${number(Object.keys(incoming.marks).length)} marques. Si una moció ja estava marcada, es conserva la marca més recent.`);
    } catch (e) {setMessage(e instanceof SyntaxError ? 'El fitxer no és un JSON vàlid.' : (e as Error).message);}
    if (fileRef.current) fileRef.current.value = '';
  }
  function exportCsv() {
    download('mocions-filtrades.csv', csv([
      ['Data', 'Grup', 'Títol', 'Sessions', 'Estat', 'Compliment', 'Notes de seguiment', 'Font'],
      ...rows.map(m => [m.date, m.groups.map(g => groups.label(groups.resolve(g))).join(' + '), m.title, m.appearances.map(a => a.date).join(' | '), STATUS_LABEL[mark(m)?.status ?? ''], COMPLIANCE_LABEL[mark(m)?.compliance ?? ''], mark(m)?.note ?? '', m.appearances[0].url]),
    ]), 'text/csv;charset=utf-8');
  }

  return <>
    <PageTitle eyebrow="Activitat institucional" title="Seguiment de mocions" actions={<><button className="button secondary" onClick={() => fileRef.current?.click()}><Upload size={16}/>Importa seguiment</button><DownloadButton onClick={exportState}>Exporta seguiment</DownloadButton><ShareLink/></>}>Mocions presentades al Ple segons els ordres del dia indexats. L’estat i el compliment els marques tu.</PageTitle>
    <input ref={fileRef} className="sr-only" aria-label="Importa seguiment de mocions JSON" type="file" accept=".json,application/json" onChange={e => importState(e.target.files?.[0])}/>
    <div className="notice"><Gavel size={19}/><p>L’ordre del dia no recull el resultat de la votació. Consulta l’acta o el vídeo abans de marcar l’estat. Les marques i les notes es desen només en aquest navegador; exporta’n una còpia per compartir-les dins del grup.</p></div>
    {(message || error) && <div className={`notice ${error ? 'warning' : ''}`} role="status"><p>{error || message}</p></div>}
    <div className="stats-grid"><Stat label="Mocions indexades" value={number(motions.length)} detail={`${number(motions.reduce((n, m) => n + m.appearances.length, 0))} punts a l’ordre del dia del Ple`}/><Stat label="Grups proposants" value={number(groups.keys.length)} detail="Variants del nom agrupades"/><Stat label="Amb estat marcat" value={`${number(marked)} de ${number(motions.length)}`} detail="Marques d’aquest navegador" accent/><Stat label="Aprovades per complir" value={number(toFollow)} detail="Aprovades sense compliment complet"/></div>
    <div className="motion-grid">
      <section className="panel" aria-labelledby="motion-matrix-title"><div className="panel-heading"><div><h2 id="motion-matrix-title">Mocions per grup i any</h2><p>Any de la primera aparició a l’ordre del dia · una moció conjunta compta a cada grup</p></div><button className="text-button" onClick={() => setMerging(true)}><Merge size={14}/>Unifica noms</button></div>
        {suggestions.length > 0 && <div className="merge-suggestions"><p><strong>Possibles variants del mateix grup.</strong> Comprova-ho a l’ordre del dia abans d’unir-les.</p><ul>{suggestions.map(({from, to}) => <li key={from + to}><span>{groups.label(from)} <ArrowRight size={13}/> {groups.label(to)}</span><button className="button secondary" onClick={() => save({...state, merges: {...state.merges, [from]: to}})}>Uneix</button><button className="text-button" onClick={() => dismiss(from, to)}>Descarta</button></li>)}</ul></div>}
        <div className="table-scroll"><table className="motion-matrix"><caption className="sr-only">Nombre de mocions per grup proposant i any</caption><thead><tr><th>Grup</th>{years.map(y => <th key={y} className="numeric">{y}</th>)}<th className="numeric">Total</th></tr></thead><tbody>{groups.keys.map(k => {
          const own = motions.filter(m => m.groups.some(g => groups.resolve(g) === k));
          return <tr key={k} className={group === k ? 'selected' : ''}><th scope="row"><button className="link-cell" onClick={() => set({group: group === k ? null : k, year: null})}>{groups.label(k)}</button></th>{years.map(y => {const n = own.filter(m => m.date.startsWith(y)).length; return <td key={y} className="numeric">{n ? <button className="link-cell" aria-label={`${groups.label(k)}, ${y}: ${n} mocions`} onClick={() => set({group: k, year: y})}>{n}</button> : <span className="muted">·</span>}</td>;})}<td className="numeric"><strong>{own.length}</strong></td></tr>;
        })}</tbody></table></div>
      </section>
      <section className="panel" aria-labelledby="motion-topics-title"><div className="panel-heading"><div><h2 id="motion-topics-title">Temes recurrents</h2><p>Paraules presents al títol de 3 mocions o més</p></div></div>
        {topics.length ? <div className="topic-list">{topics.map(t => <button key={t.word} className={`topic-chip ${normalize(q) === normalize(t.word) ? 'active' : ''}`} aria-pressed={normalize(q) === normalize(t.word)} onClick={() => set({q: normalize(q) === normalize(t.word) ? null : t.word})}>{t.word}<span>{t.count}</span></button>)}</div> : <p className="muted small topic-list">Encara no hi ha prou mocions per detectar temes.</p>}
      </section>
    </div>
    <section className="panel">
      <div className="filters">
        <div className="input-with-icon grow"><Search size={16}/><input aria-label="Cerca mocions" placeholder="Cerca un tema o un grup…" value={q} onChange={e => set({q: e.target.value})}/></div>
        <select aria-label="Grup proposant" value={group} onChange={e => set({group: e.target.value})}><option value="">Tots els grups</option>{groups.keys.map(k => <option key={k} value={k}>{groups.label(k)}</option>)}</select>
        <select aria-label="Any" value={year} onChange={e => set({year: e.target.value})}><option value="">Tots els anys</option>{[...years].reverse().map(y => <option key={y}>{y}</option>)}</select>
        <select aria-label="Estat de la votació" value={status} onChange={e => set({status: e.target.value})}><option value="">Tots els estats</option><option value={NONE}>Sense marcar</option>{MOTION_STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <select aria-label="Compliment" value={follow} onChange={e => set({follow: e.target.value})}><option value="">Qualsevol compliment</option><option value={NONE}>Sense seguiment</option>{COMPLIANCE.filter(Boolean).map(c => <option key={c} value={c}>{COMPLIANCE_LABEL[c]}</option>)}</select>
        <DownloadButton onClick={exportCsv}/>
      </div>
      <div className="session-list">{rows.slice((page - 1) * 20, page * 20).map(m => {
        const k = mark(m);
        return <button className="session-row" key={m.id} onClick={() => setOpen(m)}><span className="session-icon"><Gavel size={20}/></span><span className="session-copy"><span className="row-meta"><span>{date(m.date)}</span>{m.groups.map(g => <Badge key={g} tone="blue">{groups.label(groups.resolve(g))}</Badge>)}{m.appearances.length > 1 && <Badge>{m.appearances.length} sessions</Badge>}{m.appearances.some(a => a.withdrawn) && !k?.status && <Badge tone="amber">Retirada segons l’ordre del dia</Badge>}</span><strong>{m.title}</strong><span className="row-meta">{k?.status ? <Badge tone={STATUS_TONE[k.status]}>{STATUS_LABEL[k.status]}</Badge> : <small>Estat sense marcar</small>}{k?.compliance && <Badge tone={COMPLIANCE_TONE[k.compliance]}>Compliment: {COMPLIANCE_LABEL[k.compliance].toLocaleLowerCase('ca')}</Badge>}{k?.note && <small>Amb notes</small>}</span></span><ArrowRight size={18}/></button>;
      })}</div>
      {!rows.length && <Empty title="No hi ha mocions amb aquests filtres">Prova un altre tema, grup o any.</Empty>}
      <Pagination page={page} total={rows.length} setPage={p => updateRoute({p: p === 1 ? null : String(p)})}/>
    </section>
    <p className="info-line">Grup i títol s’extreuen del text publicat a l’ordre del dia; comprova’ls a l’original. Una moció que torna al Ple amb el mateix títol es compta una sola vegada.</p>
    {open && <MotionEditor key={open.id} motion={open} groups={groups} mark={mark(open)} capturedAt={data.sessions.find(s => s.id === open.appearances[0].sessionId)?.capturedAt ?? data.generatedAt} onClose={() => setOpen(null)} onOpenSession={id => {const item = data.sessions.find(s => s.id === id); setOpen(null); if (item) onSelect({kind: 'session', item});}} onSave={next => {
      const marks = {...state.marks};
      if (next) marks[open.id] = next; else delete marks[open.id];
      save({...state, marks}); setOpen(null);
    }}/>}
    {merging && <MergeGroups groups={groups} state={state} onChange={merges => save({...state, merges})} onClose={() => setMerging(false)}/>}
  </>;
}

function MotionEditor({motion, groups, mark, capturedAt, onClose, onSave, onOpenSession}: {motion: Motion; groups: GroupIndex; mark?: MotionMark; capturedAt: string; onClose: () => void; onSave: (m: MotionMark | null) => void; onOpenSession: (id: string) => void}) {
  const withdrawn = motion.appearances.some(a => a.withdrawn);
  const [status, setStatus] = useState<MotionStatus>(mark?.status ?? (withdrawn ? 'retirada' : ''));
  const [compliance, setCompliance] = useState<Compliance>(mark?.compliance ?? '');
  const [note, setNote] = useState(mark?.note ?? '');
  return <Modal title="Seguiment de la moció" onClose={onClose} wide>
    <div className="detail-labels">{motion.groups.map(g => <Badge key={g} tone="blue">{groups.label(groups.resolve(g))}</Badge>)}<span>{date(motion.date)}</span></div>
    <h3 className="detail-title">{motion.title}</h3>
    <div className="detail-actions"><SaveToDossier evidence={() => motionEvidence(motion, motion.groups.map(g => groups.label(groups.resolve(g))), capturedAt)}/></div>
    <h3>Aparicions a l’ordre del dia del Ple</h3>
    <ol className="timeline">{motion.appearances.map(a => <li key={a.sessionId}><span className="timeline-dot"/><div className="row-meta"><time>{date(a.date)}</time><Badge>Punt {a.number}</Badge>{a.carriedOver && <Badge tone="amber">Venia de sobre la taula</Badge>}{a.withdrawn && <Badge tone="amber">Retirada de l’ordre del dia</Badge>}</div><p className="small">{a.text}</p><div className="request-actions"><button className="text-button" onClick={() => onOpenSession(a.sessionId)}><CalendarDays size={14}/>Obre la sessió</button><Original url={a.url}>Acta i vídeo originals</Original></div></li>)}</ol>
    <h3>Seguiment del grup</h3>
    {withdrawn && !mark?.status && <p className="muted small">L’ordre del dia indica que es va retirar: s’ha proposat aquest estat, però no es desa fins que el confirmis.</p>}
    <div className="request-grid">
      <label className="field">Resultat de la votació<select value={status} onChange={e => setStatus(e.target.value as MotionStatus)}>{MOTION_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
      <label className="field">Compliment de l’acord<select value={compliance} onChange={e => setCompliance(e.target.value as Compliance)}>{COMPLIANCE.map(c => <option key={c} value={c}>{COMPLIANCE_LABEL[c]}</option>)}</select></label>
    </div>
    <label className="field">Notes de seguiment<textarea value={note} maxLength={5000} onChange={e => setNote(e.target.value)} placeholder="Què es va acordar, quin compromís hi ha, quina evidència de compliment has trobat i on…"/></label>
    <p className="muted small">El compliment és una valoració del grup: anota-hi la font que la sustenta.</p>
    <div className="request-actions">
      <button className="button primary" onClick={() => onSave(status || compliance || note.trim() ? {status, compliance, note: note.trim(), updatedAt: new Date().toISOString()} : null)}><Save size={16}/>Desa el seguiment</button>
      {mark && <button className="button secondary" onClick={() => onSave(null)}><Trash2 size={16}/>Esborra el seguiment</button>}
    </div>
  </Modal>;
}

function MergeGroups({groups, state, onChange, onClose}: {groups: GroupIndex; state: MotionState; onChange: (merges: Record<string, string>) => void; onClose: () => void}) {
  const manual = Object.entries(state.merges);
  return <Modal title="Unifica noms de grup" onClose={onClose}>
    <p className="muted small">Els ordres del dia escriuen el nom d’un mateix grup de maneres diferents. L’eina ja agrupa les variants que comencen igual; uneix aquí les altres. La unió es desa en aquest navegador i s’inclou en l’exportació del seguiment.</p>
    <ul className="merge-list">{groups.keys.map(k => <li key={k}>
      <div><strong>{groups.label(k)}</strong>{groups.variants(k).length > 1 && <small>També apareix com: {groups.variants(k).slice(1).join(' · ')}</small>}</div>
      <label className="field">Uneix amb<select aria-label={`Uneix ${groups.label(k)} amb`} value="" onChange={e => e.target.value && onChange({...state.merges, [k]: e.target.value})}><option value="">—</option>{groups.keys.filter(o => o !== k).map(o => <option key={o} value={o}>{groups.label(o)}</option>)}</select></label>
    </li>)}</ul>
    {manual.length > 0 && <><h3>Unions fetes a mà</h3><ul className="merge-list">{manual.map(([from, to]) => <li key={from}><span>{groups.name(from)} → {groups.label(groups.resolve(to))}</span><button className="button secondary" onClick={() => {const next = {...state.merges}; delete next[from]; onChange(next);}}>Desfés</button></li>)}</ul></>}
  </Modal>;
}

// Resum per a la portada: aprovades que el grup encara no dona per complertes.
export function PendingMotions({data, onOpen}: {data: Catalog; onOpen: () => void}) {
  const {state} = useMotionState();
  const motions = useMemo(() => extractMotions(data), [data]);
  const groups = useMemo(() => groupIndex(motions, state.merges), [motions, state.merges]);
  const pending = motions.filter(m => approved(state.marks[m.id]) && state.marks[m.id].compliance !== 'complerta');
  const marked = motions.filter(m => state.marks[m.id]?.status).length;
  return <section className="panel pending-motions" aria-labelledby="pending-motions-title">
    <div className="panel-heading"><div><h2 id="pending-motions-title">Mocions aprovades per complir</h2><p>Segons les marques d’aquest navegador · {number(marked)} de {number(motions.length)} mocions amb estat marcat</p></div><button className="text-button" onClick={onOpen}>Seguiment de mocions<ArrowRight size={14}/></button></div>
    {pending.length ? <ul className="pending-list">{pending.slice(0, 5).map(m => {const k = state.marks[m.id]; return <li key={m.id}><a href={`#motions?motion=${m.id}`}><span className="row-meta"><span>{date(m.date)}</span>{m.groups.map(g => <Badge key={g} tone="blue">{groups.label(groups.resolve(g))}</Badge>)}<Badge tone={COMPLIANCE_TONE[k.compliance]}>{k.compliance ? COMPLIANCE_LABEL[k.compliance] : 'Compliment sense marcar'}</Badge></span><strong>{m.title}</strong></a></li>;})}</ul>
      : <p className="muted small pending-empty">{marked ? 'Cap moció aprovada pendent de complir entre les que has marcat.' : 'Marca a Mocions el resultat de les votacions i el compliment dels acords; aquí veuràs les aprovades que encara no s’han complert.'}</p>}
    {pending.length > 5 && <div className="panel-bottom"><p className="small muted">{number(pending.length - 5)} més al seguiment de mocions.</p></div>}
  </section>;
}

const DISMISSED_KEY = 'observatori-mocions-suggeriments-descartats';
function readDismissed(): string[] {
  try {const value: unknown = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'); return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];} catch {return [];}
}
