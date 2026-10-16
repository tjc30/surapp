use axum::{
    extract::{Path as ApiPath, Query, Request},
    http::StatusCode,
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::Path;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempRecord {
    pub year: i32,
    pub average: f64,
    pub lower_bound: f64,
    pub upper_bound: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Co2Record {
    pub year: i32,
    pub co2_ppm: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entity: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WildfireRecord {
    pub year: i32,
    pub fires: i32,
    pub area_burned_acres_mil: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub country: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub as_of: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DroughtRecord {
    pub record_id: String,
    pub date: String,
    pub year: i32,
    pub month: i32,
    pub region_code: i32,
    pub region_name: String,
    pub pdsi: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rolling_24_pdsi: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FloodTrendsRecord {
    pub year: i32,
    pub us_coastal_flood_days: f64,
    pub us_heavy_precip_area_pct: f64,
    pub global_reported_flood_events: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FloodCostsRecord {
    pub decade: String,
    pub coastal_tropical_cyclones_billions: f64,
    pub inland_flooding_billions: f64,
    pub total_flood_related_billions: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FloodingResponse {
    pub trends: Vec<FloodTrendsRecord>,
    pub costs: Vec<FloodCostsRecord>,
}



#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSourceRecord {
    pub table_name: String,
    pub topic_id: String,
    pub display_name: String,
    pub data_type: String,
    pub source_org: String,
    pub source_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_endpoint: Option<String>,
    pub last_updated: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_update: Option<String>,
    pub record_count: i64,
    pub time_range: String,
    pub unit: String,
    pub frequency: String,
    pub notes: String,
    pub status: String,
    #[serde(default)]
    pub manually_maintained: Option<bool>,
    #[serde(default)]
    pub manually_reviewed: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct SurrealQueryResponse<T> {
    result: Option<Vec<T>>,
    #[allow(dead_code)]
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FilterParams {
    pub start_year: Option<i32>,
    pub end_year: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct DroughtFilterParams {
    pub start_year: Option<i32>,
    pub end_year: Option<i32>,
    pub region: Option<i32>,
}


#[derive(Debug, Serialize)]
pub struct StatsSummary {
    pub count: usize,
    pub min_year: i32,
    pub max_year: i32,
    pub min_temp: f64,
    pub max_temp: f64,
    pub warmest_year: i32,
    pub coldest_year: i32,
    pub latest_record: Option<TempRecord>,
}

const SURREAL_URL: &str = "http://127.0.0.1:8000/sql";
const SURREAL_NS: &str = "main";
const SURREAL_DB: &str = "main";
const SURREAL_USER: &str = "root";
const SURREAL_PASS: &str = "root";

async fn fetch_temps_from_db(params: FilterParams) -> Result<Vec<TempRecord>, (StatusCode, String)> {
    let client = reqwest::Client::new();

    let mut query = "SELECT year, average, lower_bound, upper_bound FROM temps".to_string();
    let mut conditions = Vec::new();

    if let Some(start) = params.start_year {
        conditions.push(format!("year >= {}", start));
    }
    if let Some(end) = params.end_year {
        conditions.push(format!("year <= {}", end));
    }

    if !conditions.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&conditions.join(" AND "));
    }

    query.push_str(" ORDER BY year ASC;");

    let response = client
        .post(SURREAL_URL)
        .header("Accept", "application/json")
        .header("surreal-ns", SURREAL_NS)
        .header("surreal-db", SURREAL_DB)
        .basic_auth(SURREAL_USER, Some(SURREAL_PASS))
        .body(query)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to connect to SurrealDB: {}", e)))?;

    if !response.status().is_success() {
        let err_body = response.text().await.unwrap_or_default();
        return Err((StatusCode::BAD_GATEWAY, format!("SurrealDB returned error: {}", err_body)));
    }

    let parsed: Vec<SurrealQueryResponse<TempRecord>> = response
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse SurrealDB response: {}", e)))?;

    let records = parsed
        .into_iter()
        .next()
        .and_then(|r| r.result)
        .unwrap_or_default();

    Ok(records)
}

async fn fetch_co2_table_from_db(table: &str, params: FilterParams) -> Result<Vec<Co2Record>, (StatusCode, String)> {
    let client = reqwest::Client::new();

    let mut query = format!("SELECT year, co2_ppm, entity, source, location, unit FROM {}", table);
    let mut conditions = Vec::new();

    if let Some(start) = params.start_year {
        conditions.push(format!("year >= {}", start));
    }
    if let Some(end) = params.end_year {
        conditions.push(format!("year <= {}", end));
    }

    if !conditions.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&conditions.join(" AND "));
    }

    query.push_str(" ORDER BY year ASC;");

    let response = client
        .post(SURREAL_URL)
        .header("Accept", "application/json")
        .header("surreal-ns", SURREAL_NS)
        .header("surreal-db", SURREAL_DB)
        .basic_auth(SURREAL_USER, Some(SURREAL_PASS))
        .body(query)
        .send()
        .await;

    if let Ok(resp) = response {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<Vec<SurrealQueryResponse<Co2Record>>>().await {
                if let Some(records) = parsed.into_iter().next().and_then(|r| r.result) {
                    if !records.is_empty() {
                        return Ok(records);
                    }
                }
            }
        }
    }

    // Fallback: parse CSV directly from disk if SurrealDB table isn't populated
    let csv_candidates = [
        "/home/timu/surapp/input/CO2/NOAA CO2 mean 1959-2025.csv",
        "../input/CO2/NOAA CO2 mean 1959-2025.csv",
        "./input/CO2/NOAA CO2 mean 1959-2025.csv",
    ];

    for path in &csv_candidates {
        if let Ok(content) = std::fs::read_to_string(path) {
            let mut records = Vec::new();
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() || trimmed.starts_with("NOAA") || trimmed.to_lowercase().starts_with("year") {
                    continue;
                }
                let parts: Vec<&str> = trimmed.split(',').collect();
                if parts.len() >= 2 {
                    if let (Ok(year), Ok(co2)) = (parts[0].trim().parse::<i32>(), parts[1].trim().parse::<f64>()) {
                        let matches_start = params.start_year.map_or(true, |s| year >= s);
                        let matches_end = params.end_year.map_or(true, |e| year <= e);
                        if matches_start && matches_end {
                            records.push(Co2Record {
                                year,
                                co2_ppm: co2,
                                entity: Some("World".to_string()),
                                source: Some("NOAA Global Monitoring Laboratory".to_string()),
                                location: Some("Mauna Loa, Hawaii".to_string()),
                                unit: Some("ppm".to_string()),
                            });
                        }
                    }
                }
            }
            if !records.is_empty() {
                records.sort_by_key(|r| r.year);
                return Ok(records);
            }
        }
    }

    Err((StatusCode::NOT_FOUND, "No CO2 records found in database or CSV".to_string()))
}

async fn get_temps(Query(params): Query<FilterParams>) -> Result<Json<Vec<TempRecord>>, (StatusCode, String)> {
    let records = fetch_temps_from_db(params).await?;
    Ok(Json(records))
}

async fn get_co2(Query(params): Query<FilterParams>) -> Result<Json<Vec<Co2Record>>, (StatusCode, String)> {
    let records = fetch_co2_table_from_db("co2", params).await?;
    Ok(Json(records))
}

async fn get_co2_noaa(Query(params): Query<FilterParams>) -> Result<Json<Vec<Co2Record>>, (StatusCode, String)> {
    let records = fetch_co2_table_from_db("co2_noaa", params).await?;
    Ok(Json(records))
}

async fn fetch_wildfires_from_db(params: FilterParams) -> Result<Vec<WildfireRecord>, (StatusCode, String)> {
    let client = reqwest::Client::new();

    let mut query = "SELECT year, fires, area_burned_acres_mil, country, as_of, notes, source FROM wildfires".to_string();
    let mut conditions = Vec::new();

    if let Some(start) = params.start_year {
        conditions.push(format!("year >= {}", start));
    }
    if let Some(end) = params.end_year {
        conditions.push(format!("year <= {}", end));
    }

    if !conditions.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&conditions.join(" AND "));
    }

    query.push_str(" ORDER BY year ASC;");

    let response = client
        .post(SURREAL_URL)
        .header("Accept", "application/json")
        .header("surreal-ns", SURREAL_NS)
        .header("surreal-db", SURREAL_DB)
        .basic_auth(SURREAL_USER, Some(SURREAL_PASS))
        .body(query)
        .send()
        .await;

    if let Ok(resp) = response {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<Vec<SurrealQueryResponse<WildfireRecord>>>().await {
                if let Some(records) = parsed.into_iter().next().and_then(|r| r.result) {
                    if !records.is_empty() {
                        return Ok(records);
                    }
                }
            }
        }
    }

    // Fallback: parse CSV directly from disk if SurrealDB table isn't populated
    let csv_candidates = [
        "/home/timu/surapp/input/Fires/Forest fires in Canada 2000-2026 v2.csv",
        "../input/Fires/Forest fires in Canada 2000-2026 v2.csv",
        "./input/Fires/Forest fires in Canada 2000-2026 v2.csv",
    ];

    for path in &csv_candidates {
        if let Ok(content) = std::fs::read_to_string(path) {
            let mut records = Vec::new();
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() || trimmed.starts_with("Data") || trimmed.starts_with("Note") || trimmed.to_lowercase().starts_with("year") {
                    continue;
                }
                let parts: Vec<&str> = trimmed.split(',').collect();
                if parts.len() >= 4 {
                    if let Ok(year) = parts[0].trim().parse::<i32>() {
                        let matches_start = params.start_year.map_or(true, |s| year >= s);
                        let matches_end = params.end_year.map_or(true, |e| year <= e);
                        if matches_start && matches_end {
                            if let Ok(acres) = parts.last().unwrap().trim().parse::<f64>() {
                                let fires_str: String = parts[1..parts.len() - 2]
                                    .join("")
                                    .chars()
                                    .filter(|c| c.is_ascii_digit())
                                    .collect();
                                let fires = fires_str.parse::<i32>().unwrap_or(0);
                                let is_2026 = year == 2026;
                                records.push(WildfireRecord {
                                    year,
                                    fires,
                                    area_burned_acres_mil: acres,
                                    country: Some("Canada".to_string()),
                                    as_of: if is_2026 { Some("Sept 2026".to_string()) } else { None },
                                    notes: if is_2026 { Some("2026 data is as of Sept. 2026".to_string()) } else { None },
                                    source: Some("Canadian Wildland Fire Information System (CWFIS)".to_string()),
                                });
                            }
                        }
                    }
                }
            }
            if !records.is_empty() {
                records.sort_by_key(|r| r.year);
                return Ok(records);
            }
        }
    }

    Err((StatusCode::NOT_FOUND, "No wildfire records found in database or CSV".to_string()))
}

