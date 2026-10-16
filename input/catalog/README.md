# Supplemental SurrealDB datasets

`python/load_area_data.py` creates ten tables and imports the app's formerly bundled
area records. Runtime views use `/api/datasets/:dataset`, and the catalog uses
`/api/sources`. No browser CSV or research-data fallback remains.

| Table | Seed input | Records |
| --- | --- | ---: |
| global_clean_power_share | input/clean-energy/global_clean_power_share.csv | 26 |
| tree_cover_change_2000_2020 | input/forests/tree_cover_change_2000_2020.csv | 7 |
| electric_transport_cars | supplemental_datasets.json | 1 |
| electric_transport_road | supplemental_datasets.json | 3 |
| electric_transport_rail | supplemental_datasets.json | 1 |
| electric_transport_marine | supplemental_datasets.json | 1 |
| co2_milestones | supplemental_datasets.json | 9 |
| drought_milestones | supplemental_datasets.json | 8 |
| wildfire_milestones | supplemental_datasets.json | 6 |
| flood_milestones | supplemental_datasets.json | 9 |

The JSON manifest records research provenance, catalog metadata, and the
migration snapshot. For the two numerical datasets the CSV is authoritative;
the loader reparses it on each run. If revising these CSVs, update the migration
snapshot used by the integration check as well.

Supplemental records are stored as a flexible `data` object in schemafull tables.
This preserves typed JSON values, nested references, negative net-change values,
and mode identifiers without conflating them with SurrealDB record IDs. The API
returns the `data` value, not the internal record ID. Existing observational
tables retain their original field-based schemas.

Run with the existing local database:

```sh
python3 python/load_area_data.py --dry-run
python3 python/load_area_data.py
python3 python/tests/check_database_datasets.py
```

The default namespace/database is `main/main`, matching the app. Endpoint and
credentials can be supplied as CLI options. Imports use transactions per table,
check SQL statuses, and upsert deterministic seed IDs without deleting rows.
Repeated-year milestones get distinct suffixes in seed order. `--missing-only`
is used by `start_app.sh` to preserve already populated tables; catalog counts
are read from actual database rows. An explicit import intentionally refreshes
seed records. User-added rows with other IDs are preserved. Changes to live
source counts require rerunning the loader to update catalog totals.

The migration preserves existing editorial milestone claims; it does not certify
or independently revalidate them. Their catalog entries explicitly record this
provenance limitation. Original datasets (temps, CO₂, drought, wildfires and
flooding) remain managed by their existing loaders and catalog entries.
