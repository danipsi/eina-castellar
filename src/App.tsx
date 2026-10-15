import {useEffect, useMemo, useRef, useState} from 'react';
import {Activity, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays, Check, ChevronRight, Database, FileText, FolderOpen, Gavel, LayoutDashboard, Menu, Search, ShieldCheck, Wallet, X} from 'lucide-react';
import type {Catalog, Dossier, Evidence, Page, Selection} from './types';
import {budgetTotal, compactMoney, date, evidenceFor, exactResults, isFutureDate, looksLikeExpedient, makeSearch, number, pct, ratio, today} from './lib';
import {DossierConflict, readDossiers, removeDossier, writeDossier} from './storage';
import {useNoteDrafts} from './drafts';
import {ContractTable, Contracts, Budget, Detail, Sessions, Stat} from './Explorer';
import {Dossiers, SaveEvidence} from './Dossiers';
import {Badge, Empty, Modal, Original, PageTitle, ShareLink} from './ui';
import {routeSelection, selectRecord, updateRoute, useRoute} from './routes';
import {Changes} from './Changes';
import {PERIOD_LABEL} from './period';
import {Investments} from './Investments';
import {Motions, PendingMotions} from './Motions';

const pages: {id: Page; label: string; icon: typeof Search}[] = [{id: 'overview', label: 'Visió general', icon: LayoutDashboard}, {id: 'contracts', label: 'Contractació', icon: FileText}, {id: 'budget', label: 'Pressupost', icon: Wallet}, {id: 'sessions', label: 'Sessions', icon: CalendarDays}, {id: 'motions', label: 'Mocions', icon: Gavel}, {id: 'dossiers', label: 'Dossiers', icon: FolderOpen}, {id: 'sources', label: 'Fonts i qualitat', icon: Database}];

