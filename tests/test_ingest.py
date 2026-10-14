import copy
from contextlib import closing
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('ingest', Path(__file__).parents[1] / 'scripts/ingest.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

class IngestTest(unittest.TestCase):
    def record(self, id='test', **values):
        record = {'id':id, 'title':'Títol públic', 'url':f'https://example.org/{id}', 'capturedAt':'2026-10-13', 'amountCents':100}
        record.update(values)
        return record

    def catalog(self, contracts=None, sessions=None, generated='2026-10-13'):
        contracts = contracts if contracts is not None else [self.record()]
        sessions = sessions if sessions is not None else [self.record('session-test')]
        return {'schemaVersion':1, 'generatedAt':generated, 'contracts':contracts, 'sessions':sessions, 'events':[], 'budget':[], 'sources':[], 'changes':[]}

    def temporary_root(self):
        staging = Path(__file__).parents[1] / 'dades' / 'staging'
        staging.mkdir(parents=True, exist_ok=True)
        return tempfile.TemporaryDirectory(dir=staging)

    def test_amounts_dates_and_privacy(self):
        self.assertEqual(m.cents('2.642,20 €'), 264220)
        self.assertEqual(m.cents('2642.20'), 264220)
        self.assertEqual(m.cents('-0.05'), -5)
        self.assertEqual(m.cents('0'), 0)
        self.assertIsNone(m.cents(None))
        with self.assertRaises(ValueError): m.cents('100,00;200,00')
        self.assertEqual(m.iso('03/12/2026'), '2026-12-03')
        with self.assertRaises(ValueError): m.iso('2026-31-03')
        self.assertNotIn('12345678A', m.clean('Identificador 12345678A'))
        self.assertIsNone(m.company('Persona de prova'))
        self.assertEqual(m.company('EMPRESA DE PROVA SL'), 'EMPRESA DE PROVA SL')

    def test_truncation(self):
        n = 0
        def response(url):
            nonlocal n
            n += 1
            return [{'total': '2'}] if n == 1 else []
        with self.assertRaisesRegex(ValueError, 'truncada'): m.socrata('test', 'test', 'test', response)

    def test_budget_hierarchy_and_duplicate(self):
        rows = [{'ANY_EXERCICI':y,'TIPUS_PARTIDA':s,'TIPUS_CLASSIF':'E','NIVELL':'1','CODI_PANTALLA':str(c),'DESCRIPCIO':f'Capítol {c}','IMPORT':'100,00'} for y in range(2022,2027) for s in ['I','D'] for c in range(1,10)]
        rows.append({**rows[0], 'NIVELL':'2','IMPORT':'99999,00'})
        rows.append({**rows[0], 'TIPUS_CLASSIF':'F','IMPORT':'99999,00'})
        normalized = m.normalize_budget(rows, [], '2026-10-13')
        self.assertEqual(len(normalized),90)
        self.assertEqual(sum(r['initialCents'] for r in normalized),900000)
        self.assertTrue(all(r['executedCents'] is None for r in normalized))
        with self.assertRaisesRegex(ValueError,'duplicat'): m.normalize_budget(rows + [rows[0]], [], '2026-10-13')

    def test_agenda_not_transcription(self):
        text = '<span class="sessionSummary"><p>6.- Aprovar modificació del contracte CONT2400054.</p><p>7.- Bonificació a persona de prova.</p></span></div><p>8.- Contracte fora de l’ordre del dia.</p>'
        self.assertEqual(m.parse_agenda(text), [{'number':'6','title':'Aprovar modificació del contracte CONT2400054.','expedients':['CONT2400054']}])
        self.assertEqual(m.parse_agenda('<span class="sessionSummary"><div>1.- Aprovar un conveni sobre reclamacions individuals.</div><div>2.- Modificació de nomenaments personals.</div></span>'), [])

    def test_atomic_versioning_and_idempotence(self):
        data = self.catalog()
        with self.temporary_root() as d:
            root = Path(d)
            self.assertEqual(m.publish(copy.deepcopy(data),root),2)
            initial = json.loads((root / 'public/data/catalog.json').read_text(encoding='utf-8'))
            self.assertEqual(len(initial['changes']), 2)
            self.assertTrue(all('recordId' not in c and 'fields' not in c for c in initial['changes']))
            initial_changes = initial['changes']
            data['generatedAt'] = '2026-10-14'
            for section in ['contracts','sessions']: data[section][0]['capturedAt'] = '2026-10-14'
            self.assertEqual(m.publish(copy.deepcopy(data),root),0)
            unchanged = json.loads((root / 'public/data/catalog.json').read_text(encoding='utf-8'))
            self.assertEqual(unchanged['changes'], initial_changes)
            with closing(sqlite3.connect(root / 'dades/observatori.sqlite')) as db: self.assertEqual(db.execute('SELECT count(*) FROM versions').fetchone()[0],2)
            original = (root / 'public/data/catalog.json').read_bytes()
            invalid = copy.deepcopy(data); invalid['contracts'][0]['url'] = 'javascript:alert(1)'
            with self.assertRaises(ValueError): m.publish(invalid,root)
            self.assertEqual(original,(root / 'public/data/catalog.json').read_bytes())
            data['contracts'][0]['amountCents'] = 200
            self.assertEqual(m.publish(copy.deepcopy(data),root),1)
            loaded = json.loads((root / 'public/data/catalog.json').read_text(encoding='utf-8'))
            self.assertEqual(loaded['changes'], [{'date':'2026-10-14', 'source':'contracts', 'kind':'modificats', 'description':'Registre modificat.', 'recordId':'test', 'fields':[{'field':'amountCents', 'before':100, 'after':200}]}])
            with closing(sqlite3.connect(root / 'dades/observatori.sqlite')) as db: self.assertEqual(db.execute('SELECT count(*) FROM versions').fetchone()[0],3)

    def test_text_fields_never_duplicate_values(self):
        data = self.catalog(contracts=[self.record(supplier='EMPRESA DE PROVA SL', agenda=['punt antic'])])
        with self.temporary_root() as d:
            root = Path(d); m.publish(copy.deepcopy(data), root)
            current = data['contracts'][0]
            current.update(title='Text substituït', supplier='ALTRA EMPRESA SL', agenda=['punt nou'], url='https://example.org/nou', capturedAt='2026-10-14')
            data['generatedAt'] = '2026-10-14'
            self.assertEqual(m.publish(copy.deepcopy(data), root), 1)
            change = json.loads((root / 'public/data/catalog.json').read_text(encoding='utf-8'))['changes'][0]
            by_field = {item['field']: item for item in change['fields']}
            for field in ['title', 'supplier', 'agenda', 'url']:
                self.assertEqual(by_field[field], {'field':field})

    def test_removal_is_only_an_anonymous_count(self):
        removed = self.record('retirat-secret', title='Text retirat confidencial', url='https://example.org/retirat-secret')
        data = self.catalog(contracts=[self.record('vigent'), removed])
        with self.temporary_root() as d:
            root = Path(d); m.publish(copy.deepcopy(data), root)
            data['contracts'] = [self.record('vigent', capturedAt='2026-10-14')]
            data['sessions'][0]['capturedAt'] = '2026-10-14'; data['generatedAt'] = '2026-10-14'
            self.assertEqual(m.publish(copy.deepcopy(data), root), 1)
            public_text = (root / 'public/data/catalog.json').read_text(encoding='utf-8')
            change = json.loads(public_text)['changes'][0]
            self.assertEqual(change, {'date':'2026-10-14', 'source':'contracts', 'kind':'no observats', 'description':'1 registres no observats.'})
            self.assertNotIn('retirat-secret', public_text)
            self.assertNotIn('Text retirat confidencial', public_text)

    def test_all_modified_records_are_addressable(self):
        data = self.catalog(contracts=[self.record('contract-1'), self.record('contract-2')])
        with self.temporary_root() as d:
            root = Path(d); m.publish(copy.deepcopy(data), root)
            data['generatedAt'] = '2026-10-14'
            for index, record in enumerate(data['contracts'], start=1):
                record.update(amountCents=100 + index, capturedAt='2026-10-14')
            data['sessions'][0]['capturedAt'] = '2026-10-14'
            self.assertEqual(m.publish(copy.deepcopy(data), root), 2)
            changes = json.loads((root / 'public/data/catalog.json').read_text(encoding='utf-8'))['changes']
            self.assertEqual([c['recordId'] for c in changes], ['contract-1', 'contract-2'])
            self.assertTrue(all(c['kind'] == 'modificats' and c['fields'][0]['field'] == 'amountCents' for c in changes))

    def test_change_validation_rejects_text_history(self):
        data = self.catalog()
        data['changes'] = [{'date':'2026-10-14', 'source':'contracts', 'kind':'modificats', 'description':'Registre modificat.', 'recordId':'test', 'fields':[{'field':'title', 'before':'antic', 'after':'nou'}]}]
        with self.assertRaisesRegex(ValueError, 'no publicable'):
            m.validate(data)

    def test_real_budget_reconciliation(self):
        path = Path(__file__).parents[1] / 'public/data/catalog.json'
        if not path.exists(): self.skipTest('Encara no hi ha captura real')
        data = json.loads(path.read_text(encoding='utf-8'))
        # PDF municipal estat_dexecucio_per_trimestres_2024.pdf, 31/12/2024.
        expected = {'1':(1221277775,1265382261,1197038653),'2':(1370563633,1384583014,1152282262),'3':(7828200,7828200,5441301),'4':(152574392,161854851,141586259)}
        for chapter, amounts in expected.items():
            row = next(r for r in data['budget'] if r['year']==2024 and r['side']=='despeses' and r['chapter']==chapter)
            self.assertEqual(tuple(row[f] for f in ['initialCents','finalCents','executedCents']),amounts)

if __name__ == '__main__': unittest.main()
