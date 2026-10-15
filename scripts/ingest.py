"""Captura municipal publicable. Només stdlib; cap credencial ni HTML cru desat.

Execució: py -3.13 scripts/ingest.py
La publicació és tot-o-res: una fallada conserva catalog.json i actualitza status.json.
"""
from __future__ import annotations
import argparse
from collections import Counter
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sqlite3
import sys
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PERIOD_PATH = ROOT / 'config' / 'period.json'

def validate_period(value):
    keys = {'startYear', 'endYear', 'latestLiquidationYear'}
    if not isinstance(value, dict) or set(value) != keys or any(type(value[key]) is not int for key in keys):
        raise ValueError('La configuració del període ha de contenir tres anys enters')
    start, end, latest = value['startYear'], value['endYear'], value['latestLiquidationYear']
    if start < 1900 or end > 9999 or not start <= latest <= end:
        raise ValueError('L’ordre dels anys del període no és vàlid')
    return {'startYear': start, 'endYear': end, 'latestLiquidationYear': latest}

def load_period(path=PERIOD_PATH):
    try:
        return validate_period(json.loads(path.read_text(encoding='utf-8')))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError('No s’ha pogut llegir la configuració del període') from error

PERIOD = load_period()

def period_years(period=PERIOD, liquidation=False):
    last = period['latestLiquidationYear'] if liquidation else period['endYear']
    return range(period['startYear'], last + 1)

def period_label(period=PERIOD, liquidation=False):
    years = period_years(period, liquidation)
    return f'{years.start}–{years.stop - 1}'

SOC = 'https://analisi.transparenciacatalunya.cat/resource/'
CKAN = 'https://dadesobertes.seu-e.cat/api/3/action/datastore_search?'
ACTES = 'https://actes.castellarvalles.cat'
BUDGET_ID = '595f8620-7a3c-4e38-8be2-7cffa744cd44'
LIQ_ID = '81f18313-547f-4c87-adbd-c6ce873cb406'
INVOICES_ID = '2e86b79d-b79d-4ae0-9f87-1a56f1c49a4f'
PROVIDERS_ID = 'b8c6a773-1cf2-4592-a9a2-92f30a645985'
INVOICES_DATASET = 'https://dadesobertes.seu-e.cat/dataset/castellardelvalles-factures'
# Tipus d'emissor segons la lletra inicial del NIF, que no es publica. Només es mostren noms de persones
# jurídiques amb denominació pròpia: societats civils i comunitats de béns poden dur noms de persones.
NIF_CATEGORIES = {**dict.fromkeys('AB', 'societat'), 'F': 'cooperativa', 'U': 'UTE', **dict.fromkeys('GR', 'entitat'), **dict.fromkeys('PQS', 'administració o ens públic'), **dict.fromkeys('NVW', 'altres persones jurídiques')}
UNNAMED = 'sense nom publicat'
GRANTS_ID = '30798421-5952-4420-a769-d1121beb6534'
GRANTS_DATASET = 'https://dadesobertes.seu-e.cat/dataset/cc-c-concessions-subvencions-i-ajuts-minhap'
AGREEMENTS_ID = 'a2ca7c35-3afa-41f4-87e6-1d1645d0291a'
AGREEMENTS_DATASET = 'https://dadesobertes.seu-e.cat/dataset/castellardelvalles-convenis-col-laboracio'
POPULATION_URL = 'https://api.idescat.cat/taules/v2/pmh/446/477/mun'
POPULATION_PAGE = 'https://www.idescat.cat/pub/?id=pmh'
CKAN_SQL = 'https://dadesobertes.seu-e.cat/api/3/action/datastore_search_sql?'
PEER_RANGE = (15000, 35000)
SELF_CODE = '080517'
PRIVATE = re.compile(r'\b(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', re.I)
SENSITIVE = re.compile(r'assetjament|discapaci|dependència|vulnerab|violència|ajut.{0,20}(?:social|urgència)|expedient.{0,20}disciplin|dades personals|menors d.edat|servei.{0,20}psico', re.I)
SECTIONS = ('contracts', 'events', 'budget', 'sessions', 'suppliers', 'grants', 'agreements')
CHANGE_KINDS = {'nous', 'modificats', 'no observats'}

def stamp():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')

def clean(value):
    value = html.unescape(re.sub(r'<[^>]+>', ' ', str(value or '')))
    return re.sub(r'\s+', ' ', PRIVATE.sub('[dada personal omesa]', value)).strip()

def public_title(value):
    value = clean(value)
    return 'Objecte no indexat per precaució de privacitat. Consulta la font.' if SENSITIVE.search(value) else value[:4000]

