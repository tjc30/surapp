#!/usr/bin/env python3
"""
Loader script to import NOAA World Temperature data into SurrealDB.
"""

import argparse
import base64
import csv
import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_CSV_PATHS = [
    '/home/timu/surapp/input/noaa/temps/temps 1850-2026.csv',
    '/home/timu/surapp/input/NOAA world temps/temps 1850-2026.csv',
    './input/noaa/temps/temps 1850-2026.csv',
    './input/NOAA world temps/temps 1850-2026.csv',
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
    parser = argparse.ArgumentParser(description='Load NOAA temperature CSV into SurrealDB')
    parser.add_argument('csv_file', nargs='?', default=None, help='Path to CSV file')
    parser.add_argument('--endpoint', default='http://localhost:8000', help='SurrealDB endpoint URL')
    parser.add_argument('--ns', default='main', help='SurrealDB namespace')
    parser.add_argument('--db', default='main', help='SurrealDB database')
    parser.add_argument('--username', '-u', default='root', help='SurrealDB username')
    parser.add_argument('--password', '-p', default='root', help='SurrealDB password')
    parser.add_argument('--table', '-t', default='temps', help='Table name')
    parser.add_argument('--alias-table', default='temperature_anomaly', help='Alias view table name')
    parser.add_argument('--drop', action='store_true', help='Drop table before loading')
    args = parser.parse_args()

    csv_path = args.csv_file
    if not csv_path:
        csv_path = find_default_csv()
    if not csv_path or not os.path.exists(csv_path):
        print(f"Error: CSV file not found. Checked: {DEFAULT_CSV_PATHS}", file=sys.stderr)
        sys.exit(1)

    print(f"Using CSV file: {csv_path}")
    print(f"Target SurrealDB: {args.endpoint} (NS: {args.ns}, DB: {args.db}, Table: {args.table})")

    # Read and parse CSV rows
    records = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=2):
            try:
                year = int(row['Year'])
                avg = float(row['Average'])
                lower = float(row['Lower bound'])
                upper = float(row['Upper bound'])
                entity = row.get('Entity', 'World').strip()
                code = row.get('Code', 'OWID_WRL').strip()
                records.append({
                    'id': f"{args.table}:{year}",
                    'entity': entity,
                    'code': code,
                    'year': year,
                    'average': avg,
                    'lower_bound': lower,
                    'upper_bound': upper
                })
            except Exception as e:
                print(f"Error parsing row {row_idx}: {e}", file=sys.stderr)
                sys.exit(1)

    print(f"Parsed {len(records)} temperature records (Years {records[0]['year']} to {records[-1]['year']}).")

    # Prepare schema statements
    schema_statements = []
    if args.drop:
        schema_statements.append(f"REMOVE TABLE IF EXISTS {args.alias_table};")
        schema_statements.append(f"REMOVE TABLE IF EXISTS {args.table};")

    schema_statements.append(f"DEFINE TABLE IF NOT EXISTS {args.table} SCHEMAFULL;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS entity ON TABLE {args.table} TYPE string;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS code ON TABLE {args.table} TYPE string;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS year ON TABLE {args.table} TYPE int;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS average ON TABLE {args.table} TYPE float;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS lower_bound ON TABLE {args.table} TYPE float;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS upper_bound ON TABLE {args.table} TYPE float;")
    schema_statements.append(f"DEFINE INDEX IF NOT EXISTS idx_{args.table}_year ON TABLE {args.table} COLUMNS year;")

    schema_query = "\n".join(schema_statements)
    print("Applying schema definitions...")
    execute_surql(args.endpoint, args.ns, args.db, args.username, args.password, schema_query)

    # Batch UPSERT records inside a transaction
    print(f"Loading {len(records)} records into table '{args.table}'...")
    batch_statements = ["BEGIN TRANSACTION;"]
    for r in records:
        content_json = json.dumps({
            'entity': r['entity'],
            'code': r['code'],
            'year': r['year'],
            'average': r['average'],
            'lower_bound': r['lower_bound'],
            'upper_bound': r['upper_bound']
        })
        batch_statements.append(f"UPSERT {r['id']} CONTENT {content_json};")
    batch_statements.append("COMMIT TRANSACTION;")

    batch_query = "\n".join(batch_statements)
    execute_surql(args.endpoint, args.ns, args.db, args.username, args.password, batch_query)

    # Define alias view if requested
    if args.alias_table and args.alias_table != args.table:
        print(f"Creating alias view '{args.alias_table}' referencing '{args.table}'...")
        alias_sql = f"DEFINE TABLE IF NOT EXISTS {args.alias_table} AS SELECT * FROM {args.table};"
        execute_surql(args.endpoint, args.ns, args.db, args.username, args.password, alias_sql)

    # Verify counts and samples
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
