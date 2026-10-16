import {useMemo, useState} from 'react';
import {Scale, Search} from 'lucide-react';
import type {Agreement, Catalog, Grant} from './types';
import {csv, date, download, money, normalize, number, pct, today} from './lib';
import {companyKey, defaultYear} from './supplierData';
import {elapsed, entitiesFor, entityHistory, grantsByAgreement, callsFor, invoicesByEntity, isOpen, isOverdue, isUpcoming, issuesFor, needsReview} from './grantData';
import type {Call, Entity} from './grantData';
import {Badge, DownloadButton, Empty, Original, PageTitle, Pagination, SaveToDossier, ShareLink} from './ui';
import {agreementEvidence, grantEvidence} from './evidence';
import {Stat} from './Explorer';
import {updateRoute, useRoute} from './routes';
import {PERIOD_LABEL} from './period';
import {entityHref} from './entityData';

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const plural = (n: number, one: string, many: string) => `${number(n)} ${n === 1 ? one : many}`;
const VISIBLE = 10;

function AgreementLink({code}: {code: string}) {
  return <button className="text-button" onClick={() => updateRoute({view: 'convenis', conveni: code, estat: null, p: null})}>Conveni {code}</button>;
}

function EntityItem({entity, all, invoices, total}: {entity: Entity; all: Grant[]; invoices: Map<string, number>; total: number}) {
  const [open, setOpen] = useState(false);
  const year = entity.grants[0].year, invoiced = invoices.get(`${entity.key}|${year}`);
  return <details className="pattern-group supplier-item grant-item" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary><span className="pattern-name">{entity.name}<small>{plural(entity.grants.length, 'concessió', 'concessions')} · darrera el {date(entity.grants[0].date)}</small></span>
      <span className="row-meta"><Badge>{entity.category}</Badge>{entity.withoutCallCents > 0 && <Badge tone="amber">{entity.withoutCallCents === entity.amountCents ? 'Sense convocatòria' : `${money(entity.withoutCallCents)} sense convocatòria`}</Badge>}{invoiced !== undefined && <Badge tone="blue">També factura {money(invoiced)}</Badge>}</span>
      <strong className="mono">{money(entity.amountCents)}<small>{pct(total ? entity.amountCents / total * 100 : null)} de l’exercici</small></strong></summary>
    {open && <div className="supplier-detail">
      <div className="table-scroll"><table className="year-summary"><caption className="sr-only">Subvencions per exercici de {entity.name}</caption><thead><tr><th>Exercici</th><th className="numeric">Concessions</th><th className="numeric">Import</th><th className="numeric">Factures registrades</th></tr></thead><tbody>{entityHistory(all, entity.key).map(h => {const billed = invoices.get(`${entity.key}|${h.year}`); return <tr key={h.year} className={h.year === year ? 'current' : ''}><td>{h.year}</td><td className="numeric">{number(h.grants)}</td><td className="numeric">{money(h.amountCents)}</td><td className="numeric">{billed === undefined ? '—' : money(billed)}</td></tr>;})}</tbody></table></div>
      <div className="table-scroll"><table className="grant-table"><caption className="sr-only">Concessions de {year} a {entity.name}</caption><thead><tr><th>Data</th><th>Acord</th><th className="numeric">Import</th></tr></thead><tbody>{entity.grants.map(g => <tr key={g.id}><td className="nowrap">{date(g.date)}</td><td><span className="grant-call">{g.call}</span><span className="row-meta"><Badge tone={g.procedure === 'convocatòria' ? '' : 'amber'}>{g.procedure === 'convocatòria' ? 'Amb convocatòria' : 'Sense convocatòria'}</Badge>{g.agreement && <AgreementLink code={g.agreement}/>}<Original url={g.url}>Concessions del dia a la font</Original></span></td><td className="numeric">{money(g.amountCents)}{g.repeated > 0 && <small>la font la repeteix</small>}</td></tr>)}</tbody></table></div>
      {invoiced !== undefined && <p className="small muted">Hi ha factures registrades a nom d’un emissor amb el mateix nom el {year}. Pot ser una activitat diferent de la subvencionada; convé comprovar que no es financi dues vegades la mateixa despesa.</p>}
      <div className="request-actions"><a className="text-button" href={entityHref(entity.name)}>Fitxa de l’entitat</a><SaveToDossier name={`${entity.name}, subvencions ${year}`} evidence={() => grantEvidence(entity)}/></div>
    </div>}
  </details>;
}