async fn get_wildfires(Query(params): Query<FilterParams>) -> Result<Json<Vec<WildfireRecord>>, (StatusCode, String)> {
    let records = fetch_wildfires_from_db(params).await?;
    Ok(Json(records))
}

async fn fetch_drought_from_db(params: DroughtFilterParams) -> Result<Vec<DroughtRecord>, (StatusCode, String)> {
    let client = reqwest::Client::new();

    let mut query = "SELECT record_id, date, year, month, region_code, region_name, pdsi, rolling_24_pdsi FROM drought_pdsi".to_string();
    let mut conditions = Vec::new();

    if let Some(start) = params.start_year {
        conditions.push(format!("year >= {}", start));
    }
    if let Some(end) = params.end_year {
        conditions.push(format!("year <= {}", end));
    }
    if let Some(reg) = params.region {
        conditions.push(format!("region_code = {}", reg));
    }

    if !conditions.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&conditions.join(" AND "));
    }

    query.push_str(" ORDER BY date ASC;");

    let response = client
        .post(SURREAL_URL)
        .header("Accept", "application/json")
        .header("surreal-ns", SURREAL_NS)
        .header("surreal-db", SURREAL_DB)
        .basic_auth(SURREAL_USER, Some(SURREAL_PASS))
        .body(query)
        .send()
        .await;

    if let Ok(resp) = response {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<Vec<SurrealQueryResponse<DroughtRecord>>>().await {
                if let Some(records) = parsed.into_iter().next().and_then(|r| r.result) {
                    if !records.is_empty() {
                        return Ok(records);
                    }
                }
            }
        }
    }

    // Fallback: parse CSV files from disk
    let csv_files = [
        (109, "West", "/home/timu/surapp/input/Drought/noaa_pdsi_west_109.csv"),
        (101, "Northeast", "/home/timu/surapp/input/Drought/noaa_pdsi_northeast_101.csv"),
    ];

    let mut all_records = Vec::new();
    for (reg_code, reg_name, path) in &csv_files {
        if let Some(wanted_reg) = params.region {
            if wanted_reg != *reg_code {
                continue;
            }
        }
        if let Ok(content) = std::fs::read_to_string(path) {
            let mut reg_records: Vec<(String, i32, i32, f64)> = Vec::new();
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.to_lowercase().starts_with("date") {
                    continue;
                }
                let parts: Vec<&str> = trimmed.split(',').collect();
                if parts.len() >= 2 {
                    if let Ok(val) = parts[1].trim().parse::<f64>() {
                        let dt_str = parts[0].trim();
                        if dt_str.len() >= 6 {
                            if let (Ok(yr), Ok(mo)) = (dt_str[0..4].parse::<i32>(), dt_str[4..6].parse::<i32>()) {
                                reg_records.push((format!("{}-{:02}-01", yr, mo), yr, mo, val));
                            }
                        }
                    }
                }
            }

            for i in 0..reg_records.len() {
                let (ref date_iso, yr, mo, pdsi) = reg_records[i];
                let matches_start = params.start_year.map_or(true, |s| yr >= s);
                let matches_end = params.end_year.map_or(true, |e| yr <= e);
                if matches_start && matches_end {
                    let rolling = if i >= 23 {
                        let sum: f64 = reg_records[i - 23..=i].iter().map(|r| r.3).sum();
                        Some((sum / 24.0 * 1000.0).round() / 1000.0)
                    } else {
                        None
                    };
                    all_records.push(DroughtRecord {
                        record_id: format!("{}_{}{:02}", reg_name.to_lowercase(), yr, mo),
                        date: date_iso.clone(),
                        year: yr,
                        month: mo,
                        region_code: *reg_code,
                        region_name: reg_name.to_string(),
                        pdsi,
                        rolling_24_pdsi: rolling,
                    });
                }
            }
        }
    }

    if !all_records.is_empty() {
        all_records.sort_by(|a, b| a.date.cmp(&b.date));
        return Ok(all_records);
    }

    Err((StatusCode::NOT_FOUND, "No drought records found in database or CSV".to_string()))
}

