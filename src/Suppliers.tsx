import {useMemo, useState} from 'react';
import {Scale, Search} from 'lucide-react';
import type {Catalog, Contract, Selection, SupplierYear} from './types';
import {compactMoney, csv, date, download, money, normalize, number, pct} from './lib';
import {INVOICE_THRESHOLD, PUBLIC_BODY, contractsBySupplier, defaultYear, history, isFlagged, matchesFor} from './supplierData';
import {Badge, DownloadButton, Empty, Original, PageTitle, Pagination, ShareLink} from './ui';
import {ContractTable, Stat} from './Explorer';
import {updateRoute, useRoute} from './routes';
import {PERIOD_LABEL} from './period';

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

function SupplierItem({row, all, matches, onSelect}: {row: SupplierYear; all: SupplierYear[]; matches: Contract[]; onSelect: (s: Selection) => void}) {
  const [open, setOpen] = useState(false);
  return <details className="pattern-group supplier-item" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary><span className="pattern-name">{row.name}<small>{row.invoices === 1 ? '1 factura' : `${number(row.invoices)} factures`}{row.firstDate && ` · ${row.firstDate === row.lastDate ? date(row.firstDate) : `del ${date(row.firstDate)} al ${date(row.lastDate)}`}`}</small></span>
      <span className="row-meta"><Badge>{row.category}</Badge>{matches.length ? <Badge tone="green">{matches.length === 1 ? '1 contracte trobat' : `${matches.length} contractes trobats`}</Badge> : <Badge tone="amber">No s’ha trobat contracte amb aquest nom</Badge>}</span>
      <strong className="mono">{money(row.invoicedCents)}<small>factura més alta {money(row.maxInvoiceCents)}</small></strong></summary>
    {open && <div className="supplier-detail">
      <div className="table-scroll"><table className="year-summary"><caption className="sr-only">Facturació per exercici de {row.name}</caption><thead><tr><th>Exercici</th><th className="numeric">Factures</th><th className="numeric">Import</th></tr></thead><tbody>{history(all, row.name!).map(h => <tr key={h.id} className={h.year === row.year ? 'current' : ''}><td>{h.year}</td><td className="numeric">{number(h.invoices)}</td><td className="numeric">{money(h.invoicedCents)}</td></tr>)}</tbody></table></div>
      {matches.length ? <><p className="small muted">Contractes del catàleg amb el mateix nom (qualsevol exercici i font). La coincidència és només per nom: comprova que es tracti de la mateixa empresa.</p><ContractTable rows={matches} onSelect={onSelect} compact/></> : <p className="small muted">No hi ha cap contracte al catàleg amb aquest nom. Pot ser que figuri amb un altre nom, que l’adjudicatari no sigui visible a la font, que vingui d’una central de compres o d’un exercici anterior al catàleg, o que la despesa no requereixi contracte. Cal comprovar-ho a l’expedient.</p>}
      <Original url={row.url}>Factures de {row.year} a la font</Original>
    </div>}
  </details>;
}

function SupplierList({rows, all, map, onSelect, page, setPage}: {rows: SupplierYear[]; all: SupplierYear[]; map: Map<string, Contract[]>; onSelect: (s: Selection) => void; page?: number; setPage?: (p: number) => void}) {
  const shown = page ? rows.slice((page - 1) * 20, page * 20) : rows;
  return <><div className="pattern-groups">{shown.map(r => <SupplierItem key={r.id} row={r} all={all} matches={matchesFor(map, r)} onSelect={onSelect}/>)}</div>{page && setPage && <Pagination page={page} total={rows.length} setPage={setPage}/>}</>;
}

