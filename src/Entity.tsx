import {useMemo, type ReactNode} from 'react';
import {ArrowRight, Scale} from 'lucide-react';
import type {Catalog, Selection} from './types';
import {compactMoney, csv, date, download, money, number, today} from './lib';
import {entityTrail, type EntityTrail} from './entityData';
import {grantsByAgreement} from './grantData';
import {PUBLIC_BODY} from './supplierData';
import {Badge, DownloadButton, Empty, Original, PageTitle, SaveToDossier, ShareLink} from './ui';
import {entityEvidence} from './evidence';
import {ContractTable, Stat} from './Explorer';
import {AgreementTable} from './Grants';
import {PERIOD_LABEL} from './period';

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const plural = (n: number, one: string, many: string) => `${number(n)} ${n === 1 ? one : many}`;
const q = encodeURIComponent;
// Imports grans en milions; la resta en euros sencers, perquè «0 M€» amagaria subvencions petites.
const amount = (cents: number) => cents >= 100_000_000 ? compactMoney(cents) : new Intl.NumberFormat('ca-ES', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0}).format(cents / 100);
const span = (list: number[]) => {const years = [...new Set(list)]; return years.length > 1 ? `${Math.min(...years)}–${Math.max(...years)}` : years.length ? String(years[0]) : '';};

function Section({id, title, subtitle, children}: {id: string; title: string; subtitle: string; children: ReactNode}) {
  return <section className="panel" aria-labelledby={id}><div className="panel-heading"><div><h2 id={id}>{title}</h2><p>{subtitle}</p></div></div>{children}</section>;
}

function YearTable({t}: {t: EntityTrail}) {
  const cell = (n: number, text: string, detail?: string) => n ? <>{text}{detail && <small>{detail}</small>}</> : <span className="muted">—</span>;
  return <div className="table-scroll"><table className="year-summary entity-years"><caption className="sr-only">Rastre per exercici de {t.name}</caption>
    <thead><tr><th>Exercici</th><th className="numeric">Factures</th><th className="numeric">Contractes PSCP</th><th className="numeric">RPC</th><th className="numeric">Subvencions</th><th className="numeric">Convenis</th><th className="numeric">Sessions</th></tr></thead>
    <tbody>{t.years.map(y => <tr key={y.year}><td>{y.year}</td>
      <td className="numeric">{cell(y.invoices, money(y.invoicedCents), plural(y.invoices, 'factura', 'factures'))}</td>
      <td className="numeric">{cell(y.pscp, money(y.pscpCents), plural(y.pscp, 'contracte', 'contractes'))}</td>
      <td className="numeric">{cell(y.rpc, number(y.rpc))}</td>
      <td className="numeric">{cell(y.grants, money(y.grantCents), plural(y.grants, 'concessió', 'concessions'))}</td>
      <td className="numeric">{cell(y.agreements, number(y.agreements))}</td>
      <td className="numeric">{cell(y.mentions, number(y.mentions))}</td></tr>)}</tbody></table></div>;
}

