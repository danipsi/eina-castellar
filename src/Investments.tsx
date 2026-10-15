import {ArrowRight} from 'lucide-react';
import type {BudgetRow, Catalog, Selection} from './types';
import {compactMoney, money, pct, ratio} from './lib';
import {Badge} from './ui';

export const INVESTMENT_CHAPTER = '6';

// Sèrie anual del capítol 6 de despeses. Només un capítol i un nivell: no es barregen magnituds.
export function investmentSeries(data: Catalog): BudgetRow[] {
  return data.budget.filter(r => r.side === 'despeses' && r.chapter === INVESTMENT_CHAPTER).sort((a, b) => a.year - b.year);
}

export function latestInvestment(data: Catalog) {
  return [...investmentSeries(data)].reverse().find(r => r.executedCents !== null && r.finalCents !== null) ?? null;
}

const growth = (from: number | null, to: number | null) => from !== null && to !== null && from > 0 ? to / from : null;
const times = (n: number | null) => n === null ? 'No calculable' : '×' + new Intl.NumberFormat('ca-ES', {maximumFractionDigits: 1}).format(n);

export function Investments({data, onSelect, compact = false, onOpen}: {data: Catalog; onSelect: (s: Selection) => void; compact?: boolean; onOpen?: () => void}) {
  const rows = investmentSeries(data);
  if (!rows.length) return null;
  const max = Math.max(1, ...rows.flatMap(r => [r.initialCents ?? 0, r.finalCents ?? 0, r.executedCents ?? 0]));
  const closed = rows.filter(r => r.executedCents !== null && r.finalCents !== null);
  const pending = closed.reduce((sum, r) => sum + Math.max(0, r.finalCents! - r.executedCents!), 0);
  return <section className="panel investments" id="inversions" aria-labelledby="investments-title">
    <div className="panel-heading"><div><h2 id="investments-title">Inversions: pressupostat i executat</h2><p>Capítol 6 de despeses · inversions reals · per exercici</p></div><div className="legend"><span><i className="initial"/>Inicial</span><span><i className="final"/>Definitiu</span><span><i className="executed"/>Liquidat</span></div></div>
    <div className="budget-bars" aria-hidden="true">{rows.map(r => <div className="budget-bar-row" key={r.id}><div><span className="chapter-number">{r.year}</span><span>{r.executedCents === null ? 'Liquidació no disponible' : `${compactMoney(r.executedCents)} liquidats de ${compactMoney(r.finalCents)}`}</span></div><div className="bar-stack">{(['initialCents', 'finalCents', 'executedCents'] as const).map((field, i) => <div key={field} className={`bar ${['initial', 'final', 'executed'][i]}`} style={{width: `${Math.max(0, (r[field] ?? 0) / max * 100)}%`}}/>)}</div><span className="mono">{pct(ratio(r.executedCents, r.finalCents))}</span></div>)}</div>
    {compact && <ul className="sr-only">{rows.map(r => <li key={r.id}>{r.year}: inicial {money(r.initialCents)}, definitiu {money(r.finalCents)}, liquidat {money(r.executedCents)}, execució {pct(ratio(r.executedCents, r.finalCents))}</li>)}</ul>}
    {!compact && <div className="table-scroll"><table><caption className="sr-only">Capítol 6 de despeses per exercici: imports exactes i percentatges</caption><thead><tr><th>Exercici</th><th className="numeric">Inicial</th><th className="numeric">Definitiu</th><th className="numeric">Definitiu / inicial</th><th className="numeric">Liquidat</th><th className="numeric">Execució</th><th className="numeric">Sense executar</th><th>Font</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td><strong>{r.year}</strong></td><td className="numeric">{money(r.initialCents)}</td><td className="numeric">{money(r.finalCents)}</td><td className="numeric">{times(growth(r.initialCents, r.finalCents))}</td><td className="numeric">{money(r.executedCents)}</td><td className="numeric">{pct(ratio(r.executedCents, r.finalCents))}</td><td className="numeric">{r.executedCents === null || r.finalCents === null ? 'No calculable' : money(r.finalCents - r.executedCents)}</td><td><button className="text-button" onClick={() => onSelect({kind: 'budget', item: r})}>Consulta</button></td></tr>)}</tbody></table></div>}
    {compact
      ? <div className="panel-bottom"><p className="small muted">{closed.length ? `Crèdit definitiu no liquidat acumulat ${closed[0].year}–${closed.at(-1)!.year}: ${compactMoney(pending)}.` : 'Encara no hi ha cap exercici liquidat.'}</p>{onOpen && <button className="text-button" onClick={onOpen}>Veure detall<ArrowRight size={14}/></button>}</div>
      : <div className="calculation-note"><Badge tone="blue">Com llegir-ho</Badge><p>Execució = obligacions reconegudes / crèdit definitiu del capítol 6. El crèdit definitiu inclou les modificacions de l’exercici, entre elles els romanents incorporats d’anys anteriors; una obra plurianual pot liquidar-se en exercicis successius i aparèixer més d’un any com a crèdit. «Sense executar» és crèdit definitiu no convertit en obligació, no diners perduts ni pagaments pendents. {closed.length > 0 && `Suma ${closed[0].year}–${closed.at(-1)!.year}: ${money(pending)}, amb possibles repeticions per romanents.`} Una execució baixa és un motiu per preguntar quins projectes s’han endarrerit, no una conclusió.</p></div>}
  </section>;
}
