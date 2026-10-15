import {ArrowRight} from 'lucide-react';
import type {BudgetRow, Catalog, Peers} from './types';
import {csv, download, money, number, pct} from './lib';
import {updateRoute, useRoute} from './routes';
import {Badge, DownloadButton, Original} from './ui';
import {peerStats, perCapita, versusMedian, type PeerChapter, type PeerMetric, type PeerStats} from './peerData';

const metrics: {id: PeerMetric; label: string}[] = [{id: 'initialCents', label: 'Inicial'}, {id: 'finalCents', label: 'Definitiu'}, {id: 'executedCents', label: 'Liquidat'}];
const chapters: PeerChapter[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'total'];
const signedPct = (n: number | null) => n === null ? 'No calculable' : (n > 0 ? '+' : '') + pct(n);

// Tira de punts: cada municipi a la seva posició dins l'escala de la fila (mínim–màxim).
function Strip({stats, self}: {stats: PeerStats; self: string}) {
  const values = stats.values.map(v => v.perCapita);
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), x = (v: number) => 6 + (max === min ? .5 : (v - min) / (max - min)) * 148;
  return <svg className="peer-strip" viewBox="0 0 160 20" role="img" aria-label={`Distribució de ${values.length} municipis`}>
    <line x1="6" x2="154" y1="10" y2="10" className="axis"/>
    {stats.median !== null && <line x1={x(stats.median)} x2={x(stats.median)} y1="3" y2="17" className="median"/>}
    {stats.values.filter(v => v.code !== self).map(v => <circle key={v.code} cx={x(v.perCapita)} cy="10" r="3" className="peer"><title>{v.name}: {perCapita(v.perCapita)}</title></circle>)}
    {stats.self && <circle cx={x(stats.self.perCapita)} cy="10" r="5" className="self"><title>{stats.self.name}: {perCapita(stats.self.perCapita)}</title></circle>}
  </svg>;
}