export function EntityPage({data, name, onSelect}: {data: Catalog; name: string; onSelect: (s: Selection) => void}) {
  const t = useMemo(() => entityTrail(data, name), [data, name]);
  const grantLinks = useMemo(() => grantsByAgreement(data.grants ?? []), [data]);
  const found = t.invoices.length + t.contracts.length + t.grants.length + t.agreements.length + t.mentions.length > 0;
  const invoiced = t.invoices.reduce((s, r) => s + r.invoicedCents, 0), invoiceCount = t.invoices.reduce((s, r) => s + r.invoices, 0);
  const granted = t.grants.reduce((s, g) => s + g.amountCents, 0), grantCount = t.grants.reduce((s, g) => s + g.grants, 0);
  const pscp = t.years.reduce((s, y) => s + y.pscp, 0), pscpCents = t.years.reduce((s, y) => s + y.pscpCents, 0), rpc = t.years.reduce((s, y) => s + y.rpc, 0);
  const byText = t.agreements.filter(a => a.basis === 'text').length;
  function exportTrail() {
    download(`entitat-${t.key.replace(/ /g, '-')}.csv`, csv([
      ['Entitat', 'Nom normalitzat', 'Exercici', 'Factures', 'Import facturat EUR (amb IVA)', 'Contractes PSCP', 'Import adjudicat PSCP EUR', 'Contractes RPC', 'Concessions de subvenció', 'Import subvencions EUR', 'Convenis iniciats', 'Punts de sessió que el citen'],
      ...t.years.map(y => [t.name, t.key, y.year, y.invoices, euros(y.invoicedCents), y.pscp, euros(y.pscpCents), y.rpc, y.grants, euros(y.grantCents), y.agreements, y.mentions]),
    ]), 'text/csv;charset=utf-8');
  }
  const title = <PageTitle eyebrow="Fitxa d’entitat" title={found ? t.name : name || 'Entitat no indicada'} actions={<ShareLink/>}>Tot el que es troba amb aquest nom a factures, contractes, subvencions, convenis i sessions, per exercici.</PageTitle>;
  if (!name.trim()) return <>{title}<Empty title="Indica una entitat o empresa">Obre la fitxa des de Proveïdors, Subvencions o un contracte, o cerca el nom al cercador superior.</Empty></>;
  if (!found) return <>{title}<Empty title="No s’ha trobat cap registre amb aquest nom">Pot figurar a les fonts amb un altre nom. Prova la cerca transversal: <a href={`#search?q=${q(name)}`}>cerca «{name}»</a>.</Empty></>;
  return <>{title}
    <div className="notice"><Scale size={19}/><p><strong>Coincidència per nom, no identitat.</strong> Es relacionen els registres amb el mateix nom normalitzat («{t.key}»: sense accents, puntuació ni forma societària). Una mateixa entitat pot figurar amb noms diferents, i dues de diferents poden coincidir: comprova-ho a la font abans de treure’n conclusions.</p></div>
    <div className="view-controls entity-controls"><span className="row-meta">{t.category && <Badge>{t.category}</Badge>}<span className="small muted">Exercicis amb registres: {span(t.years.map(y => y.year))}</span></span><span className="request-actions"><DownloadButton onClick={exportTrail}>Exporta el rastre</DownloadButton><SaveToDossier name={`fitxa de ${t.name}`} evidence={() => entityEvidence(t, data.generatedAt)}/></span></div>
    {t.category === PUBLIC_BODY && <div className="notice" role="status"><p>És una administració o un ens públic: els encàrrecs i convenis entre administracions no passen per la contractació.</p></div>}
    <div className="stats-grid"><Stat label="Facturació registrada" value={invoiceCount ? amount(invoiced) : '—'} detail={invoiceCount ? `${plural(invoiceCount, 'factura', 'factures')} · IVA inclòs · ${span(t.invoices.map(r => r.year))}` : 'Cap factura amb aquest nom'}/>
      <Stat label="Contractes trobats" value={number(pscp + rpc)} detail={pscp + rpc ? `PSCP ${number(pscp)} (${amount(pscpCents)} adjudicats) · RPC ${number(rpc)}` : 'Cap contracte amb aquest adjudicatari'}/>
      <Stat label="Subvencions concedides" value={grantCount ? amount(granted) : '—'} detail={grantCount ? `${plural(grantCount, 'concessió', 'concessions')} · ${span(t.grants.map(g => g.year))}` : 'Cap concessió amb aquest beneficiari'}/>
      <Stat label="Convenis i sessions" value={number(t.agreements.length + t.mentions.length)} detail={`${plural(t.agreements.length, 'conveni', 'convenis')} · ${t.searchable ? plural(t.mentions.length, 'punt de sessió', 'punts de sessió') : 'sessions no cercades'}`}/></div>
    <Section id="entity-years" title="Rastre per exercici" subtitle="Cada font amb la seva magnitud: les factures porten l’IVA, les adjudicacions sovint no, i PSCP i RPC no se sumen. Convenis per any d’inici; sessions, punts que citen el nom"><YearTable t={t}/></Section>
    <Section id="entity-invoices" title="Factures" subtitle="Registre municipal de factures, agregat per emissor i exercici">{t.invoices.length ? <div className="table-scroll"><table className="grant-table entity-invoices"><thead><tr><th>Exercici</th><th className="numeric">Factures</th><th className="numeric">Import</th><th className="numeric">Factura més alta</th><th>Període</th><th><span className="sr-only">Enllaços</span></th></tr></thead><tbody>{t.invoices.map(r => <tr key={r.id}><td>{r.year}</td><td className="numeric">{number(r.invoices)}</td><td className="numeric">{money(r.invoicedCents)}</td><td className="numeric">{money(r.maxInvoiceCents)}</td><td className="nowrap">{r.firstDate ? (r.firstDate === r.lastDate ? date(r.firstDate) : `${date(r.firstDate)} – ${date(r.lastDate)}`) : 'No informat'}</td><td><span className="row-meta"><a className="text-button" href={`#suppliers?year=${r.year}&name=${q(r.name ?? '')}`}>A Proveïdors</a><Original url={r.url}>Font</Original></span></td></tr>)}</tbody></table></div> : <p className="small muted pattern-subtitle">Cap factura registrada amb aquest nom. Les persones físiques, les societats civils i les comunitats de béns no es publiquen amb nom.</p>}</Section>
    <Section id="entity-contracts" title="Contractes" subtitle={`Adjudicatari amb el mateix nom a la PSCP i al RPC (${PERIOD_LABEL}); una fila per registre de la font`}>{t.contracts.length ? <ContractTable rows={t.contracts} onSelect={onSelect} compact/> : <p className="small muted pattern-subtitle">Cap contracte del catàleg amb aquest adjudicatari. Pot ser que l’adjudicatari no sigui visible a la font, que figuri amb un altre nom o que el contracte sigui anterior al catàleg.</p>}</Section>
    <Section id="entity-grants" title="Subvencions" subtitle="Concessions publicades a la BDNS i a l’AOC amb aquest beneficiari">{t.grants.length ? <div className="table-scroll"><table className="grant-table"><thead><tr><th>Data</th><th>Acord</th><th className="numeric">Import</th></tr></thead><tbody>{t.grants.map(g => <tr key={g.id}><td className="nowrap">{date(g.date)}</td><td><span className="grant-call">{g.call}</span><span className="row-meta"><Badge tone={g.procedure === 'convocatòria' ? '' : 'amber'}>{g.procedure === 'convocatòria' ? 'Amb convocatòria' : 'Sense convocatòria'}</Badge>{g.agreement && <a className="text-button" href={`#grants?view=convenis&conveni=${q(g.agreement)}`}>Conveni {g.agreement}</a>}<a className="text-button" href={`#grants?year=${g.year}&name=${q(g.beneficiary ?? '')}`}>A Subvencions</a><Original url={g.url}>Font</Original></span></td><td className="numeric">{money(g.amountCents)}{g.grants > 1 && <small>{number(g.grants)} concessions</small>}</td></tr>)}</tbody></table></div> : <p className="small muted pattern-subtitle">Cap concessió amb aquest beneficiari.</p>}</Section>
    <Section id="entity-agreements" title="Convenis" subtitle={[t.agreements.length > byText || !byText ? `${plural(t.agreements.length - byText, 'conveni citat', 'convenis citats')} pel codi en una subvenció de l’entitat` : '', byText ? `${plural(byText, 'conveni', 'convenis')} amb el nom al títol o a la descripció` : ''].filter(Boolean).join(' · ')}>{t.agreements.length ? <AgreementTable rows={t.agreements.map(a => a.agreement)} grants={grantLinks} reference={today()}/> : <p className="small muted pattern-subtitle">{t.searchable ? 'Cap conveni cita aquesta entitat pel codi ni pel nom.' : 'Cap conveni la cita pel codi. El nom és massa curt per buscar-lo al text dels convenis.'}</p>}</Section>
    <Section id="entity-sessions" title="Sessions i mocions" subtitle="Punts de l’ordre del dia del Ple i de la Junta de Govern que contenen el nom">{!t.searchable ? <p className="small muted pattern-subtitle">El nom és massa curt o d’una sola paraula: buscar-lo al text de les sessions donaria massa coincidències que no hi tenen res a veure.</p> : t.mentions.length ? <ol className="agenda entity-mentions">{t.mentions.map(m => <li key={`${m.session.id}-${m.number}`}><span>{m.number}</span><div><div className="row-meta"><time>{date(m.session.date)}</time><Badge tone={m.session.body === 'Ple' ? 'blue' : ''}>{m.session.body}</Badge>{m.motionId && <Badge>Moció</Badge>}</div><p>{m.title}</p><span className="row-meta"><button className="exp-link" onClick={() => onSelect({kind: 'session', item: m.session})}>Fitxa de la sessió<ArrowRight size={13}/></button>{m.motionId && <a className="exp-link" href={`#motions?motion=${m.motionId}`}>Seguiment de la moció<ArrowRight size={13}/></a>}</span></div></li>)}</ol> : <p className="small muted pattern-subtitle">Cap punt de l’ordre del dia conté aquest nom. L’ordre del dia sovint no anomena l’entitat; no vol dir que no se n’hagi parlat.</p>}</Section>
    <div className="calculation-note"><Badge tone="blue">Criteri de càlcul</Badge><p>Factures, contractes i subvencions es relacionen quan el nom de l’emissor, de l’adjudicatari o del beneficiari coincideix un cop normalitzat. Els convenis hi consten si una subvenció de l’entitat en cita el codi o si el títol o la descripció contenen el nom sencer; els punts de sessió, si el títol el conté. Els contractes que la font publica dues vegades (mateix expedient, lot i import) es compten una vegada al rastre per exercici, però es llisten tots. Els imports de fonts diferents no se sumen.</p></div>
  </>;
}
