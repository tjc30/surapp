#!/usr/bin/env python3
"""Create/import area datasets and their catalog entries, without deleting rows."""
import argparse
import base64
import csv
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def datasets():
    manifest = json.loads((ROOT / 'input/catalog/supplemental_datasets.json').read_text())
    paths = {
        'global_clean_power_share': 'input/clean-energy/global_clean_power_share.csv',
        'tree_cover_change_2000_2020': 'input/forests/tree_cover_change_2000_2020.csv',
    }
    for table in manifest['tables']:
        if table['name'] in paths:
            with (ROOT / paths[table['name']]).open() as file:
                table['records'] = [
                    {key: value if key in ('region', 'country') else float(value) if '.' in value else int(value)
                     for key, value in row.items()} for row in csv.DictReader(file)
                ]
        assert re.fullmatch(r'[a-z][a-z0-9_]*', table['name'])
        assert table['records'], f"Empty seed: {table['name']}"
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--endpoint', default='http://127.0.0.1:8000')
    parser.add_argument('--ns', default='main')
    parser.add_argument('--db', default='main')
    parser.add_argument('--username', default='root')
    parser.add_argument('--password', default='root')
    parser.add_argument('--missing-only', action='store_true', help='Preserve populated tables (used by startup)')
    parser.add_argument('--dry-run', action='store_true', help='Validate local inputs without contacting the database')
    args = parser.parse_args()
    manifest = datasets()

    def query(sql):
        request = urllib.request.Request(args.endpoint.rstrip('/') + '/sql', data=sql.encode(), headers={
            'Accept': 'application/json', 'Content-Type': 'text/plain; charset=utf-8',
            'surreal-ns': args.ns, 'surreal-db': args.db,
            'Authorization': 'Basic ' + base64.b64encode(f'{args.username}:{args.password}'.encode()).decode(),
        })
        with urllib.request.urlopen(request, timeout=30) as response:
            results = json.load(response)
        errors = [r for r in results if r.get('status') != 'OK']
        if errors:
            raise RuntimeError(json.dumps(errors))
        return results

    if args.dry_run:
        for table in manifest['tables']:
            print(f"{table['name']}: {len(table['records'])} validated records")
        return

    # Existing registry schema is shared with the original dataset loaders.
    registry = ['DEFINE TABLE IF NOT EXISTS data_sources TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;']
    for field in ('table_name', 'topic_id', 'display_name', 'data_type', 'source_org', 'source_url',
                  'last_updated', 'time_range', 'unit', 'frequency', 'notes', 'status'):
        registry.append(f'DEFINE FIELD IF NOT EXISTS {field} ON TABLE data_sources TYPE string;')
    registry.extend([
        'DEFINE FIELD IF NOT EXISTS record_count ON TABLE data_sources TYPE int;',
        'DEFINE FIELD IF NOT EXISTS manually_maintained ON TABLE data_sources TYPE option<bool>;',
        'DEFINE FIELD IF NOT EXISTS manually_reviewed ON TABLE data_sources TYPE option<bool>;',
        'DEFINE FIELD IF NOT EXISTS api_endpoint ON TABLE data_sources TYPE option<string>;',
        'DEFINE FIELD IF NOT EXISTS next_update ON TABLE data_sources TYPE option<string>;',
    ])
    query('\n'.join(registry))
    for table in manifest['tables']:
        name = table['name']
        query(f'DEFINE TABLE IF NOT EXISTS {name} TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;\n'
              f'DEFINE FIELD IF NOT EXISTS data ON TABLE {name} TYPE object FLEXIBLE;')
        current = query(f'SELECT count() AS count FROM {name} GROUP ALL;')[0]['result']
        if not (args.missing_only and current and current[0]['count']):
            statements = ['BEGIN TRANSACTION;']
            seen = {}
            for index, row in enumerate(table['records']):
                key = str(row.get('id', row.get('region', row.get('year', index))))
                key = re.sub(r'[^a-zA-Z0-9_]', '_', key)
                occurrence = seen.get(key, 0)
                seen[key] = occurrence + 1
                key = f'{key}_{occurrence}' if occurrence else key
                statements.append(f'UPSERT {name}:seed_{key} CONTENT ' + json.dumps({'data': row}, ensure_ascii=False) + ';')
            statements.append('COMMIT TRANSACTION;')
            query('\n'.join(statements))
        count = query(f'SELECT count() AS count FROM {name} GROUP ALL;')[0]['result'][0]['count']
        source = next(s for s in manifest['sources'] if s['table_name'] == name).copy()
        source['record_count'] = count
        query(f'UPSERT data_sources:{name} CONTENT ' + json.dumps(source, ensure_ascii=False) + ';')
        print(f'{name}: {count} records; catalog registered')


if __name__ == '__main__':
    main()
