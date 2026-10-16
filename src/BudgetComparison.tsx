import type {BudgetRow, Catalog, Selection} from './types';
import {budgetTotal, csv, download, money, pct} from './lib';
import {updateRoute, useRoute} from './routes';
import {DownloadButton} from './ui';

type Metric = 'initialCents' | 'finalCents' | 'executedCents';
const metrics: {id: Metric; label: string}[] = [{id: 'initialCents', label: 'Inicial'}, {id: 'finalCents', label: 'Definitiu'}, {id: 'executedCents', label: 'Liquidat'}];
const difference = (current: number | null, previous: number | null) => current !== null && previous !== null ? current - previous : null;
const variation = (current: number | null, previous: number | null) => current !== null && previous !== null && previous !== 0 ? (current - previous) / Math.abs(previous) * 100 : null;
const signedMoney = (value: number | null) => value === null ? 'No calculable' : (value > 0 ? '+' : '') + money(value);

export function BudgetComparison({data, year, side, onSelect}: {data: Catalog; year: number; side: BudgetRow['side']; onSelect: (selection: Selection) => void}) {
  const {params} = useRoute();
  const years = [...new Set(data.budget.map(r => r.year))].sort((a, b) => b - a);
  const compare = Number(params.get('compare'));
  const active = params.has('compare') && years.includes(compare);
  const metric = (metrics.find(m => m.id === params.get('metric'))?.id ?? 'executedCents') as Metric;
  const label = metrics.find(m => m.id === metric)!.label;
  const current = data.budget.filter(r => r.year === year && r.side === side);
  const previous = data.budget.filter(r => r.year === compare && r.side === side);
  const keys = [...new Set([...current, ...previous].map(r => r.chapter))].sort((a, b) => Number(a) - Number(b));
  const rows = keys.map(chapter => {
    const a = current.find(r => r.chapter === chapter), b = previous.find(r => r.chapter === chapter);
    const now = a?.[metric] ?? null, before = b?.[metric] ?? null;
    return {chapter, title: a?.chapterName ?? b!.chapterName, a, b, now, before, delta: difference(now, before), percent: variation(now, before)};
  });
  // Un capítol absent en qualsevol exercici també impedeix calcular el total comparable.
  const nowTotal = current.length === keys.length ? budgetTotal(current, metric) : null;
  const beforeTotal = previous.length === keys.length ? budgetTotal(previous, metric) : null;
  const max = Math.max(1, ...rows.flatMap(r => [Math.abs(r.now ?? 0), Math.abs(r.before ?? 0)]));
  function exportComparison() {
    const eur = (n: number | null) => n === null ? null : (n / 100).toFixed(2).replace('.', ',');
    download(`comparacio-${side}-${compare}-${year}.csv`, csv([
      ['Tipus', 'Magnitud', 'Capítol', 'Descripció', 'Any base', 'Any comparat', 'Base EUR', 'Comparat EUR', 'Diferència EUR', 'Variació %', 'Font base', 'Font comparada'],
      ...rows.map(r => [side, label, r.chapter, r.title, compare, year, eur(r.before), eur(r.now), eur(r.delta), r.percent === null ? null : r.percent.toFixed(2).replace('.', ','), metric === 'initialCents' ? r.b?.initialUrl ?? r.b?.url : r.b?.liquidationUrl ?? r.b?.url, metric === 'initialCents' ? r.a?.initialUrl ?? r.a?.url : r.a?.liquidationUrl ?? r.a?.url]),
    ]), 'text/csv;charset=utf-8');
  }
  if (!active) return <div className="comparison-start"><div><strong>Com ha canviat el pressupost?</strong><p>Compara el mateix capítol i la mateixa magnitud entre dos exercicis.</p></div><button className="button secondary" disabled={years.length < 2} onClick={() => updateRoute({compare: String(years.find(y => y < year) ?? years.find(y => y !== year)), year: String(year), side})}>Compara exercicis</button></div>;
  return <section className="panel budget-comparison" id="comparacio" aria-label="Comparació pressupostària"><div className="panel-heading"><div><h2>{compare} → {year}</h2><p>Comparació de {side} · {label.toLocaleLowerCase('ca')}</p></div><div className="comparison-actions"><DownloadButton onClick={exportComparison}>Exporta comparació</DownloadButton><button className="text-button" onClick={() => updateRoute({compare: null, metric: null})}>Tanca la comparació</button></div></div>
    <div className="filters"><label className="inline-label">Any base<select aria-label="Exercici base de comparació" value={compare} onChange={e => updateRoute({compare: e.target.value})}>{years.map(y => <option key={y}>{y}</option>)}</select></label><label className="inline-label">Magnitud<select aria-label="Magnitud de comparació" value={metric} onChange={e => updateRoute({metric: e.target.value})}>{metrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label><span className="comparison-total">Diferència total: <strong>{signedMoney(difference(nowTotal, beforeTotal))}</strong></span></div>
    <p className="comparison-context">Diferència = {year} − {compare}. Imports nominals, sense ajustar per inflació. Una dada absent no és zero; si la base és zero, el percentatge no es calcula.{rows.some(r => r.now === null || r.before === null) && ' Hi ha capítols sense dades comparables.'}{compare === year && ' Has seleccionat el mateix exercici.'}</p>
    <div className="table-scroll"><table><caption className="sr-only">Comparació de {side}: {label}, {compare} i {year}</caption><thead><tr><th>Capítol</th><th className="numeric">{compare} · base</th><th className="numeric">{year} · comparat</th><th className="numeric">Diferència</th><th className="numeric">Variació</th></tr></thead><tbody>{rows.map(r => <tr key={r.chapter}><td><strong>{r.chapter}.</strong> {r.title}</td>{[{value: r.before, item: r.b, className: 'base'}, {value: r.now, item: r.a, className: 'current'}].map((v, i) => <td className="numeric" key={i}>{v.item ? <button className="comparison-amount" aria-label={`Consulta ${v.item.year}, ${v.item.chapterName}, ${label}`} onClick={() => onSelect({kind: 'budget', item: v.item!})}>{money(v.value)}</button> : 'No informat'}{v.value !== null && <span className={`comparison-bar ${v.className}`} style={{width: `${Math.abs(v.value) / max * 100}%`}} aria-hidden="true"/>}</td>)}<td className="numeric">{signedMoney(r.delta)}</td><td className="numeric">{pct(r.percent)}</td></tr>)}</tbody></table></div>
  </section>;
}
