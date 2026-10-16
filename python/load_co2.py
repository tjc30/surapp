#!/usr/bin/env python3
"""
Loader script to import NOAA CO2 mean data into SurrealDB with rich metadata.
"""

import argparse
from pathlib import Path
import base64
import csv
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV_PATHS = [
    str(ROOT / 'input/CO2/NOAA CO2 mean 1959-2025.csv'),
]

def find_default_csv():
    for p in DEFAULT_CSV_PATHS:
        full_p = os.path.abspath(os.path.expanduser(p))
        if os.path.exists(full_p):
            return full_p
    return None

def execute_surql(url: str, ns: str, db: str, user: str, password: str, query: str):
    endpoint = f"{url.rstrip('/')}/sql"
    auth_bytes = f"{user}:{password}".encode('utf-8')
    auth_header = "Basic " + base64.b64encode(auth_bytes).decode('utf-8')

    headers = {
        'surreal-ns': ns,
        'surreal-db': db,
        'Authorization': auth_header,
        'Content-Type': 'text/plain; charset=utf-8',
        'Accept': 'application/json'
    }

    req = urllib.request.Request(endpoint, data=query.encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode('utf-8')
            return json.loads(data)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8') if e.fp else str(e)
        raise RuntimeError(f"HTTP {e.code} error from SurrealDB: {err_body}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Connection error connecting to {endpoint}: {e.reason}")

def main():
    parser = argparse.ArgumentParser(description='Load NOAA CO2 CSV into SurrealDB with metadata')
    parser.add_argument('csv_file', nargs='?', default=None, help='Path to CSV')
    parser.add_argument('--endpoint', default='http://localhost:8000', help='SurrealDB endpoint')
    parser.add_argument('--ns', default='main', help='SurrealDB namespace')
    parser.add_argument('--db', default='main', help='SurrealDB database')
    parser.add_argument('--username', '-u', default='root', help='SurrealDB user')
    parser.add_argument('--password', '-p', default='root', help='SurrealDB pass')
    parser.add_argument('--table', '-t', default='co2', help='Table name')
    parser.add_argument('--drop', action='store_true', help='Drop table before loading')
    args = parser.parse_args()

    csv_path = args.csv_file
    if not csv_path:
        csv_path = find_default_csv()
    if not csv_path or not os.path.exists(csv_path):
        print(f"Error: CSV not found. Checked: {DEFAULT_CSV_PATHS}", file=sys.stderr)
        sys.exit(1)

    print(f"Using CSV file: {csv_path}")
    print(f"Target SurrealDB: {args.endpoint} (NS: {args.ns}, DB: {args.db}, Table: {args.table})")

    records = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]

    start_idx = 0
    if len(lines) > 0 and 'year' not in lines[0].lower():
        start_idx = 1

    reader = csv.DictReader(lines[start_idx:])
    for row_idx, row in enumerate(reader, start=start_idx + 1):
        try:
            year_val = None
            co2_val = None
            for k, v in row.items():
                if not k or v is None:
                    continue
                k_clean = k.strip().lower()
                if 'year' in k_clean:
                    year_val = int(v.strip())
                elif 'co2' in k_clean or 'ppm' in k_clean:
                    co2_val = float(v.strip())

            if year_val is not None and co2_val is not None:
                records.append({
                    'id': f"{args.table}:{year_val}",
                    'entity': 'World',
                    'source': 'NOAA Global Monitoring Laboratory',
                    'location': 'Mauna Loa, Hawaii',
                    'unit': 'ppm',
                    'year': year_val,
                    'co2_ppm': co2_val
                })
        except Exception as e:
            print(f"Error parsing row {row_idx}: {e}", file=sys.stderr)

    print(f"Parsed {len(records)} CO2 records with metadata (Years {records[0]['year']} to {records[-1]['year']}).")

    schema_statements = []
    if args.drop:
        schema_statements.append(f"REMOVE TABLE IF EXISTS {args.table};")

    schema_statements.append(f"DEFINE TABLE IF NOT EXISTS {args.table} SCHEMAFULL;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS entity ON TABLE {args.table} TYPE string;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS source ON TABLE {args.table} TYPE string;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS location ON TABLE {args.table} TYPE string;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS unit ON TABLE {args.table} TYPE string;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS year ON TABLE {args.table} TYPE int;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS co2_ppm ON TABLE {args.table} TYPE float;")
    schema_statements.append(f"DEFINE INDEX IF NOT EXISTS idx_{args.table}_year ON TABLE {args.table} COLUMNS year;")

    schema_query = "\n".join(schema_statements)
    print("Applying schema definitions with metadata fields...")
    execute_surql(args.endpoint, args.ns, args.db, args.username, args.password, schema_query)

    print(f"Loading {len(records)} records into table '{args.table}'...")
    batch_statements = ["BEGIN TRANSACTION;"]
    for r in records:
        content_json = json.dumps({
            'entity': r['entity'],
            'source': r['source'],
            'location': r['location'],
            'unit': r['unit'],
            'year': r['year'],
            'co2_ppm': r['co2_ppm']
        })
        batch_statements.append(f"UPSERT {r['id']} CONTENT {content_json};")
    batch_statements.append("COMMIT TRANSACTION;")

    batch_query = "\n".join(batch_statements)
    execute_surql(args.endpoint, args.ns, args.db, args.username, args.password, batch_query)

    verify_sql = f"""
    SELECT count() FROM {args.table} GROUP ALL;
    SELECT * FROM {args.table} ORDER BY year ASC LIMIT 2;
    SELECT * FROM {args.table} ORDER BY year DESC LIMIT 2;
    """
    res = execute_surql(args.endpoint, args.ns, args.db, args.username, args.password, verify_sql)

    count_res = res[0].get('result', [])
    first_res = res[1].get('result', [])
    last_res = res[2].get('result', [])

    count_val = count_res[0].get('count', 0) if count_res else 0
    print("\nLoad Complete!")
    print(f"Total records in '{args.table}': {count_val}")
    print("\nEarliest records:")
    print(json.dumps(first_res, indent=2))
    print("\nLatest records:")
    print(json.dumps(last_res, indent=2))

if __name__ == '__main__':
    main()