#!/usr/bin/env python3
"""
Loader script to import Canadian Forest Fires (2000-2026) CSV into SurrealDB with rich metadata.
Leaves out hectares per specification; stores fire count and area burned in million acres.
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
    '/home/timu/surapp/input/Fires/Forest fires in Canada 2000-2026 v2.csv',
    './input/Fires/Forest fires in Canada 2000-2026 v2.csv',
    '../input/Fires/Forest fires in Canada 2000-2026 v2.csv',
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
    parser = argparse.ArgumentParser(description='Load Forest fires in Canada CSV into SurrealDB')
    parser.add_argument('csv_file', nargs='?', default=None, help='Path to CSV')
    parser.add_argument('--endpoint', default='http://localhost:8000', help='SurrealDB endpoint')
    parser.add_argument('--ns', default='main', help='SurrealDB namespace')
    parser.add_argument('--db', default='main', help='SurrealDB database')
    parser.add_argument('--username', '-u', default='root', help='SurrealDB user')
    parser.add_argument('--password', '-p', default='root', help='SurrealDB pass')
    parser.add_argument('--table', '-t', default='wildfires', help='Table name')
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

    with open(csv_path, mode='r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]

    # Find header row
    header_idx = -1
    for i, line in enumerate(lines):
        if line.lower().startswith('year,'):
            header_idx = i
            break

    if header_idx == -1:
        print("Error: Could not find header row starting with 'Year,'", file=sys.stderr)
        sys.exit(1)

    reader = csv.DictReader(lines[header_idx:])
    records = []

    for row_idx, row in enumerate(reader, start=header_idx + 1):
        try:
            year_str = row.get('Year', '').strip()
            if not year_str:
                continue
            year = int(year_str)

            # Fire count
            fires_raw = row.get('Total Number of Fires', '').replace(',', '').strip()
            fires = int(fires_raw)

            # Area burned in million acres (find column with 'acre')
            acres_key = next((k for k in row.keys() if 'acre' in k.lower()), None)
            if not acres_key:
                raise ValueError(f"Could not find acres column in {list(row.keys())}")
            acres_raw = row.get(acres_key, '').replace(',', '').strip()
            area_acres_mil = float(acres_raw)

            is_2026 = (year == 2026)
            notes = "2026 data is as of Sept. 2026" if is_2026 else None
            as_of = "Sept 2026" if is_2026 else None

            rec = {
                'id': f"{args.table}:{year}",
                'year': year,
                'fires': fires,
                'area_burned_acres_mil': area_acres_mil,
                'country': 'Canada',
                'source': 'Canadian Wildland Fire Information System (CWFIS)'
            }
            if as_of:
                rec['as_of'] = as_of
            if notes:
                rec['notes'] = notes

            records.append(rec)
        except Exception as e:
            print(f"Warning: Failed parsing row {row_idx}: {e}", file=sys.stderr)

    # Sort chronological ascending (2000 to 2026)
    records.sort(key=lambda r: r['year'])
    print(f"Parsed {len(records)} wildfire records (Years {records[0]['year']} to {records[-1]['year']}).")

    # Define Schema
    schema_statements = []
    if args.drop:
        schema_statements.append(f"REMOVE TABLE IF EXISTS {args.table};")

    schema_statements.append(f"DEFINE TABLE IF NOT EXISTS {args.table} TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS year ON TABLE {args.table} TYPE int;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS fires ON TABLE {args.table} TYPE int;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS area_burned_acres_mil ON TABLE {args.table} TYPE float;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS country ON TABLE {args.table} TYPE string;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS as_of ON TABLE {args.table} TYPE option<string> | null;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS notes ON TABLE {args.table} TYPE option<string> | null;")
    schema_statements.append(f"DEFINE FIELD IF NOT EXISTS source ON TABLE {args.table} TYPE string;")
    schema_statements.append(f"DEFINE INDEX IF NOT EXISTS idx_{args.table}_year ON TABLE {args.table} COLUMNS year;")

    schema_query = "\n".join(schema_statements)
    print("Applying schema definitions...")
    execute_surql(args.endpoint, args.ns, args.db, args.username, args.password, schema_query)

    # Batch UPSERT records inside a transaction
    print(f"Loading {len(records)} records into table '{args.table}'...")
    batch_statements = ["BEGIN TRANSACTION;"]
    for r in records:
        content_data = {
            'year': r['year'],
            'fires': r['fires'],
            'area_burned_acres_mil': r['area_burned_acres_mil'],
            'country': r['country'],
            'source': r['source']
        }
        if 'as_of' in r:
            content_data['as_of'] = r['as_of']
        if 'notes' in r:
            content_data['notes'] = r['notes']

        content_json = json.dumps(content_data)
        batch_statements.append(f"UPSERT {r['id']} CONTENT {content_json};")
    batch_statements.append("COMMIT TRANSACTION;")

    batch_query = "\n".join(batch_statements)
    res = execute_surql(args.endpoint, args.ns, args.db, args.username, args.password, batch_query)

    # Check for any errors in results
    has_error = False
    for item in res:
        if isinstance(item, dict) and item.get('status') == 'ERR':
            print(f"Error in batch: {item.get('result')}", file=sys.stderr)
            has_error = True

    if has_error:
        print("Encountered errors during batch upsert.", file=sys.stderr)
    else:
        print(f"Batch upsert completed successfully.")

    # Register in data_sources catalog table
    print("Registering in data_sources catalog...")
    source_record = {
        'table_name': args.table,
        'topic_id': 'wildfires',
        'display_name': 'Forest Fires in Canada (2000–2026)',
        'data_type': 'Wildfire Frequency & Burned Acreage',
        'source_org': 'Canadian Wildland Fire Information System (CWFIS) / NRCan CFS',
        'source_url': 'https://cwfis.cfs.nrcan.gc.ca/en/summary',
        'api_endpoint': './input/Fires/Forest fires in Canada 2000-2026 v2.csv',
        'last_updated': '2026-09-30',
        'next_update': 'Annual National Summary',
        'record_count': len(records),
        'time_range': '2000 to 2026 (as of Sept 2026)',
        'unit': 'Total fires & Million acres burned',
        'frequency': 'Annual (2026 YTD through Sept 2026)',
        'notes': 'Official historical statistics from the Canadian Forest Service National Fire Database. Hectares excluded per project requirements. 2026 data reflects year-to-date figures as of September 2026.',
        'status': 'active (verified local dataset)'
    }
    source_sql = f"UPSERT data_sources:{args.table} CONTENT {json.dumps(source_record)};"
    try:
        execute_surql(args.endpoint, args.ns, args.db, args.username, args.password, source_sql)
        print("Registered in data_sources successfully.")
    except Exception as e:
        print(f"Warning: Failed to register in data_sources: {e}", file=sys.stderr)

    # Verify counts
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
