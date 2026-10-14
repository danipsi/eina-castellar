"""Comprovació local de la captura: no consulta Internet ni modifica el paquet."""
from pathlib import Path
import hashlib
import json
import tempfile
from contextlib import closing
import sqlite3
import ingest

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'public/data/catalog.json').read_text(encoding='utf-8'))
ingest.validate(data)
case = [r for r in data['contracts'] if r['expedient'] == 'CONT2400054' and r['source'] == 'PSCP']
assert {r['lot'] for r in case} == {'1', '2'}
assert any(s['date'] == '2026-03-31' and any(a['number'] == '6' and 'CONT2400054' in a['expedients'] for a in s['agenda']) for s in data['sessions'])
with tempfile.TemporaryDirectory() as folder:
    target = Path(folder)
    ingest.publish(data, target)
    with closing(sqlite3.connect(target / 'dades/observatori.sqlite')) as db:
        before = db.execute('SELECT count(*) FROM versions').fetchone()[0]
    assert ingest.publish(data, target) == 0
    with closing(sqlite3.connect(target / 'dades/observatori.sqlite')) as db:
        assert db.execute('SELECT count(*) FROM versions').fetchone()[0] == before
    catalog = target / 'public/data/catalog.json'
    digest = hashlib.sha256(catalog.read_bytes()).hexdigest()
    ingest.atomic_json(target / 'public/data/status.json', {'status':'error','attemptedAt':ingest.stamp()})
    assert hashlib.sha256(catalog.read_bytes()).hexdigest() == digest
    assert {p.name for p in (target / 'public/data').iterdir()} == {'catalog.json','status.json'}
print(json.dumps({'result':'ok','rows':{key:len(data[key]) for key in ['contracts','events','budget','sessions']},'indexedSessions':sum(bool(s['agenda']) for s in data['sessions']),'agendaPoints':sum(len(s['agenda']) for s in data['sessions']),'checks':['cas CONT2400054','idempotència de tota la captura','cap versió duplicada','catàleg preservat després d’error','cap fitxer pendent a public']},ensure_ascii=False))
