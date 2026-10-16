#!/usr/bin/env python3
"""Integration check: run after importing data and starting the Axum backend."""
import json
from pathlib import Path
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://127.0.0.1:3000'


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=10) as response:
        return json.load(response)


def check():
    manifest = json.loads((ROOT / 'input/catalog/supplemental_datasets.json').read_text())
    sources = {source['table_name']: source for source in get('/api/sources')}
    total = 0
    for table in manifest['tables']:
        name = table['name']
        rows = get('/api/datasets/' + name)
        assert len(rows) == len(table['records']), (name, len(rows))
        normalize = lambda data: sorted(json.dumps(row, sort_keys=True) for row in data)
        assert normalize(rows) == normalize(table['records']), name
        assert sources[name]['record_count'] == len(rows), name
        assert sources[name]['api_endpoint'] == '/api/datasets/' + name
        total += len(rows)
    manual = [source for source in sources.values() if source.get('manually_maintained') or source.get('manually_reviewed')]
    assert len(manual) == 9
    assert sum(bool(source.get('manually_maintained')) for source in manual) == 4
    assert sum(bool(source.get('manually_reviewed')) for source in manual) == 5
    for source in manifest['sources']:
        current = sources[source['table_name']]
        assert current.get('manually_maintained') == source.get('manually_maintained')
        assert current.get('manually_reviewed') == source.get('manually_reviewed')
    modes = get('/api/datasets/electric-transportation')
    assert len(modes) == 6 and len({mode['id'] for mode in modes}) == 6
    for path in ('/api/datasets/temps', '/api/datasets/not_a_table'):
        try:
            get(path)
        except urllib.error.HTTPError as error:
            assert error.code == 404
        else:
            raise AssertionError('Unregistered dataset should be rejected')
    for table in ('temps', 'co2', 'co2_noaa', 'drought_pdsi', 'wildfires', 'flood_trends', 'flood_costs'):
        assert table in sources, 'Missing catalog table: ' + table
    assert get('/api/health')['status'] == 'healthy'
    with urllib.request.urlopen(BASE + '/', timeout=10) as response:
        assert response.read().decode() == (ROOT / 'frontend/dist/index.html').read_text(), 'Server must serve the rebuilt frontend'
    print(f'PASS: {len(manifest["tables"])} tables, {total} exact records, catalog counts, six transport modes, API allowlist and existing sources.')


if __name__ == '__main__':
    check()
