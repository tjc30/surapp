#!/usr/bin/env python3
"""
Automated data pipeline script for Climate Observatory:
1. Ingests Our World In Data (OWID) CO2 long-term concentration (800,000 BCE - 2025 CE)
2. Ingests NOAA Mauna Loa CO2 Annual Mean (1959 - 2025 CE) from verified input CSV
3. Registers and updates data_sources catalog table across namespaces
"""

import csv
from pathlib import Path
import io
import json
import base64
import urllib.request
import requests
import os

SURREAL_URL = 'http://localhost:8000'
USER = 'root'
PASS = 'root'
NAMESPACES = ['main']

def execute_surql(ns, db, query):
    endpoint = f"{SURREAL_URL}/sql"
    auth_bytes = f"{USER}:{PASS}".encode('utf-8')
    auth_header = "Basic " + base64.b64encode(auth_bytes).decode('utf-8')

    headers = {
        'surreal-ns': ns,
        'surreal-db': db,
        'Authorization': auth_header,
        'Content-Type': 'text/plain; charset=utf-8',
        'Accept': 'application/json'
    }

    req = urllib.request.Request(endpoint, data=query.encode('utf-8'), headers=headers, method='POST')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

schema_query = """
DEFINE USER IF NOT EXISTS root ON NAMESPACE PASSWORD 'root' ROLES OWNER;
DEFINE USER IF NOT EXISTS root ON DATABASE PASSWORD 'root' ROLES OWNER;

DEFINE TABLE IF NOT EXISTS co2 TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;
DEFINE FIELD IF NOT EXISTS year ON TABLE co2 TYPE int;
DEFINE FIELD IF NOT EXISTS co2_ppm ON TABLE co2 TYPE float;
DEFINE FIELD IF NOT EXISTS entity ON TABLE co2 TYPE string;
DEFINE FIELD IF NOT EXISTS source ON TABLE co2 TYPE string;
DEFINE FIELD IF NOT EXISTS location ON TABLE co2 TYPE string;
DEFINE FIELD IF NOT EXISTS unit ON TABLE co2 TYPE string;
DEFINE INDEX IF NOT EXISTS idx_co2_year ON TABLE co2 COLUMNS year;

DEFINE TABLE IF NOT EXISTS co2_noaa TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;
DEFINE FIELD IF NOT EXISTS year ON TABLE co2_noaa TYPE int;
DEFINE FIELD IF NOT EXISTS co2_ppm ON TABLE co2_noaa TYPE float;
DEFINE FIELD IF NOT EXISTS entity ON TABLE co2_noaa TYPE string;
DEFINE FIELD IF NOT EXISTS source ON TABLE co2_noaa TYPE string;
DEFINE FIELD IF NOT EXISTS location ON TABLE co2_noaa TYPE string;
DEFINE FIELD IF NOT EXISTS unit ON TABLE co2_noaa TYPE string;
DEFINE INDEX IF NOT EXISTS idx_co2_noaa_year ON TABLE co2_noaa COLUMNS year;

DEFINE TABLE IF NOT EXISTS data_sources TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;
DEFINE FIELD IF NOT EXISTS table_name ON TABLE data_sources TYPE string;
DEFINE FIELD IF NOT EXISTS topic_id ON TABLE data_sources TYPE string;
DEFINE FIELD IF NOT EXISTS display_name ON TABLE data_sources TYPE string;
DEFINE FIELD IF NOT EXISTS data_type ON TABLE data_sources TYPE string;
DEFINE FIELD IF NOT EXISTS source_org ON TABLE data_sources TYPE string;
DEFINE FIELD IF NOT EXISTS source_url ON TABLE data_sources TYPE string;
DEFINE FIELD IF NOT EXISTS api_endpoint ON TABLE data_sources TYPE option<string>;
DEFINE FIELD IF NOT EXISTS last_updated ON TABLE data_sources TYPE string;
DEFINE FIELD IF NOT EXISTS next_update ON TABLE data_sources TYPE option<string>;
DEFINE FIELD IF NOT EXISTS record_count ON TABLE data_sources TYPE int;
DEFINE FIELD IF NOT EXISTS time_range ON TABLE data_sources TYPE string;
DEFINE FIELD IF NOT EXISTS unit ON TABLE data_sources TYPE string;
DEFINE FIELD IF NOT EXISTS frequency ON TABLE data_sources TYPE string;
DEFINE FIELD IF NOT EXISTS notes ON TABLE data_sources TYPE string;
DEFINE FIELD IF NOT EXISTS status ON TABLE data_sources TYPE string;
"""

