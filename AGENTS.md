# Planetary Climate Dashboard – AI Coding Standards & Guidelines

This document defines architectural and design standards for the Planetary Climate Observatory application. All future views, features, and components must adhere to these specifications.

---

## 1. Selection Boxes & View Mode Controls Standard

All selection boxes across the dashboard (such as **View Mode**, **Time Horizon**, **Data Filters**, and metric toggles) must follow the unified design standard established in the **Atmospheric CO₂ Level Rise** and **Canadian Forest Fires** views.

### 1.1 Visual Specification

| Property | Inactive State | Active State (Selected) |
| :--- | :--- | :--- |
| **Background** | Sleek dark slate `#1E293B` | Vibrant Sky Blue `#38BDF8` |
| **Border** | `1px solid rgba(255, 255, 255, 0.12)` | `1px solid #38BDF8` |
| **Text Color** | `#E2E8F0` (Bright light text) | `#04101F` (Dark black/navy, high contrast) |
| **Font Weight** | `500` (Medium) | `700` (Bold) |
| **Icon Color** | `#94A3B8` (Muted slate) | `#04101F` (Matches active text) |
| **Border Radius**| `6px` (Rectangular box with subtle rounding) | `6px` |
| **Box Shadow** | `0 1px 3px rgba(0, 0, 0, 0.2)` | `0 0 14px rgba(56, 189, 248, 0.4), 0 2px 4px rgba(0, 0, 0, 0.25)` |
| **Hover State** | Background `#334155`, border `rgba(255, 255, 255, 0.25)`, text `#FFFFFF` | Remains active with full glow |

### 1.2 Count Badge / Pill (`.selection-count-pill`)
When a selection box includes a numerical count (e.g., number of table records):
- **Inactive Pill**: `background: rgba(255, 255, 255, 0.1)`, `color: #CBD5E1`, font `JetBrains Mono`
- **Active Pill**: `background: rgba(4, 16, 31, 0.2)`, `color: #04101F`, `font-weight: 700`

---

## 2. Standard JSX Markup Pattern

When implementing view mode toggles or filter rows, use the following layout and CSS classes:

```jsx
import { Layers, Activity, Compass, Table as TableIcon } from 'lucide-react';

{/* Standard Controls Panel */}
<div className="controls-panel">
  <div className="control-row">
    {/* Row Label with Icon and Uppercase Text */}
    <span className="control-row-label">
      <Layers size={14} />
      View Mode:
    </span>

    {/* Selection Buttons Group */}
    <div className="selection-boxes-group">
      <button
        type="button"
        className={`selection-box-btn ${activeTab === 'chart' ? 'active' : ''}`}
        onClick={() => setActiveTab('chart')}
      >
        <Activity size={14} />
        <span>Interactive Chart</span>
      </button>

      <button
        type="button"
        className={`selection-box-btn ${activeTab === 'milestones' ? 'active' : ''}`}
        onClick={() => setActiveTab('milestones')}
      >
        <Compass size={14} />
        <span>Key Milestones</span>
      </button>

      <button
        type="button"
        className={`selection-box-btn ${activeTab === 'table' ? 'active' : ''}`}
        onClick={() => setActiveTab('table')}
      >
        <TableIcon size={14} />
        <span>Raw Records</span>
        <span className="selection-count-pill">{records.length}</span>
      </button>
    </div>
  </div>
</div>
```

---

## 3. Multi-Row Controls (View Mode + Time Horizon + Overlays)

For views requiring multiple rows of controls (e.g. view mode plus time presets):
- Stack multiple `.control-row` divs inside the single `.controls-panel`.
- Maintain consistent `.control-row-label` widths (`min-width: 135px`) so all button groups align horizontally.
- Use appropriate semantic Lucide icons for each row label (e.g., `<Layers size={14} />` for View Mode, `<Calendar size={14} />` for Time Horizon, `<Sliders size={14} />` for Filters).

---

## 4. Reusable CSS Classes Reference