export function Suppliers({data, onSelect}: {data: Catalog; onSelect: (s: Selection) => void}) {
  const {params} = useRoute();
  const all = useMemo(() => data.suppliers ?? [], [data]);
  const map = useMemo(() => contractsBySupplier(data.contracts), [data]);
  const years = useMemo(() => [...new Set(all.map(r => r.year))].sort((a, b) => b - a), [all]);
  const year = years.some(y => String(y) === params.get('year')) ? Number(params.get('year')) : defaultYear(years);
  const name = params.get('name') ?? '';
  const own = useMemo(() => all.filter(r => r.year === year), [all, year]);
  const named = useMemo(() => own.filter(r => r.name).sort((a, b) => b.invoicedCents - a.invoicedCents), [own]);
  const others = own.find(r => !r.name);
  const flagged = named.filter(r => isFlagged(r, matchesFor(map, r)));
  const above = named.filter(r => r.invoicedCents >= INVOICE_THRESHOLD);
  const publicAbove = above.filter(r => r.category === PUBLIC_BODY).length;
  const total = own.reduce((s, r) => s + r.invoicedCents, 0), namedTotal = named.reduce((s, r) => s + r.invoicedCents, 0);
  const invoices = own.reduce((s, r) => s + r.invoices, 0);
  const listed = name ? named.filter(r => normalize(r.name!).includes(normalize(name))) : named;
  const page = Math.max(1, Math.min(Math.ceil(listed.length / 20) || 1, Math.floor(Number(params.get('p'))) || 1));
  const partial = year === new Date().getFullYear();
  function exportYear() {
    download(`proveidors-${year}.csv`, csv([
      ['Exercici', 'Emissor', 'Tipus d’emissor', 'Emissors agrupats', 'Factures', 'Import EUR (amb IVA)', 'Factura més alta EUR', 'Primera factura', 'Darrera factura', 'Contractes trobats amb el mateix nom', 'Patró a revisar', 'URL', 'Registre'],
      ...[...named, ...(others ? [others] : [])].map(r => {const found = matchesFor(map, r); return [r.year, r.name ?? 'Emissors sense nom publicat', r.category, r.emitters, r.invoices, euros(r.invoicedCents), euros(r.maxInvoiceCents), r.firstDate, r.lastDate, r.name ? found.length : null, isFlagged(r, found) ? 'Per sobre del llindar sense contracte trobat' : null, r.url, r.id];}),
    ]), 'text/csv;charset=utf-8');
  }
  const title = <PageTitle eyebrow={`Factures registrades${year ? ` · ${year}` : ''}`} title="Proveïdors i facturació" actions={<ShareLink/>}>Quant factura cada empresa o entitat a l’Ajuntament i si se’n troba el contracte.</PageTitle>;
  if (!all.length) return <>{title}<Empty title="Aquesta captura encara no inclou les factures">Les factures s’afegiran a la propera actualització de les dades.</Empty></>;
  return <>{title}
    <div className="notice"><Scale size={19}/><p><strong>Patrons a revisar, no irregularitats.</strong> Una facturació alta sense contracte trobat pot tenir una explicació vàlida (un altre nom, una central de compres, un contracte anterior o una despesa que no en requereix). Registrar una factura no acredita que s’hagi pagat.</p></div>
    {partial && <div className="notice warning" role="status"><p>L’exercici {year} encara és obert: només inclou les factures registrades fins ara.</p></div>}
    <div className="view-controls"><label className="inline-label">Exercici <select aria-label="Exercici de les factures" value={year} onChange={e => updateRoute({year: e.target.value, p: null})}>{years.map(y => <option key={y}>{y}</option>)}</select></label><DownloadButton onClick={exportYear}>Exporta l’exercici</DownloadButton></div>
    <div className="stats-grid three"><Stat label={`Facturació registrada · ${year}`} value={compactMoney(total)} detail={`${number(invoices)} factures · IVA inclòs`}/><Stat label="Emissors amb nom publicat" value={number(named.length)} detail={`${pct(total ? namedTotal / total * 100 : null)} de l’import · ${number(others?.emitters ?? 0)} sense nom publicat`}/><Stat label={`Per sobre de ${money(INVOICE_THRESHOLD)} sense contracte trobat`} value={number(flagged.length)} detail={`de ${number(above.length)} emissors per sobre del llindar`} accent/></div>
    <section className="panel" aria-labelledby="flagged-title"><div className="panel-heading"><div><h2 id="flagged-title">Per sobre del llindar sense contracte trobat amb aquest nom</h2><p>Facturació anual igual o superior a {money(INVOICE_THRESHOLD)} (15.000 € més un 21 % d’IVA) i cap contracte del catàleg amb el mateix nom</p></div></div>
      {flagged.length ? <SupplierList rows={flagged} all={all} map={map} onSelect={onSelect}/> : <Empty title="Cap emissor compleix el criteri en aquest exercici"/>}
      {publicAbove > 0 && <p className="small muted pattern-subtitle">{number(publicAbove)} administracions o ens públics superen el llindar i no s’hi inclouen: els encàrrecs i convenis entre administracions no passen per la contractació.</p>}
    </section>
    <section className="panel" aria-labelledby="all-title"><div className="panel-heading"><div><h2 id="all-title">Tots els emissors amb nom publicat</h2><p>Ordenats per import facturat en l’exercici</p></div></div>
      <div className="filters"><div className="input-with-icon grow"><Search size={16}/><input aria-label="Cerca un proveïdor" placeholder="Cerca un proveïdor pel nom…" value={name} onChange={e => updateRoute({name: e.target.value, p: null})}/></div></div>
      {listed.length ? <SupplierList rows={listed} all={all} map={map} onSelect={onSelect} page={page} setPage={p => updateRoute({p: String(p)})}/> : <Empty title="Cap proveïdor amb aquest nom en aquest exercici"/>}
      {others && <p className="small muted pattern-subtitle">A més, {number(others.emitters)} emissors sense nom publicat (persones físiques, societats civils i comunitats de béns) sumen {money(others.invoicedCents)} en {number(others.invoices)} factures. <Original url={others.url}>Conjunt de dades</Original></p>}
    </section>
    <div className="calculation-note"><Badge tone="blue">Criteri de càlcul</Badge><p>Registre municipal de factures, agregat per emissor i exercici tal com el publica l’Ajuntament; els totals es contrasten amb la relació anual de proveïdors (vegeu Fonts i qualitat). Els imports inclouen l’IVA, per això el llindar de 15.000 € del contracte menor de serveis i subministraments (LCSP art. 118) es compara amb {money(INVOICE_THRESHOLD)}; per a obres el llindar és més alt. La relació amb els contractes és només per nom normalitzat (sense accents, puntuació ni forma societària), en qualsevol exercici ({PERIOD_LABEL}) i font del catàleg: un contracte anterior no hi consta. Els contractes amb adjudicatari no visible no es poden relacionar. Les administracions i ens públics no es marquen. El tipus d’emissor es dedueix de la lletra del NIF, que no es publica.</p></div>
  </>;
}