export function App() {
  const [data, setData] = useState<Catalog | null>(null), [error, setError] = useState('');
  const route = useRoute();
  const searchQuery = route.page === 'search' ? route.q : '';
  const [query, setQuery] = useState(searchQuery), [menu, setMenu] = useState(false);
  const selection = routeSelection(data, route.params.get('record'));
  const [saving, setSaving] = useState<Evidence | null>(null);
  const [dossiers, setDossiers] = useState<Dossier[]>([]), [storageError, setStorageError] = useState(''), [toast, setToast] = useState('');
  const [dossiersLoading, setDossiersLoading] = useState(true);
  const noteDrafts = useNoteDrafts();
  const [updateStatus, setUpdateStatus] = useState<{status?: string; message?: string; error?: string; attemptedAt?: string} | null>(null);
  const searchRef = useRef<HTMLInputElement>(null), mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/catalog.json`, {signal: abort.signal}).then(r => {if (!r.ok) throw new Error(); return r.json();}).then(d => {if (d.schemaVersion !== 1 || !Array.isArray(d.contracts) || !Array.isArray(d.budget) || !Array.isArray(d.sources) || !Array.isArray(d.events) || !Array.isArray(d.sessions)) throw new Error(); setData(d);}).catch(e => {if (e.name !== 'AbortError') setError('No s’han pogut carregar les dades. Torna a carregar la pàgina o comprova que el paquet de dades estigui disponible.');});
    fetch(`${import.meta.env.BASE_URL}data/status.json`, {signal: abort.signal}).then(r => r.ok ? r.json() : null).then(setUpdateStatus).catch(() => {});
    readDossiers().then(setDossiers).catch(e => setStorageError(e.message)).finally(() => setDossiersLoading(false));
    return () => abort.abort();
  }, []);
  useEffect(() => {setQuery(searchQuery); setMenu(false); window.scrollTo(0, 0); requestAnimationFrame(() => mainRef.current?.querySelector<HTMLHeadingElement>('h1')?.focus());}, [route.page, searchQuery]);
  useEffect(() => {const handle = (e: KeyboardEvent) => {if ((e.ctrlKey || e.metaKey) && e.key === 'k') {e.preventDefault(); searchRef.current?.focus();}}; window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle);}, []);
  useEffect(() => {if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer);}, [toast]);
  function go(page: Page, q = '') {location.hash = page + (q ? `?q=${encodeURIComponent(q)}` : '');}
  async function refreshAfterConflict(error: unknown) {
    if (error instanceof DossierConflict) {
      try {setDossiers(await readDossiers());} catch (e) {setStorageError((e as Error).message);}
    }
    throw error;
  }
  async function saveDossier(d: Dossier) {
    try {
      const saved = await writeDossier(d);
      setDossiers(old => [saved, ...old.filter(x => x.id !== d.id)]);
      setToast('Dossier desat en aquest navegador');
    } catch (error) {await refreshAfterConflict(error);}
  }
  async function deleteDossier(d: Dossier) {
    try {
      await removeDossier(d); setDossiers(old => old.filter(x => x.id !== d.id));
      setToast('Dossier eliminat');
    } catch (error) {await refreshAfterConflict(error);}
  }
  const sourceStale = data ? (Date.now() - Date.parse(data.generatedAt)) > 8 * 24 * 3600 * 1000 : false;
  const failedUpdate = updateStatus && ['error', 'failed'].includes(updateStatus.status ?? '');
  return <div className="app-shell"><a className="skip-link" href="#main-content" onClick={e => {e.preventDefault(); mainRef.current?.focus();}}>Salta al contingut</a>
    {menu && <button aria-label="Tanca el menú" className="nav-scrim" onClick={() => setMenu(false)}/>}
    <aside className={`sidebar ${menu ? 'open' : ''}`}><a className="brand" href="#overview" aria-label="Observatori de Castellar, inici"><img src={`${import.meta.env.BASE_URL}favicon.svg`} alt=""/><span>Observatori<small>de Castellar</small></span></a><div className="workspace-tag"><span className="status-dot"/>Castellar del Vallès<ChevronRight size={14}/></div><p className="nav-label">Explora</p><nav aria-label="Navegació principal">{pages.map(p => <a key={p.id} href={`#${p.id}`} aria-current={route.page === p.id ? 'page' : undefined} className={`${route.page === p.id ? 'active' : ''} ${p.id === 'dossiers' ? 'nav-separator' : ''}`}><p.icon size={18}/><span>{p.label}</span>{p.id === 'dossiers' && dossiers.length > 0 && <span className="nav-count">{dossiers.length}</span>}</a>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><ShieldCheck size={18}/><div><strong>Dades amb context</strong><span>Cada registre, amb la seva font.</span></div></div><span className="local-version">MVP · Eina independent</span></div></aside>
    <div className="workspace"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Obre el menú" onClick={() => setMenu(true)}><Menu size={21}/></button><span className="breadcrumb">Espai d’anàlisi<ChevronRight size={13}/><strong>{route.page === 'search' ? 'Cerca' : pages.find(p => p.id === route.page)?.label}</strong></span><form className="global-search" role="search" onSubmit={e => {e.preventDefault(); go('search', query);}}><Search size={17}/><input ref={searchRef} aria-label="Cerca global" placeholder="Cerca un tema o expedient…" value={query} onChange={e => setQuery(e.target.value)}/><kbd>Ctrl K</kbd></form><button className="icon-button updates-button" title="Novetats de les fonts" aria-label="Novetats de les fonts" onClick={() => go('sources')}><Bell size={18}/></button><span className="avatar" title="Espai personal local">OC</span></header>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {(sourceStale || failedUpdate) && <div className="notice warning" role="status"><Activity size={18}/><p>{failedUpdate ? 'La darrera actualització no s’ha completat. Es conserva l’última captura vàlida.' : 'Aquesta captura té més de vuit dies. Consulta la data i la cobertura abans d’interpretar les dades.'} <button className="text-button" onClick={() => go('sources')}>Veure fonts</button></p></div>}
        {route.page === 'dossiers' ? <>{error && <div className="notice warning" role="status"><p>Les dades públiques no estan disponibles. Pots continuar consultant i exportant els dossiers d’aquest navegador.</p></div>}{dossiersLoading ? <p role="status">Carregant els dossiers…</p> : <Dossiers dossiers={dossiers} onSave={saveDossier} onDelete={deleteDossier} storageError={storageError} drafts={noteDrafts.drafts} onDraftChange={noteDrafts.changeDraft} draftError={noteDrafts.error}/>}</> : error ? <Empty title="Dades no disponibles"><p>{error}</p><button className="button primary" onClick={() => location.reload()}>Torna a carregar</button><p><a href="#dossiers">Obre els dossiers locals</a></p></Empty> : !data ? <div className="loading" role="status"><span className="spinner"/><h1>Preparant l’Observatori</h1><p>Carregant les dades municipals i les seves fonts…</p></div> : <>
          {route.params.has('record') && !selection && <div className="notice warning" role="status"><p>Aquest registre no està disponible en la captura actual. Pot haver estat retirat o l’enllaç pot ser incorrecte. <button className="text-button" onClick={() => updateRoute({record: null})}>Tanca l’avís</button></p></div>}
          {route.page === 'overview' && <Overview data={data} dossiers={dossiers} go={go} onSelect={selectRecord}/>}
          {route.page === 'contracts' && <Contracts data={data} onSelect={selectRecord}/>}
          {route.page === 'budget' && <Budget data={data} onSelect={selectRecord}/>}
          {route.page === 'sessions' && <Sessions data={data} onSelect={selectRecord}/>}
          {route.page === 'motions' && <Motions data={data} onSelect={selectRecord}/>}
          {route.page === 'sources' && <Sources data={data}/>}
          {route.page === 'search' && <SearchResults data={data} query={route.q} onSelect={selectRecord}/>}
          <footer className="main-footer"><span>Observatori de Castellar · No és un portal oficial de l’Ajuntament</span><button onClick={() => go('sources')}>Captura {date(data.generatedAt)}<ArrowUpRight size={13}/></button></footer>
        </>}
      </main>
    </div>{selection && data && <Modal title={selection.kind === 'contract' ? 'Fitxa d’expedient' : selection.kind === 'session' ? 'Fitxa de sessió' : 'Detall pressupostari'} wide onClose={() => updateRoute({record: null})}><div className="detail-share"><ShareLink/></div><Detail selection={selection} data={data} onSelect={selectRecord} onSave={() => setSaving(evidenceFor(selection))}/></Modal>}{saving && <SaveEvidence evidence={saving} dossiers={dossiers} onSave={saveDossier} onClose={() => setSaving(null)}/>}{toast && <div className="toast" role="status"><Check size={17}/>{toast}<button aria-label="Tanca l’avís" onClick={() => setToast('')}><X size={14}/></button></div>}
  </div>;
}