These classes are defined globally in `frontend/src/index.css`:
- `.controls-panel`: Container card for control rows with subtle blur and dark background.
- `.control-row`: Flex row aligning label and button group.
- `.control-row-label`: Uppercase, bold, 700-weight muted section label.
- `.selection-boxes-group`: Flex container with `gap: 10px` and wrapping.
- `.selection-box-btn`: Standard button component with hover transition, active `#38BDF8` background, and dark text.
- `.selection-count-pill`: Monospace rounded count chip.


---

## 5. Shared Area Header Standard (Required for New Areas)

The current area header is the canonical design for every new area. Reuse it
without adding a separate header implementation or restoring removed badges.

All existing and new topic areas must use the shared top section implemented in
`frontend/src/components/Header.jsx`. Register new areas in
`frontend/src/data/topics.js` with a title, short title, icon, and status so the
shared header can display them consistently.

- Display the area title and icon in the shared header.
- Directly beneath the title, display `← Main / Area Name`. Use the existing
  accessible breadcrumb button to return to the main menu, with a single
  `ArrowLeft` icon. The area name comes from `shortTitle` or `title`.
  Do not add Live Dataset or In Development badges beside the area breadcrumb.
- Keep the shared Data Sources and Sync actions in the header. Area-specific
  header controls are optional and belong in `Header.jsx`.
- Keep Data Sources, the area's data source/status badge, and Sync together on
  one horizontal line, using `AreaDataStatus` for the badge. Do not display the
  `SurrealDB Connected` box in topic areas. Preserve meaningful dataset ranges,
  sources, and record counts. Use `.badge-ready` for available data and
  omit the status badge for an area in development.
- Start the area content with its hero or content section. Do not repeat the
  shared page title as a large hero heading, including partial restatements. Use
  `.area-hero-category` on the category line above the description for slightly
  larger, bold introductory text. The temperature area keeps its existing layout.
  Do not add a separate full-width navigation strip, a second breadcrumb, or standalone Main Menu /
  Back to Main Menu boxes at the top or bottom of an area.
- Keep header styling in `frontend/src/index.css`; update the shared header when
  changing its layout so new and existing areas stay consistent.

### New Area JSX Pattern

`App.jsx` renders the shared `Header` once. Do not render another `Header` inside
an area view. Register the area's metadata in `topics.js` and its dedicated view
in `App.jsx`; areas without a dedicated view use `TopicPlaceholderView`.

A topic view supplies only its optional data status and page content. For an
area with available data, follow this pattern:

```jsx
import AreaDataStatus from './AreaDataStatus';
import { CheckCircle2 } from 'lucide-react';

export default function NewAreaView({ records = [] }) {
  return (
    <div className="temp-view-container">
      <AreaDataStatus>
        <span className="badge-ready">
          <CheckCircle2 size={12} />
          Dataset loaded ({records.length.toLocaleString()} records)
        </span>
      </AreaDataStatus>

      <section>
        <div className="placeholder-category-pill area-hero-category">
          Area category • Data scope
        </div>
        <p>Describe the dataset without repeating the page title.</p>
        {/* Area content goes here. */}
      </section>
    </div>
  );
}
```

Render at most one `AreaDataStatus` per active area. Omit it for areas in
development rather than displaying an In Development badge. It places its
children between Data Sources and Sync in the shared header; do not duplicate
its badge in the content below. The generic `TopicPlaceholderView` also follows this
standard for new areas that do not yet have a dedicated view.


When adding an area, verify that its header matches the existing areas: one title
and icon, one `← Main / Area Name` breadcrumb, and a single row containing Data
Sources, any available dataset badge, and Sync. There must be no SurrealDB
Connected box, Live Dataset breadcrumb badge, In Development badge, or standalone
Main Menu button. Keep this layout through the shared components and CSS.


## 6. Verify the Served Frontend After UI Changes

The Axum app on port 3000 serves `frontend/dist`, not the JSX source directly.
After changing visible UI, run `npm run build` in `frontend` to refresh that
served bundle before reporting completion. For removals, verify the removed
badge or control markup is absent from the relevant source and generated bundle;
identical text may legitimately remain in unrelated dataset metadata. A source
edit alone does not update the app served by Axum. When possible, also check
the served page; explicitly distinguish build verification from browser checks.

