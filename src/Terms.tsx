import {useMemo, useState} from 'react';
import {ArrowRight, Scale} from 'lucide-react';
import type {Catalog, Contract, Selection} from './types';
import {csv, date, download, money, number, today} from './lib';
import {BASIS_LABEL, HORIZONS, durationLabel, extensionChains, inHorizon, isExtraordinary, monthLabel, termRows} from './termData';
import type {Chain, Horizon, TermRow} from './termData';
import {Badge, DownloadButton, Empty, Original} from './ui';
import {Stat} from './Explorer';
import {updateRoute, useRoute} from './routes';

const euros = (cents: number | null) => cents === null ? null : (cents / 100).toFixed(2).replace('.', ',');
const plural = (n: number, one: string, many: string) => `${number(n)} ${n === 1 ? one : many}`;
const yearsBetween = (from: string | null, to: string | null) => from && to && to > from ? (Date.parse(to) - Date.parse(from)) / (365.25 * 86_400_000) : null;
const VISIBLE_CHAINS = 10;

function ContractCell({c, onSelect}: {c: Contract; onSelect: (s: Selection) => void}) {
  return <><div className="row-meta"><span className="mono">{c.expedient || 'Sense codi'}</span>{c.lot && <span className="lot">Lot {c.lot}</span>}<Badge>{c.procedure || 'Procediment no informat'}</Badge></div><button className="row-title" onClick={() => onSelect({kind: 'contract', item: c})}>{c.title}</button>{c.supplier && <small className="muted">{c.supplier}</small>}</>;
}

function TermTable({rows, onSelect}: {rows: TermRow[]; onSelect: (s: Selection) => void}) {
  let month = '';
  return <div className="table-scroll"><table className="contract-table term-table"><thead><tr><th>Expedient i objecte</th><th>Fi del termini inicial</th><th>Pròrrogues registrades</th><th className="numeric">Adjudicació</th><th><span className="sr-only">Obre</span></th></tr></thead><tbody>{rows.flatMap(({contract: c, term, extensions}) => {
    const current = term.end.slice(0, 7), header = current !== month;
    month = current;
    return [header && <tr key={'m' + current} className="month-row"><th colSpan={5} scope="colgroup">{monthLabel(term.end)}</th></tr>,
      <tr key={c.id}><td><ContractCell c={c} onSelect={onSelect}/></td><td className="nowrap"><strong>{date(term.end)}</strong><small className="muted">{term.basis === 'font' ? BASIS_LABEL.font : `${BASIS_LABEL[term.basis]} · ${durationLabel(c)}`}</small></td><td>{extensions.length ? <><Badge tone="amber">{plural(extensions.length, 'pròrroga', 'pròrrogues')}</Badge><small className="muted">Darrera: {date(extensions.at(-1)!.date)}</small></> : <span className="muted small">Cap a la font</span>}</td><td className="numeric"><strong>{money(c.amountCents)}</strong><small>{c.vat}</small></td><td><button className="icon-button" aria-label={`Obre ${c.expedient}, ${c.lot ? `lot ${c.lot}` : 'sense lot'}`} onClick={() => onSelect({kind: 'contract', item: c})}><ArrowRight size={17}/></button></td></tr>];
  })}</tbody></table></div>;
}

