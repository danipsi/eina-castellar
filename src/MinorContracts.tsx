import {useMemo, useState} from 'react';
import {ArrowRight, Scale} from 'lucide-react';
import type {Catalog, Contract, Selection} from './types';
import {csv, date, download, money, number, pct} from './lib';
import {CPV_LEVELS, DEFAULT_CPV_DIGITS, NEAR_SHARE, THRESHOLDS, cpvPrefix, isAtOrAbove, isNear, minorRows, repeatedGroups, yearSummary} from './minorData';
import type {MinorGroup, MinorRow} from './minorData';
import {Badge, DownloadButton, Empty, Pagination} from './ui';
import {Stat} from './Explorer';
import {updateRoute, useRoute} from './routes';

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const share = (r: MinorRow) => r.share === null ? 'No calculable' : pct(r.share * 100);
const limitLabel = (g: {kind: MinorGroup['kind']; limit: number}) => `${g.kind} · llindar ${money(g.limit)}`;

function RowList({rows, onSelect}: {rows: MinorRow[]; onSelect: (s: Selection) => void}) {
  return <div className="table-scroll"><table className="contract-table"><thead><tr><th>Expedient i objecte</th><th>Data</th><th className="numeric">Adjudicació</th><th className="numeric">% del llindar</th><th><span className="sr-only">Obre</span></th></tr></thead><tbody>{rows.map(({contract: c, ...r}) => <tr key={c.id}><td><div className="row-meta"><span className="mono">{c.expedient || 'Sense codi'}</span>{c.lot && <span className="lot">Lot {c.lot}</span>}<Badge>{r.kind}</Badge>{c.cpv && <span className="source-label">CPV {c.cpv}</span>}</div><button className="row-title" onClick={() => onSelect({kind: 'contract', item: c})}>{c.title}</button>{c.supplier && <small className="muted">{c.supplier}</small>}</td><td className="nowrap muted">{date(c.date)}</td><td className="numeric"><strong>{money(c.amountCents)}</strong><small>{c.vat}</small></td><td className="numeric">{share({contract: c, ...r})}</td><td><button className="icon-button" aria-label={`Obre ${c.expedient}, ${c.lot ? `lot ${c.lot}` : 'sense lot'}`} onClick={() => onSelect({kind: 'contract', item: c})}><ArrowRight size={17}/></button></td></tr>)}</tbody></table></div>;
}

const VISIBLE_GROUPS = 10;

function GroupList({groups, onSelect, what}: {groups: MinorGroup[]; onSelect: (s: Selection) => void; what: 'supplier' | 'cpv'}) {
  const [all, setAll] = useState(false);
  if (!groups.length) return <Empty title="Cap grup compleix el criteri">Amb aquests filtres, cap conjunt de contractes menors arriba al llindar sumat.</Empty>;
  const shown = all ? groups : groups.slice(0, VISIBLE_GROUPS);
  return <div className="pattern-groups">{shown.map(g => <details key={g.id} className="pattern-group"><summary><span className="pattern-name">{what === 'cpv' ? <>CPV <code>{g.label}</code><small>p. ex. {g.rows[0].contract.title}</small></> : g.label}</span><span className="row-meta"><Badge tone="blue">{g.year}</Badge><span>{g.rows.length} contractes</span><span>{limitLabel(g)}</span>{what === 'cpv' && <span>{g.suppliers ? `${g.suppliers} adjudicataris visibles` : 'Cap adjudicatari visible'}</span>}</span><strong className="mono">{money(g.totalCents)}<small>{pct(g.totalCents / g.limit * 100)} del llindar</small></strong></summary><RowList rows={g.rows} onSelect={onSelect}/></details>)}{groups.length > VISIBLE_GROUPS && <div className="panel-bottom"><span className="small muted">{all ? groups.length : VISIBLE_GROUPS} de {groups.length} grups, ordenats per proporció sobre el llindar</span><button className="text-button" onClick={() => setAll(!all)}>{all ? 'Mostra’n menys' : `Mostra’ls tots (${groups.length})`}</button></div>}</div>;
}

