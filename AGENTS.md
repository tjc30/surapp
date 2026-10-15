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

## 5. Shared Area Header Standard

All existing and new topic areas must use the shared top section implemented in
`frontend/src/components/Header.jsx`. Register new areas in
`frontend/src/data/topics.js` with a title, short title, icon, and status so the
shared header can display them consistently.

- Display the area title and icon in the shared header.
- Directly beneath the title, display `← Main / Area Name`. Use the existing
  accessible breadcrumb button to return to the main menu, with a single
  `ArrowLeft` icon. The area name comes from `shortTitle` or `title`.
- Keep the shared Data Sources and Sync actions in the header. Area-specific
  header controls are optional and belong in `Header.jsx`.
- Place the area's data source/status badge directly beneath
  `SurrealDB Connected`, using `AreaDataStatus`. Preserve meaningful dataset
  ranges, sources, and record counts. Use `.badge-ready` for available data and
  `.badge-blank-indicator` for an area in development.
- Start the area content with its hero or content section. Do not add a separate
  full-width navigation strip, a second breadcrumb, or standalone Main Menu /
  Back to Main Menu boxes at the top or bottom of an area.
- Keep header styling in `frontend/src/index.css`; update the shared header when
  changing its layout so new and existing areas stay consistent.

### New Area JSX Pattern

`App.jsx` renders the shared `Header` once. A topic view supplies only its status
and page content:

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

      {/* Area hero and content go here. */}
    </div>
  );
}
```

Render one `AreaDataStatus` per active area, including during loading or empty
states. It places its children in the shared header; do not duplicate its badge
in the content below. The generic `TopicPlaceholderView` also follows this
standard for new areas that do not yet have a dedicated view.
