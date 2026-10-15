#!/usr/bin/env python3
"""
Regional Palmer Drought Severity Index (PDSI) analysis: West vs. Northeast (1950-2025).
Downloads NOAA NCEI regional drought data, stores records into SurrealDB tables
(drought_pdsi, drought_west, drought_northeast, data_sources), and generates divergence plot.
"""

import os
import sys
import base64
import json
import urllib.request
import urllib.error
import pandas as pd
import matplotlib.pyplot as plt

# Directories
PROJECT_DIR = "/home/timu/surapp"
ARTIFACT_DIR = "/home/timu/.gemini/antigravity-ide/brain/7f497c18-9e4b-4784-9223-46d7d17062aa"
CACHE_DIR = os.path.join(PROJECT_DIR, "input", "Drought")
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

SURREAL_URL = os.environ.get("SURREAL_URL", "http://127.0.0.1:8000")
SURREAL_NS = os.environ.get("SURREAL_NS", "main")
SURREAL_DB = os.environ.get("SURREAL_DB", "main")
SURREAL_USER = os.environ.get("SURREAL_USER", "root")
SURREAL_PASS = os.environ.get("SURREAL_PASS", "root")

REGIONS = {
    109: {"name": "West", "label": "West (CA/NV)", "cache_file": os.path.join(CACHE_DIR, "noaa_pdsi_west_109.csv")},
    101: {"name": "Northeast", "label": "Northeast", "cache_file": os.path.join(CACHE_DIR, "noaa_pdsi_northeast_101.csv")}
}

