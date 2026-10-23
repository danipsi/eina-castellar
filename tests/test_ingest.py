import copy
from contextlib import closing, redirect_stderr
import importlib.util
import io
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest import mock

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

    def budget_rows(self, period=m.PERIOD):
        return [{'ANY_EXERCICI':y,'TIPUS_PARTIDA':s,'TIPUS_CLASSIF':'E','NIVELL':'1','CODI_PANTALLA':str(c),'DESCRIPCIO':f'Capítol {c}','IMPORT':'100,00'} for y in m.period_years(period) for s in ['I','D'] for c in range(1,10)]

    def liquidation_rows(self, years):
        return [{'ANY_EXERCICI':y,'TIPUS_PARTIDA':s,'CODI_CAPITOL':str(c),'CAPITOL':f'Capítol {c}','IMPORT_PRESSU_FINAL':'120,00','IMPORT_LIQUIDAT':'90,00'} for y in years for s in ['I','D'] for c in range(1,10)]

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

    def test_cpv_keeps_the_main_code(self):
        self.assertEqual(m.cpv('85121270-6'), '85121270-6')
        self.assertEqual(m.cpv('90922000-6||90923000-3'), '90922000-6')
        self.assertEqual(m.cpv('71311000'), '71311000')
        self.assertIsNone(m.cpv(''))
        self.assertIsNone(m.cpv('123456789'))

    def test_term_keeps_only_what_the_source_states(self):
        self.assertEqual(m.term('27/02/2025 a 26/02/2027'), ('2025-02-27', '2027-02-26', None))
        self.assertEqual(m.term('2 anys'), (None, None, 'P2Y'))
        self.assertEqual(m.term('3 mesos 15 dies'), (None, None, 'P3M15D'))
        self.assertEqual(m.term('1 mes'), (None, None, 'P1M'))
        for unclear in ['', None, '2 anys prorrogables', '31/02/2025 a 01/03/2025', '01/03/2026 a 01/02/2026', '0 dies']:
            self.assertEqual(m.term(unclear), (None, None, None))
        self.assertEqual(m.rpc_duration({'anys_durada': '1', 'mesos_durada': '0', 'dies_durada': '1'}), 'P1Y1D')
        self.assertIsNone(m.rpc_duration({'anys_durada': '0', 'mesos_durada': '0', 'dies_durada': '0'}))

    def test_suppliers_publish_only_legal_entities(self):
        # Dades inventades: NIF i noms no corresponen a cap persona ni empresa real.
        providers = [
            {'EXERCICI': 2024, 'NOM_EMPRESA': 'EMPRESA ALFA SL', 'CIF_EMPRESA': 'B12345678', 'IMPORT': '1.200,50 €'},
            {'EXERCICI': 2024, 'NOM_EMPRESA': 'AJUNTAMENT VEÍ', 'CIF_EMPRESA': 'P0800000A', 'IMPORT': '50,00 €'},
            {'EXERCICI': 2024, 'NOM_EMPRESA': 'PERSONA INVENTADA', 'CIF_EMPRESA': '***1234**', 'IMPORT': '30,00 €'},
            {'EXERCICI': 2024, 'NOM_EMPRESA': 'COGNOM I COGNOM SCP', 'CIF_EMPRESA': 'J12345678', 'IMPORT': '20,00 €'},
            {'EXERCICI': 2019, 'NOM_EMPRESA': 'EMPRESA ALFA SL', 'CIF_EMPRESA': 'B12345678', 'IMPORT': '10,00 €'},
        ]
        invoice = lambda name, amount, day='2024-03-01T00:00:00', year=2024: {'EXERCICI': year, 'NOM_EMISSOR': name, 'IMPORT_FACTURA': amount, 'DATA_FACTURA': day, 'NUM_FACTURA': 'F1'}
        invoices = [invoice('EMPRESA ALFA SL', '1.000,00 €'), invoice('EMPRESA ALFA SL', '200,50 €', '1923-07-19T00:00:00'), invoice('AJUNTAMENT VEÍ', '50,00 €'), invoice('PERSONA INVENTADA', '30,00 €'), invoice('COGNOM I COGNOM SCP', '20,00 €'), invoice('EMPRESA ALFA SL', '10,00 €', year=2019)]
        rows, reconciled = m.normalize_suppliers(invoices, providers, '2026-10-15')
        self.assertTrue(reconciled)
        by_name = {r['name']: r for r in rows}
        self.assertEqual(set(by_name), {'EMPRESA ALFA SL', 'AJUNTAMENT VEÍ', None})
        alfa = by_name['EMPRESA ALFA SL']
        self.assertEqual((alfa['category'], alfa['invoices'], alfa['invoicedCents'], alfa['maxInvoiceCents'], alfa['firstDate'], alfa['lastDate']), ('societat', 2, 120050, 100000, '2024-03-01', '2024-03-01'))
        self.assertEqual(by_name['AJUNTAMENT VEÍ']['category'], 'administració o ens públic')
        others = by_name[None]
        self.assertEqual((others['category'], others['emitters'], others['invoicedCents'], others['url']), (m.UNNAMED, 2, 5000, m.INVOICES_DATASET))
        published = json.dumps(rows, ensure_ascii=False)
        for hidden in ['PERSONA INVENTADA', 'COGNOM', 'B12345678', '1234']:
            self.assertNotIn(hidden, published)
        self.assertNotIn(2019, {r['year'] for r in rows})
        _, reconciled = m.normalize_suppliers(invoices[1:], providers, '2026-10-15')
        self.assertFalse(reconciled)

    def test_grants_hide_people_and_count_repeated_rows_once(self):
        # Dades inventades: NIF i noms no corresponen a cap persona ni entitat real.
        row = lambda who, amount, title='Resolució de convocatòria de subvencions 2024', day='2024-07-01T00:00:00': {'DATA_DE_CONCESSIO': day, 'TITOL': title, 'IMPORT': amount, 'BENEFICIARI': who}
        rows = [
            row('G12345678 ENTITAT ALFA', '1500'), row('G12345678 ENTITAT ALFA', '1500'), row('G12345678 ENTITAT ALFA', '700', 'Resolució per la qual es convoquen subvencions 2024'),
            row('***1234** PERSONA INVENTADA', '300', 'Acord de concessió directa a autònoms'), row('****5678* ALTRA PERSONA', '200', 'Acord de concessió directa a autònoms'),
            row('J12345678 COGNOM I COGNOM SCP', '100', 'Acord de concessió directa a autònoms'),
            row('G87654321 CLUB BETA', '900', 'Acord de subvenció nominativa amb conveni CONV2400007'),
            row('G12345678 ENTITAT ALFA', '50', day='2019-01-01T00:00:00'),
        ]
        records, repeated = m.normalize_grants(rows, '2026-10-15')
        self.assertEqual(repeated, 1)
        alfa = sorted((r for r in records if r['beneficiary'] == 'ENTITAT ALFA'), key=lambda r: r['amountCents'])
        self.assertEqual([(r['amountCents'], r['repeated'], r['procedure']) for r in alfa], [(70000, 0, 'convocatòria'), (150000, 1, 'convocatòria')])
        others = [r for r in records if r['beneficiary'] is None]
        self.assertEqual([(r['grants'], r['amountCents'], r['category'], r['url']) for r in others], [(3, 60000, m.UNNAMED, m.GRANTS_DATASET)])
        beta = next(r for r in records if r['beneficiary'] == 'CLUB BETA')
        self.assertEqual((beta['procedure'], beta['agreement'], beta['category']), ('sense convocatòria', 'CONV2400007', 'entitat'))
        published = json.dumps(records, ensure_ascii=False)
        for hidden in ['PERSONA', 'COGNOM', 'G12345678', '1234', '5678']:
            self.assertNotIn(hidden, published)
        self.assertNotIn(2019, {r['year'] for r in records})

    def test_agreements_keep_declared_validity(self):
        row = lambda code, start, end, status='En curs', extendable='Sí': {'CODI_EXPEDIENT': code, 'TITOL': f'Conveni {code}', 'DESCRIPCIO': None, 'DATA_INICI': start, 'DATA_FINAL': end, 'ESTAT': status, 'PRORROGABLE': extendable}
        records = m.normalize_agreements([row('CONV2400001', '2024-01-01T00:00:00', '2024-12-31T00:00:00'), row('CONV2400002', '2024-01-01T00:00:00', None, extendable='N'), row('CONV2400003', '2024-01-01T00:00:00', '1900-01-01T00:00:00', extendable=None), row('CONV2400004', '2024-11-03T00:00:00', '2024-06-06T00:00:00', 'Finalitzat', 'No')], '2026-10-15')
        self.assertEqual([(r['end'], r['endIssue'], r['extendable']) for r in records], [('2024-12-31', None, True), (None, 'absent', False), (None, 'sentinella', None), ('2024-06-06', 'anterior a l’inici', False)])
        self.assertTrue(all(r['url'].startswith('https://') and r['code'] in r['url'] for r in records))
        with self.assertRaises(ValueError):
            m.normalize_agreements([row('CONV2400001', None, None), row('CONV2400001', None, None)], '2026-10-15')

    def test_peers_group_population_and_amounts(self):
        # Dades inventades amb l'estructura JSON-stat de l'Idescat i les files de l'AOC.
        codes = ['080517', '089999', '250001', '170002']
        values = [24933, 16000, 900, 40000, 25422, 14900, 950, 34000]
        dataset = {'id': ['YEAR', 'MUN', 'SEX', 'CONCEPT'], 'size': [2, 4, 1, 1], 'value': values, 'dimension': {'YEAR': {'category': {'index': ['2022', '2025']}}, 'MUN': {'category': {'index': codes, 'label': dict(zip(codes, ['Castellar del Vallès', 'Poble Alfa', 'Poble Beta', 'Ciutat Gamma']))}}}}
        period = {'startYear': 2022, 'endYear': 2026, 'latestLiquidationYear': 2025}
        latest, group = m.peer_group(m.parse_population(dataset), period)
        # El grup es fixa amb el padró més recent: Alfa en surt (14.900) i Gamma hi entra (34.000).
        self.assertEqual((latest, sorted(group)), (2025, ['080517', '170002']))
        self.assertEqual(group['080517']['population'], {'2022': 24933, '2025': 25422})
        ens = m.ens_codes([{'CODI_ENS': 805170005, 'NOM_COMPLERT': 'Ajuntament de Castellar del Vallès'}, {'CODI_ENS': 1700020001, 'NOM_COMPLERT': 'Ajuntament de Ciutat Gamma'}, {'CODI_ENS': 1700020002, 'NOM_COMPLERT': 'Consorci de Ciutat Gamma'}], group)
        self.assertEqual(ens, {'080517': '805170005', '170002': '1700020001'})
        initial = [{'CODI_ENS': '805170005', 'ANY_EXERCICI': '2025', 'TIPUS_PARTIDA': 'D', 'CODI_PANTALLA': str(c), 'IMPORT': '100,00'} for c in range(1, 10)]
        initial += [{'CODI_ENS': '1700020001', 'ANY_EXERCICI': '2025', 'TIPUS_PARTIDA': 'D', 'CODI_PANTALLA': str(c), 'IMPORT': '50,50'} for c in range(1, 5)]
        liquidation = [{'CODI_ENS': 805170005, 'ANY_EXERCICI': 2025, 'TIPUS_PARTIDA': 'D', 'CODI_CAPITOL': c, 'IMPORT_PRESSU_FINAL': 120.5, 'IMPORT_LIQUIDAT': 90} for c in range(1, 10)]
        peers = m.normalize_peers(group, ens, initial, liquidation, latest, '2026-10-15', period)
        m.validate_peers(peers)
        gamma = next(r for r in peers['rows'] if r['code'] == '170002')
        # Un capítol no informat queda sense import, no a zero.
        self.assertEqual(gamma['initialCents'], [5050] * 4 + [None] * 5)
        self.assertEqual(gamma['executedCents'], [None] * 9)
        own = next(r for r in peers['rows'] if r['code'] == '080517')
        self.assertEqual((own['initialCents'][0], own['finalCents'][0], own['executedCents'][0]), (10000, 12050, 9000))
        budget = [{'year': 2025, 'side': 'despeses', 'chapter': str(c), 'initialCents': 10000, 'finalCents': 12050, 'executedCents': 9000} for c in range(1, 10)]
        m.check_peers(peers, budget)
        budget[3]['executedCents'] = 9001
        with self.assertRaises(ValueError): m.check_peers(peers, budget)
        with self.assertRaises(ValueError): m.normalize_peers(group, ens, initial + initial[:1], [], latest, '2026-10-15', period)
        with self.assertRaises(ValueError): m.peer_group({'089999': {'name': 'Poble Alfa', 'population': {'2025': 20000}}}, period)

    def test_new_section_is_summarised_once(self):
        data = self.catalog()
        with self.temporary_root() as d:
            root = Path(d); m.publish(copy.deepcopy(data), root)
            data['generatedAt'] = '2026-10-14'
            data['suppliers'] = [self.record(f'supplier-{i}', invoicedCents=100) for i in range(3)]
            self.assertEqual(m.publish(copy.deepcopy(data), root), 1)
            changes = json.loads((root / 'public/data/catalog.json').read_text(encoding='utf-8'))['changes']
            self.assertEqual(changes, [{'date': '2026-10-14', 'source': 'suppliers', 'kind': 'nous', 'description': '3 registres nous (captura inicial).'}])

    def test_new_schema_field_is_not_a_change(self):
        data = self.catalog()
        with self.temporary_root() as d:
            root = Path(d); m.publish(copy.deepcopy(data), root)
            data['generatedAt'] = '2026-10-14'
            data['contracts'][0].update(cpv='85121270-6', capturedAt='2026-10-14')
            data['sessions'][0]['capturedAt'] = '2026-10-14'
            self.assertEqual(m.publish(copy.deepcopy(data), root), 0)
            data['generatedAt'] = '2026-10-15'
            data['contracts'][0].update(cpv='71311000-1', capturedAt='2026-10-15')
            self.assertEqual(m.publish(copy.deepcopy(data), root), 1)

    def test_truncation(self):
        n = 0
        def response(url):
            nonlocal n
            n += 1
            return [{'total': '2'}] if n == 1 else []
        with self.assertRaisesRegex(ValueError, 'truncada'): m.socrata('test', 'test', 'test', response)

    def test_budget_hierarchy_and_duplicate(self):
        rows = self.budget_rows()
        rows.append({**rows[0], 'NIVELL':'2','IMPORT':'99999,00'})
        rows.append({**rows[0], 'TIPUS_CLASSIF':'F','IMPORT':'99999,00'})
        normalized = m.normalize_budget(rows, [], '2026-10-13')
        expected_count = len(m.period_years()) * 2 * 9
        self.assertEqual(len(normalized), expected_count)
        self.assertEqual(sum(r['initialCents'] for r in normalized), expected_count * 10000)
        self.assertTrue(all(r['executedCents'] is None for r in normalized))
        with self.assertRaisesRegex(ValueError,'duplicat'): m.normalize_budget(rows + [rows[0]], [], '2026-10-13')

    def test_budget_rejects_any_missing_initial_chapter(self):
        period = m.validate_period({'startYear': 2022, 'endYear': 2026, 'latestLiquidationYear': 2025})
        rows = self.budget_rows(period)
        with self.assertRaisesRegex(ValueError, 'falten 1 combinacions'):
            m.normalize_budget(rows[:-1], [], '2026-10-13', period)
        reduced = [row for row in rows if not (row['ANY_EXERCICI'] in (2023, 2025) and row['TIPUS_PARTIDA'] == 'D' and row['CODI_PANTALLA'] == '9')]
        with self.assertRaisesRegex(ValueError, 'falten 2 combinacions'):
            m.normalize_budget(reduced, [], '2026-10-13', period)

    def test_budget_keeps_partial_liquidations_and_null_values_explicit(self):
        period = m.validate_period({'startYear': 2022, 'endYear': 2026, 'latestLiquidationYear': 2025})
        initial = self.budget_rows(period)
        initial[0]['IMPORT'] = None
        liquidation = self.liquidation_rows([period['startYear']])
        normalized = m.normalize_budget(initial, liquidation, '2026-10-13', period)
        present = next(row for row in normalized if row['year'] == period['startYear'] and row['side'] == 'despeses' and row['chapter'] == '1')
        absent = next(row for row in normalized if row['year'] == period['startYear'] + 1 and row['side'] == 'despeses' and row['chapter'] == '1')
        null_initial = next(row for row in normalized if row['year'] == period['startYear'] and row['side'] == 'ingressos' and row['chapter'] == '1')
        self.assertEqual((present['finalCents'], present['executedCents']), (12000, 9000))
        self.assertEqual((absent['finalCents'], absent['executedCents']), (None, None))
        self.assertIsNone(null_initial['initialCents'])
        with self.assertRaisesRegex(ValueError, 'liquidat duplicat'):
            m.normalize_budget(self.budget_rows(period), liquidation + [liquidation[0]], '2026-10-13', period)

    def test_period_configuration_is_validated_and_drives_filters(self):
        period = m.validate_period({'startYear': 2020, 'endYear': 2022, 'latestLiquidationYear': 2021})
        self.assertEqual(list(m.period_years(period)), [2020, 2021, 2022])
        self.assertEqual(list(m.period_years(period, liquidation=True)), [2020, 2021])
        self.assertEqual(m.period_label(period), '2020–2022')
        rows = self.budget_rows(period)
        self.assertEqual(len(m.normalize_budget(rows, [], '2026-10-13', period)), 54)
        contracts = m.normalize_contracts([{'row_id':'1','codi_organ':'3411306','data_adjudicacio_contracte':'2022-01-01','codi_expedient':'CONT2200001','denominacio':'Contracte de prova'}], [], '2026-10-13', period)
        self.assertEqual([contract['year'] for contract in contracts], [2022])
        with self.assertRaisesRegex(ValueError, 'ordre'):
            m.validate_period({'startYear': 2025, 'endYear': 2024, 'latestLiquidationYear': 2024})

    def test_session_queries_follow_the_configured_period(self):
        period = m.validate_period({'startYear': 2020, 'endYear': 2022, 'latestLiquidationYear': 2021})
        session_url = 'https://actes.castellarvalles.cat/session/sessionDetail/abc123'
        listing = f'<div class="title" title="Sessió de prova">02/01/2022 12:00h <a href="{session_url}">Consulta</a></div>'
        queried = []
        original_get = m.get
        def fake_get(url, json_response=True):
            queried.append(url)
            return '<span class="sessionSummary"></span><p class="step-header">Acta</p><a href="/session/downloadItem/def456">PDF</a>' if url == session_url else listing
        links = {}
        try:
            m.get = fake_get
            sessions = m.collect_sessions('2026-10-13', period, links)
        finally:
            m.get = original_get
        self.assertEqual(list(links.values()), [m.ACTES + '/session/downloadItem/def456'])
        fragment_queries = [url for url in queried if '/session/fragmentCustom?' in url]
        self.assertEqual(len(sessions), 2)
        self.assertEqual(len(fragment_queries), 8)
        self.assertTrue(any('startDate=01%2F01%2F2020' in url and 'endDate=31%2F12%2F2022' in url for url in fragment_queries))
        self.assertFalse(any('2023' in url or '2026' in url for url in fragment_queries))

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