print("1. Fetching OWID CO2 metadata & CSV...")
meta_url = "https://ourworldindata.org/grapher/co2-long-term-concentration.metadata.json?v=1&csvType=full&useColumnShortNames=true"
headers = {'User-Agent': 'Our World In Data data fetch/1.0'}
meta_resp = requests.get(meta_url, headers=headers).json()
col_info = meta_resp.get("columns", {}).get("co2_concentration", {})

last_updated = col_info.get("lastUpdated", "2026-09-11")
next_update = col_info.get("nextUpdate", "2026-11-10")
citation = col_info.get("citationShort", "NOAA Global Monitoring Laboratory & EPA")
desc_key = col_info.get("descriptionKey", "Based on ice core studies and atmospheric monitoring.")
timespan_str = col_info.get("timespan", "-803719-2025")

csv_url = "https://ourworldindata.org/grapher/co2-long-term-concentration.csv?v=1&csvType=full&useColumnShortNames=true"
csv_resp = requests.get(csv_url, headers=headers).text
reader = csv.DictReader(io.StringIO(csv_resp))

co2_records = []
for row in reader:
    try:
        yr = int(row['year'])
        val = float(row['co2_concentration'])
        entity = row.get('entity', 'World')
        co2_records.append({
            'year': yr,
            'co2_ppm': val,
            'entity': entity,
            'source': 'Our World in Data / NOAA GML / EPA',
            'location': 'Global Composite & Mauna Loa',
            'unit': 'ppm'
        })
    except Exception:
        continue

print(f"Total parsed OWID CO2 records: {len(co2_records)}")

print("2. Parsing NOAA CO2 mean dataset...")
noaa_csv_path = Path(__file__).resolve().parents[1] / 'input/CO2/NOAA CO2 mean 1959-2025.csv'
noaa_records = []
if os.path.exists(noaa_csv_path):
    with open(noaa_csv_path, 'r', encoding='utf-8') as f:
        lines = [l.strip() for l in f if l.strip()]
    start_idx = 1 if len(lines) > 0 and 'year' not in lines[0].lower() else 0
    reader_noaa = csv.DictReader(lines[start_idx:])
    for row in reader_noaa:
        try:
            yr = int(row['year'])
            val = float(row['CO2-ppm'])
            noaa_records.append({
                'year': yr,
                'co2_ppm': val,
                'entity': 'World',
                'source': 'NOAA Global Monitoring Laboratory',
                'location': 'Mauna Loa, Hawaii',
                'unit': 'ppm'
            })
        except Exception:
            continue
print(f"Total parsed NOAA CO2 records: {len(noaa_records)}")

co2_source_content = {
    'table_name': 'co2',
    'topic_id': 'co2-rise',
    'display_name': 'Annual Atmospheric Carbon Dioxide (800,000 BCE – Present)',
    'data_type': 'Atmospheric CO2 Concentration (Ice Core & Modern Air)',
    'source_org': 'Our World in Data / NOAA GML / EPA / EPICA Dome C',
    'source_url': 'https://ourworldindata.org/grapher/co2-long-term-concentration',
    'api_endpoint': csv_url,
    'last_updated': last_updated,
    'next_update': next_update,
    'record_count': len(co2_records),
    'time_range': '-803,719 BCE to 2025 CE (including 10K year Holocene record)',
    'unit': 'ppm (parts per million)',
    'frequency': 'Composite: Multi-millennial Antarctic ice cores + Mauna Loa continuous',
    'notes': f"{desc_key} Citation: {citation}",
    'status': 'active (automated API feed)'
}