function CallTable({calls}: {calls: Call[]}) {
  const [all, setAll] = useState(false);
  const shown = all ? calls : calls.slice(0, VISIBLE);
  return <><div className="table-scroll"><table className="grant-table"><thead><tr><th>Acord o convocatòria</th><th>Data</th><th className="numeric">Beneficiaris</th><th className="numeric">Import</th></tr></thead><tbody>{shown.map(c => <tr key={c.call}><td><span className="grant-call">{c.call}</span><span className="row-meta"><Badge tone={c.procedure === 'convocatòria' ? '' : 'amber'}>{c.procedure === 'convocatòria' ? 'Amb convocatòria' : 'Sense convocatòria'}</Badge></span></td><td className="nowrap">{c.first === c.last ? date(c.first) : `${date(c.first)} – ${date(c.last)}`}</td><td className="numeric">{number(c.beneficiaries)}</td><td className="numeric"><strong>{money(c.amountCents)}</strong></td></tr>)}</tbody></table></div>
    {calls.length > VISIBLE && <div className="panel-bottom"><span className="small muted">{all ? calls.length : VISIBLE} de {calls.length} acords</span><button className="text-button" onClick={() => setAll(!all)}>{all ? 'Mostra’n menys' : `Mostra’ls tots (${calls.length})`}</button></div>}</>;
}