function Overview({data, dossiers, go, onSelect}: {data: Catalog; dossiers: Dossier[]; go: (p: Page, q?: string) => void; onSelect: (s: Selection) => void}) {
  const contracts = data.contracts.filter(c => c.source === 'PSCP');
  const referenceDate = today();
  const futureCount = contracts.filter(c => isFutureDate(c.date, referenceDate)).length;
  const recent = contracts.filter(c => !isFutureDate(c.date, referenceDate)).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 5);
  const latestClosed = Math.max(...data.budget.filter(b => b.executedCents !== null).map(b => b.year));
  const budget = data.budget.filter(b => b.side === 'despeses' && b.year === latestClosed);
  const final = budgetTotal(budget, 'finalCents'), executed = budgetTotal(budget, 'executedCents');
  const recentSessions = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const chapters = [...budget].sort((a, b) => (b.finalCents ?? 0) - (a.finalCents ?? 0)).slice(0, 4);
  const max = Math.max(1, ...chapters.map(c => c.finalCents ?? 0));
  return <><PageTitle eyebrow={`Observatori municipal · ${PERIOD_LABEL}`} title="La informació pública, connectada." actions={<span className="capture-label"><span className="status-dot"/>Captura {date(data.generatedAt)}</span>}>Explora què es contracta, com s’executa el pressupost i què es porta al ple.</PageTitle>
    <section className="start-strip"><div className="orbit-mark"><Activity size={26}/></div><div><strong>Segueix el fil d’un expedient</strong><span>Contracte → sessions relacionades → fonts → dossier personal</span></div><button onClick={() => go('search', 'CONT2400054')}>Explora un cas real<ArrowRight size={16}/></button></section>
    <div className="stats-grid"><Stat label="Expedients a la PSCP" value={number(new Set(contracts.map(c => c.expedient).filter(Boolean)).size)} detail={`${number(contracts.length)} observacions i lots · ${PERIOD_LABEL}`}/><Stat label={`Despesa liquidada · ${Number.isFinite(latestClosed) ? latestClosed : '—'}`} value={compactMoney(executed)} detail={`${pct(ratio(executed, final))} del crèdit definitiu`} accent/><Stat label="Sessions al catàleg" value={number(data.sessions.length)} detail="Cobertura i exclusions a Fonts i qualitat"/><Stat label="Dossiers personals" value={number(dossiers.length)} detail="Desats només en aquest navegador"/></div>
    <div className="overview-grid"><section className="panel"><div className="panel-heading"><div><h2>On va el pressupost?</h2><p>Principals capítols de despesa · {Number.isFinite(latestClosed) ? latestClosed : 'sense liquidació'}</p></div><button className="icon-button" aria-label="Obre pressupost" onClick={() => go('budget')}><ArrowUpRight size={18}/></button></div><div className="overview-budget">{chapters.map(c => <button className="overview-budget-row" key={c.id} onClick={() => onSelect({kind: 'budget', item: c})}><span><strong>{c.chapterName}</strong><span>{compactMoney(c.executedCents)}</span></span><span className="overview-bar"><span className="track" style={{width: `${(c.finalCents ?? 0) / max * 100}%`}}/><span className="fill" style={{width: `${Math.min(100, (c.executedCents ?? 0) / max * 100)}%`}}/></span></button>)}</div><div className="panel-bottom"><div className="legend"><span><i className="final"/>Crèdit definitiu</span><span><i className="executed"/>Obligacions reconegudes</span></div><button className="text-button" onClick={() => go('budget')}>Veure detall<ArrowRight size={14}/></button></div></section>
    <section className="panel"><div className="panel-heading"><div><h2>Sessions recents</h2><p>Ordres del dia i documents originals</p></div><CalendarDays size={19} className="muted"/></div><div className="recent-sessions">{recentSessions.map(s => <button key={s.id} onClick={() => onSelect({kind: 'session', item: s})}><span className="date-tile"><strong>{s.date.slice(8, 10)}</strong><small>{new Intl.DateTimeFormat('ca-ES', {month: 'short'}).format(new Date(s.date))}</small></span><span><Badge>{s.body}</Badge><strong>{s.title}</strong><small>{s.agenda.length ? `${s.agenda.length} punts indexats` : 'Consulta el document original'}</small></span><ChevronRight size={16}/></button>)}</div><div className="panel-bottom"><button className="text-button" onClick={() => go('sessions')}>Totes les sessions<ArrowRight size={14}/></button></div></section></div>
    <Investments data={data} onSelect={onSelect} compact onOpen={() => go('budget')}/>
    <PendingMotions data={data} onOpen={() => go('motions')}/>
    <section className="panel recent-contracts"><div className="panel-heading"><div><h2>Contractació publicada</h2><p>Registres PSCP ordenats per la data que informa la font</p></div><button className="text-button" onClick={() => go('contracts')}>Explora la contractació<ArrowRight size={14}/></button></div><ContractTable rows={recent} onSelect={onSelect} compact/>{futureCount > 0 && <p className="future-summary">{futureCount} registre amb data futura pendent de contrast, separat de la llista recent. <a href="#contracts?dates=future">Consulta’l</a></p>}</section>
    <div className="method-strip"><ShieldCheck size={20}/><p><strong>Una dada és un punt de partida.</strong> Els imports, les dates i les relacions conserven la font. Les mancances de cobertura s’expliquen abans d’extreure conclusions.</p><button className="text-button" onClick={() => go('sources')}>Fonts i criteris<ArrowRight size={14}/></button></div></>;
}