async fn get_drought(Query(params): Query<DroughtFilterParams>) -> Result<Json<Vec<DroughtRecord>>, (StatusCode, String)> {
    let records = fetch_drought_from_db(params).await?;
    Ok(Json(records))
}

async fn fetch_flooding_from_db() -> Result<FloodingResponse, (StatusCode, String)> {
    let client = reqwest::Client::new();

    // Try SurrealDB for flood_trends
    let trends_query = "SELECT year, us_coastal_flood_days, us_heavy_precip_area_pct, global_reported_flood_events FROM flood_trends ORDER BY year ASC;".to_string();
    let mut trends = Vec::new();
    if let Ok(resp) = client
        .post(SURREAL_URL)
        .header("Accept", "application/json")
        .header("surreal-ns", SURREAL_NS)
        .header("surreal-db", SURREAL_DB)
        .basic_auth(SURREAL_USER, Some(SURREAL_PASS))
        .body(trends_query)
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<Vec<SurrealQueryResponse<FloodTrendsRecord>>>().await {
                if let Some(recs) = parsed.into_iter().next().and_then(|r| r.result) {
                    trends = recs;
                }
            }
        }
    }

    // Try SurrealDB for flood_costs
    let costs_query = "SELECT decade, coastal_tropical_cyclones_billions, inland_flooding_billions, total_flood_related_billions FROM flood_costs;".to_string();
    let mut costs = Vec::new();
    if let Ok(resp) = client
        .post(SURREAL_URL)
        .header("Accept", "application/json")
        .header("surreal-ns", SURREAL_NS)
        .header("surreal-db", SURREAL_DB)
        .basic_auth(SURREAL_USER, Some(SURREAL_PASS))
        .body(costs_query)
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<Vec<SurrealQueryResponse<FloodCostsRecord>>>().await {
                if let Some(recs) = parsed.into_iter().next().and_then(|r| r.result) {
                    costs = recs;
                }
            }
        }
    }

    // Fallbacks if SurrealDB is empty
    if trends.is_empty() {
        trends = vec![
            FloodTrendsRecord { year: 1950, us_coastal_flood_days: 0.5, us_heavy_precip_area_pct: 8.2, global_reported_flood_events: 15 },
            FloodTrendsRecord { year: 1960, us_coastal_flood_days: 0.8, us_heavy_precip_area_pct: 8.5, global_reported_flood_events: 25 },
            FloodTrendsRecord { year: 1970, us_coastal_flood_days: 1.2, us_heavy_precip_area_pct: 8.8, global_reported_flood_events: 45 },
            FloodTrendsRecord { year: 1980, us_coastal_flood_days: 1.8, us_heavy_precip_area_pct: 9.4, global_reported_flood_events: 75 },
            FloodTrendsRecord { year: 1990, us_coastal_flood_days: 2.3, us_heavy_precip_area_pct: 10.5, global_reported_flood_events: 120 },
            FloodTrendsRecord { year: 2000, us_coastal_flood_days: 2.8, us_heavy_precip_area_pct: 11.2, global_reported_flood_events: 155 },
            FloodTrendsRecord { year: 2010, us_coastal_flood_days: 4.0, us_heavy_precip_area_pct: 11.8, global_reported_flood_events: 165 },
            FloodTrendsRecord { year: 2020, us_coastal_flood_days: 5.0, us_heavy_precip_area_pct: 12.5, global_reported_flood_events: 175 },
        ];
    }

    if costs.is_empty() {
        costs = vec![
            FloodCostsRecord { decade: "1980–1989".to_string(), coastal_tropical_cyclones_billions: 46.5, inland_flooding_billions: 16.2, total_flood_related_billions: 62.7 },
            FloodCostsRecord { decade: "1990–1999".to_string(), coastal_tropical_cyclones_billions: 125.8, inland_flooding_billions: 62.4, total_flood_related_billions: 188.2 },
            FloodCostsRecord { decade: "2000–2009".to_string(), coastal_tropical_cyclones_billions: 436.0, inland_flooding_billions: 23.5, total_flood_related_billions: 459.5 },
            FloodCostsRecord { decade: "2010–2019".to_string(), coastal_tropical_cyclones_billions: 536.3, inland_flooding_billions: 75.8, total_flood_related_billions: 612.1 },
            FloodCostsRecord { decade: "2020–2024 (5 yrs)".to_string(), coastal_tropical_cyclones_billions: 398.6, inland_flooding_billions: 25.1, total_flood_related_billions: 423.7 },
        ];
    } else {
        // preserve standard chronological order
        let order = ["1980–1989", "1990–1999", "2000–2009", "2010–2019", "2020–2024 (5 yrs)"];
        costs.sort_by_key(|c| order.iter().position(|&x| x == c.decade).unwrap_or(99));
    }

    Ok(FloodingResponse { trends, costs })
}