def cents(value):
    if value is None or str(value).strip() in ('', '-', 'null'):
        return None
    s = str(value).strip().replace('€', '').replace('\u00a0', '').replace(' ', '')
    if ',' in s:
        s = s.replace('.', '').replace(',', '.')
    try:
        d = Decimal(s)
        if not d.is_finite(): raise InvalidOperation
        return int((d * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    except (InvalidOperation, ValueError):
        raise ValueError('Format monetari inesperat; import no convertit silenciosament') from None

def iso(value):
    if not value: return None
    s = str(value)
    try:
        if re.match(r'^\d{4}-\d{2}-\d{2}', s): return date.fromisoformat(s[:10]).isoformat()
        if re.match(r'^\d{2}/\d{2}/\d{4}', s): return datetime.strptime(s[:10], '%d/%m/%Y').date().isoformat()
    except ValueError: pass
    raise ValueError('Format de data inesperat; no s’ha inferit ni corregit')

def url_value(value, fallback):
    value = value.get('url') if isinstance(value, dict) else value
    return value if isinstance(value, str) and value.startswith('https://') else fallback

def stable(*parts):
    return hashlib.sha256(json.dumps(parts, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:24]

def get(url, json_response=True):
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'ObservatoriCastellar/0.1 (public data research)', 'Accept': 'application/json' if json_response else 'text/html'})
            with urllib.request.urlopen(request, timeout=50) as r:
                body = r.read(25_000_001)
                if len(body) > 25_000_000: raise ValueError('Resposta massa gran')
                text = body.decode('utf-8-sig')
                return json.loads(text) if json_response else text
        except Exception:
            if attempt == 2: raise RuntimeError('La font no respon amb el format esperat') from None
            time.sleep(1 + attempt)

def socrata(dataset, where, fields, fetch=get):
    def endpoint(params): return SOC + dataset + '.json?' + urllib.parse.urlencode(params)
    count = int(fetch(endpoint({'$where': where, '$select': 'count(*) as total'}))[0]['total'])
    if not 0 < count < 50000: raise ValueError('Recompte Socrata fora dels límits previstos')
    rows = []
    while len(rows) < count:
        batch = fetch(endpoint({'$where': where, '$select': ':id as row_id,' + fields, '$order': ':id', '$limit': 1000, '$offset': len(rows)}))
        if not batch: raise ValueError('Resposta Socrata truncada')
        rows.extend(batch)
    final_count = int(fetch(endpoint({'$where': where, '$select': 'count(*) as total'}))[0]['total'])
    if len(rows) != count or final_count != count: raise ValueError('Recompte Socrata inconsistent')
    return rows

def ckan(resource, fetch=get):
    rows = []
    expected = None
    while expected is None or len(rows) < expected:
        u = CKAN + urllib.parse.urlencode({'resource_id': resource, 'filters': json.dumps({'CODI_ENS': '805170005'}), 'limit': 1000, 'offset': len(rows), 'sort': '_id asc'})
        response = fetch(u)
        if not response.get('success'): raise ValueError('Error declarat pel DataStore')
        result = response['result']
        total = int(result['total'])
        if expected is not None and total != expected: raise ValueError('Canvi de recompte durant la captura')
        expected = total
        if not 0 < expected < 50000: raise ValueError('Recompte DataStore inesperat')
        if not result['records']: raise ValueError('Resposta DataStore truncada')
        rows.extend(result['records'])
    if len(rows) != expected or any(str(r['CODI_ENS']) != '805170005' for r in rows): raise ValueError('Recompte o ens incorrecte')
    return rows

def company(value):
    s = clean(value)
    # Només formes societàries explícites. No deduir persones ni completar NIF.
    return s if re.search(r'\b(?:S\.?\s?L\.?\s?U?\.?|S\.?\s?A\.?\s?U?\.?|SCCL|S\.C\.C\.L\.|UTE)\s*$', s, re.I) else None

def cpv(value):
    # La PSCP pot llistar diversos codis separats per «||»; es conserva el principal (el primer).
    found = re.search(r'\b(\d{8})(?:-(\d))?\b', str(value or ''))
    return found[1] + ('-' + found[2] if found[2] else '') if found else None

UNITS = {'any': 'Y', 'anys': 'Y', 'mes': 'M', 'mesos': 'M', 'dia': 'D', 'dies': 'D'}

def iso_duration(years=0, months=0, days=0):
    parts = [(years, 'Y'), (months, 'M'), (days, 'D')]
    return 'P' + ''.join(f'{n}{u}' for n, u in parts if n) if any(n for n, _ in parts) else None

def term(value):
    # Durada tal com la publica la PSCP: «2 anys», «3 mesos 15 dies» o «dd/mm/aaaa a dd/mm/aaaa».
    # Retorna (inici, fi, durada ISO 8601); el que no s'entén queda buit, sense deduccions.
    s = clean(value).lower()
    found = re.fullmatch(r'(\d{2}/\d{2}/\d{4})\s+a\s+(\d{2}/\d{2}/\d{4})', s)
    if found:
        try: start, end = (datetime.strptime(x, '%d/%m/%Y').date().isoformat() for x in found.groups())
        except ValueError: return None, None, None
        return (start, end, None) if start <= end else (None, None, None)
    pieces = re.findall(r'(\d{1,3})\s*(anys?|mesos|mes|dies|dia)\b', s)
    if not pieces or re.sub(r'(\d{1,3})\s*(anys?|mesos|mes|dies|dia)\b|\s|,|\bi\b', '', s): return None, None, None
    amounts = {'Y': 0, 'M': 0, 'D': 0}
    for n, unit in pieces: amounts[UNITS[unit]] += int(n)
    return None, None, iso_duration(amounts['Y'], amounts['M'], amounts['D'])

def rpc_duration(r):
    try: return iso_duration(*(int(r.get(k) or 0) for k in ['anys_durada', 'mesos_durada', 'dies_durada']))
    except ValueError: return None

def normalize_contracts(pscp, rpc, capture, period=PERIOD):
    result = []
    for source, rows in [('PSCP', pscp), ('RPC', rpc)]:
        for r in rows:
            if source == 'PSCP' and str(r.get('codi_organ')) != '3411306': raise ValueError('Òrgan PSCP incorrecte')
            if source == 'RPC' and str(r.get('id_organisme_contractant')) != '0805170005': raise ValueError('Òrgan RPC incorrecte')
            raw_date = r.get('data_adjudicacio_contracte' if source == 'PSCP' else 'data_adjudicacio')
            d = iso(raw_date)
            pub = next((iso(r[x]) for x in ['data_publicacio_adjudicacio', 'data_publicacio_anunci', 'data_publicacio_formalitzacio', 'data_publicacio_contracte'] if r.get(x)), None)
            year = int(r['exercici']) if source == 'RPC' and r.get('exercici') else int((d or pub)[:4]) if (d or pub) else None
            if year is None or year not in period_years(period): continue
            exp = clean(r.get('codi_expedient')).upper()
            lot = clean(r.get('numero_lot')) or None
            flags = []
            if not d: flags.append('Data d’adjudicació no informada; exercici obtingut de la publicació o del RPC.')
            if d and d > capture[:10]: flags.append('La font informa una data posterior a la captura. No s’ha corregit.')
            if not exp: flags.append('Codi d’expedient no informat. No es relaciona automàticament.')
            value = r.get('import_adjudicacio_sense' if source == 'PSCP' else 'import_adjudicacio')
            try: amount = cents(value)
            except ValueError:
                amount = None
                flags.append('Import compost o amb format no interpretat. Consulta l’original.')
            title = public_title(r.get('denominacio') if source == 'PSCP' else r.get('descripcio_expedient') or r.get('contracte'))
            start, end, duration = term(r.get('durada_contracte')) if source == 'PSCP' else (None, None, rpc_duration(r))
            native_url = SOC + ('ybgg-dgi6' if source == 'PSCP' else 'hb6v-jcbf') + '.json?' + urllib.parse.urlencode({'$where': ':id=' + "'" + r['row_id'] + "'"})
            result.append({'id': source.lower() + '-' + r['row_id'], 'source': source, 'expedient': exp, 'title': title or 'Objecte no informat', 'year': year, 'lot': lot, 'procedure': clean(r.get('procediment' if source == 'PSCP' else 'procediment_adjudicacio')), 'type': clean(r.get('tipus_contracte')), 'status': clean(r.get('fase_publicacio' if source == 'PSCP' else 'situaci_contractual')), 'amountCents': amount, 'vat': 'sense IVA' if source == 'PSCP' else 'no especificat', 'supplier': company(r.get('denominacio_adjudicatari' if source == 'PSCP' else 'adjudicatari')), 'cpv': cpv(r.get('codi_cpv')), 'date': d, 'formalizedDate': iso(r.get('data_formalitzacio_contracte')) if source == 'PSCP' else None, 'termStart': start, 'termEnd': end, 'duration': duration, 'url': url_value(r.get('enllac_publicacio'), native_url), 'capturedAt': capture, 'flags': flags})
    return sorted(result, key=lambda r: r['id'])

def normalize_events(rows, capture, expedients, period=PERIOD):
    output = []
    for r in rows:
        if str(r.get('codi_organ')) != '3411306': raise ValueError('Òrgan d’execució incorrecte')
        d = iso(r.get('data'))
        exp = clean(r.get('codi_expedient')).upper()
        if not (d and int(d[:4]) in period_years(period)) and exp not in expedients: continue
        output.append({'id': 'event-' + r['row_id'], 'expedient': exp, 'lot': clean(r.get('numero_lot')) or None, 'type': clean(r.get('tipus_actuacio_execucio')), 'title': public_title(r.get('denominacio_actuacio')) or clean(r.get('tipus_actuacio_execucio')), 'date': d, 'amountCents': cents(r.get('import_sense_iva')), 'url': url_value(r.get('url_json'), SOC + '8idu-wkjv.json?' + urllib.parse.urlencode({'$where': "codi_organ='3411306' AND codi_expedient='" + exp.replace("'", "''") + "'"})), 'capturedAt': capture})
    return sorted(output, key=lambda r: r['id'])

def normalize_budget(initial, liquidation, capture, period=PERIOD):
    output = {}
    chapters = {str(chapter) for chapter in range(1, 10)}
    def key(r, chapter): return (int(r['ANY_EXERCICI']), str(r['TIPUS_PARTIDA']), str(r[chapter]).strip())
    def make(k, title):
        year, side, chapter = k
        return {'id': f'budget-{year}-{side}-{chapter}', 'year': year, 'side': {'D': 'despeses', 'I': 'ingressos'}[side], 'chapter': chapter, 'chapterName': clean(title), 'initialCents': None, 'finalCents': None, 'executedCents': None, 'url': '', 'capturedAt': capture, 'initialUrl': CKAN + urllib.parse.urlencode({'resource_id': BUDGET_ID, 'filters': json.dumps({'CODI_ENS': '805170005', 'ANY_EXERCICI': str(year), 'TIPUS_PARTIDA': side, 'TIPUS_CLASSIF': 'E', 'NIVELL': '1', 'CODI_PANTALLA': chapter})}), 'liquidationUrl': CKAN + urllib.parse.urlencode({'resource_id': LIQ_ID, 'filters': json.dumps({'CODI_ENS': '805170005', 'ANY_EXERCICI': year, 'TIPUS_PARTIDA': side, 'CODI_CAPITOL': int(chapter)})})}
    for r in initial:
        if str(r['NIVELL']) != '1' or r['TIPUS_CLASSIF'] != 'E' or int(r['ANY_EXERCICI']) not in period_years(period): continue
        k = key(r, 'CODI_PANTALLA')
        if k[1] not in {'I', 'D'} or k[2] not in chapters: raise ValueError('Classificació pressupostària de nivell 1 inesperada')
        if k in output: raise ValueError('Capítol inicial duplicat')
        row = make(k, r['DESCRIPCIO']); row['initialCents'] = cents(r.get('IMPORT')); output[k] = row
    expected = {(year, side, chapter) for year in period_years(period) for side in ('I', 'D') for chapter in chapters}
    missing = expected - output.keys()
    if missing:
        raise ValueError(f'Cobertura pressupostària inicial incompleta: falten {len(missing)} combinacions d’any, costat i capítol 1–9')
    seen = set()
    for r in liquidation:
        if int(r['ANY_EXERCICI']) not in period_years(period, liquidation=True): continue
        k = key(r, 'CODI_CAPITOL')
        if k[1] not in {'I', 'D'} or k[2] not in chapters: raise ValueError('Classificació de liquidació inesperada')
        if k in seen: raise ValueError('Capítol liquidat duplicat')
        seen.add(k)
        row = output[k]
        row['finalCents'] = cents(r.get('IMPORT_PRESSU_FINAL')); row['executedCents'] = cents(r.get('IMPORT_LIQUIDAT'))
    for row in output.values(): row['url'] = row['liquidationUrl'] if row['finalCents'] is not None or row['executedCents'] is not None else row['initialUrl']
    return sorted(output.values(), key=lambda r: r['id'])

def nif_category(value):
    s = str(value or '').strip().upper()
    return NIF_CATEGORIES.get(s[:1]) if re.fullmatch(r'[A-Z]\d{7}[0-9A-J]', s) else None

def invoice_date(value, year):
    # Hi ha dates de factura impossibles (p. ex. 1923): fora de l'exercici ±1 queden sense data.
    try: d = iso(value)
    except ValueError: return None
    return d if d and abs(int(d[:4]) - year) <= 1 else None

def normalize_suppliers(invoices, providers, capture, period=PERIOD):
    """Factures agregades per emissor i exercici. Retorna (registres, quadra amb la relació de proveïdors)."""
    years = period_years(period)
    kinds, listed = {}, Counter()
    for r in providers:
        year, raw = int(r['EXERCICI']), str(r['NOM_EMPRESA'] or '').strip()
        kinds.setdefault((year, raw), set()).add(nif_category(r['CIF_EMPRESA']))
        if year in years: listed[year] += cents(r['IMPORT']) or 0
    groups = {}
    for r in invoices:
        year, raw = int(r['EXERCICI']), str(r['NOM_EMISSOR'] or '').strip()
        if year not in years: continue
        found = kinds.get((year, raw), set())
        category = next(iter(found)) if len(found) == 1 else None
        if not raw or PRIVATE.search(raw): category = None
        key = (year, raw if category else None)
        g = groups.setdefault(key, {'category': category, 'names': set(), 'invoices': 0, 'invoicedCents': 0, 'maxInvoiceCents': 0, 'dates': []})
        amount = cents(r['IMPORT_FACTURA'])
        if amount is None: raise ValueError('Factura sense import')
        g['names'].add(raw); g['invoices'] += 1; g['invoicedCents'] += amount; g['maxInvoiceCents'] = max(g['maxInvoiceCents'], amount)
        d = invoice_date(r.get('DATA_FACTURA'), year)
        if d: g['dates'].append(d)
    records, invoiced = [], Counter()
    for (year, raw), g in groups.items():
        invoiced[year] += g['invoicedCents']
        named = raw is not None
        url = CKAN + urllib.parse.urlencode({'resource_id': INVOICES_ID, 'filters': json.dumps({'EXERCICI': year, 'NOM_EMISSOR': raw}, ensure_ascii=False), 'limit': 500}) if named else INVOICES_DATASET
        records.append({'id': f'supplier-{year}-' + (stable(raw) if named else 'altres'), 'year': year, 'name': clean(raw) if named else None, 'category': g['category'] if named else UNNAMED, 'emitters': len(g['names']), 'invoices': g['invoices'], 'invoicedCents': g['invoicedCents'], 'maxInvoiceCents': g['maxInvoiceCents'], 'firstDate': min(g['dates'], default=None), 'lastDate': max(g['dates'], default=None), 'url': url, 'capturedAt': capture})
    return sorted(records, key=lambda r: r['id']), all(invoiced[y] == listed[y] for y in invoiced | listed)

def split_beneficiary(value):
    """(categoria, nom) a partir de «NIF NOM». El NIF no es publica; les persones físiques el tenen emmascarat."""
    head, _, name = re.sub(r'\s+', ' ', str(value or '')).strip().partition(' ')
    category = nif_category(head)
    # Societats civils (J) i comunitats de béns (E) poden dur noms de persones: com a la resta de fonts, sense nom.
    return (category, name.strip()) if category and head[:1].upper() not in 'JE' and name.strip() and not PRIVATE.search(name) else (None, None)

def normalize_grants(rows, capture, period=PERIOD):
    """Concessions atorgades per l'Ajuntament. Retorna (registres, files idèntiques comptades una vegada)."""
    years = period_years(period)
    seen, records, repeated = {}, {}, 0
    for r in rows:
        day = iso(r['DATA_DE_CONCESSIO'])
        if not day or int(day[:4]) not in years: continue
        amount = cents(r['IMPORT'])
        if amount is None: raise ValueError('Concessió sense import')
        call, raw = re.sub(r'\s+', ' ', str(r['TITOL'] or '')).strip(), str(r['BENEFICIARI'] or '').strip()
        # La font repeteix files senceres (p. ex. bona part d'una convocatòria del 2022): es compten una sola vegada.
        row_key = (day, call, raw, amount)
        if row_key in seen:
            seen[row_key]['repeated'] += 1; repeated += 1
            continue
        category, name = split_beneficiary(raw)
        # Les concessions sense nom publicat s'agreguen per acord i data.
        group = row_key if name else (day, call, None, None)
        record = records.get(group)
        if record is None:
            agreement = re.search(r'\bCONV\d{7}\b', call.upper())
            url = CKAN + urllib.parse.urlencode({'resource_id': GRANTS_ID, 'filters': json.dumps({'CODI_ENS': '805170005', 'DATA_DE_CONCESSIO': day}), 'limit': 500}) if name else GRANTS_DATASET
            record = records[group] = {'id': 'grant-' + stable(*group), 'year': int(day[:4]), 'date': day, 'call': public_title(call), 'procedure': 'convocatòria' if re.search(r'convo[cq]', call, re.I) else 'sense convocatòria', 'agreement': agreement[0] if agreement else None, 'beneficiary': clean(name) if name else None, 'category': category if name else UNNAMED, 'grants': 0, 'amountCents': 0, 'repeated': 0, 'url': url, 'capturedAt': capture}
        record['grants'] += 1; record['amountCents'] += amount
        seen[row_key] = record
    return sorted(records.values(), key=lambda r: r['id']), repeated

def agreement_day(value):
    # Hi ha dates sentinella (1900): no són una vigència real.
    d = iso(value)
    return (None, 'sentinella') if d and d < '1950' else (d, None if d else 'absent')

def normalize_agreements(rows, capture):
    records = []
    for r in rows:
        code = str(r['CODI_EXPEDIENT'] or '').strip().upper()
        if not re.fullmatch(r'CONV\d{7}', code): raise ValueError('Codi de conveni inesperat')
        start = agreement_day(r['DATA_INICI'])[0]
        end, end_issue = agreement_day(r['DATA_FINAL'])
        if start and end and end < start: end_issue = 'anterior a l’inici'
        extendable = {'si': True, 's': True, 'no': False, 'n': False}.get(re.sub(r'[^a-z]', '', str(r['PRORROGABLE'] or '').lower().replace('í', 'i')))
        title = public_title(r['TITOL'])
        description = public_title(r['DESCRIPCIO']) if r['DESCRIPCIO'] else None
        records.append({'id': 'agreement-' + code, 'code': code, 'title': title, 'description': description if description != title else None, 'start': start, 'end': end, 'endIssue': end_issue, 'status': clean(r['ESTAT']) or 'No informat', 'extendable': extendable, 'url': CKAN + urllib.parse.urlencode({'resource_id': AGREEMENTS_ID, 'filters': json.dumps({'CODI_EXPEDIENT': code})}), 'capturedAt': capture})
    if len({r['id'] for r in records}) != len(records): raise ValueError('Codi de conveni duplicat')
    return sorted(records, key=lambda r: r['id'])

def parse_population(dataset):
    # JSON-stat de l'Idescat: valors en ordre any → municipi (sexe i concepte tenen una sola categoria).
    if dataset.get('id') != ['YEAR', 'MUN', 'SEX', 'CONCEPT'] or dataset['size'][2:] != [1, 1]: raise ValueError('Estructura de població inesperada')
    years = dataset['dimension']['YEAR']['category']['index']; mun = dataset['dimension']['MUN']['category']
    codes, values = mun['index'], dataset['value']
    if len(values) != len(years) * len(codes): raise ValueError('Població incompleta')
    population = {}
    for i, year in enumerate(years):
        for j, code in enumerate(codes):
            value = values[i * len(codes) + j]
            if value is not None: population.setdefault(code, {})[year] = int(value)
    return {code: {'name': clean(mun['label'][code]), 'population': population.get(code, {})} for code in codes}

def peer_group(municipalities, period=PERIOD):
    # El grup es fixa amb el padró més recent; cada exercici es divideix per la població del seu any.
    latest = max(year for m in municipalities.values() for year in m['population'])
    group = {code: m for code, m in municipalities.items() if PEER_RANGE[0] <= m['population'].get(latest, -1) <= PEER_RANGE[1]}
    if SELF_CODE not in group: raise ValueError('Castellar no és dins del grup de comparació')
    years = {str(y) for y in range(period['startYear'], int(latest) + 1)}
    return int(latest), {code: {'name': m['name'], 'population': {y: v for y, v in m['population'].items() if y in years}} for code, m in group.items()}

def sql(query, fetch=get):
    response = fetch(CKAN_SQL + urllib.parse.urlencode({'sql': query}))
    if not response.get('success'): raise ValueError('Error declarat pel DataStore')
    return response['result']['records']

def ens_codes(rows, group):
    # CODI_ENS = codi municipal de 6 xifres de l'Idescat + 4 xifres de tipus d'ens.
    found = {}
    for r in rows:
        code = str(r['CODI_ENS']).zfill(10)[:6]
        if code in group and str(r['NOM_COMPLERT']).startswith('Ajuntament'):
            if code in found and found[code] != str(r['CODI_ENS']): raise ValueError('Ajuntament amb més d’un codi d’ens')
            found[code] = str(r['CODI_ENS'])
    if SELF_CODE not in found or found[SELF_CODE] != '805170005': raise ValueError('Codi d’ens de Castellar inesperat')
    return found

def normalize_peers(group, ens, initial, liquidation, latest, capture, period=PERIOD):
    by_ens = {v: k for k, v in ens.items()}
    rows = {}
    def row(code, year, side):
        return rows.setdefault((code, year, side), {'code': code, 'year': year, 'side': {'D': 'despeses', 'I': 'ingressos'}[side], 'initialCents': [None] * 9, 'finalCents': [None] * 9, 'executedCents': [None] * 9})
    def place(target, field, chapter, value):
        if target[field][chapter - 1] is not None: raise ValueError('Capítol duplicat en la comparació')
        target[field][chapter - 1] = value
    for r in initial:
        year, side, chapter = int(r['ANY_EXERCICI']), str(r['TIPUS_PARTIDA']), int(r['CODI_PANTALLA'])
        if side not in 'ID' or not 1 <= chapter <= 9 or year not in period_years(period): raise ValueError('Classificació inesperada en la comparació')
        place(row(by_ens[str(r['CODI_ENS'])], year, side), 'initialCents', chapter, cents(r['IMPORT']))
    for r in liquidation:
        year, side, chapter = int(r['ANY_EXERCICI']), str(r['TIPUS_PARTIDA']), int(r['CODI_CAPITOL'])
        if side not in 'ID' or not 1 <= chapter <= 9 or year not in period_years(period, liquidation=True): raise ValueError('Classificació inesperada en la comparació')
        target = row(by_ens[str(r['CODI_ENS'])], year, side)
        place(target, 'finalCents', chapter, cents(r['IMPORT_PRESSU_FINAL'])); place(target, 'executedCents', chapter, cents(r['IMPORT_LIQUIDAT']))
    municipalities = [{'code': code, 'name': m['name'], 'population': m['population'], 'ens': ens.get(code)} for code, m in sorted(group.items(), key=lambda x: x[1]['name'])]
    return {'capturedAt': capture, 'range': list(PEER_RANGE), 'populationYear': latest, 'self': SELF_CODE, 'populationUrl': POPULATION_PAGE, 'initialUrl': 'https://dadesobertes.seu-e.cat/dataset/ge-p-pressupostos-per-programes-detallat', 'liquidationUrl': 'https://dadesobertes.seu-e.cat/dataset/liquidacio-del-pressupost-execucio-per-capitols',
            'municipalities': municipalities, 'rows': sorted(rows.values(), key=lambda r: (r['code'], r['year'], r['side']))}

def collect_peers(capture, period=PERIOD, fetch=get):
    # L'API limita les dades per consulta: primer els anys disponibles, després només els del període.
    available = fetch(POPULATION_URL + '?lang=ca')['dimension']['YEAR']['category']['index']
    years = [y for y in available if int(y) >= period['startYear']]
    if not years: raise ValueError('Sense població per al període')
    latest, group = peer_group(parse_population(fetch(POPULATION_URL + '/data?' + urllib.parse.urlencode({'lang': 'ca', 'SEX': 'TOTAL', 'YEAR': ','.join(years)}))), period)
    ens = ens_codes(sql(f'SELECT DISTINCT "CODI_ENS","NOM_COMPLERT" FROM "{LIQ_ID}" WHERE "NOM_COMPLERT" LIKE \'Ajuntament%\'', fetch), group)
    codes = ','.join(f"'{v}'" for v in sorted(ens.values()))
    initial, liquidation = [], []
    # Una consulta per exercici: cada resposta queda molt per sota del límit de files del DataStore.
    for year in period_years(period):
        initial += sql(f'SELECT "CODI_ENS","ANY_EXERCICI","TIPUS_PARTIDA","CODI_PANTALLA","IMPORT" FROM "{BUDGET_ID}" WHERE "ANY_EXERCICI"=\'{year}\' AND "NIVELL"=\'1\' AND "TIPUS_CLASSIF"=\'E\' AND "CODI_ENS" IN ({codes})', fetch)
    for year in period_years(period, liquidation=True):
        liquidation += sql(f'SELECT "CODI_ENS","ANY_EXERCICI","TIPUS_PARTIDA","CODI_CAPITOL","IMPORT_PRESSU_FINAL","IMPORT_LIQUIDAT" FROM "{LIQ_ID}" WHERE "ANY_EXERCICI"={year} AND "CODI_ENS" IN ({",".join(sorted(ens.values()))})', fetch)
    return normalize_peers(group, ens, initial, liquidation, latest, capture, period)

def check_peers(peers, budget):
    # Les xifres de Castellar a la comparació han de coincidir amb les de la secció de pressupost.
    own = {(r['year'], r['side']): r for r in peers['rows'] if r['code'] == SELF_CODE}
    for b in budget:
        r = own.get((b['year'], b['side']))
        for field in ('initialCents', 'finalCents', 'executedCents'):
            if (r[field][int(b['chapter']) - 1] if r else None) != b[field]: raise ValueError('La comparació no quadra amb el pressupost de Castellar')

def parse_session_list(text, capture, body, period=PERIOD):
    pattern = r'<div class="title" title="([^"]+)"[^>]*>([\s\S]*?)href="(https://actes\.castellarvalles\.cat/session/sessionDetail/[a-f0-9]+)"'
    records = []
    for title, block, url in re.findall(pattern, text):
        d = re.search(r'(\d{2}/\d{2}/\d{4})\s+\d{2}:\d{2}h', block)
        if not d: raise ValueError('Data de sessió no localitzada')
        value = iso(d[1])
        if int(value[:4]) not in period_years(period): continue
        records.append({'id': url.rsplit('/', 1)[1], 'title': clean(title), 'body': body, 'date': value, 'url': url, 'agenda': [], 'capturedAt': capture})
    if not records: raise ValueError('Catàleg de sessions buit o estructura canviada')
    return records

class SummaryParser(HTMLParser):
    """Extreu només el contenidor de resum, inclosos spans/divs niats."""
    def __init__(self):
        super().__init__(); self.depth = 0; self.parts = []
    def handle_starttag(self, tag, attrs):
        if not self.depth and tag == 'span' and dict(attrs).get('class') == 'sessionSummary':
            self.depth = 1
        elif self.depth:
            if tag == 'span': self.depth += 1
            if tag in ('p','div','li','br'): self.parts.append('\n')
    def handle_endtag(self, tag):
        if self.depth:
            if tag in ('p','div','li'): self.parts.append('\n')
            if tag == 'span': self.depth -= 1
    def handle_data(self, value):
        if self.depth: self.parts.append(value.replace('\n',' '))

def parse_agenda(text):
    # Solament punts numerats de les observacions; no transcripcions/intervencions.
    parser = SummaryParser(); parser.feed(text)
    points = []
    for p in ''.join(parser.parts).splitlines():
        p = clean(p)
        m = re.match(r'^(\d{1,2})\s*[.\-–)]+\s*(.*)', p)
        if not m: continue
        title = m[2].strip()
        # Excloure assumptes personals i indexar només objectes administratius col·lectius.
        forbidden = SENSITIVE.search(title) or re.search(r'\b(?:senyor|senyora|sr\.|sra\.|nomenament\w*|renúncia\w*|jubilaci\w*|defunci\w*|indemnitzaci\w*|reclamaci\w*|llicència\w*|padró\w*|bonificaci\w*|sancion\w*|adreça\w*|domicili\w*)\b|[A-Z]\.\s*[A-Z]\.', title, re.I)
        allowed = re.search(r'contract|pressupost|liquidaci|ordenanc|reglament|pla |plans |conveni|moci[oó]|tarif|taxes|compte general|cr[eè]dit|projecte|acta |actes |decrets|urban[ií]stic|modificaci|proposici|control|precs|preguntes|informes|adhesi[oó]', title, re.I)
        if forbidden or not allowed: continue
        points.append({'number': m[1], 'title': title, 'expedients': sorted(set(re.findall(r'\bCONT\d{7}\b', title.upper())))})
    # Alguns portals repeteixen paràgrafs per adaptació mòbil.
    return list({(a['number'], a['title']): a for a in points}.values())

def collect_sessions(capture, period=PERIOD):
    all_rows = []
    for body, code in [('Ple', 'ff8080816059f3f1016059f46e5c000d'), ('Junta de Govern', 'ff8080816059f3f1016059f46e62000e')]:
        url = ACTES + '/session/fragmentCustom?' + urllib.parse.urlencode({'sessionTypeId': code, 'startDate': f"01/01/{period['startYear']}", 'endDate': f"31/12/{period['endYear']}", 'search': 'yes', 'max': 1000})
        text = get(url, False)
        rows = parse_session_list(text, capture, body, period)
        links = set(re.findall(r'/session/sessionDetail/([a-f0-9]+)', text))
        if len(rows) != len(links) or len(rows) >= 1000 or 'class="nextLink"' in text: raise ValueError('Paginació de sessions incompleta')
        # Verificar que la suma dels índexs anuals coincideix amb la consulta completa.
        annual = set()
        for year in period_years(period):
            check = get(ACTES + '/session/fragmentCustom?' + urllib.parse.urlencode({'sessionTypeId': code, 'startDate': f'01/01/{year}', 'endDate': f'31/12/{year}', 'search': 'yes', 'max': 1000}), False)
            annual.update(re.findall(r'/session/sessionDetail/([a-f0-9]+)', check))
        if annual != links: raise ValueError('Índex anual de sessions inconsistent')
        if body == 'Ple':
            for i, row in enumerate(rows):
                row['agenda'] = parse_agenda(get(row['url'], False))
                if i % 15 == 0: print(f'Plens: {i + 1}/{len(rows)} revisats', flush=True)
                time.sleep(.12)
        all_rows.extend(rows)
    return sorted(all_rows, key=lambda r: r['id'])

def source(id, name, url, records, coverage, note, capture, status='ok'):
    return dict(id=id, name=name, url=url, records=records, coverage=coverage, note=note, capturedAt=capture, status=status)

def collect(period=PERIOD):
    capture = stamp()
    jobs = {
        'pscp': lambda: socrata('ybgg-dgi6', "codi_organ='3411306'", 'codi_organ,id_intern,codi_expedient,numero_lot,denominacio,procediment,tipus_contracte,fase_publicacio,denominacio_adjudicatari,import_adjudicacio_sense,data_adjudicacio_contracte,enllac_publicacio,data_publicacio_adjudicacio,data_publicacio_anunci,data_publicacio_formalitzacio,data_publicacio_contracte,codi_cpv,durada_contracte,data_formalitzacio_contracte'),
        'rpc': lambda: socrata('hb6v-jcbf', "id_organisme_contractant='0805170005'", 'id_organisme_contractant,codi_expedient,numero_lot,exercici,descripcio_expedient,contracte,procediment_adjudicacio,tipus_contracte,situaci_contractual,adjudicatari,import_adjudicacio,data_adjudicacio,codi_cpv,anys_durada,mesos_durada,dies_durada'),
        'events': lambda: socrata('8idu-wkjv', "codi_organ='3411306'", 'codi_organ,codi_expedient,numero_lot,tipus_actuacio_execucio,denominacio_actuacio,data,import_sense_iva,url_json'),
        'initial': lambda: ckan(BUDGET_ID), 'liq': lambda: ckan(LIQ_ID),
        'invoices': lambda: ckan(INVOICES_ID), 'providers': lambda: ckan(PROVIDERS_ID),
        'grants': lambda: ckan(GRANTS_ID), 'agreements': lambda: ckan(AGREEMENTS_ID),
        'peers': lambda: optional(lambda: collect_peers(capture, period)),
    }
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {name: pool.submit(job) for name, job in jobs.items()}
        raw = {name: future.result() for name, future in futures.items()}
    print('APIs completades: ' + ', '.join(f'{k}={len(v) if v is not None else "error"}' for k,v in raw.items()), flush=True)
    contracts = normalize_contracts(raw['pscp'], raw['rpc'], capture, period)
    events = normalize_events(raw['events'], capture, {c['expedient'] for c in contracts}, period)
    budget = normalize_budget(raw['initial'], raw['liq'], capture, period)
    sessions = collect_sessions(capture, period)
    suppliers, reconciled = normalize_suppliers(raw['invoices'], raw['providers'], capture, period)
    named = sum(1 for s in suppliers if s['name'])
    grants, repeated_grants = normalize_grants(raw['grants'], capture, period)
    agreements = normalize_agreements(raw['agreements'], capture)
    peers = raw['peers']
    if peers is not None and optional(lambda: check_peers(peers, budget) or True) is None: peers = None
    # La comparació és complementària: si falla, es conserva la de la captura anterior i no s'atura la resta.
    peers_fresh = peers is not None
    if not peers_fresh: peers = previous_peers()
    first_agreement = min((a['start'] for a in agreements if a['start']), default=None)
    counts = Counter(c['source'] for c in contracts)
    full_period = period_label(period)
    liquidation_period = period_label(period, liquidation=True)
    budget_partial = any(row['initialCents'] is None or (row['year'] <= period['latestLiquidationYear'] and (row['finalCents'] is None or row['executedCents'] is None)) for row in budget)
    sources = [
        source('pscp', 'Plataforma de serveis de contractació pública', 'https://analisi.transparenciacatalunya.cat/d/ybgg-dgi6', counts['PSCP'], f'{full_period} · any d’adjudicació; si manca, any de publicació.', 'Adjudicacions sense IVA. Imports compostos no interpretats i dates futures s’indiquen a la fitxa. Noms d’adjudicataris només amb forma societària explícita. Font Generalitat; reutilització amb atribució.', capture),
        source('rpc', 'Registre públic de contractes', 'https://analisi.transparenciacatalunya.cat/d/hb6v-jcbf', counts['RPC'], f'Exercicis {full_period} informats pel registre.', 'Observacions separades de la PSCP. Base d’IVA no acreditada en aquest adaptador. No sumar imports amb els de la PSCP. Font Generalitat; reutilització amb atribució.', capture),
        source('events', 'Execució contractual · PSCP', 'https://analisi.transparenciacatalunya.cat/d/8idu-wkjv', len(events), f'Fites {full_period} i fites d’expedients inclosos en el catàleg.', 'Relació per codi exacte d’expedient; lot conservat. La falta de fites no acredita la inexistència de modificacions o pròrrogues.', capture),
        source('budget', 'Pressupost i liquidació · AOC', 'https://dadesobertes.seu-e.cat/dataset/liquidacio-del-pressupost-execucio-per-capitols', len(budget), f'Pressupost inicial {full_period}; liquidacions {liquidation_period}.', 'Classificació econòmica, nivell 1. La captura inicial exigeix els capítols 1–9 per any i costat. Els imports nuls i els capítols absents de la liquidació queden sense import, no a zero. Font Generalitat/AOC; atribució indicada als registres.', capture, 'partial' if budget_partial else 'ok'),
        source('sessions', 'Portal municipal d’àudio vídeo actes', ACTES + '/session/portadaPublica', len(sessions), f'Catàleg de plens i juntes {full_period}. Índex contrastat amb consultes anuals.', 'Només punts dels plens que superen el filtre preventiu; JGL només metadades i enllaç. No transcriu vídeos ni acredita votacions. Els ordres del dia tenen cobertura parcial per privacitat i estructura del portal. Documents originals subjectes a les condicions municipals.', capture, 'partial'),
        source('suppliers', 'Registre de factures i relació de proveïdors', INVOICES_DATASET, named, f'Factures registrades {full_period} · exercici que informa la font; l’any en curs és parcial.', 'Factures agregades per emissor i exercici, amb IVA tal com consten. Només es publiquen noms de persones jurídiques amb denominació pròpia (tipus deduït de la lletra del NIF, que no es publica); persones físiques, societats civils i comunitats de béns s’agreguen per exercici sense nom. ' + ('Els totals per exercici quadren amb la relació anual de proveïdors.' if reconciled else 'Els totals per exercici no quadren amb la relació anual de proveïdors: consulta les fonts originals.') + ' Registrar una factura no acredita el pagament. Font Ajuntament/AOC; llicència cc-by.', capture, 'ok' if reconciled else 'partial'),
        source('grants', 'Concessions de subvencions · MINHAP/AOC', GRANTS_DATASET, sum(g['grants'] for g in grants), f'Concessions atorgades per l’Ajuntament {full_period}, per data de concessió; la font comença el maig del 2022.', 'Rèplica de la Base de Dades Nacional de Subvencions. Només es publiquen noms de persones jurídiques amb denominació pròpia (tipus deduït de la lletra del NIF, que no es publica); les concessions a persones físiques, societats civils i comunitats de béns s’agreguen per acord sense nom. ' + (f'{repeated_grants} files idèntiques (mateixa data, acord, beneficiari i import) es compten una sola vegada. ' if repeated_grants else '') + 'El procediment (amb convocatòria o sense) es dedueix del títol de l’acord. Font Ministeri d’Hisenda/AOC; llicència cc-zero.', capture),
        source('agreements', 'Convenis de col·laboració · Ajuntament', AGREEMENTS_DATASET, len(agreements), f'Tots els convenis que publica la font (inicis des del {first_agreement[:4] if first_agreement else "—"}), no només els del període.', 'Codi, títol, vigència, estat i si és prorrogable, tal com els declara l’Ajuntament; la font no informa imports ni signants. Les dates sentinella (1900) i les absents queden sense data. Un conveni «en curs» amb la data de fi passada pot tenir una pròrroga que no hi consta. Font Ajuntament/AOC; la fitxa no especifica llicència: es reprodueixen només metadades amb l’enllaç a l’original.', capture, 'partial'),
    ]
    if peers:
        compared = len(peers['municipalities'])
        kept = '' if peers_fresh else f'No s’ha pogut actualitzar en aquesta captura: es conserva la del {peers["capturedAt"][:10]}. '
        sources.append(source('peers', 'Comparació amb municipis de 15.000–35.000 habitants · Idescat i AOC', POPULATION_PAGE, compared, f'{compared} municipis segons el padró de {peers["populationYear"]}; pressupost inicial {full_period} i liquidacions {liquidation_period}.', kept + 'Població del padró municipal a 1 de gener (Idescat). Imports dels ajuntaments per capítol econòmic (AOC), sense ens dependents ni consolidació: un servei gestionat per una empresa municipal o un consorci no hi apareix igual a tots els municipis. Els municipis sense liquidació d’un exercici queden fora d’aquell exercici. Les xifres de Castellar es contrasten amb la secció de pressupost. Fonts Idescat i Generalitat/AOC; llicència cc-zero (AOC) i atribució (Idescat).', capture if peers_fresh else peers['capturedAt'], 'ok' if peers_fresh else 'partial'))
    catalog = {'schemaVersion': 1, 'generatedAt': capture, 'contracts': contracts, 'events': events, 'budget': budget, 'sessions': sessions, 'suppliers': suppliers, 'grants': grants, 'agreements': agreements, 'sources': sources, 'changes': []}
    if peers: catalog['peers'] = peers
    return catalog

def optional(job):
    try: return job()
    except Exception as e:
        print('Comparació amb municipis no disponible: ' + type(e).__name__, file=sys.stderr, flush=True)
        return None

def previous_peers(root=ROOT):
    path = root / 'public' / 'data' / 'catalog.json'
    try: return json.loads(path.read_text(encoding='utf-8')).get('peers')
    except (OSError, ValueError): return None

def safe_change_value(field, value):
    if field.endswith('Cents'):
        return value is None or (isinstance(value, int) and not isinstance(value, bool) and abs(value) <= 2**53)
    if field in ('year', 'invoices', 'emitters', 'grants', 'repeated'):
        return value is None or (isinstance(value, int) and not isinstance(value, bool))
    if field in ('date', 'start', 'end'):
        if value is None: return True
        if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value): return False
        try: date.fromisoformat(value)
        except ValueError: return False
        return True
    if field == 'chapter':
        return value is None or (isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 999) or (isinstance(value, str) and re.fullmatch(r'\d{1,3}', value) is not None)
    return False