class MotionVoteTests(unittest.TestCase):
    MINUTES = '\n'.join([
        'ORDRE DEL DIA', '1.- Aprovació acta anterior.', '2.- Moció presentada pel grup municipal A que porta per títol: Moció per millorar els parcs.',
        '3.- Moció presentada pel grup municipal B que porta per títol: Moció sobre la biblioteca.', '4.- Moció presentada pel grup municipal A per a la neteja.',
        '5.- Moció presentada pel grup municipal C sobre el transport.', '6.- Precs i preguntes.', 'DESENVOLUPAMENT',
        '1.- Aprovació acta anterior.', 'VOTACIÓ: S’aprova per unanimitat.', 'Es pot consultar aquest punt mitjançant l’enllaç següent:',
        '2.- Moció presentada pel grup municipal A que porta per títol: Moció per millorar els parcs.', 'ACORDS', '1. Revisar els parcs.', '3. Fer-ne el manteniment.',
        'VOTACIÓ URGÈNCIA: Aprovada per Unanimitat.', 'VOTACIÓ de la introducció d’esmenes: S’aprova per UNANIMITAT.',
        'VOTACIÓ: S’aprova per Majoria segons els vots següents:', 'Vots en contra: 0 (ZERO)', 'Abstencions: 4 (QUATRE) del grup B', 'Vots a favor: 16 (SETZE) dels grups A i C',
        'Es pot visualitzar aquest punt a l’enllaç següent:',
        '3.- Moció presentada pel grup municipal B que porta per títol: Moció sobre la biblioteca.', 'La moció queda sobre la taula, amb l’assentiment unànime del ple.',
        'Es pot visualitzar aquest punt a l’enllaç següent:',
        '4.- Moció presentada pel grup municipal A per a la neteja.', 'Sentit de l’acord: La moció NO s’aprova amb el resultat de vots següents: Vots en contra: TRETZE (13)',
        'Es pot visualitzar aquest punt a l’enllaç següent:',
        '5.- Moció presentada pel grup municipal C sobre el transport.', 'Text de la moció sense resultat llegible.',
        'Es pot visualitzar aquest punt a l’enllaç següent:', '6.- Precs i preguntes.', 'VOTACIÓ: S’aprova per unanimitat.'])
    AGENDA = [{'number': '1', 'title': 'Aprovació acta anterior.', 'expedients': []},
              {'number': '2', 'title': 'Moció presentada pel grup municipal A que porta per títol: Moció per millorar els parcs.', 'expedients': []},
              {'number': '3', 'title': 'Moció presentada pel grup municipal B que porta per títol: Moció sobre la biblioteca.', 'expedients': []},
              {'number': '4', 'title': 'Moció presentada pel grup municipal A per a la neteja.', 'expedients': []},
              {'number': '5', 'title': 'Moció presentada pel grup municipal C sobre el transport.', 'expedients': []}]

    def test_reads_the_final_result_of_each_motion(self):
        self.assertEqual(m.motion_results(self.MINUTES, self.AGENDA), [
            {'number': '2', 'result': 'aprovada amb esmenes', 'majority': 'majoria'},
            {'number': '3', 'result': 'sobre la taula', 'majority': None},
            {'number': '4', 'result': 'rebutjada', 'majority': None}])

    def test_result_wording_variants(self):
        self.assertEqual(m.classify_point('VOTACIÓ: Introducció d’esmenes: S’aprova per UNANIMITAT Moció: S’aprova per Unanimitat.'), {'result': 'aprovada amb esmenes', 'majority': 'unanimitat'})
        self.assertEqual(m.classify_point('VOTACIÓ: La proposta fou aprovada per Majoria amb els vots següents'), {'result': 'aprovada', 'majority': 'majoria'})
        self.assertEqual(m.classify_point('VOTACIÓ: NO FOU APROVADA, amb la votació següent'), {'result': 'rebutjada', 'majority': None})
        self.assertEqual(m.classify_point('VOTACIÓ: text esmenat: Aprovat per UNANIMITAT'), {'result': 'aprovada amb esmenes', 'majority': 'unanimitat'})
        self.assertEqual(m.classify_point('El grup proposant decideix retirar de l’ordre del dia la moció que es va deixar damunt la taula.'), {'result': 'retirada', 'majority': None})
        self.assertEqual(m.classify_point('VOTACIÓ: Donat compte.'), None)
        self.assertEqual(m.classify_point('VOTACIÓ:\nIntroducció d’esmenes: Aprovada per Unanimitat\nSentit de l’acord: La moció fou aprovada per Unanimitat'), {'result': 'aprovada amb esmenes', 'majority': 'unanimitat'})
        self.assertEqual(m.classify_point('VOTACIÓ: Votada la introducció d’esmenes d’aquest tema s’aprova per unanimitat, s’inclouen a la proposta, a continuació posada en votació: Favorable per Unanimitat.'), {'result': 'aprovada amb esmenes', 'majority': 'unanimitat'})
        self.assertEqual(m.classify_point('VOTACIÓ: Votada la urgència d’aquest tema s’aprova per unanimitat, s’inclou en l’ordre del dia de la sessió, a continuació posat en votació: NO s’aprova, amb els vots següents:'), {'result': 'rebutjada', 'majority': None})
        self.assertEqual(m.classify_point('VOTACIÓ: text moció inicial, s’aprova per Majoria segons els vots següents:'), {'result': 'aprovada', 'majority': 'majoria'})
        self.assertEqual(m.classify_point('A proposta del grup municipal A, la moció es deixa a sobre de la taula.'), {'result': 'sobre la taula', 'majority': None})
        self.assertEqual(m.classify_point('Es retiren de l’ordre del dia per acord de la junta de portaveus.'), {'result': 'retirada', 'majority': None})
        self.assertEqual(m.classify_point('Es retira de l’ordre del dia'), {'result': 'retirada', 'majority': None})

    def test_subpoints_have_their_own_result(self):
        # «5.1» és una esmena a la totalitat de la moció 5; «6.1» i «6.2» són mocions urgents.
        point5 = '5.- Moció presentada pel grup municipal B i que porta per títol: Moció de suport al sector educatiu.'
        point51 = '5.1.- D’acord amb l’article 98 ROM, la moció presentada pel grup municipal C s’incorpora a l’ordre del dia com a esmena a la totalitat a la moció del grup B.'
        point61, point62 = '6.1   Moció presentada pel grup municipal A que porta per títol "Moció de suport al comerç".', '6.2   Moció presentada pel grup municipal C amb el títol "Moció pel tren".'
        link = 'Es pot consultar aquest punt mitjançant l’enllaç següent:'
        minutes = '\n'.join([point5, point51, '6.- Proposicions i mocions sobrevingudes.', point61, point62, '7.- Precs i preguntes.', 'DESENVOLUPAMENT',
            point5, 'El contingut de la moció és el que es transcriu a continuació.', point51, 'El contingut de l’esmena és el que es transcriu a continuació.',
            'VOTACIÓ de la introducció d’esmenes a la totalitat d’acord amb l’article 98 ROM: No s’aproven per Majoria segons els vots següents:',
            'VOTACIÓ: text moció inicial, s’aprova per Majoria segons els vots següents:', link, '6.- Proposicions i mocions sobrevingudes.',
            point61, 'VOTACIÓ: Votada la urgència d’aquest tema s’aprova per unanimitat, s’inclou en l’ordre del dia de la sessió, a continuació posat en votació: Favorable per Unanimitat.', link,
            point62, 'VOTACIÓ: Votada la urgència d’aquest tema s’aprova per unanimitat, s’inclou en l’ordre del dia de la sessió, a continuació posat en votació: NO s’aprova, amb els vots següents:', link,
            '7.- Precs i preguntes.'])
        agenda = [{'number': '5', 'title': point5[4:]}, {'number': '5', 'title': point51[2:]}, {'number': '6', 'title': 'Proposicions i mocions sobrevingudes.'},
                  {'number': '6', 'title': '1 ' + point61[6:]}, {'number': '6', 'title': '2 ' + point62[6:]}, {'number': '7', 'title': 'Precs i preguntes.'}]
        self.assertEqual([m.point_key(a) for a in agenda], ['5', '5.1', '6', '6.1', '6.2', '7'])
        self.assertEqual(m.motion_results(minutes, agenda), [
            {'number': '5', 'result': 'aprovada', 'majority': 'majoria'}, {'number': '5.1', 'result': 'rebutjada', 'majority': 'majoria'},
            {'number': '6.1', 'result': 'aprovada', 'majority': 'unanimitat'}, {'number': '6.2', 'result': 'rebutjada', 'majority': None}])
        self.assertEqual(m.point_key({'number': '3', 'title': '1r pla de mobilitat'}), '3')

    def test_point_renumbered_in_the_minutes_is_found_by_its_title(self):
        # Un punt afegit a la sessió desplaça la numeració: la moció 10 de l'ordre del dia és l'11 a l'acta.
        motion = 'Moció presentada pel grup municipal A i que porta per títol: Moció per recuperar els cursets de natació de primer.'
        link = 'Es pot consultar aquest punt mitjançant l’enllaç següent:'
        minutes = '\n'.join(['10.- ' + motion, '11.- Proposicions i mocions sobrevingudes.', 'DESENVOLUPAMENT', '10.- Aprovar una distinció a una entitat.', 'VOTACIÓ: S’aprova per unanimitat.', link,
                             '11.- ' + motion, 'VOTACIÓ: No s’aprova per Majoria segons els vots següents:', link, '12.- Proposicions i mocions sobrevingudes.'])
        self.assertEqual(m.motion_results(minutes, [{'number': '10', 'title': motion}]), [{'number': '10', 'result': 'rebutjada', 'majority': 'majoria'}])

    def test_minutes_link_comes_from_the_acta_block(self):
        page = '<p class="step-header"> Convocatòria </p><a href="/session/downloadItem/aaa1">Ordre</a><p class="step-header"> Acta </p><div><a class="btn" href="/session/downloadItem/bbb2" title="Acta.pdf">Acta</a>'
        self.assertEqual(m.minutes_link(page), m.ACTES + '/session/downloadItem/bbb2')
        self.assertIsNone(m.minutes_link(page.split('<p class="step-header"> Acta')[0]))

    def test_votes_reuse_minutes_already_read_and_validate(self):
        sessions = [{'id': 's1', 'body': 'Ple', 'agenda': self.AGENDA}, {'id': 's2', 'body': 'Ple', 'agenda': self.AGENDA}, {'id': 'j1', 'body': 'Junta de Govern', 'agenda': []}]
        url = m.ACTES + '/session/downloadItem/'
        read = []
        votes = m.collect_votes(sessions, {'s1': url + 'a1', 'j1': url + 'x'}, '2026-10-16', fetch=lambda u: read.append(u) or u, read=lambda u: self.MINUTES)
        self.assertEqual(read, [url + 'a1'])
        self.assertEqual([v['number'] for v in votes['results']], ['2', '3', '4'])
        m.validate_votes(votes, sessions)
        again = m.collect_votes(sessions, {'s1': url + 'a1', 's2': url + 'a2'}, '2026-10-17', votes, fetch=lambda u: read.append(u) or u, read=lambda u: self.MINUTES)
        self.assertEqual(read, [url + 'a1', url + 'a2'])
        self.assertEqual(again['read'][0]['capturedAt'], '2026-10-16')
        self.assertEqual(len(again['results']), 6)
        broken = copy.deepcopy(again); broken['results'][0]['result'] = 'aprovada per sorpresa'
        with self.assertRaises(ValueError): m.validate_votes(broken, sessions)
        broken = copy.deepcopy(again); broken['results'][0]['number'] = '9'
        with self.assertRaises(ValueError): m.validate_votes(broken, sessions)
        broken = copy.deepcopy(again); broken['read'][0]['url'] = 'https://example.org/acta.pdf'
        with self.assertRaises(ValueError): m.validate_votes(broken, sessions)

