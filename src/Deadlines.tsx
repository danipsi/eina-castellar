import {useMemo} from 'react';
import {ArrowRight, ChevronRight} from 'lucide-react';
import type {Agreement, Catalog, Contract, Selection} from './types';
import {date, money, number, today} from './lib';
import {addMonths, inHorizon, termRows} from './termData';
import {isOpen, isOverdue, isUpcoming} from './grantData';
import {Badge} from './ui';

// Resum de portada: el mateix criteri que el calendari de contractes i la vista de convenis, amb un horitzó comú
// (l'horitzó '6' de termData).
export const DEADLINE_MONTHS = 6;
const VISIBLE = 5;

type Item = {end: string; contract: Contract; extensions: number} | {end: string; agreement: Agreement};
const plural = (n: number, one: string, many: string) => `${number(n)} ${n === 1 ? one : many}`;
const tile = (day: string) => <span className="date-tile"><strong>{day.slice(8, 10)}</strong><small>{new Intl.DateTimeFormat('ca-ES', {month: 'short', timeZone: 'UTC'}).format(new Date(day))}</small></span>;

export function UpcomingDeadlines({data, onSelect}: {data: Catalog; onSelect: (s: Selection) => void}) {
  const reference = today();
  const contracts = useMemo(() => inHorizon(termRows(data, 'PSCP').rows, '6', reference), [data, reference]);
  const agreements = data.agreements ?? [];
  const upcoming = agreements.filter(a => isUpcoming(a, reference, DEADLINE_MONTHS));
  const overdue = agreements.filter(a => isOverdue(a, reference)).length, open = agreements.filter(isOpen).length;
  const items: Item[] = [...contracts.map(r => ({end: r.term.end, contract: r.contract, extensions: r.extensions.length})), ...upcoming.map(a => ({end: a.end!, agreement: a}))]
    .sort((a, b) => a.end.localeCompare(b.end));
  return <section className="panel deadlines" aria-labelledby="deadlines-title">
    <div className="panel-heading"><div><h2 id="deadlines-title">Venciments pròxims</h2><p>Fins al {date(addMonths(reference, DEADLINE_MONTHS))} · contractes de la PSCP (fi del termini inicial) i convenis en curs</p></div></div>
    <div className="deadline-counts"><span><strong>{number(contracts.length)}</strong>{' '}{contracts.length === 1 ? 'contracte' : 'contractes'}</span><span><strong>{number(upcoming.length)}</strong>{' '}{upcoming.length === 1 ? 'conveni' : 'convenis'}</span>{agreements.length > 0 && <span className="warn"><strong>{number(overdue)}</strong> {overdue === 1 ? 'conveni' : 'convenis'} en curs amb la data de fi passada{open > 0 && <small> (de {number(open)} en curs)</small>}</span>}</div>
    {items.length ? <div className="recent-sessions">{items.slice(0, VISIBLE).map(item => 'contract' in item
      ? <button key={'c' + item.contract.id} onClick={() => onSelect({kind: 'contract', item: item.contract})}>{tile(item.end)}<span><span className="row-meta"><Badge tone="blue">Contracte</Badge><span className="mono">{item.contract.expedient}{item.contract.lot && item.contract.lot !== '0' ? ` · lot ${item.contract.lot}` : ''}</span>{item.extensions > 0 && <Badge tone="amber">{plural(item.extensions, 'pròrroga', 'pròrrogues')}</Badge>}</span><strong>{item.contract.title}</strong><small>{[item.contract.supplier, money(item.contract.amountCents)].filter(Boolean).join(' · ')}</small></span><ChevronRight size={16}/></button>
      : <a key={'a' + item.agreement.id} href={`#grants?view=convenis&conveni=${encodeURIComponent(item.agreement.code)}`}>{tile(item.end)}<span><span className="row-meta"><Badge tone="green">Conveni</Badge><span className="mono">{item.agreement.code}</span>{item.agreement.extendable !== null && <Badge>{item.agreement.extendable ? 'Prorrogable' : 'No prorrogable'}</Badge>}</span><strong>{item.agreement.title}</strong><small>Data de fi declarada</small></span><ChevronRight size={16}/></a>)}</div>
      : <p className="muted small pending-empty">Cap contracte ni conveni amb la data de fi en aquest període.</p>}
    <div className="panel-bottom"><p className="small muted">{items.length > VISIBLE ? `${number(items.length - VISIBLE)} més. ` : ''}Un venciment pot tenir prevista una pròrroga.</p><span className="deadline-links"><a className="text-button" href="#contracts?view=venciments">Calendari de contractes<ArrowRight size={14}/></a>{agreements.length > 0 && <a className="text-button" href="#grants?view=convenis">Convenis<ArrowRight size={14}/></a>}</span></div>
  </section>;
}
