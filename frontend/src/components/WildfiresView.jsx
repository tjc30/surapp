import useDataset from '../hooks/useDataset';
import { DatasetStatus } from './DatasetView';
import AreaDataStatus from './AreaDataStatus';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import {
  Flame,
  Calendar,
  Layers,
  Database,
  Table as TableIcon,
  Sparkles,
  Info,
  TrendingUp,
  AlertTriangle,
  Compass,
  CheckCircle2,
  ExternalLink,
  Search,
  Download,
  BarChart3,
  Activity,
  ShieldAlert,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Key historical wildfire milestones in Canada (2000-2026)

export default function WildfiresView({
  data: initialData = [],
  loading: initialLoading = false,
  error: initialError = null,
  onNavigate,
  sources = [],
  onRefresh,
}) {
  const milestoneState = useDataset('wildfire_milestones');
  const WILDFIRE_MILESTONES = useMemo(() => [...milestoneState.data].sort((a, b) => a.year - b.year), [milestoneState.data]);

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(initialError);

  // Chart configuration state
  const [viewMode, setViewMode] = useState('dual'); // 'dual' | 'acres' | 'fires'
  const [timePreset, setTimePreset] = useState('all'); // 'all' (2000-2026) | '2010' (2010-2026) | '2020' (2020-2026)
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'milestones' | 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('year');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Fetch data if initialData is empty
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setData(initialData);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/wildfires');
        if (!res.ok) {
          throw new Error(`Failed to load wildfire records (HTTP ${res.status})`);
        }
        const json = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError(err.message || 'Error loading Canadian wildfire dataset');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [initialData]);

  // Compute domain bounds based on preset
  const minYear = useMemo(() => {
    switch (timePreset) {
      case '2020':
        return 2020;
      case '2010':
        return 2010;
      case 'all':
      default:
        return 2000;
    }
  }, [timePreset]);

  // Filtered dataset for active time window (chronological order for chart)
  const chartFilteredData = useMemo(() => {
    return data
      .filter((d) => d.year >= minYear && d.year <= 2026)
      .sort((a, b) => a.year - b.year);
  }, [data, minYear]);

  // Summary statistics
  const stats = useMemo(() => {
    if (!data.length) return null;

    const totalFires = data.reduce((acc, d) => acc + d.fires, 0);
    const totalAcres = data.reduce((acc, d) => acc + d.area_burned_acres_mil, 0);
    const avgFires = Math.round(totalFires / data.length);
    const avgAcres = (totalAcres / data.length).toFixed(2);

    // Record years
    const maxAcresRecord = [...data].sort((a, b) => b.area_burned_acres_mil - a.area_burned_acres_mil)[0];
    const maxFiresRecord = [...data].sort((a, b) => b.fires - a.fires)[0];
    const record2026 = data.find((d) => d.year === 2026);
    const record2023 = data.find((d) => d.year === 2023);

    // Recent 4-year surge (2023-2026) vs previous 23 years (2000-2022)
    const recentYears = data.filter((d) => d.year >= 2023);
    const pastYears = data.filter((d) => d.year < 2023);

    const recentAvgAcres = recentYears.length
      ? (recentYears.reduce((acc, d) => acc + d.area_burned_acres_mil, 0) / recentYears.length).toFixed(1)
      : 0;
    const pastAvgAcres = pastYears.length
      ? (pastYears.reduce((acc, d) => acc + d.area_burned_acres_mil, 0) / pastYears.length).toFixed(1)
      : 0;

    return {
      totalRecords: data.length,
      totalFires,
      totalAcres: totalAcres.toFixed(1),
      avgFires,
      avgAcres,
      maxAcresRecord,
      maxFiresRecord,
      record2026,
      record2023,
      recentAvgAcres,
      pastAvgAcres,
    };
  }, [data]);

  // Chart data configuration
  const chartData = useMemo(() => {
    if (!chartFilteredData.length) return { labels: [], datasets: [] };

    const labels = chartFilteredData.map((d) => (d.year === 2026 ? '2026*' : d.year.toString()));
    const datasets = [];

    // Dataset 1: Total Area Burned (Million Acres) (Columns / Bar)
    // The Area Burned is now the columns using the same color the columns had (amber/orange)
    if (viewMode === 'dual' || viewMode === 'acres') {
      datasets.push({
        type: 'bar',
        label: 'Area Burned (Million Acres)',
        data: chartFilteredData.map((d) => d.area_burned_acres_mil),
        backgroundColor: chartFilteredData.map((d) =>
          d.year === 2026 ? 'rgba(251, 146, 60, 0.75)' : 'rgba(245, 158, 11, 0.45)'
        ),
        borderColor: chartFilteredData.map((d) =>
          d.year === 2026 ? '#FB923C' : 'rgba(245, 158, 11, 0.85)'
        ),
        borderWidth: 1.5,
        borderRadius: 4,
        yAxisID: viewMode === 'dual' ? 'yAcres' : 'y',
        order: 2,
      });
    }

    // Dataset 2: Total Number of Fires (Connected Dots / Line)
    // The Total Number of Fires is now the connected dots using the same color they had (red)
    if (viewMode === 'dual' || viewMode === 'fires') {
      datasets.push({
        type: 'line',
        label: 'Total Number of Fires',
        data: chartFilteredData.map((d) => d.fires),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 3,
        pointBackgroundColor: chartFilteredData.map((d) => {
          if (d.year === 2006) return '#DC2626'; // Peak fire frequency record
          if (d.year === 2026) return '#F97316'; // Highlight 2026 as of Sept
          return '#EF4444';
        }),
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: chartFilteredData.map((d) => {
          if (d.year === 2006) return 8; // Prominent pulse on peak frequency
          if (d.year === 2026) return 7;
          return 4;
        }),
        pointHoverRadius: 9,
        fill: false,
        tension: 0.25,
        yAxisID: viewMode === 'dual' ? 'yFires' : 'y',
        order: 1,
      });
    }

    return { labels, datasets };
  }, [chartFilteredData, viewMode]);

  // Chart options configuration
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
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: '#E2E8F0',
            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
            boxWidth: 14,
            boxHeight: 14,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          titleColor: '#F8FAFC',
          bodyColor: '#CBD5E1',
          borderColor: 'rgba(239, 68, 68, 0.35)',
          borderWidth: 1.5,
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 13, weight: '600' },
          bodyFont: { size: 12 },
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const rawYear = items[0].label.replace('*', '');
              return rawYear === '2026'
                ? 'Year 2026 (As of Sept 2026)'
                : `Year ${rawYear}`;
            },
            label: (ctx) => {
              const datasetLabel = ctx.dataset.label || '';
              const val = ctx.parsed.y;
              if (datasetLabel.includes('Fires')) {
                return `🔥 Fires: ${val.toLocaleString()} ignitions`;
              }
              if (datasetLabel.includes('Acres')) {
                return `🌲 Area Burned: ${val.toFixed(2)} Million Acres`;
              }
              return `${datasetLabel}: ${val}`;
            },
            afterBody: (items) => {
              if (!items.length) return [];
              const rawYear = items[0].label.replace('*', '');
              const extraNotes = [];
              if (rawYear === '2026') {
                extraNotes.push('⚠️ Note: 2026 data is as of Sept. 2026');
              } else if (rawYear === '2023') {
                extraNotes.push('🏆 Historic Record Season: 43.51M acres burned');
              } else if (rawYear === '2006') {
                extraNotes.push('📊 Peak 21st century fire frequency (9,719 fires)');
              }
              return extraNotes;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(51, 65, 85, 0.3)',
          },
          ticks: {
            color: '#94A3B8',
            font: { size: 11 },
            maxRotation: 45,
          },
        },
        ...(viewMode === 'dual'
          ? {
              yAcres: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                  display: true,
                  text: 'Area Burned (Million Acres)',
                  color: '#F59E0B',
                  font: { size: 12, weight: '600' },
                },
                min: 0,
                max: 48,
                grid: {
                  color: 'rgba(51, 65, 85, 0.25)',
                },
                ticks: {
                  color: '#F59E0B',
                  callback: (value) => `${value}M`,
                },
              },
              yFires: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                  display: true,
                  text: 'Total Number of Fires',
                  color: '#EF4444',
                  font: { size: 12, weight: '600' },
                },
                min: 0,
                max: 11000,
                grid: {
                  drawOnChartArea: false, // Don't duplicate grid lines
                },
                ticks: {
                  color: '#EF4444',
                  callback: (value) => value.toLocaleString(),
                },
              },
            }
          : {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                  display: true,
                  text:
                    viewMode === 'acres'
                      ? 'Total Area Burned (Million Acres)'
                      : 'Total Number of Fires',
                  color: viewMode === 'acres' ? '#F59E0B' : '#EF4444',
                  font: { size: 12, weight: '600' },
                },
                min: 0,
                grid: {
                  color: 'rgba(51, 65, 85, 0.3)',
                },
                ticks: {
                  color: viewMode === 'acres' ? '#F59E0B' : '#EF4444',
                  callback: (value) =>
                    viewMode === 'acres' ? `${value}M` : value.toLocaleString(),
                },
              },
            }),
      },
    };
  }, [viewMode]);

  // Sorted and searched table data
  const tableData = useMemo(() => {
    let filtered = [...data];
    if (searchTerm) {
      filtered = filtered.filter(
        (d) =>
          d.year.toString().includes(searchTerm) ||
          d.fires.toString().includes(searchTerm) ||
          d.area_burned_acres_mil.toString().includes(searchTerm)
      );
    }

    filtered.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });

    return filtered;
  }, [data, searchTerm, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // CSV download function (leaves out hectares per user instructions)
  const handleExportCsv = () => {
    const headers = ['Year', 'Total Number of Fires', 'Total Area Burned (Million Acres)', 'Notes'];
    const rows = data.map((d) => [
      d.year,
      d.fires,
      d.area_burned_acres_mil,
      d.year === 2026 ? '2026 data is as of Sept. 2026' : (d.notes || ''),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['# Canadian Forest Fires (2000-2026) - Canadian Wildland Fire Information System',
       '# Note: 2026 data is as of Sept. 2026. Hectares excluded per project requirements.',
       headers.join(','),
       ...rows.map((e) => e.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'canada_forest_fires_2000_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="wildfires-view-container">
      <DatasetStatus {...milestoneState} empty={!milestoneState.data.length} />
      {/* Dataset status appears in the shared header. */}
      <AreaDataStatus>
        <span className="badge-ready">
            <CheckCircle2 size={12} /> Live SurrealDB Dataset (27 Years: 2000–2026)
          </span>
      </AreaDataStatus>

      {/* Hero Section */}
      <div className="wildfires-hero-card">
        <div className="wildfires-hero-content">
          <div className="wildfires-hero-icon-wrap">
            <Flame size={36} className="flame-hero-icon" />
          </div>
          <div className="wildfires-hero-text">
            <div className="placeholder-category-pill area-hero-category">
              Disaster & Megafire Hazards • Canada
            </div>
            <p className="wildfires-hero-desc">
              Annual record of Canadian forest fire counts and burned land area in <strong>million acres</strong>,
              sourced from the Canadian Wildland Fire Information System (CWFIS / NRCan).
              Witness the unprecedented escalation from moderate historical fire seasons to the historic 2023 megafire crisis and sustained extreme burns through 2026.
            </p>
          </div>
        </div>

        {/* 2026 Status Banner */}
        <div className="wildfires-notice-callout">
          <Info size={16} className="text-amber shrink-0" />
          <div className="notice-callout-text">
            <strong>2026 Season Status:</strong> 2026 data is as of <strong>Sept. 2026</strong> (5,248 fires and 11.20 million acres burned).
            Per dataset specifications, area burned is measured in <strong>Million Acres</strong> (hectares omitted).
          </div>
        </div>
      </div>

      {/* Top KPI Metrics Cards Grid */}
      {stats && (
        <div className="wildfires-kpi-grid">
          {/* Card 1: 2026 YTD */}
          <div className="kpi-metric-card border-orange-glow">
            <div className="kpi-card-header">
              <span className="kpi-card-label">2026 Season (As of Sept 2026)</span>
              <span className="badge-kpi-asof">As of Sept 2026</span>
            </div>
            <div className="kpi-card-main-val text-orange">
              {stats.record2026?.area_burned_acres_mil?.toFixed(2)}M Acres
            </div>
            <div className="kpi-card-sub">
              <span>{stats.record2026?.fires?.toLocaleString()} fires recorded</span>
              <span className="kpi-card-badge-trend">+33% vs 27-yr avg</span>
            </div>
          </div>

          {/* Card 2: 2023 Historic Record */}
          <div className="kpi-metric-card border-red-glow">
            <div className="kpi-card-header">
              <span className="kpi-card-label">All-Time Historic Record (2023)</span>
              <span className="badge-kpi-record">Historic Crisis</span>
            </div>
            <div className="kpi-card-main-val text-red">
              {stats.record2023?.area_burned_acres_mil?.toFixed(2)}M Acres
            </div>
            <div className="kpi-card-sub">
              <span>6,837 fires • Unprecedented megafire season</span>
              <span className="kpi-card-badge-high">5.1x 27-yr avg</span>
            </div>
          </div>

          {/* Card 3: 27-Year Cumulative Acres */}
          <div className="kpi-metric-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">27-Year Cumulative Burned Area</span>
              <span className="badge-kpi-stat">2000–2026</span>
            </div>
            <div className="kpi-card-main-val text-amber">
              {stats.totalAcres}M Acres
            </div>
            <div className="kpi-card-sub">
              <span>Across {stats.totalFires.toLocaleString()} fires in 27 years</span>
              <span className="kpi-card-meta">Avg {stats.avgAcres}M acres/yr</span>
            </div>
          </div>

          {/* Card 4: 2023-2026 Megafire Era Shift */}
          <div className="kpi-metric-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Recent Megafire Era (2023–2026)</span>
              <span className="badge-kpi-alert">Megafire Shift</span>
            </div>
            <div className="kpi-card-main-val text-rose">
              {stats.recentAvgAcres}M Acres/yr
            </div>
            <div className="kpi-card-sub">
              <span>vs {stats.pastAvgAcres}M acres/yr during 2000–2022</span>
              <span className="kpi-card-badge-danger">~4x Surge</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Controls: Graph, Timeline Milestones, Data Table */}
      <div className="wildfires-controls-panel">
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
              <BarChart3 size={14} />
              <span>Interactive Wildfire Graph</span>
            </button>
            <button
              type="button"
              className={`selection-box-btn ${activeTab === 'milestones' ? 'active' : ''}`}
              onClick={() => setActiveTab('milestones')}
            >
              <Sparkles size={14} />
              <span>Key Seasons & Milestones</span>
            </button>
            <button
              type="button"
              className={`selection-box-btn ${activeTab === 'table' ? 'active' : ''}`}
              onClick={() => setActiveTab('table')}
            >
              <TableIcon size={14} />
              <span>Raw Records Table</span>
              <span className="selection-count-pill">{data.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE GRAPH */}
      {activeTab === 'chart' && (
        <div className="wildfires-chart-card">
          {/* Chart Header & Controls Bar */}
          <div className="chart-toolbar-container">
            <div className="chart-toolbar-left">
              <h3 className="chart-section-title">
                Canadian Forest Fires & Burned Acreage (2000–2026)
              </h3>
              <p className="chart-section-subtitle">
                {viewMode === 'dual' && 'Dual-axis comparison: Area burned in million acres (columns) vs. total ignitions (connected dots).'}
                {viewMode === 'acres' && 'Area burned in million acres (hectares excluded).'}
                {viewMode === 'fires' && 'Total annual fire counts (ignitions).'}
              </p>
            </div>

            <div className="chart-toolbar-right">
              {/* View mode toggle */}
              <div className="chart-view-mode-group">
                <button
                  className={`btn-mode-toggle ${viewMode === 'dual' ? 'active' : ''}`}
                  onClick={() => setViewMode('dual')}
                  title="Show both fires count and area burned on dual axes"
                >
                  Dual-Axis
                </button>
                <button
                  className={`btn-mode-toggle ${viewMode === 'acres' ? 'active' : ''}`}
                  onClick={() => setViewMode('acres')}
                  title="Focus on Area Burned (Million Acres)"
                >
                  Million Acres
                </button>
                <button
                  className={`btn-mode-toggle ${viewMode === 'fires' ? 'active' : ''}`}
                  onClick={() => setViewMode('fires')}
                  title="Focus on Total Number of Fires"
                >
                  Fires Count
                </button>
              </div>

              {/* Time window selector */}
              <div className="chart-preset-group">
                <button
                  className={`btn-preset-toggle ${timePreset === 'all' ? 'active' : ''}`}
                  onClick={() => setTimePreset('all')}
                  title="2000 to 2026 (All 27 years)"
                >
                  2000–2026
                </button>
                <button
                  className={`btn-preset-toggle ${timePreset === '2010' ? 'active' : ''}`}
                  onClick={() => setTimePreset('2010')}
                  title="2010 to 2026"
                >
                  2010–2026
                </button>
                <button
                  className={`btn-preset-toggle ${timePreset === '2020' ? 'active' : ''}`}
                  onClick={() => setTimePreset('2020')}
                  title="2020 to 2026"
                >
                  2020–2026
                </button>
              </div>
            </div>
          </div>

          {/* Chart Canvas Wrap */}
          <div className="wildfires-chart-canvas-wrap">
            {loading ? (
              <div className="chart-loading-overlay">
                <div className="spinner-glow"></div>
                <p>Loading Canadian wildfire data from SurrealDB...</p>
              </div>
            ) : error ? (
              <div className="chart-error-banner">
                <AlertTriangle size={24} className="text-red" />
                <p>{error}</p>
              </div>
            ) : (
              <Chart type={viewMode === 'fires' ? 'line' : 'bar'} data={chartData} options={chartOptions} />
            )}
          </div>

          {/* Chart Callout Footnote */}
          <div className="chart-footer-caption-strip">
            <div className="caption-item">
              <span className="dot-indicator bg-orange"></span>
              <span><strong>*2026 Note:</strong> 2026 data is current as of <strong>September 2026</strong>.</span>
            </div>
            <div className="caption-item">
              <span className="dot-indicator bg-red"></span>
              <span><strong>Unit:</strong> Total Area Burned is shown in <strong>Million Acres</strong> (hectares omitted per prompt requirements).</span>
            </div>
            <div className="caption-item">
              <span className="dot-indicator bg-sky"></span>
              <span><strong>Source:</strong> Canadian Wildland Fire Information System (CWFIS) / Natural Resources Canada.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KEY SEASONS & MILESTONES */}
      {activeTab === 'milestones' && (
        <div className="wildfires-milestones-grid">
          {WILDFIRE_MILESTONES.map((m, idx) => (
            <div
              key={idx}
              className={`milestone-card ${m.year === 2023 ? 'milestone-record-highlight' : ''} ${
                m.year === 2026 ? 'milestone-current-highlight' : ''
              }`}
            >
              <div className="milestone-card-top">
                <span className="milestone-year-pill">{m.year}</span>
                <span className="milestone-tag">{m.tag}</span>
              </div>
              <h4 className="milestone-card-title">{m.title}</h4>
              <p className="milestone-card-desc">{m.description}</p>
              <div className="milestone-card-metrics">
                <div className="milestone-metric-item">
                  <span className="label">Total Fires</span>
                  <span className="val text-amber">{m.fires.toLocaleString()}</span>
                </div>
                <div className="milestone-metric-item">
                  <span className="label">Area Burned</span>
                  <span className="val text-red">{m.acres.toFixed(2)}M Acres</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: RAW DATA TABLE */}
      {activeTab === 'table' && (
        <div className="wildfires-table-card">
          <div className="table-toolbar">
            <div className="table-search-wrap">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search by year or value..."
                className="table-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="table-actions-right">
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExportCsv}
                title="Download CSV dataset (Hectares excluded)"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="wildfires-table-responsive">
            <table className="wildfires-data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('year')} className="sortable">
                    Year {sortField === 'year' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleSort('fires')} className="sortable">
                    Total Number of Fires {sortField === 'fires' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleSort('area_burned_acres_mil')} className="sortable">
                    Total Area Burned (Million Acres){' '}
                    {sortField === 'area_burned_acres_mil' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th>Severity (Acres / Fire)</th>
                  <th>Observation Notes</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row) => {
                  const acresPerFire = row.fires > 0 ? (row.area_burned_acres_mil * 1000000) / row.fires : 0;
                  const is2026 = row.year === 2026;
                  const is2023 = row.year === 2023;
                  const isRecordFires = row.year === 2006;

                  return (
                    <tr
                      key={row.year}
                      className={`${is2026 ? 'row-highlight-current' : ''} ${
                        is2023 ? 'row-highlight-record' : ''
                      }`}
                    >
                      <td className="font-semibold text-sky">
                        {row.year}
                        {is2026 && <span className="table-pill-badge-orange">As of Sept 2026</span>}
                        {is2023 && <span className="table-pill-badge-red">All-Time Peak</span>}
                        {isRecordFires && <span className="table-pill-badge-amber">Max Ignitions</span>}
                      </td>
                      <td className="text-amber font-mono font-medium">
                        {row.fires.toLocaleString()}
                      </td>
                      <td className="text-red font-mono font-semibold">
                        {row.area_burned_acres_mil.toFixed(2)}M
                      </td>
                      <td className="text-slate font-mono text-xs">
                        {acresPerFire.toFixed(0)} acres / fire
                      </td>
                      <td className="text-muted text-xs">
                        {is2026 ? (
                          <span className="text-amber font-medium">
                            2026 data is as of Sept. 2026
                          </span>
                        ) : is2023 ? (
                          <span className="text-red font-medium">
                            Highest single-year burned acreage in Canadian history (43.51M acres)
                          </span>
                        ) : (
                          'Annual reported total'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Megafire Analysis & Science Deep Dive */}
      <div className="wildfires-analysis-grid">
        <div className="analysis-card">
          <div className="analysis-card-header">
            <ShieldAlert size={20} className="text-red" />
            <h4>The Megafire Paradox: Constant Fires, Exponential Burn</h4>
          </div>
          <p className="analysis-card-text">
            Between 2000 and 2026, the <strong>total number of fires</strong> in Canada did not spike—in fact,
            the peak ignition year was 2006 (9,719 fires), which only burned 5.19 million acres.
            However, due to higher temperatures and record vapor pressure deficits, individual fires now rapidly explode
            into uncontrollable <strong>megafires</strong> that burn massive swathes of the boreal biome.
          </p>
        </div>

        <div className="analysis-card">
          <div className="analysis-card-header">
            <AlertTriangle size={20} className="text-orange" />
            <h4>The 2023 Record Shockwave</h4>
          </div>
          <p className="analysis-card-text">
            In 2023, <strong>43.51 million acres</strong> burned across Canada—more than double the previous modern record.
            This single catastrophic season released hundreds of millions of metric tons of CO₂, sending dense wildfire smoke across the US East Coast and Midwest and turning Canadian forests from historical carbon sinks into net carbon emitters.
          </p>
        </div>

        <div className="analysis-card">
          <div className="analysis-card-header">
            <Activity size={20} className="text-amber" />
            <h4>Ongoing 2026 Wildfire Season</h4>
          </div>
          <p className="analysis-card-text">
            As of <strong>September 2026</strong>, Canadian wildfires have already consumed <strong>11.20 million acres</strong> across 5,248 fires.
            Following 2023 (43.51M acres), 2024 (13.28M acres), and 2025 (21.25M acres), the last four seasons represent an unprecedented multi-year cluster of extreme wildfire destruction in Canadian recorded history.
          </p>
        </div>
      </div>

      {/* Data Source Provenance Card */}
      <div className="wildfires-provenance-card">
        <div className="provenance-header">
          <Database size={18} className="text-sky" />
          <h4>Data Source & Provenance</h4>
        </div>
        <div className="provenance-details-grid">
          <div className="provenance-item">
            <span className="prov-label">Dataset:</span>
            <span className="prov-val">Forest fires in Canada 2000–2026 v2</span>
          </div>
          <div className="provenance-item">
            <span className="prov-label">Authoritative Source:</span>
            <span className="prov-val">Canadian Wildland Fire Information System (CWFIS) / NRCan CFS</span>
          </div>
          <div className="provenance-item">
            <span className="prov-label">Web Portal:</span>
            <a
              href="https://cwfis.cfs.nrcan.gc.ca/en/summary"
              target="_blank"
              rel="noopener noreferrer"
              className="prov-link"
            >
              cwfis.cfs.nrcan.gc.ca/en/summary <ExternalLink size={12} />
            </a>
          </div>
          <div className="provenance-item">
            <span className="prov-label">Temporal Coverage:</span>
            <span className="prov-val">2000 to 2026 (2026 data as of Sept. 2026)</span>
          </div>
          <div className="provenance-item">
            <span className="prov-label">Units Configured:</span>
            <span className="prov-val">Total Number of Fires, Total Area Burned (Million Acres) [Hectares excluded]</span>
          </div>
          <div className="provenance-item">
            <span className="prov-label">Database Engine:</span>
            <span className="prov-val">SurrealDB 3.3 (table: <code>wildfires</code>)</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Strip */}
      <div className="view-nav-strip mt-6">

        <button
          className="btn btn-secondary btn-md"
          onClick={() => onNavigate('sources')}
          title="View in Data Sources Catalog"
        >
          <Database size={15} />
          <span>View in Data Sources Catalog →</span>
        </button>
      </div>
    </div>
  );
}