export function MinorPatterns({data, source, onSelect}: {data: Catalog; source: Contract['source']; onSelect: (s: Selection) => void}) {
  const {params} = useRoute();
  const {rows: all, duplicates} = useMemo(() => minorRows(data.contracts, source), [data, source]);
  const years = [...new Set(all.map(r => r.contract.year).filter((y): y is number => y !== null))].sort((a, b) => b - a);
  const year = years.some(y => String(y) === params.get('year')) ? params.get('year')! : '';
  const digits = CPV_LEVELS.some(l => String(l.digits) === params.get('cpv')) ? Number(params.get('cpv')) : DEFAULT_CPV_DIGITS;
  const rows = useMemo(() => year ? all.filter(r => String(r.contract.year) === year) : all, [all, year]);
  const near = rows.filter(isNear).sort((a, b) => b.share! - a.share!), above = rows.filter(isAtOrAbove);
  const withAmount = rows.filter(r => r.share !== null).length, hidden = rows.filter(r => !r.contract.supplier).length;
  const bySupplier = useMemo(() => repeatedGroups(rows, c => c.supplier), [rows]);
  const byCpv = useMemo(() => repeatedGroups(rows, c => cpvPrefix(c.cpv, digits)), [rows, digits]);
  const withoutCpv = rows.filter(r => !cpvPrefix(r.contract.cpv, digits)).length;
  const page = Math.max(1, Math.min(Math.ceil(near.length / 20) || 1, Math.floor(Number(params.get('p'))) || 1));
  const change = (values: Record<string, string | null>) => updateRoute({...values, p: null});
  function exportPatterns() {
    const line = (pattern: string, group: string, r: MinorRow) => {const c = r.contract; return [pattern, group, c.year, c.source, c.expedient, c.lot, c.title, r.kind, c.cpv ?? null, c.amountCents === null ? null : euros(c.amountCents), c.vat, r.share === null ? null : (r.share * 100).toFixed(1).replace('.', ','), c.supplier, c.url, c.id];};
    download(`patrons-contractes-menors-${source.toLowerCase()}${year ? '-' + year : ''}.csv`, csv([
      ['Patró', 'Grup', 'Exercici', 'Font', 'Expedient', 'Lot', 'Títol', 'Tipus de llindar', 'CPV', 'Import EUR', 'IVA', '% del llindar', 'Adjudicatari', 'URL', 'Registre'],
      ...near.map(r => line('A prop del llindar', '', r)), ...above.map(r => line('Igual o per sobre del llindar', '', r)),
      ...bySupplier.flatMap(g => g.rows.map(r => line('Mateix adjudicatari i exercici', `${g.label} · ${g.year}`, r))),
      ...byCpv.flatMap(g => g.rows.map(r => line(`Mateix CPV (${digits} xifres) i exercici`, `${g.label} · ${g.year}`, r))),
    ]), 'text/csv;charset=utf-8');
  }
  if (!all.length) return <Empty title="No hi ha contractes menors en aquesta font"/>;
  return <div className="minor-patterns">
    <div className="notice"><Scale size={19}/><p><strong>Patrons a revisar, no irregularitats.</strong> Aquests càlculs assenyalen contractes que convé mirar amb més detall. Un import a prop del llindar o diversos contractes amb el mateix objecte poden tenir una justificació vàlida; només l’expedient ho pot aclarir.</p></div>
    {source === 'RPC' && <div className="notice warning"><p>El RPC no acredita si els imports porten IVA. Si l’inclouen, la comparació amb el llindar (sense IVA) no és vàlida. Per a aquesta anàlisi, la PSCP és la font més fiable.</p></div>}
    <div className="view-controls"><label className="inline-label">Exercici <select aria-label="Exercici dels contractes menors" value={year} onChange={e => change({year: e.target.value})}><option value="">Tots</option>{years.map(y => <option key={y}>{y}</option>)}</select></label><DownloadButton onClick={exportPatterns}>Exporta els patrons</DownloadButton></div>
    <div className="stats-grid three"><Stat label="Contractes menors" value={number(rows.length)} detail={`${number(withAmount)} amb import · obres, serveis i subministraments`}/><Stat label={`Entre el ${NEAR_SHARE * 100} i el 100 % del llindar`} value={number(near.length)} detail={withAmount ? `${pct(near.length / withAmount * 100)} dels que tenen import` : 'Sense imports'} accent/><Stat label="Iguals o per sobre del llindar" value={number(above.length)} detail="Un contracte menor no pot arribar al llindar"/></div>
    <section className="panel" aria-labelledby="near-title"><div className="panel-heading"><div><h2 id="near-title">A prop del llindar</h2><p>Import d’adjudicació entre el {NEAR_SHARE * 100} i el 100 % · obres {money(THRESHOLDS.obres)} · serveis i subministraments {money(THRESHOLDS['serveis i subministraments'])}</p></div></div>
      {!year && <div className="table-scroll"><table className="year-summary"><caption className="sr-only">Contractes menors a prop del llindar per exercici</caption><thead><tr><th>Exercici</th><th className="numeric">Amb import</th><th className="numeric">A prop del llindar</th><th className="numeric">Proporció</th><th className="numeric">Iguals o per sobre</th></tr></thead><tbody>{yearSummary(rows).map(y => <tr key={y.year}><td><button className="text-button" onClick={() => change({year: String(y.year)})}>{y.year}</button></td><td className="numeric">{number(y.total)}</td><td className="numeric">{number(y.near)}</td><td className="numeric">{y.total ? pct(y.near / y.total * 100) : 'No calculable'}</td><td className="numeric">{number(y.above)}</td></tr>)}</tbody></table></div>}
      {near.length ? <RowList rows={near.slice((page - 1) * 20, page * 20)} onSelect={onSelect}/> : <Empty title="Cap contracte a prop del llindar"/>}<Pagination page={page} total={near.length} setPage={p => updateRoute({p: String(p)})}/>
      {above.length > 0 && <><h3 className="pattern-subtitle">Iguals o per sobre del llindar</h3><p className="small muted pattern-subtitle">Poden ser errors de la font, imports amb IVA o expedients mal classificats. Consulta l’original.</p><RowList rows={above} onSelect={onSelect}/></>}
    </section>
    <section className="panel" aria-labelledby="supplier-title"><div className="panel-heading"><div><h2 id="supplier-title">Mateix adjudicatari, diversos contractes menors</h2><p>Dos o més contractes del mateix exercici i tipus que, sumats, arriben al llindar d’un sol contracte menor</p></div></div>
      <GroupList groups={bySupplier} onSelect={onSelect} what="supplier"/>
      <p className="small muted pattern-subtitle">{number(hidden)} de {number(rows.length)} contractes menors no tenen adjudicatari visible i no entren en aquest càlcul: només es mostren empreses amb forma societària explícita, mai persones físiques.</p>
    </section>
    <section className="panel" aria-labelledby="cpv-title"><div className="panel-heading"><div><h2 id="cpv-title">Mateix objecte (CPV), diversos contractes menors</h2><p>Mateix exercici i tipus; sumats, arriben al llindar d’un sol contracte menor</p></div><label className="inline-label">Agrupació <select aria-label="Nivell del codi CPV" value={digits} onChange={e => change({cpv: e.target.value === String(DEFAULT_CPV_DIGITS) ? null : e.target.value})}>{CPV_LEVELS.map(l => <option key={l.digits} value={l.digits}>{l.label}</option>)}</select></label></div>
      <GroupList groups={byCpv} onSelect={onSelect} what="cpv"/>
      <p className="small muted pattern-subtitle">{number(withoutCpv)} contractes sense CPV informat no entren en aquest càlcul. Quan la font en dona diversos, es fa servir el principal.</p>
    </section>
    <div className="calculation-note"><Badge tone="blue">Criteri de càlcul</Badge><p>Llindars de l’article 118 de la Llei 9/2017 de contractes del sector públic: el valor estimat d’un contracte menor ha de ser inferior a 40.000 € en obres i a 15.000 € en serveis i subministraments, sense IVA. Aquí es compara l’import d’adjudicació, que sol ser igual o inferior al valor estimat. Exercici d’adjudicació; només {source}, sense barrejar fonts.{duplicates > 0 && ` ${duplicates} registres repetits (mateix expedient i import publicats dues vegades) es compten una sola vegada.`} Que diversos contractes sumin més que el llindar no demostra un fraccionament: cal comprovar si formen una unitat funcional o si es podien preveure conjuntament. Els contractes de concessió i els administratius especials no tenen aquest llindar i en queden fora.</p></div>
  </div>;
}
