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
        r = {'id':'test','title':'Títol públic','url':'https://example.org/document','capturedAt':'2026-10-13','amountCents':100}
        data = {'schemaVersion':1,'generatedAt':'2026-10-13','contracts':[r], 'sessions':[dict(r)],'events':[],'budget':[],'sources':[],'changes':[]}
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            self.assertEqual(m.publish(copy.deepcopy(data),root),2)
            data['generatedAt'] = '2026-10-14'
            for section in ['contracts','sessions']: data[section][0]['capturedAt'] = '2026-10-14'
            self.assertEqual(m.publish(copy.deepcopy(data),root),0)
            with closing(sqlite3.connect(root / 'dades/observatori.sqlite')) as db: self.assertEqual(db.execute('SELECT count(*) FROM versions').fetchone()[0],2)
            original = (root / 'public/data/catalog.json').read_bytes()
            invalid = copy.deepcopy(data); invalid['contracts'][0]['url'] = 'javascript:alert(1)'
            with self.assertRaises(ValueError): m.publish(invalid,root)
            self.assertEqual(original,(root / 'public/data/catalog.json').read_bytes())
            data['contracts'][0]['amountCents'] = 200
            self.assertEqual(m.publish(copy.deepcopy(data),root),1)
            with closing(sqlite3.connect(root / 'dades/observatori.sqlite')) as db: self.assertEqual(db.execute('SELECT count(*) FROM versions').fetchone()[0],3)
            data['contracts'][0]['title'] = 'Text substituït per privacitat'
            m.publish(copy.deepcopy(data),root)
            loaded = json.loads((root / 'public/data/catalog.json').read_text(encoding='utf-8'))
            self.assertEqual(loaded['contracts'][0]['title'],'Text substituït per privacitat')

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
