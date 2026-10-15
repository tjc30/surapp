import AreaDataStatus from './AreaDataStatus';
import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  Sun,
  Calendar,
  Layers,
  Sliders,
  Database,
  Table as TableIcon,
  Sparkles,
  Info,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Compass,
  CheckCircle2,
  ExternalLink,
  Search,
  Download,
  Activity,
  Droplets,
  Flame,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Historical Drought Milestones in North America (1950-2025)
const DROUGHT_MILESTONES = [
  {
    year: 1950,
    title: '1950s Southwest & Southern Plains Aridity',
    region: 'West / Southwest',
    pdsi: -2.40,
    type: 'drought',
    tag: 'Baseline Period',
    description: 'Post-WWII prolonged dry spell affecting California, Nevada, and the Southwest with repeated seasonal deficits.',
  },
  {
    year: 1965,
    title: 'Historic Northeast Drought of the 1960s',
    region: 'Northeast',
    pdsi: -4.50,
    type: 'drought',
    tag: 'All-Time East Record',
    description: 'Severe multi-year drought across New England, New York, and the Mid-Atlantic. Reservoir levels fell to historic lows, triggering regional emergency rationing.',
  },
  {
    year: 1977,
    title: '1976–1977 California Severe Drought Crisis',
    region: 'West (CA/NV)',
    pdsi: -5.85,
    type: 'drought',
    tag: 'Historic Desiccation',
    description: 'One of the sharpest 2-year precipitation deficits in modern West Coast history. Snowpacks virtually disappeared, sparking modern statewide water management reforms.',
  },
  {
    year: 1983,
    title: '1982–1983 Super El Niño Moisture Surplus',
    region: 'West (CA/NV)',
    pdsi: 4.88,
    type: 'moist',
    tag: 'Record Wet Spell',
    description: 'Intense atmospheric rivers dumped unprecedented rain and snow across California and Nevada, producing the highest wet index anomaly (+4.88) in the 76-year record.',
  },
  {
    year: 1991,
    title: '1987–1992 Six-Year Western Drought',
    region: 'West (CA/NV)',
    pdsi: -3.80,
    type: 'drought',
    tag: 'Prolonged Deficit',
    description: 'Six consecutive dry years in California depleted state reservoirs to 32% of capacity, accelerating groundwater overdraft across the Central Valley.',
  },
  {
    year: 2014,
    title: '2012–2016 Exceptional California Megadrought',
    region: 'West (CA/NV)',
    pdsi: -5.10,
    type: 'drought',
    tag: 'State Emergency',
    description: 'Record-high temperatures exacerbated precipitation deficits, creating a "hot drought." Governor Brown declared a statewide state of emergency with mandatory 25% urban reductions.',
  },
  {
    year: 2021,
    title: '2020–2022 Western North America Megadrought Peak',
    region: 'West (CA/NV)',
    pdsi: -4.85,
    type: 'drought',
    tag: '1,200-Year Event',
    description: 'Tree-ring studies confirmed 2000–2022 was the driest 22-year period in southwestern North America since at least 800 CE. Lake Mead and Lake Powell dropped to record crisis levels.',
  },
  {
    year: 2025,
    title: '2024–2025 Trans-Continental Regional Divergence',
    region: 'West & Northeast',
    pdsi: -3.22,
    type: 'divergence',
    tag: 'Current State',
    description: 'While California experienced atmospheric river recovery in 2023, the Northeast plunged into an unexpected severe flash drought in late 2024–2025 (-3.22 PDSI).',
  },
];