noaa_source_content = {
    'table_name': 'co2_noaa',
    'topic_id': 'co2-rise',
    'display_name': 'NOAA Mauna Loa Annual Mean Atmospheric CO₂',
    'data_type': 'Atmospheric CO2 Concentration (Direct Atmospheric In-Situ)',
    'source_org': 'NOAA Global Monitoring Laboratory (GML)',
    'source_url': 'https://gml.noaa.gov/ccgg/trends/',
    'api_endpoint': './input/CO2/NOAA CO2 mean 1959-2025.csv',
    'last_updated': '2026-10-06',
    'next_update': 'Annual Spring Release',
    'record_count': len(noaa_records),
    'time_range': '1959 to 2025 CE',
    'unit': 'ppm (parts per million)',
    'frequency': 'Annual Mean',
    'notes': 'Continuous direct infrared spectrophotometer / cavity ring-down measurements at Mauna Loa Baseline Observatory, Hawaii (Keeling Curve foundation). Calibrated to WMO standards.',
    'status': 'active (verified local dataset)'
}

temps_source_content = {
    'table_name': 'temps',
    'topic_id': 'temp-rise',
    'display_name': 'Global Land & Ocean Temperature Anomalies',
    'data_type': 'Global Surface Temperature Anomaly',
    'source_org': 'NOAA NCEI & Met Office HadCRUT5',
    'source_url': 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series',
    'api_endpoint': './input/NOAA world temps/temps 1850-2026.csv',
    'last_updated': '2026-10-06',
    'next_update': 'Monthly / Annual Release',
    'record_count': 177,
    'time_range': '1850 to 2026 CE',
    'unit': '°C anomaly (relative to pre-industrial 1850–1900)',
    'frequency': 'Annual',
    'notes': 'Surface temperature anomaly computed across land stations and sea surface buoys/ships. Includes upper and lower 95% uncertainty bounds.',
    'status': 'active (local file pipeline)'
}

for ns in NAMESPACES:
    print(f"\n--- Syncing namespace {ns}:{ns} ---")
    execute_surql(ns, ns, schema_query)

    # Insert OWID CO2 batch
    batch_size = 500
    for i in range(0, len(co2_records), batch_size):
        batch = co2_records[i:i+batch_size]
        statements = []
        for r in batch:
            stmt = f"UPSERT co2:{r['year']} CONTENT {json.dumps(r)};"
            statements.append(stmt)
        execute_surql(ns, ns, "\n".join(statements))
    print(f"  Upserted {len(co2_records)} OWID records to co2")

    # Insert NOAA CO2 batch
    if noaa_records:
        stmts = ["BEGIN TRANSACTION;"]
        for r in noaa_records:
            stmts.append(f"UPSERT co2_noaa:{r['year']} CONTENT {json.dumps(r)};")
        stmts.append("COMMIT TRANSACTION;")
        execute_surql(ns, ns, "\n".join(stmts))
        print(f"  Upserted {len(noaa_records)} NOAA records to co2_noaa")

    # Catalog registration
    execute_surql(ns, ns, f"UPSERT data_sources:co2 CONTENT {json.dumps(co2_source_content)};")
    execute_surql(ns, ns, f"UPSERT data_sources:co2_noaa CONTENT {json.dumps(noaa_source_content)};")
    execute_surql(ns, ns, f"UPSERT data_sources:temps CONTENT {json.dumps(temps_source_content)};")
    print("  Catalog tables successfully registered.")

print("\nLoad & Multi-Namespace Sync Complete!")