async fn get_flooding() -> Result<Json<FloodingResponse>, (StatusCode, String)> {
    let data = fetch_flooding_from_db().await?;
    Ok(Json(data))
}


async fn get_stats() -> Result<Json<StatsSummary>, (StatusCode, String)> {
    let records = fetch_temps_from_db(FilterParams {
        start_year: None,
        end_year: None,
    })
    .await?;

    if records.is_empty() {
        return Err((StatusCode::NOT_FOUND, "No records found in database".to_string()));
    }

    let count = records.len();
    let min_year = records.first().map(|r| r.year).unwrap_or(0);
    let max_year = records.last().map(|r| r.year).unwrap_or(0);

    let mut min_temp = f64::INFINITY;
    let mut max_temp = f64::NEG_INFINITY;
    let mut warmest_year = min_year;
    let mut coldest_year = min_year;

    for r in &records {
        if r.average > max_temp {
            max_temp = r.average;
            warmest_year = r.year;
        }
        if r.average < min_temp {
            min_temp = r.average;
            coldest_year = r.year;
        }
    }

    let latest_record = records.last().cloned();

    Ok(Json(StatsSummary {
        count,
        min_year,
        max_year,
        min_temp,
        max_temp,
        warmest_year,
        coldest_year,
        latest_record,
    }))
}


