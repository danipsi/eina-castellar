import type {Catalog, CatalogChange, Selection} from './types';
import {date, money} from './lib';
import {selectRecord, updateRoute, useRoute} from './routes';
import {Badge, Empty, Original, Pagination, ShareLink} from './ui';

const sources: Record<string, string> = {contracts: 'Contractació', events: 'Execució contractual', budget: 'Pressupost', sessions: 'Sessions', suppliers: 'Proveïdors', grants: 'Subvencions', agreements: 'Convenis'};
const fieldNames: Record<string, string> = {amountCents: 'Import', initialCents: 'Inicial', finalCents: 'Definitiu', executedCents: 'Liquidat', year: 'Exercici', date: 'Data', chapter: 'Capítol', title: 'Títol', supplier: 'Adjudicatari', agenda: 'Ordre del dia', procedure: 'Procediment', status: 'Estat', type: 'Tipus', lot: 'Lot', url: 'Font original', expedient: 'Expedient', flags: 'Observacions', vat: 'Base d’IVA', chapterName: 'Nom del capítol', side: 'Ingressos o despeses', initialUrl: 'Font del pressupost', liquidationUrl: 'Font de la liquidació', body: 'Òrgan', name: 'Emissor', category: 'Tipus d’emissor', emitters: 'Emissors', invoices: 'Factures', invoicedCents: 'Import facturat', maxInvoiceCents: 'Factura més alta', firstDate: 'Primera factura', lastDate: 'Darrera factura', call: 'Acord', agreement: 'Conveni citat', beneficiary: 'Beneficiari', grants: 'Concessions', repeated: 'Files idèntiques', code: 'Codi', description: 'Descripció', start: 'Inici', end: 'Fi', endIssue: 'Incidència de la data de fi', extendable: 'Prorrogable'};
function value(field: string, data: string | number | null | undefined) {
  if (data === undefined) return '—';
  if (data === null) return 'No informat';
  if (field.endsWith('Cents') && typeof data === 'number') return money(data);
  if (['date', 'start', 'end'].includes(field) && typeof data === 'string') return date(data);
  return String(data);
}

function currentRecord(data: Catalog, change: CatalogChange) {
  if (change.source === 'contracts') {const item = data.contracts.find(r => r.id === change.recordId); if (item) return {title: item.title, url: item.url, selection: {kind: 'contract', item} as Selection};}
  if (change.source === 'sessions') {const item = data.sessions.find(r => r.id === change.recordId); if (item) return {title: item.title, url: item.url, selection: {kind: 'session', item} as Selection};}
  if (change.source === 'budget') {const item = data.budget.find(r => r.id === change.recordId); if (item) return {title: `${item.year} · ${item.side} · ${item.chapterName}`, url: item.url, selection: {kind: 'budget', item} as Selection};}
  if (change.source === 'suppliers') {const item = data.suppliers?.find(r => r.id === change.recordId); if (item) return {title: `${item.year} · ${item.name ?? 'Emissors sense nom publicat'}`, url: item.url};}
  if (change.source === 'grants') {const item = data.grants?.find(r => r.id === change.recordId); if (item) return {title: `${date(item.date)} · ${item.beneficiary ?? 'Concessions sense nom publicat'}`, url: item.url};}
  if (change.source === 'agreements') {const item = data.agreements?.find(r => r.id === change.recordId); if (item) return {title: `${item.code} · ${item.title}`, url: item.url};}
  if (change.source === 'events') {
    const event = data.events.find(r => r.id === change.recordId);
    if (event) {
      const item = data.contracts.find(c => c.expedient.trim().toUpperCase() === event.expedient.trim().toUpperCase() && (!event.lot || c.lot === event.lot));
      return {title: event.title, url: event.url, selection: item ? {kind: 'contract', item} as Selection : undefined};
    }
  }
  return null;
}

export function Changes({data}: {data: Catalog}) {
  const {params} = useRoute();
  const source = params.get('changeSource') ?? '', kind = params.get('changeKind') ?? '';
  const rows = data.changes.filter(c => (!source || c.source === source) && (!kind || c.kind === kind));
  const page = Math.max(1, Math.min(Math.ceil(rows.length / 20) || 1, Math.floor(Number(params.get('changePage'))) || 1));
  const detailed = data.changes.some(c => c.recordId);
  return <section className="panel changes" aria-label="Canvis entre captures"><div className="panel-heading"><div><h2>Canvis entre captures</h2><p>Darrer lot amb canvis materials. La data del canvi pot ser anterior a la darrera captura.</p></div><ShareLink/></div>
    <div className="filters"><label>Font<select aria-label="Font dels canvis" value={source} onChange={e => updateRoute({changeSource: e.target.value, changePage: null})}><option value="">Totes les fonts</option>{Object.entries(sources).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Tipus<select aria-label="Tipus de canvi" value={kind} onChange={e => updateRoute({changeKind: e.target.value, changePage: null})}><option value="">Tots els canvis</option><option value="nous">Nous</option><option value="modificats">Modificats</option><option value="no observats">No observats</option></select></label></div>
    {!detailed && data.changes.length > 0 && <p className="change-explanation">Aquesta captura només conserva recomptes. El detall per registre estarà disponible quan una nova actualització detecti canvis; no es reconstrueixen diferències que no es van guardar.</p>}
    {rows.length ? <><ul>{rows.slice((page - 1) * 20, page * 20).map((change, i) => {
      const current = currentRecord(data, change);
      return <li key={`${change.date}:${change.source}:${change.recordId ?? i}:${change.kind}`}><span className="change-dot"/><div className="change-body"><div className="row-meta"><Badge>{sources[change.source] ?? change.source}</Badge><Badge tone={change.kind === 'nous' ? 'green' : 'amber'}>{change.kind}</Badge><time>{date(change.date)}</time></div><p>{change.description}</p>{current && <><h3>{current.title}</h3><div className="change-actions">{current.selection && <button className="text-button" onClick={() => selectRecord(current.selection!)}>Obre la fitxa</button>}<Original url={current.url}/></div>{!!change.fields?.length && <details><summary>Veure {change.fields.length} camps modificats</summary><div className="table-scroll"><table><caption className="sr-only">Valors anteriors i actuals dels camps modificats</caption><thead><tr><th>Camp</th><th>Abans</th><th>Després</th></tr></thead><tbody>{change.fields.map(f => <tr key={f.field}><td>{fieldNames[f.field] ?? f.field}</td>{f.before === undefined && f.after === undefined ? <td colSpan={2}>Contingut actualitzat. Consulta el registre actual; no es conserva aquí el text anterior.</td> : <><td>{value(f.field, f.before)}</td><td>{value(f.field, f.after)}</td></>}</tr>)}</tbody></table></div></details>}</>}{change.recordId && !current && <p className="muted">Registre no disponible en la captura actual.</p>}{change.kind === 'no observats' && <p className="muted">Ja no s’observen en aquesta captura. No s’hi reprodueixen identificadors ni contingut retirat; això no acredita una anul·lació.</p>}</div></li>;
    })}</ul><Pagination page={page} total={rows.length} setPage={p => updateRoute({changePage: String(p)})}/></> : <Empty title="Sense canvis amb aquests filtres">Les captures sense modificacions no generen novetats.</Empty>}
  </section>;
}