function GrantsView({data}: {data: Catalog}) {
  const {params} = useRoute();
  const all = useMemo(() => data.grants ?? [], [data]);
  const invoices = useMemo(() => invoicesByEntity(data.suppliers ?? []), [data]);
  const years = useMemo(() => [...new Set(all.map(g => g.year))].sort((a, b) => b - a), [all]);
  const year = years.some(y => String(y) === params.get('year')) ? Number(params.get('year')) : defaultYear(years);
  const entities = useMemo(() => entitiesFor(all, year), [all, year]);
  const calls = useMemo(() => callsFor(all, year), [all, year]);
  const own = all.filter(g => g.year === year);
  const total = own.reduce((s, g) => s + g.amountCents, 0), count = own.reduce((s, g) => s + g.grants, 0);
  const withoutCall = own.filter(g => g.procedure === 'sense convocatòria');
  const withoutCallCents = withoutCall.reduce((s, g) => s + g.amountCents, 0);
  const unnamed = own.filter(g => !g.beneficiary), unnamedCents = unnamed.reduce((s, g) => s + g.amountCents, 0);
  const billing = entities.filter(e => invoices.has(`${e.key}|${year}`));
  const top = entities.slice(0, 10).reduce((s, e) => s + e.amountCents, 0);
  const repeated = own.reduce((s, g) => s + g.repeated, 0);
  const name = params.get('name') ?? '';
  const listed = name ? entities.filter(e => normalize(e.name).includes(normalize(name))) : entities;
  const page = Math.max(1, Math.min(Math.ceil(listed.length / 20) || 1, Math.floor(Number(params.get('p'))) || 1));
  const partial = year === new Date().getFullYear();
  function exportYear() {
    download(`subvencions-${year}.csv`, csv([
      ['Exercici', 'Data de concessió', 'Beneficiari', 'Tipus de beneficiari', 'Concessions', 'Import EUR', 'Procediment (deduït del títol)', 'Acord', 'Conveni citat', 'Files idèntiques a la font', 'Factures del mateix nom a l’exercici EUR', 'URL', 'Registre'],
      ...[...own].sort((a, b) => a.date.localeCompare(b.date)).map(g => {const billed = g.beneficiary ? invoices.get(`${companyKey(g.beneficiary)}|${year}`) : undefined; return [g.year, g.date, g.beneficiary ?? 'Concessions sense nom publicat', g.category, g.grants, euros(g.amountCents), g.procedure, g.call, g.agreement, g.repeated, billed === undefined ? null : euros(billed), g.url, g.id];}),
    ]), 'text/csv;charset=utf-8');
  }
  if (!all.length) return <Empty title="Aquesta captura encara no inclou les subvencions">Les concessions s’afegiran a la propera actualització de les dades.</Empty>;
  return <>
    <div className="notice"><Scale size={19}/><p><strong>Patrons a revisar, no irregularitats.</strong> Les subvencions nominatives, directes o amb conveni són legals si el pressupost o la llei les preveuen. Que una entitat també factura a l’Ajuntament tampoc no és irregular, però convé comprovar que no es pagui dues vegades la mateixa activitat.</p></div>
    {partial && <div className="notice warning" role="status"><p>L’exercici {year} encara és obert: només inclou les concessions publicades fins ara.</p></div>}
    <div className="view-controls"><label className="inline-label">Exercici <select aria-label="Exercici de les subvencions" value={year} onChange={e => updateRoute({year: e.target.value, p: null})}>{years.map(y => <option key={y}>{y}</option>)}</select></label><DownloadButton onClick={exportYear}>Exporta l’exercici</DownloadButton></div>
    <div className="stats-grid three"><Stat label={`Subvencions atorgades · ${year}`} value={money(total)} detail={`${plural(count, 'concessió', 'concessions')} · ${plural(entities.length, 'entitat amb nom', 'entitats amb nom')} · les 10 primeres reben el ${pct(total ? top / total * 100 : null)}`}/><Stat label="Sense convocatòria al títol de l’acord" value={pct(total ? withoutCallCents / total * 100 : null)} detail={`${money(withoutCallCents)} · nominatives, directes, excepcionals o amb conveni`} accent/><Stat label="Entitats que també facturen" value={number(billing.length)} detail={`Factures registrades el ${year} a nom d’un emissor amb el mateix nom`}/></div>
    <section className="panel" aria-labelledby="entities-title"><div className="panel-heading"><div><h2 id="entities-title">Entitats beneficiàries</h2><p>Ordenades per import atorgat en l’exercici</p></div></div>
      <div className="filters"><div className="input-with-icon grow"><Search size={16}/><input aria-label="Cerca una entitat" placeholder="Cerca una entitat pel nom…" value={name} onChange={e => updateRoute({name: e.target.value, p: null})}/></div></div>
      {listed.length ? <><div className="pattern-groups">{listed.slice((page - 1) * 20, page * 20).map(e => <EntityItem key={e.key} entity={e} all={all} invoices={invoices} total={total}/>)}</div><Pagination page={page} total={listed.length} setPage={p => updateRoute({p: String(p)})}/></> : <Empty title="Cap entitat amb aquest nom en aquest exercici"/>}
      {unnamed.length > 0 && <p className="small muted pattern-subtitle">A més, {plural(unnamed.reduce((s, g) => s + g.grants, 0), 'concessió', 'concessions')} a persones físiques, societats civils o comunitats de béns sumen {money(unnamedCents)}; no se’n publica el nom. <Original url={unnamed[0].url}>Conjunt de dades</Original></p>}
    </section>
    <section className="panel" aria-labelledby="calls-title"><div className="panel-heading"><div><h2 id="calls-title">Per acord o convocatòria</h2><p>Import i beneficiaris de cada acord de concessió de {year}</p></div></div>
      <CallTable calls={calls}/>
    </section>
    <div className="calculation-note"><Badge tone="blue">Criteri de càlcul</Badge><p>Concessions de l’Ajuntament replicades per l’AOC des de la Base de Dades Nacional de Subvencions, per data de concessió ({PERIOD_LABEL}; la font comença el maig del 2022). {repeated > 0 ? `${plural(repeated, 'fila idèntica', 'files idèntiques')} d’aquest exercici (mateixa data, acord, beneficiari i import) es compten una sola vegada. ` : ''}«Sense convocatòria» vol dir que el títol de l’acord no esmenta cap convocatòria: sol tractar-se de subvencions nominatives, directes, excepcionals o instrumentades amb conveni (Llei 38/2003, art. 22.2), però cal comprovar-ho a l’expedient. Les entitats s’agrupen pel nom normalitzat, com els proveïdors; la relació amb les factures també és només per nom. El tipus de beneficiari es dedueix de la lletra del NIF, que no es publica. Atorgar una subvenció no acredita que s’hagi pagat ni justificat.</p></div>
  </>;
}