async fn get_sources() -> Result<Json<Vec<DataSourceRecord>>, (StatusCode, String)> {
    let client = reqwest::Client::new();
    let query = "SELECT table_name, topic_id, display_name, data_type, source_org, source_url, api_endpoint, last_updated, next_update, record_count, time_range, unit, frequency, notes, status, manually_maintained, manually_reviewed FROM data_sources ORDER BY table_name ASC;".to_string();

    let response = client
        .post(SURREAL_URL)
        .header("Accept", "application/json")
        .header("surreal-ns", SURREAL_NS)
        .header("surreal-db", SURREAL_DB)
        .basic_auth(SURREAL_USER, Some(SURREAL_PASS))
        .body(query)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to connect to SurrealDB: {}", e)))?;

    if !response.status().is_success() {
        let err_body = response.text().await.unwrap_or_default();
        return Err((StatusCode::BAD_GATEWAY, format!("SurrealDB returned error: {}", err_body)));
    }

    let parsed: Vec<SurrealQueryResponse<DataSourceRecord>> = response
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse SurrealDB response: {}", e)))?;

    let records = parsed
        .into_iter()
        .next()
        .and_then(|r| r.result)
        .unwrap_or_default();

    Ok(Json(records))
}

// All names are fixed here; user input is never interpolated into SurrealQL.
async fn get_area_dataset(ApiPath(dataset): ApiPath<String>) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let table = match dataset.as_str() {
        "global_clean_power_share" => "global_clean_power_share",
        "tree_cover_change_2000_2020" => "tree_cover_change_2000_2020",
        "electric_transport_cars" => "electric_transport_cars",
        "electric_transport_road" => "electric_transport_road",
        "electric_transport_rail" => "electric_transport_rail",
        "electric_transport_marine" => "electric_transport_marine",
        "electric-transportation" => "electric_transport_cars, electric_transport_road, electric_transport_rail, electric_transport_marine",
        "co2_milestones" => "co2_milestones",
        "drought_milestones" => "drought_milestones",
        "wildfire_milestones" => "wildfire_milestones",
        "flood_milestones" => "flood_milestones",
        _ => return Err((StatusCode::NOT_FOUND, "Unknown dataset".into())),
    };
    let response = reqwest::Client::new()
        .post(SURREAL_URL)
        .header("Accept", "application/json")
        .header("surreal-ns", SURREAL_NS)
        .header("surreal-db", SURREAL_DB)
        .basic_auth(SURREAL_USER, Some(SURREAL_PASS))
        .body(format!("SELECT VALUE data FROM {};", table))
        .send().await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Database unavailable: {}", e)))?;
    if !response.status().is_success() {
        return Err((StatusCode::BAD_GATEWAY, "Database request failed".into()));
    }
    let results: Vec<serde_json::Value> = response.json().await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Invalid database response: {}", e)))?;
    let result = results.first().ok_or((StatusCode::BAD_GATEWAY, "Missing database result".into()))?;
    if result["status"] != "OK" {
        return Err((StatusCode::BAD_GATEWAY, "Dataset query failed".into()));
    }
    let rows = result["result"].as_array().cloned()
        .ok_or((StatusCode::BAD_GATEWAY, "Invalid dataset records".into()))?;
    Ok(Json(rows))
}