function SearchResults({data, query, onSelect}: {data: Catalog; query: string; onSelect: (s: Selection) => void}) {
  const {params} = useRoute();
  const filter = ['contract', 'session'].includes(params.get('type') ?? '') ? params.get('type')! : 'all';
  const setFilter = (value: string) => updateRoute({type: value === 'all' ? null : value});
  const index = useMemo(() => makeSearch(data), [data]);
  const exact = useMemo(() => exactResults(data, query), [data, query]);
  const isCode = looksLikeExpedient(query) || exact.length > 0;
  const approximate = isCode && params.get('approx') === '1';
  const result = useMemo(() => isCode && !approximate ? exact : query.trim() ? index.search(query) : [], [isCode, approximate, exact, index, query]);
  const contracts = useMemo(() => new Map(data.contracts.map(c => [c.id, c])), [data]);
  const sessions = useMemo(() => new Map(data.sessions.map(s => [s.id, s])), [data]);
  const [limit, setLimit] = useState(30);
  useEffect(() => {setLimit(30);}, [query, filter, approximate]);
  const shown = result.filter(r => filter === 'all' || r.kind === filter);
  return <><PageTitle eyebrow="Cerca transversal" title={query ? `Resultats per «${query}»` : 'Què vols investigar?'} actions={<ShareLink/>}>{query ? `${number(result.length)} ${isCode && !approximate ? 'coincidències exactes del codi' : approximate ? 'resultats aproximats (poden ser altres expedients)' : 'coincidències'} en contractació i ordres del dia indexats.` : 'Escriu un expedient o un tema al cercador superior.'}</PageTitle>{isCode && <div className="notice search-mode"><p>{approximate ? 'Estàs veient també codis semblants. No impliquen cap relació amb l’expedient.' : 'Només registres i sessions amb aquest codi exacte. Les fonts i els lots es mantenen separats.'}</p><button className="button secondary" onClick={() => updateRoute({approx: approximate ? null : '1'})}>{approximate ? 'Mostra només el codi exacte' : 'Mostra resultats aproximats'}</button></div>}<div className="segmented search-tabs">{[['all', 'Tot'], ['contract', 'Contractació'], ['session', 'Sessions']].map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label} <span>{id === 'all' ? result.length : result.filter(r => r.kind === id).length}</span></button>)}</div><section className="panel search-results">{shown.slice(0, limit).map(r => {const item = r.kind === 'contract' ? contracts.get(r.itemId) : sessions.get(r.itemId); if (!item) return null; return <button key={r.id} className="search-result" onClick={() => onSelect(r.kind === 'contract' ? {kind: 'contract', item: contracts.get(r.itemId)!} : {kind: 'session', item: sessions.get(r.itemId)!})}><span className="result-icon">{r.kind === 'contract' ? <FileText size={21}/> : <CalendarDays size={21}/>}</span><span><span className="row-meta"><Badge tone={r.kind === 'contract' ? 'blue' : 'green'}>{r.kind === 'contract' ? 'Contractació' : 'Sessió'}</Badge>{'source' in item && <code>{item.source} · {item.expedient}{item.lot ? ` · lot ${item.lot}` : ''}</code>}<span>{date(item.date)}</span></span><strong>{item.title}</strong>{'agenda' in item && <small>{item.agenda.length} punts indexats · ordre del dia</small>}</span><ArrowRight size={18}/></button>;})}{!shown.length && <Empty title={query ? 'No s’han trobat coincidències' : 'Cerca entre les fonts'}>Prova un codi com CONT2400054 o una paraula com piscina.</Empty>}{shown.length > limit && <button className="load-more" onClick={() => setLimit(n => n + 30)}>Mostra més resultats ({shown.length - limit} pendents)</button>}</section></>;
}