def changed_fields(before, after):
    fields = []
    # Un camp nou o retirat de l'esquema no és un canvi de la font: només es comparen els comuns.
    for field in sorted((set(before) & set(after)) - {'capturedAt'}):
        old_value, new_value = before.get(field), after.get(field)
        if old_value == new_value: continue
        change = {'field': field}
        if safe_change_value(field, old_value) and safe_change_value(field, new_value):
            change.update(before=old_value, after=new_value)
        fields.append(change)
    return fields

def validate_changes(catalog):
    current_ids = {section: {r['id'] for r in catalog.get(section, [])} for section in SECTIONS}
    if not isinstance(catalog.get('changes'), list): raise ValueError('Historial de canvis invàlid')
    for change in catalog['changes']:
        # Compatibilitat de lectura amb el marcador mínim anterior a schemaVersion 1.
        if 'schemaVersion' not in catalog and isinstance(change, dict) and set(change) == {'description'} and isinstance(change['description'], str) and change['description']:
            continue
        if not isinstance(change, dict) or not {'date', 'source', 'kind', 'description'} <= change.keys(): raise ValueError('Canvi incomplet')
        if set(change) - {'date', 'source', 'kind', 'description', 'recordId', 'fields'}: raise ValueError('Camp de canvi desconegut')
        if not all(isinstance(change[k], str) and change[k] for k in ['date', 'source', 'kind', 'description']): raise ValueError('Metadades de canvi invàlides')
        source_name, kind = change['source'], change['kind']
        if source_name not in SECTIONS or kind not in CHANGE_KINDS: raise ValueError('Tipus de canvi invàlid')
        record_id = change.get('recordId')
        if record_id is not None and (not isinstance(record_id, str) or not record_id or record_id not in current_ids[source_name]): raise ValueError('Referència de canvi invàlida')
        if record_id is not None:
            expected_description = {'nous': 'Registre nou.', 'modificats': 'Registre modificat.'}.get(kind)
            if change['description'] != expected_description: raise ValueError('Descripció de canvi no genèrica')
        else:
            summary = re.fullmatch(r'(\d+) registres (nous|modificats|no observats)( \(captura inicial\))?\.', change['description'])
            if not summary or summary[2] != kind: raise ValueError('Resum de canvis invàlid')
        if kind == 'no observats' and ('recordId' in change or 'fields' in change): raise ValueError('Una retirada no pot identificar registres')
        if 'fields' not in change: continue
        if kind != 'modificats' or record_id is None or not isinstance(change['fields'], list) or not change['fields']: raise ValueError('Detall de camps invàlid')
        seen = set()
        for field_change in change['fields']:
            if not isinstance(field_change, dict) or not isinstance(field_change.get('field'), str) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', field_change['field']) or field_change['field'] == 'capturedAt': raise ValueError('Camp modificat invàlid')
            if set(field_change) - {'field', 'before', 'after'} or field_change['field'] in seen: raise ValueError('Detall de camp invàlid')
            seen.add(field_change['field'])
            exposed = 'before' in field_change or 'after' in field_change
            if exposed and (not safe_change_value(field_change['field'], field_change.get('before')) or not safe_change_value(field_change['field'], field_change.get('after'))): raise ValueError('Valor històric no publicable')