export function PeerComparison({data, year, side}: {data: Catalog; year: number; side: BudgetRow['side']}) {
  const {params} = useRoute();
  const peers: Peers | undefined = data.peers;
  if (!peers) return null;
  const own = peers.rows.find(r => r.code === peers.self && r.year === year && r.side === side);
  const liquidated = !!own && own.executedCents.some(v => v !== null);
  const metric = (metrics.find(m => m.id === params.get('peer'))?.id ?? (liquidated ? 'executedCents' : 'initialCents')) as PeerMetric;
  const label = metrics.find(m => m.id === metric)!.label;
  const selected = chapters.includes(params.get('peerChapter') ?? '') ? params.get('peerChapter')! : 'total';
  const names = new Map(data.budget.filter(r => r.year === year && r.side === side).map(r => [r.chapter, r.chapterName]));
  const title = (c: PeerChapter) => c === 'total' ? 'Total' : `${c}. ${names.get(c) ?? `Capítol ${c}`}`;
  const all = chapters.map(c => peerStats(peers, year, side, metric, c));
  const ranking = all.find(s => s.chapter === selected)!;
  const total = all.at(-1)!;
  const populationYears = [...new Set(all.flatMap(s => s.values.map(v => v.populationYear)))].filter(y => Number(y) !== year);
  const self = peers.municipalities.find(m => m.code === peers.self)!;
  const maxRanking = Math.max(1e-9, ...ranking.values.map(v => Math.max(0, v.perCapita)));
  function exportRanking() {
    const eur = (n: number) => (n / 100).toFixed(2).replace('.', ',');
    download(`municipis-${side}-${year}-${selected}.csv`, csv([
      ['Posició', 'Municipi', 'Codi Idescat', 'Exercici', 'Tipus', 'Magnitud', 'Capítol', 'Import EUR', 'Població', 'Any del padró', 'EUR per habitant'],
      ...ranking.values.map(v => [ranking.values.filter(o => o.perCapita > v.perCapita).length + 1, v.name, v.code, year, side, label, title(selected), eur(v.cents), v.population, v.populationYear, v.perCapita.toFixed(2).replace('.', ',')]),
    ]), 'text/csv;charset=utf-8');
  }
  return <section className="panel peer-comparison" id="municipis" aria-labelledby="peers-title">
    <div className="panel-heading"><div><h2 id="peers-title">Castellar entre municipis similars</h2><p>{side === 'despeses' ? 'Despeses' : 'Ingressos'} per habitant · {year} · {number(peers.municipalities.length)} municipis de {number(peers.range[0])} a {number(peers.range[1])} habitants (padró {peers.populationYear})</p></div><label className="inline-label">Magnitud<select aria-label="Magnitud de la comparació entre municipis" value={metric} onChange={e => updateRoute({peer: e.target.value})}>{metrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label></div>
    {total.values.length < 2 ? <p className="peer-empty">No hi ha prou municipis amb dades de {label.toLocaleLowerCase('ca')} per a {year}.{metric !== 'initialCents' && ' Prova amb el pressupost inicial.'}</p> : <>
    <div className="peer-summary"><span>Total de Castellar: <strong>{perCapita(total.self?.perCapita ?? null)}</strong></span><span>Mediana del grup: <strong>{perCapita(total.median)}</strong></span><span>Posició: <strong>{total.rank ? `${total.rank} de ${total.values.length}` : 'No calculable'}</strong> <small>(1 = el més alt)</small></span></div>
    <div className="table-scroll"><table className="peer-table"><caption className="sr-only">{label} per habitant i capítol: Castellar, mediana, interval central i posició, {year}</caption><thead><tr><th>Capítol</th><th className="numeric">Castellar</th><th className="numeric">Mediana</th><th className="numeric">Interval central</th><th className="numeric">Respecte a la mediana</th><th className="numeric">Posició</th><th><span className="sr-only">Distribució</span><span aria-hidden="true" className="peer-legend"><i className="self"/>Castellar <i className="median"/>mediana</span></th><th><span className="sr-only">Rànquing</span></th></tr></thead>
      <tbody>{all.map(s => <tr key={s.chapter} className={`${s.chapter === 'total' ? 'total-row' : ''} ${s.chapter === selected ? 'current' : ''}`}><td>{s.chapter === 'total' ? <strong>Total</strong> : <><strong>{s.chapter}.</strong> {names.get(s.chapter) ?? `Capítol ${s.chapter}`}</>}</td><td className="numeric"><strong>{perCapita(s.self?.perCapita ?? null)}</strong></td><td className="numeric">{perCapita(s.median)}</td><td className="numeric">{s.p25 === null || s.p75 === null ? 'No calculable' : `${perCapita(s.p25).replace(' €/hab.', '')}–${perCapita(s.p75)}`}</td><td className="numeric">{signedPct(versusMedian(s.self?.perCapita ?? null, s.median))}</td><td className="numeric">{s.rank ? `${s.rank} de ${s.values.length}` : 'No calculable'}{s.missing > 0 && <small>{s.missing} sense dada</small>}</td><td><Strip stats={s} self={peers.self}/></td><td><button className="text-button" aria-pressed={s.chapter === selected} onClick={() => updateRoute({peerChapter: s.chapter === 'total' ? null : s.chapter})}>Rànquing</button></td></tr>)}</tbody></table></div>
    <div className="peer-ranking"><div className="peer-ranking-heading"><h3>Rànquing · {title(selected)}</h3><DownloadButton onClick={exportRanking}>Exporta rànquing</DownloadButton></div>
      <ol>{ranking.values.map(v => <li key={v.code} className={v.code === peers.self ? 'self' : ''}><span className="mono">{ranking.values.filter(o => o.perCapita > v.perCapita).length + 1}</span><span><strong>{v.name}</strong><small>{number(v.population)} hab. · {money(v.cents)}</small></span><span className="peer-bar"><span style={{width: `${Math.max(0, v.perCapita) / maxRanking * 100}%`}}/></span><span className="mono">{perCapita(v.perCapita)}</span></li>)}</ol>
      {ranking.missing > 0 && <p className="small muted">{ranking.missing} {ranking.missing === 1 ? 'municipi no informa' : 'municipis no informen'} aquest capítol o exercici i no {ranking.missing === 1 ? 's’hi compta' : 's’hi compten'}.</p>}</div>
    </>}
    <div className="calculation-note"><Badge tone="blue">Com llegir-ho</Badge><p>Import per habitant = import del capítol de l’ajuntament / població a 1 de gener del mateix any (padró de l’Idescat).{populationYears.length > 0 && ` Per a ${year} s’usa la població de ${populationYears.join(', ')}, la darrera publicada.`} El grup es fixa amb el padró de {peers.populationYear} ({self.name}: {number(self.population[String(peers.populationYear)] ?? 0)} habitants). El total suma els capítols que informa cada municipi (cal que n’informi almenys els capítols de l’1 al 4). Un capítol no informat (sovint el 5, el 7, el 8 o el 9, quan no hi ha crèdit) no s’hi suma i, a la fila d’aquell capítol, el municipi queda fora del càlcul. Són xifres de l’ajuntament sense els ens dependents: si un servei el presta una empresa municipal, un consorci o la mancomunitat, la despesa pot quedar en un altre capítol (transferències) o fora del pressupost. Imports nominals. Una posició alta o baixa és un motiu per preguntar, no una conclusió.</p></div>
    <p className="info-line"><Original url={peers.populationUrl}>Padró municipal · Idescat</Original> <Original url={metric === 'initialCents' ? peers.initialUrl : peers.liquidationUrl}>{metric === 'initialCents' ? 'Pressupostos · AOC' : 'Liquidacions · AOC'}</Original></p>
  </section>;
}

const SNAPSHOT: PeerChapter[] = ['total', '1', '2', '6'];

// Darrer exercici de despeses amb liquidació comparable de Castellar; si no n'hi ha cap, el darrer pressupost inicial.
export function latestPeerYear(peers: Peers): {year: number; metric: PeerMetric} | null {
  const years = [...new Set(peers.rows.filter(r => r.code === peers.self && r.side === 'despeses').map(r => r.year))].sort((a, b) => b - a);
  for (const metric of ['executedCents', 'initialCents'] as const) for (const year of years) {
    const total = peerStats(peers, year, 'despeses', metric, 'total');
    if (total.self && total.values.length >= 2) return {year, metric};
  }
  return null;
}

export function PeerSnapshot({data}: {data: Catalog}) {
  const peers = data.peers, latest = peers ? latestPeerYear(peers) : null;
  if (!peers || !latest) return null;
  const {year, metric} = latest;
  const names = new Map(data.budget.filter(r => r.year === year && r.side === 'despeses').map(r => [r.chapter, r.chapterName]));
  const rows = SNAPSHOT.map(c => peerStats(peers, year, 'despeses', metric, c));
  return <section className="panel peer-snapshot" aria-labelledby="peer-snapshot-title">
    <div className="panel-heading"><div><h2 id="peer-snapshot-title">Castellar entre municipis similars</h2><p>Despesa {metric === 'executedCents' ? 'liquidada' : 'pressupostada inicial'} per habitant · {year} · municipis de {number(peers.range[0])} a {number(peers.range[1])} habitants</p></div></div>
    <div className="table-scroll"><table className="peer-table"><caption className="sr-only">Despesa per habitant de Castellar, mediana del grup i posició, {year}</caption><thead><tr><th>Capítol</th><th className="numeric">Castellar</th><th className="numeric">Posició</th></tr></thead>
      <tbody>{rows.map(s => {const diff = versusMedian(s.self?.perCapita ?? null, s.median); return <tr key={s.chapter} className={s.chapter === 'total' ? 'total-row' : ''}><td>{s.chapter === 'total' ? <strong>Total</strong> : <><strong>{s.chapter}.</strong> {names.get(s.chapter) ?? `Capítol ${s.chapter}`}</>}</td><td className="numeric"><strong>{perCapita(s.self?.perCapita ?? null)}</strong><small>{diff !== null && `${signedPct(diff)} · `}<span className="nowrap">mediana {perCapita(s.median)}</span></small></td><td className="numeric">{s.rank ? `${s.rank} de ${s.values.length}` : 'No calculable'}<Strip stats={s} self={peers.self}/></td></tr>;})}</tbody></table></div>
    <div className="panel-bottom"><p className="small muted">Posició 1 = la despesa per habitant més alta. Una posició alta o baixa és un motiu per preguntar, no una conclusió.</p><a className="text-button" href={`#budget?year=${year}&peer=${metric}&seccio=municipis`}>Comparació completa<ArrowRight size={14}/></a></div>
  </section>;
}
