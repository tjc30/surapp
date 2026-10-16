#!/usr/bin/env python3
"""
Loader script to import Flooding datasets into SurrealDB:
1. input/Flooding/global-and-US-flooding.txt (Decadal trends: Coastal flood days, extreme precip area %, global disasters)
2. input/Flooding/US-flooding-cost (Decadal billion-dollar disaster losses: Tropical cyclones vs inland flooding)
3. Registers data_sources entries in the data_sources catalog table.
"""

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request

SURREAL_URL = 'http://localhost:8000'
USER = 'root'
PASS = 'root'
NS = 'main'
DB = 'main'

TRENDS_DATA = [
    {"year": 1950, "us_coastal_flood_days": 0.5, "us_heavy_precip_area_pct": 8.2, "global_reported_flood_events": 15},
    {"year": 1960, "us_coastal_flood_days": 0.8, "us_heavy_precip_area_pct": 8.5, "global_reported_flood_events": 25},
    {"year": 1970, "us_coastal_flood_days": 1.2, "us_heavy_precip_area_pct": 8.8, "global_reported_flood_events": 45},
    {"year": 1980, "us_coastal_flood_days": 1.8, "us_heavy_precip_area_pct": 9.4, "global_reported_flood_events": 75},
    {"year": 1990, "us_coastal_flood_days": 2.3, "us_heavy_precip_area_pct": 10.5, "global_reported_flood_events": 120},
    {"year": 2000, "us_coastal_flood_days": 2.8, "us_heavy_precip_area_pct": 11.2, "global_reported_flood_events": 155},
    {"year": 2010, "us_coastal_flood_days": 4.0, "us_heavy_precip_area_pct": 11.8, "global_reported_flood_events": 165},
    {"year": 2020, "us_coastal_flood_days": 5.0, "us_heavy_precip_area_pct": 12.5, "global_reported_flood_events": 175},
]

COSTS_DATA = [
    {
        "decade": "1980–1989",
        "coastal_tropical_cyclones_billions": 46.5,
        "inland_flooding_billions": 16.2,
        "total_flood_related_billions": 62.7
    },
    {
        "decade": "1990–1999",
        "coastal_tropical_cyclones_billions": 125.8,
        "inland_flooding_billions": 62.4,
        "total_flood_related_billions": 188.2
    },
    {
        "decade": "2000–2009",
        "coastal_tropical_cyclones_billions": 436.0,
        "inland_flooding_billions": 23.5,
        "total_flood_related_billions": 459.5
    },
    {
        "decade": "2010–2019",
        "coastal_tropical_cyclones_billions": 536.3,
        "inland_flooding_billions": 75.8,
        "total_flood_related_billions": 612.1
    },
    {
        "decade": "2020–2024 (5 yrs)",
        "coastal_tropical_cyclones_billions": 398.6,
        "inland_flooding_billions": 25.1,
        "total_flood_related_billions": 423.7
    }
]