def validate(catalog):
    if 'schemaVersion' in catalog and catalog['schemaVersion'] != 1: raise ValueError('Versió d’esquema invàlida')
    for section in SECTIONS:
        ids = set()
        for r in catalog.get(section, []):
            if not r['url'].startswith('https://') or not r['capturedAt'] or r['id'] in ids: raise ValueError('Traçabilitat o identitat invàlida')
            ids.add(r['id'])
            for k,v in r.items():
                if k.endswith('Cents') and v is not None and (not isinstance(v, int) or abs(v) > 2**53): raise ValueError('Import no segur')
    if not catalog['contracts'] or not catalog['sessions']: raise ValueError('Catàleg incomplet')
    if 'peers' in catalog: validate_peers(catalog['peers'])
    validate_changes(catalog)
    if PRIVATE.search(json.dumps(catalog, ensure_ascii=False)): raise ValueError('Identificador personal detectat al paquet')

def validate_peers(peers):
    codes = {m['code'] for m in peers['municipalities']}
    if peers['self'] not in codes or not all(peers[k].startswith('https://') for k in ('populationUrl', 'initialUrl', 'liquidationUrl')): raise ValueError('Comparació invàlida')
    for m in peers['municipalities']:
        if not re.fullmatch(r'\d{6}', m['code']) or not all(isinstance(v, int) and v > 0 for v in m['population'].values()): raise ValueError('Població invàlida')
    seen = set()
    for r in peers['rows']:
        key = (r['code'], r['year'], r['side'])
        if r['code'] not in codes or key in seen or r['side'] not in ('despeses', 'ingressos'): raise ValueError('Fila de comparació invàlida')
        seen.add(key)
        for field in ('initialCents', 'finalCents', 'executedCents'):
            if len(r[field]) != 9 or any(v is not None and (not isinstance(v, int) or isinstance(v, bool) or abs(v) > 2**53) for v in r[field]): raise ValueError('Import no segur')