function getPdsiClassification(val) {
  if (val >= 4.0) return { label: 'Extremely Moist', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.15)' };
  if (val >= 3.0) return { label: 'Very Moist', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.15)' };
  if (val >= 2.0) return { label: 'Moderately Moist', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
  if (val >= 1.0) return { label: 'Slightly Moist', color: '#7DD3FC', bg: 'rgba(125, 211, 252, 0.15)' };
  if (val > -1.0) return { label: 'Near Normal', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)' };
  if (val > -2.0) return { label: 'Mild Drought', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
  if (val > -3.0) return { label: 'Moderate Drought', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' };
  if (val > -4.0) return { label: 'Severe Drought', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.18)' };
  return { label: 'Extreme Drought', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.25)' };
}

export default function DroughtsView({
  data = [],
  loading = false,
  error = null,
  onNavigate,
  sources = [],
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'milestones' | 'table'
  const [timePreset, setTimePreset] = useState('all'); // 'all' | '1950-1979' | '1980-1999' | '2000-2025' | '2010-2025'
  const [regionFilter, setRegionFilter] = useState('both'); // 'both' | 'west' | 'northeast'
  const [smoothingMode, setSmoothingMode] = useState('rolling'); // 'rolling' | 'raw'
  const [tableSearch, setTableSearch] = useState('');
  const [tableRegion, setTableRegion] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Separate records by region
  const westRecords = useMemo(() => data.filter((r) => r.region_code === 109), [data]);
  const eastRecords = useMemo(() => data.filter((r) => r.region_code === 101), [data]);

  // Filter records by time preset
  const filteredData = useMemo(() => {
    return data.filter((r) => {
      if (timePreset === '1950-1979') return r.year >= 1950 && r.year <= 1979;
      if (timePreset === '1980-1999') return r.year >= 1980 && r.year <= 1999;
      if (timePreset === '2000-2025') return r.year >= 2000 && r.year <= 2025;
      if (timePreset === '2010-2025') return r.year >= 2010 && r.year <= 2025;
      return true;
    });
  }, [data, timePreset]);

  // Key Statistics
  const stats = useMemo(() => {
    if (!data.length) return null;

    let minWest = 0;
    let minEast = 0;
    let minWestDate = '';
    let minEastDate = '';
    let latestWest = null;
    let latestEast = null;

    westRecords.forEach((r) => {
      if (r.pdsi < minWest) {
        minWest = r.pdsi;
        minWestDate = r.date;
      }
      latestWest = r;
    });

    eastRecords.forEach((r) => {
      if (r.pdsi < minEast) {
        minEast = r.pdsi;
        minEastDate = r.date;
      }
      latestEast = r;
    });

    // Count extreme drought months (pdsi <= -4.0)
    const westExtremeCount = westRecords.filter((r) => r.pdsi <= -4.0).length;
    const eastExtremeCount = eastRecords.filter((r) => r.pdsi <= -4.0).length;

    return {
      minWest,
      minWestDate,
      minEast,
      minEastDate,
      latestWest,
      latestEast,
      westExtremeCount,
      eastExtremeCount,
      totalMonths: westRecords.length,
    };
  }, [data, westRecords, eastRecords]);

  // Build Chart.js Dataset
  const chartData = useMemo(() => {
    const datesMap = new Map();

    filteredData.forEach((r) => {
      if (!datesMap.has(r.date)) {
        datesMap.set(r.date, { date: r.date, year: r.year, month: r.month });
      }
      if (r.region_code === 109) {
        datesMap.get(r.date).west = smoothingMode === 'rolling' ? r.rolling_24_pdsi : r.pdsi;
        datesMap.get(r.date).westRaw = r.pdsi;
      } else if (r.region_code === 101) {
        datesMap.get(r.date).east = smoothingMode === 'rolling' ? r.rolling_24_pdsi : r.pdsi;
        datesMap.get(r.date).eastRaw = r.pdsi;
      }
    });

    const sortedEntries = Array.from(datesMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const labels = sortedEntries.map((e) => e.date.substring(0, 7)); // YYYY-MM

    const datasets = [];

    // Zero reference line
    datasets.push({
      label: 'Zero Baseline (Normal)',
      data: sortedEntries.map(() => 0),
      borderColor: 'rgba(148, 163, 184, 0.6)',
      borderWidth: 1.5,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      order: 3,
    });

    // West Region (CA/NV)
    if (regionFilter === 'both' || regionFilter === 'west') {
      datasets.push({
        label: `West (CA/NV) ${smoothingMode === 'rolling' ? '24-Mo Rolling Mean' : 'Monthly PDSI'}`,
        data: sortedEntries.map((e) => e.west ?? null),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: smoothingMode === 'rolling' ? 2.5 : 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#EF4444',
        pointHoverBorderColor: '#FFFFFF',
        tension: 0.25,
        fill: false,
        order: 1,
      });
    }

    // Northeast Region
    if (regionFilter === 'both' || regionFilter === 'northeast') {
      datasets.push({
        label: `Northeast ${smoothingMode === 'rolling' ? '24-Mo Rolling Mean' : 'Monthly PDSI'}`,
        data: sortedEntries.map((e) => e.east ?? null),
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.08)',
        borderWidth: smoothingMode === 'rolling' ? 2.5 : 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#38BDF8',
        pointHoverBorderColor: '#FFFFFF',
        tension: 0.25,
        fill: false,
        order: 2,
      });
    }

    return { labels, datasets };
  }, [filteredData, regionFilter, smoothingMode]);

  // Chart Options
  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#E2E8F0',
            font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
            usePointStyle: true,
            boxWidth: 10,
            padding: 18,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#F8FAFC',
          bodyColor: '#E2E8F0',
          borderColor: 'rgba(56, 189, 248, 0.3)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              return `Month: ${items[0].label}`;
            },
            label: (context) => {
              const label = context.dataset.label || '';
              const val = context.parsed.y;
              if (val === null || val === undefined) return `${label}: N/A`;
              if (context.datasetIndex === 0) return null; // hide zero line tooltip
              const classification = getPdsiClassification(val);
              return `${label}: ${val > 0 ? '+' : ''}${val.toFixed(2)} (${classification.label})`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94A3B8',
            maxTicksLimit: 14,
            font: { family: "'JetBrains Mono', monospace", size: 11 },
          },
        },
        y: {
          min: -6.0,
          max: 6.0,
          grid: { color: 'rgba(255, 255, 255, 0.07)' },
          ticks: {
            color: '#94A3B8',
            stepSize: 2,
            callback: (val) => {
              if (val === 0) return '0.0 (Normal)';
              if (val > 0) return `+${val} (Wet)`;
              return `${val} (Dry)`;
            },
            font: { family: "'JetBrains Mono', monospace", size: 11 },
          },
          title: {
            display: true,
            text: 'Palmer Drought Severity Index (PDSI)',
            color: '#CBD5E1',
            font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
          },
        },
      },
    };
  }, []);

  // Filtered Table Records
  const tableRecords = useMemo(() => {
    return data.filter((r) => {
      if (tableRegion !== 'all' && r.region_code.toString() !== tableRegion) {
        return false;
      }
      if (!tableSearch) return true;
      const q = tableSearch.toLowerCase();
      const cls = getPdsiClassification(r.pdsi).label.toLowerCase();
      return (
        r.date.includes(q) ||
        r.year.toString().includes(q) ||
        r.region_name.toLowerCase().includes(q) ||
        cls.includes(q) ||
        r.pdsi.toString().includes(q)
      );
    });
  }, [data, tableRegion, tableSearch]);

  const totalPages = Math.ceil(tableRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return tableRecords.slice(start, start + pageSize);
  }, [tableRecords, currentPage]);

  // Export CSV
  const exportCsv = () => {
    if (!tableRecords.length) return;
    const headers = ['Date', 'Year', 'Month', 'Region Code', 'Region Name', 'PDSI', '24-Mo Rolling Mean', 'Severity Classification'];
    const rows = tableRecords.map((r) => [
      r.date,
      r.year,
      r.month,
      r.region_code,
      r.region_name,
      r.pdsi,
      r.rolling_24_pdsi ?? '',
      getPdsiClassification(r.pdsi).label,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `noaa_pdsi_drought_records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="view-container">
      {/* Dataset status appears in the shared header. */}
      <AreaDataStatus>
        <span className="badge-ready">
            <CheckCircle2 size={12} /> Live NOAA Ingestion Active ({data.length.toLocaleString()} Records)
          </span>
      </AreaDataStatus>

      {/* Hero Section */}
      <div className="wildfires-hero-card" style={{ borderColor: 'rgba(234, 179, 8, 0.3)' }}>
        <div className="wildfires-hero-content">
          <div
            className="wildfires-hero-icon-wrap"
            style={{
              background: 'rgba(234, 179, 8, 0.15)',
              borderColor: 'rgba(234, 179, 8, 0.3)',
              color: '#EAB308',
            }}
          >
            <Sun size={36} />
          </div>
          <div className="wildfires-hero-text">
            <div
              className="placeholder-category-pill"
              style={{ color: '#EAB308', borderColor: 'rgba(234, 179, 8, 0.3)' }}
            >
              Ecological & Agricultural Impact • North America
            </div>
            <h2 className="wildfires-hero-title">
              Severe Droughts & Regional Aridity Divergence (1950–2025)
            </h2>
            <p className="wildfires-hero-desc">
              A 76-year monthly comparative study of regional aridity between the <strong>American West (Region 109: CA/NV)</strong> and the <strong>Northeast (Region 101)</strong>.
              Tracking severe multidecadal megadrought desiccation versus humid Atlantic moisture regimes using authoritative NOAA Palmer Drought Severity Index (PDSI) measurements.
            </p>
          </div>
        </div>

        <div className="wildfires-notice-callout">
          <Info size={16} className="text-amber shrink-0" />
          <div className="notice-callout-text">
            <strong>Index Benchmark:</strong> PDSI values &gt; 0 represent moisture surplus / wet spells, while values &lt; 0 represent drought deficits.
            Values at or below <strong>-4.00</strong> denote <strong>Extreme Drought</strong>. 24-month rolling means highlight persistent multidecadal megadrought epochs.
          </div>
        </div>
      </div>

      {/* Top KPI Metrics Cards Grid */}
      {stats && (
        <div className="wildfires-kpi-grid">
          {/* Card 1: All-Time West Drought Low */}
          <div className="kpi-metric-card border-red-glow">
            <div className="kpi-card-header">
              <span className="kpi-card-label">All-Time West Drought Low</span>
              <span className="badge-kpi-record">Historic Record</span>
            </div>
            <div className="kpi-card-main-val text-red">
              {stats.minWest.toFixed(2)} PDSI
            </div>
            <div className="kpi-card-sub">
              <span>Recorded in {stats.minWestDate}</span>
              <span className="kpi-card-badge-danger">Extreme Desiccation</span>
            </div>
          </div>

          {/* Card 2: West Extreme Drought Months */}
          <div className="kpi-metric-card border-orange-glow">
            <div className="kpi-card-header">
              <span className="kpi-card-label">West Extreme Drought (≤ -4.0)</span>
              <span className="badge-kpi-alert">Megadrought Exposure</span>
            </div>
            <div className="kpi-card-main-val text-orange">
              {stats.westExtremeCount} Months
            </div>
            <div className="kpi-card-sub">
              <span>{((stats.westExtremeCount / (stats.totalMonths || 1)) * 100).toFixed(1)}% of all recorded months</span>
              <span className="kpi-card-badge-trend">Region 109 (CA/NV)</span>
            </div>
          </div>

          {/* Card 3: Northeast Historic Low */}
          <div className="kpi-metric-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Northeast Historic Record Low</span>
              <span className="badge-kpi-stat">1960s Drought</span>
            </div>
            <div className="kpi-card-main-val text-sky">
              {stats.minEast.toFixed(2)} PDSI
            </div>
            <div className="kpi-card-sub">
              <span>Recorded in {stats.minEastDate}</span>
              <span className="kpi-card-meta">Region 101</span>
            </div>
          </div>

          {/* Card 4: Latest 2025 Condition */}
          <div className="kpi-metric-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Latest Condition (Dec 2025)</span>
              <span className="badge-kpi-asof">Dec 2025</span>
            </div>
            <div className="kpi-card-main-val text-amber">
              W: {stats.latestWest ? stats.latestWest.pdsi.toFixed(2) : '--'} | NE: {stats.latestEast ? stats.latestEast.pdsi.toFixed(2) : '--'}
            </div>
            <div className="kpi-card-sub">
              <span>West: Moderate Drought • Northeast: Severe Flash Drought</span>
            </div>
          </div>
        </div>
      )}

      {/* STANDARD CONTROLS PANEL (STRICTLY ADHERING TO AGENTS.md) */}
      <div className="controls-panel">
        {/* Row 1: View Mode */}
        <div className="control-row">
          <span className="control-row-label">
            <Layers size={14} />
            View Mode:
          </span>
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
              <span>Key Drought Milestones</span>
            </button>

            <button
              type="button"
              className={`selection-box-btn ${activeTab === 'table' ? 'active' : ''}`}
              onClick={() => setActiveTab('table')}
            >
              <TableIcon size={14} />
              <span>Raw Records</span>
              <span className="selection-count-pill">{tableRecords.length}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Time Horizon */}
        <div className="control-row">
          <span className="control-row-label">
            <Calendar size={14} />
            Time Horizon:
          </span>
          <div className="selection-boxes-group">
            <button
              type="button"
              className={`selection-box-btn ${timePreset === 'all' ? 'active' : ''}`}
              onClick={() => setTimePreset('all')}
            >
              <span>Full Era (1950–2025)</span>
            </button>
            <button
              type="button"
              className={`selection-box-btn ${timePreset === '1950-1979' ? 'active' : ''}`}
              onClick={() => setTimePreset('1950-1979')}
            >
              <span>1950–1979 (Post-War)</span>
            </button>
            <button
              type="button"
              className={`selection-box-btn ${timePreset === '1980-1999' ? 'active' : ''}`}
              onClick={() => setTimePreset('1980-1999')}
            >
              <span>1980–1999 (Late 20th C.)</span>
            </button>
            <button
              type="button"
              className={`selection-box-btn ${timePreset === '2000-2025' ? 'active' : ''}`}
              onClick={() => setTimePreset('2000-2025')}
            >
              <span>2000–2025 (21st C. Megadroughts)</span>
            </button>
            <button
              type="button"
              className={`selection-box-btn ${timePreset === '2010-2025' ? 'active' : ''}`}
              onClick={() => setTimePreset('2010-2025')}
            >
              <span>Recent (2010–2025)</span>
            </button>
          </div>
        </div>

        {/* Row 3: Display Filters & Smoothing */}
        <div className="control-row">
          <span className="control-row-label">
            <Sliders size={14} />
            Display Series:
          </span>
          <div className="selection-boxes-group">
            <button
              type="button"
              className={`selection-box-btn ${regionFilter === 'both' ? 'active' : ''}`}
              onClick={() => setRegionFilter('both')}
            >
              <span>Both (West vs. Northeast)</span>
            </button>
            <button
              type="button"
              className={`selection-box-btn ${regionFilter === 'west' ? 'active' : ''}`}
              onClick={() => setRegionFilter('west')}
            >
              <span>West (CA/NV) Only</span>
            </button>
            <button
              type="button"
              className={`selection-box-btn ${regionFilter === 'northeast' ? 'active' : ''}`}
              onClick={() => setRegionFilter('northeast')}
            >
              <span>Northeast Only</span>
            </button>

            <span style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.15)', margin: '0 4px' }}></span>

            <button
              type="button"
              className={`selection-box-btn ${smoothingMode === 'rolling' ? 'active' : ''}`}
              onClick={() => setSmoothingMode('rolling')}
              title="24-month rolling mean highlights long-term multidecadal trends"
            >
              <span>24-Mo Rolling Mean</span>
            </button>
            <button
              type="button"
              className={`selection-box-btn ${smoothingMode === 'raw' ? 'active' : ''}`}
              onClick={() => setSmoothingMode('raw')}
              title="Display raw monthly values"
            >
              <span>Monthly Raw PDSI</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW TAB 1: INTERACTIVE CHART */}
      {activeTab === 'chart' && (
        <div className="chart-wrapper-card">
          <div className="chart-header-row">
            <div>
              <h3 className="chart-heading">Regional Palmer Drought Severity Index Divergence (1950–2025)</h3>
              <p className="chart-subheading">
                Palmer Drought Severity Index (PDSI) values: Values <strong>&gt; 0 indicate moisture surplus / wet spells</strong>, while values <strong>&lt; 0 indicate moisture deficit / drought</strong>.
              </p>
            </div>
            <div className="chart-legend-chips">
              <span className="legend-chip">
                <span className="legend-chip-color" style={{ backgroundColor: '#EF4444' }}></span>
                West (CA/NV)
              </span>
              <span className="legend-chip">
                <span className="legend-chip-color" style={{ backgroundColor: '#38BDF8' }}></span>
                Northeast
              </span>
              <span className="legend-chip">
                <span className="legend-chip-color" style={{ backgroundColor: '#94A3B8' }}></span>
                Zero Normal Line
              </span>
            </div>
          </div>

          <div style={{ height: '480px', width: '100%', position: 'relative' }}>
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Severity Reference Legend Strip */}
          <div className="pdsi-scale-strip">
            <span className="pdsi-scale-title">PDSI Scale:</span>
            <div className="pdsi-scale-pill" style={{ background: 'rgba(2, 132, 199, 0.2)', color: '#38BDF8' }}>
              ≥ +4.0 Extremely Moist
            </div>
            <div className="pdsi-scale-pill" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#7DD3FC' }}>
              +2.0 to +3.9 Moderate/Very Moist
            </div>
            <div className="pdsi-scale-pill" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#CBD5E1' }}>
              -1.9 to +1.9 Near Normal
            </div>
            <div className="pdsi-scale-pill" style={{ background: 'rgba(249, 115, 22, 0.2)', color: '#FB923C' }}>
              -2.0 to -2.9 Moderate Drought
            </div>
            <div className="pdsi-scale-pill" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171' }}>
              -3.0 to -3.9 Severe Drought
            </div>
            <div className="pdsi-scale-pill" style={{ background: 'rgba(220, 38, 38, 0.3)', color: '#EF4444', fontWeight: 'bold' }}>
              ≤ -4.0 Extreme Drought
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: KEY MILESTONES */}
      {activeTab === 'milestones' && (
        <div className="milestones-grid-container">
          <div className="milestones-intro-card">
            <Compass size={24} className="text-amber" />
            <div>
              <h3 className="milestones-intro-title">Major North American Drought & Moisture Milestones (1950–2025)</h3>
              <p className="milestones-intro-desc">
                From the 1960s Northeast reservoir crisis to the 2000–2022 Western North America megadrought—the driest 22-year window in 1,200 years.
              </p>
            </div>
          </div>

          <div className="milestones-cards-grid">
            {DROUGHT_MILESTONES.map((m, idx) => (
              <div
                key={idx}
                className="milestone-card"
                style={{
                  borderTop: `3px solid ${
                    m.type === 'moist' ? '#38BDF8' : m.type === 'divergence' ? '#EAB308' : '#EF4444'
                  }`,
                }}
              >
                <div className="milestone-card-top">
                  <span className="milestone-year-badge">{m.year}</span>
                  <span
                    className="milestone-tag"
                    style={{
                      backgroundColor:
                        m.type === 'moist'
                          ? 'rgba(56, 189, 248, 0.15)'
                          : m.type === 'divergence'
                          ? 'rgba(234, 179, 8, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      color:
                        m.type === 'moist'
                          ? '#38BDF8'
                          : m.type === 'divergence'
                          ? '#EAB308'
                          : '#EF4444',
                    }}
                  >
                    {m.tag}
                  </span>
                </div>

                <h4 className="milestone-card-title">{m.title}</h4>
                <div className="milestone-meta-row">
                  <span className="milestone-region-pill">{m.region}</span>
                  <span className="milestone-pdsi-pill">
                    PDSI: <strong>{m.pdsi > 0 ? `+${m.pdsi}` : m.pdsi}</strong>
                  </span>
                </div>
                <p className="milestone-card-desc">{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW TAB 3: RAW RECORDS TABLE */}
      {activeTab === 'table' && (
        <div className="table-wrapper-card">
          <div className="table-header-controls">
            <div className="table-search-group">
              <Search size={16} className="text-muted" />
              <input
                type="text"
                placeholder="Search by date (e.g. 2021-08, 1977), region, or severity..."
                className="table-search-input"
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="table-filter-group">
              <select
                className="table-select"
                value={tableRegion}
                onChange={(e) => {
                  setTableRegion(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Regions</option>
                <option value="109">West (Region 109: CA/NV)</option>
                <option value="101">Northeast (Region 101)</option>
              </select>

              <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv} title="Export filtered records to CSV">
                <Download size={14} />
                <span>Export CSV ({tableRecords.length})</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="climate-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Region</th>
                  <th>Monthly PDSI</th>
                  <th>24-Mo Rolling Mean</th>
                  <th>Classification</th>
                  <th>SurrealDB ID</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((r, idx) => {
                    const cls = getPdsiClassification(r.pdsi);
                    return (
                      <tr key={idx}>
                        <td className="font-mono">{r.date}</td>
                        <td>
                          <span
                            className="region-badge"
                            style={{
                              backgroundColor: r.region_code === 109 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                              color: r.region_code === 109 ? '#EF4444' : '#38BDF8',
                              border: `1px solid ${r.region_code === 109 ? '#EF444433' : '#38BDF833'}`,
                            }}
                          >
                            {r.region_name} ({r.region_code})
                          </span>
                        </td>
                        <td className="font-mono" style={{ color: r.pdsi < 0 ? '#EF4444' : '#38BDF8', fontWeight: 600 }}>
                          {r.pdsi > 0 ? `+${r.pdsi.toFixed(2)}` : r.pdsi.toFixed(2)}
                        </td>
                        <td className="font-mono text-muted">
                          {r.rolling_24_pdsi !== null && r.rolling_24_pdsi !== undefined
                            ? (r.rolling_24_pdsi > 0 ? `+${r.rolling_24_pdsi.toFixed(3)}` : r.rolling_24_pdsi.toFixed(3))
                            : '—'}
                        </td>
                        <td>
                          <span
                            className="status-pill"
                            style={{
                              backgroundColor: cls.bg,
                              color: cls.color,
                              border: `1px solid ${cls.color}44`,
                            }}
                          >
                            {cls.label}
                          </span>
                        </td>
                        <td className="font-mono text-dim text-xs">drought_pdsi:{r.record_id}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px' }}>
                      No matching drought records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="table-pagination-row">
              <span className="pagination-info">
                Showing {((currentPage - 1) * pageSize + 1).toLocaleString()} to{' '}
                {Math.min(currentPage * pageSize, tableRecords.length).toLocaleString()} of{' '}
                {tableRecords.length.toLocaleString()} records
              </span>

              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  Previous
                </button>
                <span className="pagination-page-indicator">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scientific Methodology & Information Section */}
      <div className="info-accordion-card">
        <div className="info-accordion-header">
          <Info size={18} className="text-sky" />
          <h4 className="info-accordion-title">Scientific Background & Palmer Drought Severity Index (PDSI) Formulation</h4>
        </div>
        <div className="info-accordion-content">
          <p>
            The <strong>Palmer Drought Severity Index (PDSI)</strong> was developed by meteorologist Wayne Palmer in 1965 and remains one of the gold-standard climatological metrics for quantifying long-term meteorological and agricultural drought. Unlike simple precipitation anomaly tallies, PDSI uses a two-layer soil water balance equation that incorporates:
          </p>
          <ul>
            <li><strong>Atmospheric Evaporative Demand</strong>: Driven by ambient temperature anomalies.</li>
            <li><strong>Soil Moisture Recharge & Runoff</strong>: Water holding capacity in the surface and underlying soil root zones.</li>
            <li><strong>Climatological Normal Benchmarks</strong>: Adjusted dynamically for regional seasonality.</li>
          </ul>
          <p>
            <strong>The Western Megadrought Phenomenon:</strong> Recent climatological studies demonstrate that approximately 42% of the severity of the 2000–2022 Western North American megadrought is directly attributable to anthropogenic warming, which increases the vapor pressure deficit (VPD) and bakes moisture out of soils even during winters with near-normal snowfall.
          </p>
          <div className="source-citation-box">
            <Database size={14} className="text-amber" />
            <span>
              Primary Data Source: <strong>NOAA National Centers for Environmental Information (NCEI)</strong> Climate at a Glance Regional Time Series (PDSI 1950–2025). Stored and indexed in <strong>SurrealDB 3.3</strong> table <code>drought_pdsi</code>.
            </span>
            <a
              href="https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/regional/time-series/"
              target="_blank"
              rel="noopener noreferrer"
              className="citation-link"
            >
              NOAA NCEI Data Portal <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