export function AgreementTable({rows, grants, reference}: {rows: Agreement[]; grants: Map<string, Grant[]>; reference: string}) {
  return <div className="table-scroll"><table className="contract-table agreement-table"><thead><tr><th>Conveni</th><th>Vigència declarada</th><th>Estat</th><th><span className="sr-only">Font</span></th></tr></thead><tbody>{rows.map(a => {
    const linked = grants.get(a.code) ?? [], issues = issuesFor(a, reference);
    return <tr key={a.id}><td><div className="row-meta"><span className="mono">{a.code}</span>{issues.map(i => <Badge key={i} tone={i === 'Venç en 12 mesos' ? 'blue' : 'amber'}>{i}</Badge>)}</div><span className="agreement-title">{a.title}</span>{a.description && <small className="muted agreement-description">{a.description}</small>}{linked.length > 0 && <small className="muted">{plural(linked.length, 'subvenció citada', 'subvencions citades')} amb aquest codi · {money(linked.reduce((s, g) => s + g.amountCents, 0))}</small>}</td>
      <td className="nowrap"><strong>{a.start ? date(a.start) : 'Inici no informat'}</strong><small className="muted">{a.end ? `fins al ${date(a.end)}` : a.endIssue === 'sentinella' ? 'Data de fi sentinella (1900)' : 'Sense data de fi'}</small>{isOverdue(a, reference) && <small className="muted">venç fa {elapsed(a.end!, reference)}</small>}</td>
      <td><Badge tone={isOpen(a) ? 'green' : ''}>{a.status}</Badge><small className="muted">{a.extendable === null ? 'Pròrroga no informada' : a.extendable ? 'Prorrogable' : 'No prorrogable'}</small></td>
      <td><Original url={a.url}>Font</Original><SaveToDossier name={`conveni ${a.code}`} evidence={() => agreementEvidence(a)}/></td></tr>;
  })}</tbody></table></div>;
}

function Collapsible({rows, grants, reference, label}: {rows: Agreement[]; grants: Map<string, Grant[]>; reference: string; label: string}) {
  const [all, setAll] = useState(false);
  if (!rows.length) return <Empty title="Cap conveni compleix el criteri"/>;
  return <><AgreementTable rows={all ? rows : rows.slice(0, VISIBLE)} grants={grants} reference={reference}/>
    {rows.length > VISIBLE && <div className="panel-bottom"><span className="small muted">{all ? rows.length : VISIBLE} de {rows.length} {label}</span><button className="text-button" onClick={() => setAll(!all)}>{all ? 'Mostra’n menys' : `Mostra’ls tots (${rows.length})`}</button></div>}</>;
}