## 7. Data Sources Catalog Completeness (Required)

Every dataset used by any existing or new area must have an entry in the Data
Sources catalog. This includes SurrealDB tables, API feeds, bundled CSV/JSON
files, and other local datasets. Add or update the catalog entry in the same
change that introduces or changes the dataset; a dataset badge in an area is
not a substitute for a catalog entry.

- Include a stable dataset identifier, display name, topic/view link, data type,
  provider, source URL when known, geographic coverage, time range, record count,
  units, frequency, update information when known, and methodology/file notes.
- Derive coverage and record counts from the actual data when practical. Reuse
  shared metadata between the area and the catalog to avoid inconsistencies.
- Identify the actual SurrealDB table and the ingestion source (API or local
  file). Import local files before registering their rows as database data. Keep
  catalog wording and totals accurate for observational and research records.
- Record unknown provenance or update dates as unspecified; do not invent them.
  For local files, include the repository-relative path in the notes.
- Register every dataset through the SurrealDB `data_sources` registry. Local
  files are ingestion inputs; import them into database tables before display.
  The catalog reads only `/api/sources`; do not merge frontend-only entries.
- Confirm each dataset appears in the catalog, can be searched and filtered,
  contributes the correct record count, and links to its area. Rebuild the served
  frontend after changes, as required in section 6.


## 8. Hierarchical Page Breadcrumbs (Required)

Use `Breadcrumbs.jsx` beneath the shared page title on every page except Main.
Only breadcrumb links navigate: the title, icon, current-page label, and `/`
separators must not navigate to Main. Keep the title container non-interactive.

- Begin with `← Main`, linking to Main. Each ancestor page links to that page,
  followed by `/`. Display the current page as plain text with
  `aria-current="page"`. Do not make the whole breadcrumb a Main link.
- A nested page must show its complete parent chain, for example:
  `← Main / CO₂ Levels / Historical Records / Record Details`.
  Here Main, CO₂ Levels, and Historical Records are independent links.
- Register page metadata in the shared page registry (`pagePaths.js` uses
  `TOPICS` plus Main and the catalog). Set `parentId` to the immediate parent's
  registered `id` for every sub-page. Pages without `parentId` belong to Main.
  Register the new view with the app's routing/hash handling as well.
- `getPagePath` derives breadcrumbs from metadata, not browser visit history, so
  direct links show the same full path. Parent IDs must exist and be acyclic.
  Do not hard-code separate breadcrumb chains inside individual views.
- Use real links for ancestors, retain keyboard and modified-click behavior,
  and allow long paths to wrap on smaller screens. Three or four levels use the
  same component; no special layout or extra navigation system is needed.


## 9. SurrealDB Is the Source of Area Data (Required)

All datasets used by areas and sub-areas must be stored in SurrealDB and read
through backend API endpoints. This includes charts, tables, research profiles,
reference milestones, and the provenance needed to interpret them. CSV/JSON
files may serve as reproducible ingestion inputs, never as runtime browser data.
Static interface labels, icons, styling, unit conversion constants, and values
calculated from database records do not require separate tables.

- Add a named table with a defined schema, deterministic record IDs, a repeatable
  loader, and a `data_sources` entry in the same change as a dataset or sub-area.
  Preserve units, geographic coverage, observation period, source links, and
  independently reported values. Do not fabricate missing metadata.
- Expose database data through an explicit backend route or the allowlisted
  `/api/datasets/:dataset` endpoint. Never accept arbitrary table names or SQL
  from the browser. Keep database credentials in the backend/loader.
- Supplemental tables use a schemafull table with a flexible `data` object to
  retain the original record shape, including nested research references. Use
  the existing typed schemas for established observational tables.
- Use `useDataset` / `DatasetView` for supplemental data. Show loading, empty,
  and error states and support Sync. Do not substitute hard-coded datasets or
  bundle CSV/JSON into the frontend when the database is unavailable.