def payload(record):
    return json.dumps({k:v for k,v in record.items() if k != 'capturedAt'}, ensure_ascii=False, sort_keys=True, separators=(',', ':'))

def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    # Preparació privada: el build no pot copiar una captura pendent.
    stage = path.parents[2] / 'dades' / 'staging'
    stage.mkdir(parents=True, exist_ok=True)
    temp = stage / (path.name + '.pending')
    temp.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    for attempt in range(4):
        try:
            temp.replace(path)
            return
        except PermissionError:
            if attempt == 3: raise RuntimeError('Windows bloqueja el fitxer de dades. Tanca la previsualització i torna a actualitzar.') from None
            time.sleep(1 + attempt)

def publish(catalog, root=ROOT):
    if catalog.get('schemaVersion') != 1: raise ValueError('Versió d’esquema invàlida')
    validate(catalog)
    directory = root / 'public' / 'data'; directory.mkdir(parents=True, exist_ok=True)
    path = directory / 'catalog.json'
    previous = json.loads(path.read_text(encoding='utf-8')) if path.exists() else None
    differences = []
    for section in SECTIONS:
        old = {r['id']: r for r in previous.get(section, [])} if previous else {}
        now = {r['id']: r for r in catalog.get(section, [])}
        # Una secció nova es resumeix com una captura inicial, no registre a registre.
        if previous is None or section not in previous:
            if now:
                differences.append({'date': catalog['generatedAt'], 'source': section, 'kind': 'nous', 'description': f'{len(now)} registres nous (captura inicial).'})
            continue
        for key in sorted(now.keys() - old.keys()):
            differences.append({'date': catalog['generatedAt'], 'source': section, 'kind': 'nous', 'description': 'Registre nou.', 'recordId': key})
        for key in sorted(now.keys() & old.keys()):
            fields = changed_fields(old[key], now[key])
            if fields:
                differences.append({'date': catalog['generatedAt'], 'source': section, 'kind': 'modificats', 'description': 'Registre modificat.', 'recordId': key, 'fields': fields})
        removed = len(old.keys() - now.keys())
        if removed:
            differences.append({'date': catalog['generatedAt'], 'source': section, 'kind': 'no observats', 'description': f'{removed} registres no observats.'})
    catalog['changes'] = differences if differences else (previous or {}).get('changes', [])
    # Validar també el lot calculat abans d'escriure la base de dades o el JSON públic.
    validate(catalog)
    private_dir = root / 'dades'; private_dir.mkdir(exist_ok=True)
    with closing(sqlite3.connect(private_dir / 'observatori.sqlite')) as db, db:
        db.execute('CREATE TABLE IF NOT EXISTS versions (kind TEXT,id TEXT,hash TEXT,payload TEXT,captured_at TEXT,PRIMARY KEY(kind,id,hash))')
        db.execute('CREATE TABLE IF NOT EXISTS releases (captured_at TEXT PRIMARY KEY,hash TEXT,records INTEGER)')
        for section in SECTIONS:
            now = {r['id']: r for r in catalog.get(section, [])}
            for key, record in now.items():
                content = payload(record); digest = hashlib.sha256(content.encode()).hexdigest()
                db.execute('INSERT OR IGNORE INTO versions VALUES (?,?,?,?,?)', (section,key,digest,content,catalog['generatedAt']))
        digest = hashlib.sha256(json.dumps(catalog, sort_keys=True).encode()).hexdigest()
        db.execute('INSERT OR REPLACE INTO releases VALUES (?,?,?)', (catalog['generatedAt'], digest, sum(len(catalog.get(x, [])) for x in SECTIONS)))
    # Una única substitució del catàleg: el lector veu tota la versió antiga o tota la nova.
    atomic_json(path, catalog)
    atomic_json(directory / 'status.json', {'status': 'ok', 'attemptedAt': catalog['generatedAt'], 'changes': len(differences), 'message': 'Captura completa i validada.'})
    return len(differences)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--simulate-failure', action='store_true')
    args = parser.parse_args()
    work = ROOT / 'dades'; work.mkdir(exist_ok=True)
    lock = work / 'ingest.lock'
    try:
        fd = lock.open('x'); fd.write(stamp()); fd.close()
    except FileExistsError:
        print('Ja hi ha una captura en curs. Comprova el procés abans de retirar el bloqueig.', file=sys.stderr); return 1
    try:
        if args.simulate_failure: raise RuntimeError('Fallada de prova')
        catalog = collect()
        changes = publish(catalog)
        print(json.dumps({'status':'ok', 'counts': {k:len(catalog[k]) for k in SECTIONS}, 'changes':changes}, ensure_ascii=False))
        return 0
    except Exception as e:
        # No escriure contingut de les respostes ni dades personals al log.
        atomic_json(ROOT / 'public/data/status.json', {'status': 'error', 'attemptedAt': stamp(), 'message': 'Captura aturada. Es conserva el catàleg anterior.', 'errorType': type(e).__name__})
        print('Captura aturada: ' + str(e), file=sys.stderr); return 1
    finally:
        lock.unlink(missing_ok=True)

if __name__ == '__main__':
    raise SystemExit(main())