function AgreementsView({data}: {data: Catalog}) {
  const {params} = useRoute();
  const all = useMemo(() => data.agreements ?? [], [data]);
  const grants = useMemo(() => grantsByAgreement(data.grants ?? []), [data]);
  const reference = today();
  const overdue = useMemo(() => all.filter(a => isOverdue(a, reference)).sort((a, b) => b.end!.localeCompare(a.end!)), [all, reference]);
  const upcoming = useMemo(() => all.filter(a => isUpcoming(a, reference)).sort((a, b) => a.end!.localeCompare(b.end!)), [all, reference]);
  const review = useMemo(() => all.filter(needsReview), [all]);
  const open = all.filter(isOpen).length, notExtendable = overdue.filter(a => a.extendable === false).length;
  const statuses = useMemo(() => [...new Set(all.map(a => a.status))].sort(), [all]);
  const status = statuses.includes(params.get('estat') ?? '') ? params.get('estat')! : '';
  const query = params.get('conveni') ?? '';
  const listed = all.filter(a => (!status || a.status === status) && (!query.trim() || normalize(`${a.code} ${a.title} ${a.description ?? ''}`).includes(normalize(query)))).sort((a, b) => b.code.localeCompare(a.code));
  const page = Math.max(1, Math.min(Math.ceil(listed.length / 20) || 1, Math.floor(Number(params.get('p'))) || 1));
  // Una sola llista visible alhora; un enllaç amb codi de conveni obre la llista completa filtrada.
  const lists = [['vencuts', 'Vençuts en curs', overdue.length], ['propers', 'Pròxims 12 mesos', upcoming.length], ['revisar', 'Vigència a revisar', review.length], ['tots', 'Tots els convenis', all.length]] as const;
  const list = lists.some(([id]) => id === params.get('llista')) ? params.get('llista')! : query || status ? 'tots' : 'vencuts';
  function exportAll() {
    download('convenis.csv', csv([
      ['Codi', 'Títol', 'Descripció', 'Inici', 'Fi declarada', 'Estat', 'Prorrogable', 'Patrons a revisar', 'Subvencions que citen el codi', 'Import d’aquestes subvencions EUR', 'URL'],
      ...all.map(a => {const linked = grants.get(a.code) ?? []; return [a.code, a.title, a.description, a.start, a.end, a.status, a.extendable === null ? null : a.extendable ? 'Sí' : 'No', issuesFor(a, reference).join(' | ') || null, linked.length, linked.length ? euros(linked.reduce((s, g) => s + g.amountCents, 0)) : null, a.url];}),
    ]), 'text/csv;charset=utf-8');
  }
  if (!all.length) return <Empty title="Aquesta captura encara no inclou els convenis">Els convenis s’afegiran a la propera actualització de les dades.</Empty>;
  return <>
    <div className="notice"><Scale size={19}/><p><strong>Patrons a revisar, no irregularitats.</strong> L’estat i les dates són els que declara l’Ajuntament a dades obertes. Un conveni «en curs» amb la data de fi passada pot haver-se prorrogat sense que consti a la font, o pot ser que l’estat no s’hagi actualitzat: només l’expedient ho aclareix.</p></div>
    <div className="view-controls"><span className="small muted">Referència: {date(reference)}</span><DownloadButton onClick={exportAll}>Exporta els convenis</DownloadButton></div>
    <div className="stats-grid three"><Stat label="En curs amb la data de fi passada" value={number(overdue.length)} detail={`de ${plural(open, 'conveni en curs', 'convenis en curs')} · ${plural(notExtendable, 'no prorrogable', 'no prorrogables')}`} accent/><Stat label="Vencen en els pròxims 12 mesos" value={number(upcoming.length)} detail="Convenis en curs amb la data de fi declarada"/><Stat label="Vigència a revisar" value={number(review.length)} detail="En curs sense data de fi, amb dates incoherents o amb més de 4 anys de durada"/></div>
    <div className="segmented list-tabs" role="group" aria-label="Llista de convenis">{lists.map(([id, label, count]) => <button key={id} aria-pressed={list === id} className={list === id ? 'active' : ''} onClick={() => updateRoute({llista: id, p: null})}>{label} <span>{number(count)}</span></button>)}</div>
    {list === 'vencuts' && <section className="panel" aria-labelledby="overdue-title"><div className="panel-heading"><div><h2 id="overdue-title">Consten en curs amb la data de fi passada</h2><p>Ordenats per la data de fi, del més recent al més antic</p></div></div>
      <Collapsible rows={overdue} grants={grants} reference={reference} label="convenis"/>
    </section>}
    {list === 'propers' && <section className="panel" aria-labelledby="upcoming-title"><div className="panel-heading"><div><h2 id="upcoming-title">Venciments dels pròxims 12 mesos</h2><p>Convenis en curs, per data de fi</p></div></div>
      <Collapsible rows={upcoming} grants={grants} reference={reference} label="convenis"/>
    </section>}
    {list === 'revisar' && <section className="panel" aria-labelledby="review-title"><div className="panel-heading"><div><h2 id="review-title">Vigència a revisar</h2><p>Convenis en curs sense data de fi, amb una data sentinella o anterior a l’inici, o amb una durada superior a 4 anys</p></div></div>
      <Collapsible rows={review} grants={grants} reference={reference} label="convenis"/>
    </section>}
    {list === 'tots' && <section className="panel" aria-labelledby="agreements-title"><div className="panel-heading"><div><h2 id="agreements-title">Tots els convenis</h2><p>Del més recent al més antic pel codi</p></div></div>
      <div className="filters"><div className="input-with-icon grow"><Search size={16}/><input aria-label="Cerca un conveni" placeholder="Cerca per codi o text…" value={query} onChange={e => updateRoute({conveni: e.target.value, p: null})}/></div><label>Estat<select aria-label="Estat del conveni" value={status} onChange={e => updateRoute({estat: e.target.value, p: null})}><option value="">Tots</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label></div>
      {listed.length ? <><AgreementTable rows={listed.slice((page - 1) * 20, page * 20)} grants={grants} reference={reference}/><Pagination page={page} total={listed.length} setPage={p => updateRoute({p: String(p)})}/></> : <Empty title="Cap conveni amb aquests filtres"/>}
    </section>}
    <div className="calculation-note"><Badge tone="blue">Criteri de càlcul</Badge><p>Catàleg municipal de convenis de col·laboració, sencer (no només el període {PERIOD_LABEL}); no n’informa imports ni signants. Es comparen la data de fi i l’estat declarats amb la data de referència. Les dates absents i les sentinella (1900) queden sense data. La durada dels convenis no pot superar els 4 anys, llevat que una norma prevegi un termini superior, i es pot prorrogar fins a 4 anys més (Llei 40/2015, art. 49 h); aquesta norma no s’aplica igual a tots els convenis, per això és un patró a revisar. Les subvencions vinculades són les que citen el codi del conveni al títol de l’acord.</p></div>
  </>;
}

export function GrantsAndAgreements({data}: {data: Catalog}) {
  const {params} = useRoute();
  const view = params.get('view') === 'convenis' ? 'convenis' : 'subvencions';
  return <><PageTitle eyebrow="Foment i col·laboració" title="Subvencions i convenis" actions={<ShareLink/>}>Qui rep subvencions de l’Ajuntament i quins convenis consten vigents.</PageTitle>
    <div className="view-controls"><div className="segmented" role="group" aria-label="Vista de subvencions i convenis">{([['subvencions', 'Subvencions'], ['convenis', 'Convenis']] as const).map(([id, label]) => <button key={id} aria-pressed={view === id} className={view === id ? 'active' : ''} onClick={() => updateRoute({view: id === 'subvencions' ? null : id, p: null, name: null, conveni: null, estat: null})}>{label}</button>)}</div></div>
    {view === 'convenis' ? <AgreementsView data={data}/> : <GrantsView data={data}/>}
  </>;
}
