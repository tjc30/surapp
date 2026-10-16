# Python data pipeline

All project-owned Python scripts live here. Input datasets remain in `../input/`;
the virtual environment and `requirements.txt` remain at the repository root.
Default input paths resolve from the script location, so loaders can be invoked
from the repository root, this folder, or another working directory.

From the repository root:

```sh
python3 python/load_area_data.py --dry-run
python3 python/load_area_data.py --missing-only
python3 python/tests/check_database_datasets.py
```

Other loaders: `load_temps.py`, `load_co2.py`, `load_wildfires.py`,
`load_flooding.py`, and `load_sources.py`. The latter downloads provider data
and writes to SurrealDB when run; it is not a dry-run command. `drought-plott.py`
uses pandas/matplotlib from the existing virtual environment and generates the
drought plot. `gen.py` is the existing generator placeholder.

`start_app.sh` invokes the loaders using absolute paths under this folder.
The integration check requires the database and Rust backend to be running.