function Sources({data}: {data: Catalog}) {
  return <><PageTitle eyebrow="Traçabilitat i mètode" title="Fonts i qualitat">Quines dades pots consultar, d’on provenen i quins límits tenen.</PageTitle><div className="notice"><ShieldCheck size={20}/><p><strong>Consulta sobre una captura.</strong> Les dades no s’actualitzen en directe. Darrera publicació del conjunt: {date(data.generatedAt)}. Els dossiers i les notes personals no s’envien a cap servidor.</p></div><div className="sources-grid">{data.sources.map(s => <article className="panel source-card" key={s.id}><div className="source-card-top"><Database size={20}/><Badge tone={s.status === 'ok' ? 'green' : s.status === 'error' ? 'red' : 'amber'}>{s.status === 'ok' ? 'Captura correcta' : s.status === 'error' ? 'Error de captura' : 'Cobertura parcial'}</Badge></div><h2>{s.name}</h2><p>{s.coverage}</p><dl><div><dt>Registres</dt><dd>{number(s.records)}</dd></div><div><dt>Captura</dt><dd>{date(s.capturedAt)}</dd></div></dl><p className="source-note">{s.note}</p><Original url={s.url}/></article>)}</div><section className="panel methodology"><h2>Com llegir les dades</h2><div><article><Badge tone="blue">Dada publicada</Badge><p>Valors i textos de la font, amb registre i data de captura. «No informat» indica una absència, no un zero.</p></article><article><Badge tone="green">Càlcul</Badge><p>Operacions explícites sobre magnituds comparables. No se sumen PSCP i RPC ni nivells diferents del pressupost.</p></article><article><Badge tone="amber">Nota o hipòtesi</Badge><p>Interpretació personal dins d’un dossier. El seu estat de revisió no substitueix la comprovació documental.</p></article></div></section><Changes data={data}/><div className="method-strip"><BookOpen size={20}/><p>Les sessions sense revisió de privacitat s’enllacen sense indexar-ne tot el text. L’Observatori no identifica irregularitats automàticament.</p></div></>;
}
