import {useMemo} from 'react';
import {ArrowRight, ChevronRight} from 'lucide-react';
import type {Agreement, Catalog, Contract, Selection} from './types';
import {date, expKey, money, number, today} from './lib';
import {addMonths, inHorizon, termRows, type TermRow} from './termData';
import {isOpen, isOverdue, isUpcoming} from './grantData';
import {Badge} from './ui';

// Resum de portada: el mateix criteri que el calendari de contractes i la vista de convenis, amb un horitzó comú
// (l'horitzó '6' de termData).
export const DEADLINE_MONTHS = 6;
const VISIBLE = 5;

type Item = {end: string; contract: Contract; lots: Contract[]; extensions: number} | {end: string; agreement: Agreement};
const plural = (n: number, one: string, many: string) => `${number(n)} ${n === 1 ? one : many}`;
const lotNumber = (c: Contract) => Number(c.lot) || 0;

// Els lots d'un mateix expedient amb la mateixa data de fi es mostren en una sola fila; amb dates diferents, per separat.
function groupLots(rows: TermRow[]): Item[] {
  const groups = new Map<string, TermRow[]>();
  for (const row of rows) {
    const key = row.contract.expedient ? `${expKey(row.contract.expedient)}|${row.term.end}` : row.contract.id;
    groups.set(key, [...groups.get(key) ?? [], row]);
  }
  return [...groups.values()].map(group => {
    const lots = group.map(r => r.contract).sort((a, b) => lotNumber(a) - lotNumber(b));
    return {end: group[0].term.end, contract: lots[0], lots, extensions: Math.max(...group.map(r => r.extensions.length))};
  });
}
function lotDetail(lots: Contract[]) {
  const suppliers = [...new Set(lots.map(c => c.supplier).filter(Boolean))];
  const amounts = lots.map(c => c.amountCents).filter((n): n is number => n !== null);
  const supplier = suppliers.length > 2 ? `${number(suppliers.length)} adjudicataris` : suppliers.join(', ');
  const amount = lots.length === 1 ? money(lots[0].amountCents) : amounts.length ? `${money(amounts.reduce((a, b) => a + b, 0))} ${amounts.length < lots.length ? `(${number(amounts.length)} lots amb import)` : 'en total'}` : null;
  return [supplier, amount].filter(Boolean).join(' · ');
}
const lotLabel = (item: {contract: Contract; lots: Contract[]}) => item.lots.length > 1 ? ` · ${number(item.lots.length)} lots` : item.contract.lot && item.contract.lot !== '0' ? ` · lot ${item.contract.lot}` : '';

const tile = (day: string) => <span className="date-tile"><strong>{day.slice(8, 10)}</strong><small>{new Intl.DateTimeFormat('ca-ES', {month: 'short', timeZone: 'UTC'}).format(new Date(day))}</small></span>;

export function UpcomingDeadlines({data, onSelect}: {data: Catalog; onSelect: (s: Selection) => void}) {
  const reference = today();
  const contracts = useMemo(() => groupLots(inHorizon(termRows(data, 'PSCP').rows, '6', reference)), [data, reference]);
  const agreements = data.agreements ?? [];
  const upcoming = agreements.filter(a => isUpcoming(a, reference, DEADLINE_MONTHS));
  const overdue = agreements.filter(a => isOverdue(a, reference)).length, open = agreements.filter(isOpen).length;
  const items: Item[] = [...contracts, ...upcoming.map(a => ({end: a.end!, agreement: a}))]
    .sort((a, b) => a.end.localeCompare(b.end));
  return <section className="panel deadlines" aria-labelledby="deadlines-title">
    <div className="panel-heading"><div><h2 id="deadlines-title">Venciments pròxims</h2><p>Fins al {date(addMonths(reference, DEADLINE_MONTHS))} · contractes de la PSCP (fi del termini inicial) i convenis en curs</p></div></div>
    <div className="deadline-counts"><span><strong>{number(contracts.length)}</strong>{' '}{contracts.length === 1 ? 'contracte' : 'contractes'}</span><span><strong>{number(upcoming.length)}</strong>{' '}{upcoming.length === 1 ? 'conveni' : 'convenis'}</span>{agreements.length > 0 && <span className="warn"><strong>{number(overdue)}</strong> {overdue === 1 ? 'conveni' : 'convenis'} en curs amb la data de fi passada{open > 0 && <small> (de {number(open)} en curs)</small>}</span>}</div>
    {items.length ? <div className="recent-sessions">{items.slice(0, VISIBLE).map(item => 'contract' in item
      ? <button key={'c' + item.contract.id} onClick={() => onSelect({kind: 'contract', item: item.contract})}>{tile(item.end)}<span><span className="row-meta"><Badge tone="blue">Contracte</Badge><span className="mono">{item.contract.expedient}{lotLabel(item)}</span>{item.extensions > 0 && <Badge tone="amber">{plural(item.extensions, 'pròrroga', 'pròrrogues')}</Badge>}</span><strong>{item.contract.title}</strong><small>{lotDetail(item.lots)}</small></span><ChevronRight size={16}/></button>
      : <a key={'a' + item.agreement.id} href={`#grants?view=convenis&conveni=${encodeURIComponent(item.agreement.code)}`}>{tile(item.end)}<span><span className="row-meta"><Badge tone="green">Conveni</Badge><span className="mono">{item.agreement.code}</span>{item.agreement.extendable !== null && <Badge>{item.agreement.extendable ? 'Prorrogable' : 'No prorrogable'}</Badge>}</span><strong>{item.agreement.title}</strong><small>Data de fi declarada</small></span><ChevronRight size={16}/></a>)}</div>
      : <p className="muted small pending-empty">Cap contracte ni conveni amb la data de fi en aquest període.</p>}
    <div className="panel-bottom"><p className="small muted">{items.length > VISIBLE ? `${number(items.length - VISIBLE)} més. ` : ''}Un venciment pot tenir prevista una pròrroga.</p><span className="deadline-links"><a className="text-button" href="#contracts?view=venciments">Calendari de contractes<ArrowRight size={14}/></a>{agreements.length > 0 && <a className="text-button" href="#grants?view=convenis">Convenis<ArrowRight size={14}/></a>}</span></div>
  </section>;
}