- `python/load_area_data.py` imports the supplemental CSV/JSON inputs and registers
  their catalog entries. Startup runs it with `--missing-only` to preserve
  populated tables. Explicit imports upsert seed records without deleting rows.
- Verify actual database rows, catalog counts, API responses, repeat imports,
  and rebuilt frontend assets before reporting completion. Source files and
  unexecuted CREATE statements alone do not satisfy this standard.

Current supplemental tables: `global_clean_power_share`,
`tree_cover_change_2000_2020`, `electric_transport_cars`,
`electric_transport_road`, `electric_transport_rail`,
`electric_transport_marine`, `co2_milestones`, `drought_milestones`,
`wildfire_milestones`, and `flood_milestones`.

## 10. Python → SurrealDB → Rust → Web Data Pipeline (Required)

Use this separation of responsibilities for every area and sub-area:

`Provider API / source file → Python ingestion and cleaning → SurrealDB tables → Rust Axum API → React page`

- **Python acquires and prepares data.** Download provider data when available,
  or read documented CSV/JSON inputs for manually supplied or curated datasets.
  Parse and validate types, required fields, units, dates, geography, missing
  values, duplicates and dataset-specific constraints before writing records.
  Preserve source precision and independently reported values; do not silently
  fill gaps or reinterpret rounded values as errors. Report rejected records.
- **Python writes the validated data and provenance.** Use repeatable imports,
  stable IDs and checked database responses. Register each dataset in
  `data_sources`, with accurate counts, source links, periods, units and update
  information. Preserve existing populated tables during normal startup.
- **SurrealDB holds the runtime datasets.** Source files are ingestion inputs,
  not alternative browser data stores. Include curated research and milestones,
  as well as numerical observations, in named tables.
- **Rust delivers the data.** Axum queries SurrealDB, applies requested filters
  and required response shaping, and serves JSON through defined API routes.
  Do not use Rust as a second provider-download or raw-data-cleaning pipeline.
  Keep credentials and query execution out of the browser.
- **React presents the data.** Fetch from Rust API routes, render charts/tables,
  and handle loading, empty and failure states. Presentation filtering, display
  unit conversions, and summaries calculated from API records are allowed.
  Do not fetch provider datasets or import raw CSV/JSON directly in React.
- **Distinguish refresh from ingestion.** The current Sync button rereads the
  database through Rust; it does not run Python or download new provider data.
  State explicitly when an import is manual, startup-driven, or scheduled. Do
  not label a curated snapshot or local-file import as an automated live feed.

Current implementation follows this pipeline using the existing Python loaders,
including `python/load_area_data.py`, the SurrealDB `main/main` database, Rust routes in
`backend/src/main.rs`, and the React API clients. Some inputs are supplied files
or manually curated research rather than automatic provider downloads; cleaning
and validation depth varies by existing loader. Apply the checks above when
adding or revising loaders rather than assuming every existing input is fully
validated or automatically updated.


## 11. Manual Maintenance and Review Classification

Catalog entries use independent optional boolean fields `manually_maintained`
and `manually_reviewed`. The Data Sources page's Manual Records filter selects
entries where either flag is true; both flags may be true. Do not infer these
flags solely from words in a display name, ingestion method, or frequency.

Maintained means people manually update the dataset. Reviewed means the source
and interpretation were checked for a dated snapshot, without implying an update
or ongoing freshness. Neither label certifies independent verification. Retain
any documented review date in provenance; do not invent a date or assert review
for migrated editorial material that was not independently checked. Missing
flags mean the activity is not documented, not proof of automated maintenance.

Store classification in `data_sources`, expose it through Rust `/api/sources`,
and filter those database values in React. Do not duplicate underlying records
or create a second physical dataset just for this catalog filter.


## 12. Python Project Layout

Keep application-owned Python scripts in `python/` and Python checks in
`python/tests/`. Derive repository input/output paths from `__file__`, not the
working directory or a hard-coded checkout path. Invoke scripts from shell
scripts using `$DIR/python/<script>.py`. Update startup references and
maintained documentation whenever moving or renaming a script. Dependency
folders such as `.venv` and `node_modules` are not part of this source layout.