function ChainList({chains, onSelect}: {chains: Chain[]; onSelect: (s: Selection) => void}) {
  const [all, setAll] = useState(false);
  if (!chains.length) return <Empty title="Cap expedient compleix el criteri"/>;
  const shown = all ? chains : chains.slice(0, VISIBLE_CHAINS);
  return <div className="pattern-groups">{shown.map(chain => {
    const c = chain.contract, last = chain.events.at(-1)!, span = yearsBetween(c?.date ?? null, last.date);
    return <details key={chain.id} className="pattern-group"><summary><span className="pattern-name"><code>{chain.expedient || 'Sense codi'}</code>{chain.lot && ` · lot ${chain.lot}`}<small>{c?.title ?? chain.events[0].title}</small></span><span className="row-meta"><Badge tone={chain.events.length > 1 ? 'amber' : ''}>{plural(chain.events.length, 'pròrroga', 'pròrrogues')}</Badge>{chain.extraordinary > 0 && <Badge tone="red">{chain.extraordinary === 1 ? 'Pròrroga extraordinària' : `${chain.extraordinary} extraordinàries`}</Badge>}{c?.supplier && <span>{c.supplier}</span>}{span !== null && <span>{new Intl.NumberFormat('ca-ES', {maximumFractionDigits: 1}).format(span)} anys entre l’adjudicació i la darrera pròrroga</span>}</span><strong className="mono">{date(last.date)}<small>darrera pròrroga</small></strong></summary>
      <ol className="timeline chain-timeline">{c && <li><span className="timeline-dot"/><div className="row-meta"><time>{date(c.date)}</time><Badge>Adjudicació · {c.source}</Badge></div><p>{money(c.amountCents)} · {c.vat}{durationLabel(c) && ` · durada publicada: ${durationLabel(c)}`}</p><button className="text-button" onClick={() => onSelect({kind: 'contract', item: c})}>Obre la fitxa del contracte</button></li>}{chain.events.map(e => <li key={e.id}><span className="timeline-dot"/><div className="row-meta"><time>{date(e.date)}</time><Badge tone={isExtraordinary(e) ? 'red' : 'amber'}>{e.type}</Badge></div><p>{e.title}</p>{e.amountCents !== null && <small>{money(e.amountCents)} · sense IVA</small>}<Original url={e.url}>Consulta l’evidència</Original></li>)}</ol>
      {!c && <p className="small muted pattern-subtitle">El contracte d’origen no és al catàleg (pot ser anterior al període o un contracte menor). Consulta les evidències.</p>}</details>;
  })}{chains.length > VISIBLE_CHAINS && <div className="panel-bottom"><span className="small muted">{all ? chains.length : VISIBLE_CHAINS} de {chains.length} expedients</span><button className="text-button" onClick={() => setAll(!all)}>{all ? 'Mostra’n menys' : `Mostra’ls tots (${chains.length})`}</button></div>}</div>;
}