def execute_surql(query: str):
    """Executes a SurrealQL query via HTTP endpoint."""
    endpoint = f"{SURREAL_URL.rstrip('/')}/sql"
    auth_bytes = f"{SURREAL_USER}:{SURREAL_PASS}".encode("utf-8")
    auth_header = "Basic " + base64.b64encode(auth_bytes).decode("utf-8")

    headers = {
        "surreal-ns": SURREAL_NS,
        "surreal-db": SURREAL_DB,
        "Authorization": auth_header,
        "Content-Type": "text/plain; charset=utf-8",
        "Accept": "application/json"
    }

    req = urllib.request.Request(endpoint, data=query.encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        raise RuntimeError(f"HTTP {e.code} error from SurrealDB: {err_body}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Connection error connecting to SurrealDB at {endpoint}: {e.reason}")

def load_noaa_region(region_code: int):
    """Loads regional PDSI data from local cache or NOAA NCEI."""
    info = REGIONS.get(region_code, {"name": f"Region_{region_code}", "cache_file": None})
    cache_file = info.get("cache_file")

    if cache_file and os.path.exists(cache_file) and os.path.getsize(cache_file) > 100:
        print(f"Loading Region {region_code} ({info.get('name')}) from local cache: {cache_file}")
        df = pd.read_csv(cache_file, comment="#")
    else:
        url = f"https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/regional/time-series/{region_code}/pdsi/1/0/1950-2025.csv"
        print(f"Downloading Region {region_code} from NOAA URL: {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            content = resp.read()
        if cache_file:
            with open(cache_file, "wb") as f:
                f.write(content)
        import io
        df = pd.read_csv(io.BytesIO(content), comment="#")

    df.columns = df.columns.str.strip()
    df["DateStr"] = df["Date"].astype(str).str.strip()
    df["Date"] = pd.to_datetime(df["DateStr"], format="%Y%m")
    df["Year"] = df["Date"].dt.year
    df["Month"] = df["Date"].dt.month
    df = df.rename(columns={"Value": "PDSI"})
    df["RegionCode"] = region_code
    df["RegionName"] = info.get("name", f"Region_{region_code}")
    df["Rolling24"] = df["PDSI"].rolling(24).mean()
    return df.sort_values("Date").reset_index(drop=True)

def store_in_surrealdb(df_west: pd.DataFrame, df_east: pd.DataFrame):
    """Initializes schema and ingests PDSI data into SurrealDB tables."""
    print("1. Initializing SurrealDB drought tables schema...")
    schema_sql = """
    DEFINE TABLE IF NOT EXISTS drought_pdsi TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;
    DEFINE FIELD IF NOT EXISTS record_id ON TABLE drought_pdsi TYPE string;
    DEFINE FIELD IF NOT EXISTS date ON TABLE drought_pdsi TYPE string;
    DEFINE FIELD IF NOT EXISTS year ON TABLE drought_pdsi TYPE int;
    DEFINE FIELD IF NOT EXISTS month ON TABLE drought_pdsi TYPE int;
    DEFINE FIELD IF NOT EXISTS region_code ON TABLE drought_pdsi TYPE int;
    DEFINE FIELD IF NOT EXISTS region_name ON TABLE drought_pdsi TYPE string;
    DEFINE FIELD IF NOT EXISTS pdsi ON TABLE drought_pdsi TYPE float;
    DEFINE FIELD IF NOT EXISTS rolling_24_pdsi ON TABLE drought_pdsi TYPE option<float | null>;
    DEFINE INDEX IF NOT EXISTS idx_drought_pdsi_region ON TABLE drought_pdsi COLUMNS region_code;
    DEFINE INDEX IF NOT EXISTS idx_drought_pdsi_year ON TABLE drought_pdsi COLUMNS year;

    DEFINE TABLE IF NOT EXISTS drought_west AS SELECT * FROM drought_pdsi WHERE region_code = 109;
    DEFINE TABLE IF NOT EXISTS drought_northeast AS SELECT * FROM drought_pdsi WHERE region_code = 101;
    """
    execute_surql(schema_sql)

    all_records = []
    for df in [df_west, df_east]:
        for _, row in df.iterrows():
            reg_slug = row["RegionName"].lower()
            date_str = row["DateStr"]
            rolling_val = None if pd.isna(row["Rolling24"]) else round(float(row["Rolling24"]), 3)
            rec = {
                "id": f"drought_pdsi:{reg_slug}_{date_str}",
                "record_id": f"{reg_slug}_{date_str}",
                "date": row["Date"].strftime("%Y-%m-%d"),
                "year": int(row["Year"]),
                "month": int(row["Month"]),
                "region_code": int(row["RegionCode"]),
                "region_name": str(row["RegionName"]),
                "pdsi": round(float(row["PDSI"]), 2),
            }
            if rolling_val is not None:
                rec["rolling_24_pdsi"] = rolling_val
            all_records.append(rec)

    print(f"2. Ingesting {len(all_records)} drought records into SurrealDB...")
    batch_size = 200
    for i in range(0, len(all_records), batch_size):
        chunk = all_records[i:i + batch_size]
        statements = ["BEGIN TRANSACTION;"]
        for r in chunk:
            payload = json.dumps({k: v for k, v in r.items() if k != "id"})
            statements.append(f"UPSERT {r['id']} CONTENT {payload};")
        statements.append("COMMIT TRANSACTION;")
        batch_resp = execute_surql("\n".join(statements))
        for item in batch_resp:
            if item.get("status") != "OK":
                print(f"   Batch error in chunk [{i}:{i + len(chunk)}]: {item.get('result') or item.get('detail')}")
                break

    # Register in data_sources catalog table
    catalog_sql = f"""
    UPSERT data_sources:drought_pdsi CONTENT {{
        table_name: 'drought_pdsi',
        topic_id: 'drought',
        display_name: 'Palmer Drought Severity Index (PDSI) - Regional Divergence',
        data_type: 'time-series',
        source_org: 'NOAA NCEI Climate at a Glance',
        source_url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/regional/time-series/',
        api_endpoint: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/regional/time-series/{{region_code}}/pdsi/1/0/1950-2025.csv',
        last_updated: '2026-10-11',
        next_update: NONE,
        record_count: {len(all_records)},
        time_range: '1950-01 - 2025-12',
        unit: 'PDSI Index (-4 Extreme Drought to +4 Extremely Moist)',
        frequency: 'Monthly',
        notes: 'NOAA Palmer Drought Severity Index (PDSI) comparing West (109: CA, NV) and Northeast (101). Positive values indicate wet spells, negative values indicate drought conditions.',
        status: 'active'
    }};
    """
    execute_surql(catalog_sql)

    # Verification queries
    count_res = execute_surql("SELECT count() FROM drought_pdsi GROUP ALL;")
    sample_west = execute_surql("SELECT date, pdsi, rolling_24_pdsi FROM drought_pdsi WHERE region_code = 109 ORDER BY date DESC LIMIT 2;")
    sample_east = execute_surql("SELECT date, pdsi, rolling_24_pdsi FROM drought_pdsi WHERE region_code = 101 ORDER BY date DESC LIMIT 2;")

    print("3. SurrealDB Ingestion Complete!")
    print(f"   Total drought_pdsi records: {count_res[0].get('result')}")
    print(f"   Recent West sample: {sample_west[0].get('result')}")
    print(f"   Recent Northeast sample: {sample_east[0].get('result')}")

def generate_plot(df_west: pd.DataFrame, df_east: pd.DataFrame):
    """Generates and saves the regional divergence visualization."""
    print("4. Generating regional PDSI divergence plot...")
    fig, ax = plt.subplots(figsize=(13, 6.5), dpi=150)

    # Plot 24-month rolling means
    ax.plot(df_west["Date"], df_west["Rolling24"], color="#EF4444", lw=2.4, label="West (CA/NV) - 24-mo Mean")
    ax.plot(df_east["Date"], df_east["Rolling24"], color="#3B82F6", lw=2.4, label="Northeast - 24-mo Mean")

    # Shaded zero line & zones
    ax.axhline(0, color="#64748B", linestyle="--", alpha=0.8, lw=1.2)
    ax.axhspan(0, 5, color="#3B82F6", alpha=0.06, label="Moist / Surplus (> 0)")
    ax.axhspan(-5, 0, color="#EF4444", alpha=0.06, label="Drought / Deficit (< 0)")

    ax.set_title("Regional PDSI Divergence: West vs. Northeast (1950–2025)", fontsize=14, fontweight="bold", pad=12)
    ax.set_ylabel("PDSI (Wet > 0 | Dry < 0)", fontsize=11, fontweight="medium")
    ax.set_xlabel("Year", fontsize=11, fontweight="medium")
    ax.set_ylim(-4.5, 4.5)
    ax.grid(True, linestyle=":", alpha=0.5, color="#94A3B8")
    ax.legend(loc="lower left", framealpha=0.9, facecolor="#F8FAFC", edgecolor="#CBD5E1")

    fig.tight_layout()

    # Save to workspace and artifact directory
    plot_path_local = os.path.join(PROJECT_DIR, "drought_pdsi_divergence.png")
    plot_path_artifact = os.path.join(ARTIFACT_DIR, "drought_pdsi_divergence.png")

    fig.savefig(plot_path_local, bbox_inches="tight")
    fig.savefig(plot_path_artifact, bbox_inches="tight")
    print(f"   Plot saved successfully to:\n     - {plot_path_local}\n     - {plot_path_artifact}")

    if os.environ.get("DISPLAY"):
        try:
            plt.show(block=False)
            plt.pause(1.5)
        except Exception as e:
            print(f"   (GUI show note: {e})")
    plt.close(fig)

def main():
    print("==================================================")
    print("  NOAA Regional Drought (PDSI) Divergence Pipeline")
    print("==================================================")
    df_west = load_noaa_region(109)
    df_east = load_noaa_region(101)

    print(f"West records: {len(df_west)} (from {df_west['Date'].min().strftime('%Y-%m')} to {df_west['Date'].max().strftime('%Y-%m')})")
    print(f"Northeast records: {len(df_east)} (from {df_east['Date'].min().strftime('%Y-%m')} to {df_east['Date'].max().strftime('%Y-%m')})")

    # 1. Store in SurrealDB
    store_in_surrealdb(df_west, df_east)

    # 2. Generate and export plot
    generate_plot(df_west, df_east)

    print("==================================================")
    print("  Pipeline Completed Successfully!")
    print("==================================================")

if __name__ == "__main__":
    main()