class PublicationPageTests(unittest.TestCase):
    def test_execucio_enllaca_pagina_publica_si_lexpedient_es_inequivoc(self):
        page = 'https://contractaciopublica.cat/ca/detall-publicacio/{}/300508373'
        uuid, other = '10708302-4564-4a07-9b34-2a4c1ed860a1', '20708302-4564-4a07-9b34-2a4c1ed860a2'
        pages = m.publication_pages([{'expedient': 'CONT2300053', 'url': page.format(uuid)}, {'expedient': 'CONT2300053', 'url': page.format(uuid)},
                                     {'expedient': 'CONT2400001', 'url': page.format(uuid)}, {'expedient': 'CONT2400001', 'url': page.format(other)}])
        self.assertEqual(pages, {'CONT2300053': uuid})
        json_url = 'https://contractaciopublica.cat/portal-api/documents-publicacio/json/300828470'
        self.assertEqual(m.public_page(json_url, 'CONT2300053', pages), f'https://contractaciopublica.cat/ca/detall-publicacio/{uuid}/300828470')
        self.assertEqual(m.public_page(json_url, 'CONT2400001', pages), json_url)
        self.assertEqual(m.public_page('https://analisi.transparenciacatalunya.cat/resource/8idu-wkjv.json', 'CONT2300053', pages), 'https://analisi.transparenciacatalunya.cat/resource/8idu-wkjv.json')
        self.assertEqual(m.changed_fields({'url': json_url}, {'url': m.public_page(json_url, 'CONT2300053', pages)}), [])
        self.assertEqual(m.changed_fields({'url': json_url}, {'url': json_url.replace('300828470', '300828471')}), [{'field': 'url'}])

    def test_font_caiguda_es_reintenta_i_lerror_diu_quina_font_ha_fallat(self):
        calls = []
        def down(request, timeout):
            calls.append(request.full_url)
            raise m.urllib.error.HTTPError(request.full_url, 503, 'Service Unavailable', {}, None)
        waits = []
        with mock.patch.object(m.urllib.request, 'urlopen', down), mock.patch.object(m.time, 'sleep', waits.append), redirect_stderr(io.StringIO()):
            with self.assertRaises(RuntimeError) as error:
                m.labelled('Pressupost inicial (AOC)', lambda: m.get('https://dadesobertes.example/api/action/datastore_search?resource_id=x'))
        self.assertEqual(len(calls), 3)
        self.assertEqual(waits, [30, 60])
        self.assertEqual(str(error.exception), 'Pressupost inicial (AOC): La font no respon amb el format esperat (HTTPError 503) · dadesobertes.example/api/action/datastore_search')

if __name__ == '__main__': unittest.main()