export function TermsAndExtensions({data, source, onSelect}: {data: Catalog; source: Contract['source']; onSelect: (s: Selection) => void}) {
  const {params} = useRoute();
  const horizon: Horizon = HORIZONS.some(h => h.id === params.get('horitzo')) ? params.get('horitzo') as Horizon : '12';
  const allChains = params.get('cadenes') === 'totes';
  const reference = today();
  const {rows, minors, unknown} = useMemo(() => termRows(data, source), [data, source]);
  const due = useMemo(() => inHorizon(rows, horizon, reference), [rows, horizon, reference]);
  const chains = useMemo(() => extensionChains(data, source), [data, source]);
  const chained = chains.filter(c => c.events.length > 1), shownChains = allChains ? chains : chained;
  const extraordinary = chains.filter(c => c.extraordinary > 0).length;
  const nextSix = inHorizon(rows, '6', reference).length;
  const change = (values: Record<string, string | null>) => updateRoute(values);
  function exportAll() {
    const term = ({contract: c, term, extensions}: TermRow) => ['Venciment', HORIZONS.find(h => h.id === horizon)!.label, c.expedient, c.lot, c.title, c.supplier, euros(c.amountCents), c.vat, c.date, term.end, BASIS_LABEL[term.basis], durationLabel(c), extensions.length, extensions.map(e => e.date).join(' | '), c.url];
    const chain = (ch: Chain) => ['Pròrrogues', ch.events.length > 1 ? 'Encadenades' : 'Única', ch.expedient, ch.lot, ch.contract?.title ?? ch.events[0].title, ch.contract?.supplier ?? null, euros(ch.contract?.amountCents ?? null), ch.contract?.vat ?? null, ch.contract?.date ?? null, null, null, ch.contract ? durationLabel(ch.contract) : null, ch.events.length, ch.events.map(e => `${e.date ?? 'sense data'} ${e.title}`).join(' | '), ch.events.at(-1)!.url];
    download(`venciments-i-prorrogues-${source.toLowerCase()}.csv`, csv([
      ['Apartat', 'Criteri', 'Expedient', 'Lot', 'Títol', 'Adjudicatari', 'Import EUR', 'IVA', 'Adjudicació', 'Fi del termini inicial', 'Base del càlcul', 'Durada publicada', 'Pròrrogues', 'Dates de pròrroga', 'URL'],
      ...due.map(term), ...shownChains.map(chain),
    ]), 'text/csv;charset=utf-8');
  }
  return <div className="terms-view">
    <div className="notice"><Scale size={19}/><p><strong>Calendari orientatiu i patrons a revisar.</strong> Un contracte que venç pot tenir prevista una pròrroga, i una pròrroga encadenada pot estar justificada. Les dates estimades parteixen de la durada publicada i no inclouen suspensions, ampliacions de termini ni pròrrogues; només l’expedient ho pot confirmar.</p></div>
    <div className="view-controls"><label className="inline-label">Horitzó <select aria-label="Horitzó dels venciments" value={horizon} onChange={e => change({horitzo: e.target.value === '12' ? null : e.target.value})}>{HORIZONS.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}</select></label><DownloadButton onClick={exportAll}>Exporta venciments i pròrrogues</DownloadButton></div>
    <div className="stats-grid three"><Stat label="Fi del termini en 6 mesos" value={number(nextSix)} detail={`${source} · contractes no menors amb durada`} accent/><Stat label="Expedients amb pròrrogues" value={number(chains.length)} detail={`${number(chained.length)} amb dues o més · fites de la PSCP`}/><Stat label="Pròrrogues extraordinàries" value={number(extraordinary)} detail="Expedients on la font ho indica al títol"/></div>
    <section className="panel" aria-labelledby="terms-title"><div className="panel-heading"><div><h2 id="terms-title">Calendari de venciments</h2><p>{HORIZONS.find(h => h.id === horizon)!.label} · fi del termini inicial, sense pròrrogues · referència {date(reference)}</p></div></div>
      {due.length ? <TermTable rows={due} onSelect={onSelect}/> : <Empty title="Cap venciment en aquest horitzó"/>}
      <p className="small muted pattern-subtitle">{number(rows.length)} contractes no menors de {source} tenen data de fi o durada interpretable; {plural(unknown, 'expedient no la té', 'expedients no la tenen')} i no surten al calendari. {plural(minors, 'contracte menor queda', 'contractes menors queden')} fora: no es poden prorrogar i duren un any com a màxim.</p>
    </section>
    <section className="panel" aria-labelledby="chains-title"><div className="panel-heading"><div><h2 id="chains-title">Pròrrogues encadenades</h2><p>Expedients amb {allChains ? 'una o més pròrrogues' : 'dues o més pròrrogues'} registrades a l’execució contractual, ordenats pel nombre de pròrrogues</p></div><label className="inline-label check-label"><input type="checkbox" checked={allChains} onChange={e => change({cadenes: e.target.checked ? 'totes' : null})}/>Inclou les pròrrogues úniques</label></div>
      <ChainList chains={shownChains} onSelect={onSelect}/>
    </section>
    <div className="calculation-note"><Badge tone="blue">Criteri de càlcul</Badge><p>Fi del termini inicial: la data de fi publicada a la PSCP; si només hi ha la durada, inici + durada − 1 dia, comptant des de la formalització o, si no consta, des de l’adjudicació. El RPC només informa la durada, i l’adjudicació sol ser anterior a l’inici real: les seves dates són aproximades. Un mateix expedient i lot compta una vegada per font. Les pròrrogues provenen de les fites d’execució de la PSCP (tipus «Pròrroga»); la data és la que publica la fita. Que no consti cap pròrroga no acredita que no n’hi hagi hagut. Una pròrroga extraordinària és la que permet continuar el servei fins a nou mesos mentre s’adjudica el contracte nou (article 29.4 de la Llei 9/2017): convé consultar-ne la justificació.</p></div>
  </div>;
}