async fn health_check() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "surapp-backend-axum",
        "version": "1.0.0"
    }))
}

async fn no_cache_middleware(req: Request, next: Next) -> Response {
    let mut response = next.run(req).await;
    response.headers_mut().insert(
        axum::http::header::CACHE_CONTROL,
        axum::http::HeaderValue::from_static("no-cache, no-store, must-revalidate"),
    );
    response.headers_mut().insert(
        axum::http::header::PRAGMA,
        axum::http::HeaderValue::from_static("no-cache"),
    );
    response.headers_mut().insert(
        axum::http::header::EXPIRES,
        axum::http::HeaderValue::from_static("0"),
    );
    response
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let mut app = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/temps", get(get_temps))
        .route("/api/co2", get(get_co2))
        .route("/api/co2/noaa", get(get_co2_noaa))
        .route("/api/wildfires", get(get_wildfires))
        .route("/api/drought", get(get_drought))
        .route("/api/flooding", get(get_flooding))
        .route("/api/stats", get(get_stats))
        .route("/api/sources", get(get_sources))
        .route("/api/datasets/:dataset", get(get_area_dataset));

    let dist_path = Path::new("../frontend/dist");
    if dist_path.exists() {
        println!("Serving frontend static build from {:?}", dist_path);
        app = app.fallback_service(ServeDir::new(dist_path));
    }

    app = app.layer(middleware::from_fn(no_cache_middleware)).layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("Axum server running on http://127.0.0.1:3000 (0.0.0.0:3000)");

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind TCP listener on port 3000");

    axum::serve(listener, app)
        .await
        .expect("Axum server crashed");
}