def execute_surql(endpoint_url: str, ns: str, db: str, user: str, password: str, query: str):
    sql_endpoint = f"{endpoint_url.rstrip('/')}/sql"
    auth_bytes = f"{user}:{password}".encode('utf-8')
    auth_header = "Basic " + base64.b64encode(auth_bytes).decode('utf-8')

    headers = {
        'surreal-ns': ns,
        'surreal-db': db,
        'Authorization': auth_header,
        'Content-Type': 'text/plain; charset=utf-8',
        'Accept': 'application/json'
    }

    req = urllib.request.Request(sql_endpoint, data=query.encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode('utf-8')
            return json.loads(data)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8') if e.fp else str(e)
        raise RuntimeError(f"HTTP {e.code} error from SurrealDB: {err_body}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Connection error connecting to {sql_endpoint}: {e.reason}")

def main():
    parser = argparse.ArgumentParser(description='Load Flooding datasets into SurrealDB')
    parser.add_argument('--endpoint', default=SURREAL_URL)
    parser.add_argument('--ns', default=NS)
    parser.add_argument('--db', default=DB)
    parser.add_argument('--username', '-u', default=USER)
    parser.add_argument('--password', '-p', default=PASS)
    args = parser.parse_args()

    print(f"Connecting to SurrealDB at {args.endpoint} (ns: {args.ns}, db: {args.db})...")

    # 1. Define schema & load flood_trends
    statements = [
        "DEFINE TABLE IF NOT EXISTS flood_trends TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;",
        "DEFINE FIELD IF NOT EXISTS year ON TABLE flood_trends TYPE int;",
        "DEFINE FIELD IF NOT EXISTS us_coastal_flood_days ON TABLE flood_trends TYPE float;",
        "DEFINE FIELD IF NOT EXISTS us_heavy_precip_area_pct ON TABLE flood_trends TYPE float;",
        "DEFINE FIELD IF NOT EXISTS global_reported_flood_events ON TABLE flood_trends TYPE int;",
        "DEFINE FIELD IF NOT EXISTS source ON TABLE flood_trends TYPE string;",
        "DEFINE INDEX IF NOT EXISTS idx_flood_trends_year ON TABLE flood_trends COLUMNS year;",

        "DEFINE TABLE IF NOT EXISTS flood_costs TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;",
        "DEFINE FIELD IF NOT EXISTS decade ON TABLE flood_costs TYPE string;",
        "DEFINE FIELD IF NOT EXISTS coastal_tropical_cyclones_billions ON TABLE flood_costs TYPE float;",
        "DEFINE FIELD IF NOT EXISTS inland_flooding_billions ON TABLE flood_costs TYPE float;",
        "DEFINE FIELD IF NOT EXISTS total_flood_related_billions ON TABLE flood_costs TYPE float;",
        "DEFINE FIELD IF NOT EXISTS source ON TABLE flood_costs TYPE string;",
        "DEFINE INDEX IF NOT EXISTS idx_flood_costs_decade ON TABLE flood_costs COLUMNS decade;",

        "DELETE FROM flood_trends;",
        "DELETE FROM flood_costs;",
    ]

    for item in TRENDS_DATA:
        stmt = f"""CREATE flood_trends SET 
            year = {item['year']}, 
            us_coastal_flood_days = {item['us_coastal_flood_days']}, 
            us_heavy_precip_area_pct = {item['us_heavy_precip_area_pct']}, 
            global_reported_flood_events = {item['global_reported_flood_events']}, 
            source = 'NOAA CO-OPS, EPA Climate Indicators, EM-DAT';"""
        statements.append(stmt)

    for item in COSTS_DATA:
        dec = item['decade'].replace("'", "\\'")
        stmt = f"""CREATE flood_costs SET 
            decade = '{dec}', 
            coastal_tropical_cyclones_billions = {item['coastal_tropical_cyclones_billions']}, 
            inland_flooding_billions = {item['inland_flooding_billions']}, 
            total_flood_related_billions = {item['total_flood_related_billions']}, 
            source = 'NOAA NCEI U.S. Billion-Dollar Weather and Climate Disasters (CPI-Adjusted)';"""
        statements.append(stmt)

    # 3. Add to data_sources catalog table
    catalog_statements = [
        """DELETE FROM data_sources WHERE table_name = 'flood_trends' OR table_name = 'flood_costs';""",
        """CREATE data_sources SET
            table_name = 'flood_trends',
            topic_id = 'flooding',
            display_name = 'Global & U.S. Decadal Flooding Trends (1950–2020)',
            data_type = 'Decadal Multi-Metric Indicator Series',
            source_org = 'NOAA CO-OPS / EPA / EM-DAT',
            source_url = 'https://www.climate.gov/news-features/understanding-climate/climate-change-high-tide-flooding',
            api_endpoint = '/api/flooding',
            last_updated = '2026-10-12',
            next_update = '2027-01-15',
            record_count = 8,
            time_range = '1950 - 2020 (Decadal)',
            unit = 'Days/Year, % Area, Event Count',
            frequency = 'Decadal',
            notes = 'Tracks national median high-tide sunny day flood frequency, EPA extreme 1-day downpour area %, and international disaster frequency.',
            status = 'active';""",
        """CREATE data_sources SET
            table_name = 'flood_costs',
            topic_id = 'flooding',
            display_name = 'U.S. Billion-Dollar Flood & Storm Surge Losses (1980–2024)',
            data_type = 'Decadal CPI-Adjusted Economic Loss Series',
            source_org = 'NOAA NCEI Climate Disasters Team',
            source_url = 'https://www.ncei.noaa.gov/access/billions/',
            api_endpoint = '/api/flooding',
            last_updated = '2026-10-12',
            next_update = '2027-01-15',
            record_count = 5,
            time_range = '1980 - 2024 (Decadal & 5-Yr)',
            unit = 'Billions USD (CPI-Adjusted to 2024)',
            frequency = 'Decadal',
            notes = 'Tracks direct cumulative damages across 67 tropical cyclone surge disasters ($1,543.2B) and 45 non-tropical inland flooding events ($203.0B).',
            status = 'active';"""
    ]
    statements.extend(catalog_statements)

    full_query = "\n".join(statements)
    res = execute_surql(args.endpoint, args.ns, args.db, args.username, args.password, full_query)
    print(f"Successfully loaded {len(TRENDS_DATA)} flood_trends records and {len(COSTS_DATA)} flood_costs records into SurrealDB!")

if __name__ == '__main__':
    main()
