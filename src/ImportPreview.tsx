import {useState} from 'react';
import {Download} from 'lucide-react';
import type {Dossier} from './types';
import {date, number} from './lib';
import {mergeStates} from './motionData';
import type {MotionState} from './motionData';
import {asCopy, changed, mergeDossier, receivedNotes} from './share';
import {markExported, markReceived} from './dossierAlerts';
import type {MergeSummary, Received} from './share';
import {Badge, Modal} from './ui';

type Mode = 'merge' | 'copy' | 'skip';
const plural = (n: number, one: string, many: string) => `${number(n)} ${n === 1 ? one : many}`;

export function summaryText(s: MergeSummary) {
  const parts = [
    s.added.evidence && plural(s.added.evidence, 'font nova', 'fonts noves'),
    s.added.note && plural(s.added.note, 'nota nova', 'notes noves'),
    s.added.request && plural(s.added.request, 'petició nova', 'peticions noves'),
    s.updated && plural(s.updated, 'element actualitzat', 'elements actualitzats'),
    s.removed && plural(s.removed, 'element eliminat per qui l’ha enviat', 'elements eliminats per qui l’ha enviat'),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Ja tens aquesta versió: no hi ha canvis.';
}

export function ImportPreview({received, dossiers, motions, onSave, onSaveMotions, onDone, onClose}: {received: Received; dossiers: Dossier[]; motions: MotionState; onSave: (d: Dossier) => Promise<void>; onSaveMotions: (s: MotionState) => void; onDone: (message: string, firstId: string) => void; onClose: () => void}) {
  const [modes, setModes] = useState<Record<string, Mode>>({});
  const [withMotions, setWithMotions] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const rows = received.dossiers.map(incoming => {
    const local = dossiers.find(d => d.id === incoming.id);
    return {incoming, local, merge: local ? mergeDossier(local, incoming) : null, mode: modes[incoming.id] ?? (local ? 'merge' : 'copy') as Mode};
  });
  const newerMarks = received.motions ? Object.entries(received.motions.marks).filter(([id, m]) => !motions.marks[id] || m.updatedAt > motions.marks[id].updatedAt).length : 0;
  const newMerges = received.motions ? Object.keys(received.motions.merges).filter(k => motions.merges[k] !== received.motions!.merges[k]).length : 0;
  async function apply() {
    setBusy(true); setError('');
    let done = 0, firstId = '';
    try {
      for (const row of rows) {
        if (row.mode === 'skip') continue;
        const target = row.mode === 'copy' ? (row.local ? asCopy(row.incoming) : row.incoming) : row.merge && changed(row.merge.summary) ? row.merge.dossier : null;
        if (!target) continue;
        await onSave(target); done++; firstId ||= target.id;
        markReceived(target.id, receivedNotes(row.mode === 'merge' ? row.local : undefined, target));
        // Un dossier afegit des del fitxer ja és al dia amb qui l'ha enviat.
        if (row.mode === 'copy') markExported([target.id]);
      }
      if (received.motions && withMotions && (newerMarks || newMerges)) onSaveMotions(mergeStates(motions, received.motions));
      onDone(done ? `${plural(done, 'dossier actualitzat', 'dossiers actualitzats')} en aquest navegador` : 'No hi havia canvis per importar', firstId);
    } catch (e) {
      setError(`${(e as Error).message}${done ? ` S’han desat ${plural(done, 'dossier', 'dossiers')} abans de l’error.` : ''}`);
    } finally {setBusy(false);}
  }
  return <Modal title="Revisa la importació" wide onClose={onClose}>
    <p className="muted small">{received.exportedBy ? `Enviat per ${received.exportedBy}` : 'Fitxer sense autor indicat'}{received.exportedAt && ` · exportat el ${date(received.exportedAt)}`}. Els canvis es fusionen element a element: si una nota s’ha modificat als dos llocs, es queda la versió més recent.</p>
    <ul className="import-list">
      {rows.map(({incoming, local, merge, mode}) => <li key={incoming.id}>
        <div><strong>{incoming.title}</strong> {local ? <Badge tone="blue">Ja el tens</Badge> : <Badge tone="green">Nou</Badge>}</div>
        <p className="small muted">{plural(incoming.evidence.length, 'font', 'fonts')} · {plural(incoming.notes.length, 'nota', 'notes')} · {plural(incoming.requests?.length ?? 0, 'petició', 'peticions')}</p>
        {merge && <p className="small">{summaryText(merge.summary)}{merge.summary.keptLocal > 0 && ` Es conserven ${plural(merge.summary.keptLocal, 'canvi teu més recent', 'canvis teus més recents')}.`}{merge.summary.otherTitle && ` El nom rebut («${merge.summary.otherTitle}») no substitueix el teu.`}</p>}
        <label className="field compact">Què en vols fer<select aria-label={`Importació de ${incoming.title}`} value={mode} onChange={e => setModes({...modes, [incoming.id]: e.target.value as Mode})}>
          {local ? <option value="merge">Fusiona amb el meu dossier</option> : <option value="copy">Afegeix-lo</option>}
          {local && <option value="copy">Importa’l com a còpia separada</option>}
          <option value="skip">No l’importis</option>
        </select></label>
      </li>)}
    </ul>
    {received.motions && <label className="check-line"><input type="checkbox" checked={withMotions} onChange={e => setWithMotions(e.target.checked)}/>Seguiment de mocions: {newerMarks || newMerges ? `${plural(newerMarks, 'marca nova o més recent', 'marques noves o més recents')}${newMerges ? ` i ${plural(newMerges, 'unió de noms de grup', 'unions de noms de grup')}` : ''}` : 'sense canvis respecte al teu'}</label>}
    <p className="muted small">Les eliminacions que ha fet qui t’envia el fitxer també s’apliquen. Un dossier sencer eliminat no s’esborra del teu navegador.</p>
    {error && <p role="alert" className="error-text">{error}</p>}
    <button className="button primary full-width" disabled={busy} onClick={apply}><Download size={16}/>{busy ? 'Important…' : 'Confirma la importació'}</button>
  </Modal>;
}
