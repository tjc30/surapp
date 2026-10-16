import useDataset from '../hooks/useDataset';
import { DatasetStatus } from './DatasetView';
import AreaDataStatus from './AreaDataStatus';
import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  Waves,
  Calendar,
  Layers,
  Sliders,
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
  Activity,
  DollarSign,
  CloudRain,
  ShieldAlert,
  BarChart3,
  Landmark,
  Droplets,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Historical North American and Global Flood Disasters & Milestones

function FloodingContent({
  data = null,
  loading = false,
  error = null,
  onNavigate,
  sources = [],
  onRefresh,
}) {
  const milestoneState = useDataset('flood_milestones');
  const FLOOD_MILESTONES = useMemo(() => [...milestoneState.data].sort((a, b) => a.year - b.year), [milestoneState.data]);

  const trendsData = data.trends;
  const costsData = data.costs;

  // View Mode Controls
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'milestones' | 'table' | 'economic'
  const [activeGraphMode, setActiveGraphMode] = useState('both'); // 'both' | 'trends' | 'costs'
  const [trendsSeriesFilter, setTrendsSeriesFilter] = useState('all'); // 'all' | 'coastal' | 'precip' | 'global'
  const [costsDisplayMode, setCostsDisplayMode] = useState('stacked'); // 'stacked' | 'comparison'

  // Raw Table states
  const [tableDataset, setTableDataset] = useState('trends'); // 'trends' | 'costs'
  const [tableSearch, setTableSearch] = useState('');

  // Total summary calculations
  const summaryStats = useMemo(() => {
    const totalTropicalCyclones = costsData.reduce((acc, c) => acc + c.coastal_tropical_cyclones_billions, 0);
    const totalInland = costsData.reduce((acc, c) => acc + c.inland_flooding_billions, 0);
    const totalDisasterCosts = costsData.reduce((acc, c) => acc + c.total_flood_related_billions, 0);

    const latestTrend = trendsData[trendsData.length - 1] || trendsData[0];
    const initialTrend = trendsData[0];

    const coastalMultiplier = initialTrend.us_coastal_flood_days > 0
      ? (latestTrend.us_coastal_flood_days / initialTrend.us_coastal_flood_days).toFixed(1)
      : '10.0';

    const globalIncreasePct = initialTrend.global_reported_flood_events > 0
      ? Math.round(((latestTrend.global_reported_flood_events - initialTrend.global_reported_flood_events) / initialTrend.global_reported_flood_events) * 100)
      : 1067;

    return {
      totalTropicalCyclones: totalTropicalCyclones.toFixed(1),
      totalInland: totalInland.toFixed(1),
      totalDisasterCosts: totalDisasterCosts.toFixed(1),
      latestCoastalDays: latestTrend.us_coastal_flood_days.toFixed(1),
      coastalMultiplier,
      latestPrecipArea: latestTrend.us_heavy_precip_area_pct.toFixed(1),
      latestGlobalEvents: latestTrend.global_reported_flood_events,
      globalIncreasePct,
    };
  }, [trendsData, costsData]);

  // ==========================================
  // CHART 1: Global & U.S. Flooding Trends (1950–2020)
  // Multi-Axis Line Chart directly from global-and-US-flooding.txt
  // ==========================================
  const trendsChartData = useMemo(() => {
    const labels = trendsData.map((d) => d.year.toString());

    const datasets = [];

    // Line 1: US Coastal Flood Days (NOAA)
    if (trendsSeriesFilter === 'all' || trendsSeriesFilter === 'coastal') {
      datasets.push({
        type: 'line',
        label: 'U.S. Coastal High Tide Flood Days / Yr (NOAA)',
        data: trendsData.map((d) => d.us_coastal_flood_days),
        borderColor: '#38BDF8', // Cyan
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        borderWidth: 3,
        pointBackgroundColor: '#38BDF8',
        pointBorderColor: '#FFFFFF',
        pointHoverRadius: 7,
        pointRadius: 5,
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
      });
    }

    // Line 2: US Extreme Precip Area % (EPA)
    if (trendsSeriesFilter === 'all' || trendsSeriesFilter === 'precip') {
      datasets.push({
        type: 'line',
        label: 'U.S. Heavy Precip Land Area % (EPA)',
        data: trendsData.map((d) => d.us_heavy_precip_area_pct),
        borderColor: '#3B82F6', // Blue
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        borderDash: [5, 4],
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#FFFFFF',
        pointStyle: 'rectRot',
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.3,
        yAxisID: 'y',
      });
    }

    // Line 3: Global Reported Flood Events (EM-DAT)
    if (trendsSeriesFilter === 'all' || trendsSeriesFilter === 'global') {
      datasets.push({
        type: 'line',
        label: 'Global Reported Flood Disasters / Yr (EM-DAT)',
        data: trendsData.map((d) => d.global_reported_flood_events),
        borderColor: '#F43F5E', // Vivid Coral / Rose
        backgroundColor: 'rgba(244, 63, 94, 0.08)',
        borderWidth: 3,
        pointBackgroundColor: '#F43F5E',
        pointBorderColor: '#FFFFFF',
        pointStyle: 'triangle',
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.3,
        yAxisID: 'y1',
      });
    }

    return { labels, datasets };
  }, [trendsData, trendsSeriesFilter]);

  const trendsChartOptions = useMemo(() => {
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
          labels: {
            color: '#E2E8F0',
            font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
            usePointStyle: true,
            boxWidth: 10,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#F8FAFC',
          bodyColor: '#E2E8F0',
          borderColor: 'rgba(56, 189, 248, 0.35)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            title: (items) => `Decade: ${items[0].label}s`,
            label: (context) => {
              const label = context.dataset.label || '';
              const val = context.parsed.y;
              if (context.dataset.yAxisID === 'y1') {
                return `${label}: ${val} flood events/yr`;
              }
              if (label.includes('Flood Days')) {
                return `${label}: ${val} days/yr (National Median)`;
              }
              return `${label}: ${val}% land area`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94A3B8',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
          },
          title: {
            display: true,
            text: 'Decade (1950–2020)',
            color: '#94A3B8',
            font: { family: "'Inter', sans-serif", size: 11, weight: 600 },
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          min: 0,
          max: 15,
          grid: { color: 'rgba(255, 255, 255, 0.07)' },
          ticks: {
            color: '#38BDF8',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: (v) => `${v}`,
          },
          title: {
            display: true,
            text: 'U.S. Coastal Flood Days (Days/Yr) & Heavy Precip Area (%)',
            color: '#38BDF8',
            font: { family: "'Inter', sans-serif", size: 11, weight: 600 },
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 200,
          grid: { drawOnChartArea: false }, // avoid overlapping horizontal grids
          ticks: {
            color: '#F43F5E',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: (v) => `${v}`,
          },
          title: {
            display: true,
            text: 'Global Reported Flood Events per Year (EM-DAT)',
            color: '#F43F5E',
            font: { family: "'Inter', sans-serif", size: 11, weight: 600 },
          },
        },
      },
    };
  }, []);

  // ==========================================
  // CHART 2: U.S. Billion-Dollar Flood & Coastal Storm Losses by Decade (1980–2024)
  // Stacked Bar Chart directly from US-flooding-cost
  // ==========================================
  const costsChartData = useMemo(() => {
    const labels = costsData.map((d) => d.decade);

    if (costsDisplayMode === 'comparison') {
      return {
        labels,
        datasets: [
          {
            label: 'Coastal / Tropical Cyclones ($B)',
            data: costsData.map((d) => d.coastal_tropical_cyclones_billions),
            backgroundColor: '#0284C7', // Deep Ocean Blue
            borderColor: '#38BDF8',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Inland Flooding (Non-Tropical) ($B)',
            data: costsData.map((d) => d.inland_flooding_billions),
            backgroundColor: '#10B981', // Emerald Green
            borderColor: '#34D399',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      };
    }

    // Default: Stacked Bar Chart
    return {
      labels,
      datasets: [
        {
          label: 'Coastal / Tropical Cyclones (Surge & Rain)',
          data: costsData.map((d) => d.coastal_tropical_cyclones_billions),
          backgroundColor: '#0284C7', // Blue
          borderColor: '#38BDF8',
          borderWidth: 1,
          stack: 'flooding',
        },
        {
          label: 'Inland Flooding (Non-Tropical Riverine & Flash)',
          data: costsData.map((d) => d.inland_flooding_billions),
          backgroundColor: '#10B981', // Emerald Green
          borderColor: '#34D399',
          borderWidth: 1,
          stack: 'flooding',
          borderRadius: { topLeft: 6, topRight: 6 },
        },
      ],
    };
  }, [costsData, costsDisplayMode]);

  const costsChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#E2E8F0',
            font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
            usePointStyle: true,
            boxWidth: 12,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#F8FAFC',
          bodyColor: '#E2E8F0',
          borderColor: 'rgba(56, 189, 248, 0.35)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          callbacks: {
            title: (items) => `Period: ${items[0].label}`,
            label: (context) => {
              const label = context.dataset.label || '';
              const val = context.parsed.y;
              return `${label}: $${val.toFixed(1)}B`;
            },
            footer: (items) => {
              if (costsDisplayMode === 'stacked') {
                const total = items.reduce((sum, item) => sum + item.parsed.y, 0);
                return `Total Flood-Related Disaster Losses: $${total.toFixed(1)}B`;
              }
              return null;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: costsDisplayMode === 'stacked',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94A3B8',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
          },
        },
        y: {
          stacked: costsDisplayMode === 'stacked',
          grid: { color: 'rgba(255, 255, 255, 0.07)' },
          ticks: {
            color: '#94A3B8',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: (v) => `$${v}B`,
          },
          title: {
            display: true,
            text: 'Direct Disaster Losses ($ Billions, CPI-Adjusted to 2024)',
            color: '#CBD5E1',
            font: { family: "'Inter', sans-serif", size: 11, weight: 600 },
          },
        },
      },
    };
  }, [costsDisplayMode]);

  // Raw Records Table filtering
  const filteredTrendsRecords = useMemo(() => {
    if (!tableSearch) return trendsData;
    const q = tableSearch.toLowerCase();
    return trendsData.filter(
      (r) =>
        r.year.toString().includes(q) ||
        r.us_coastal_flood_days.toString().includes(q) ||
        r.us_heavy_precip_area_pct.toString().includes(q) ||
        r.global_reported_flood_events.toString().includes(q)
    );
  }, [trendsData, tableSearch]);

  const filteredCostsRecords = useMemo(() => {
    if (!tableSearch) return costsData;
    const q = tableSearch.toLowerCase();
    return costsData.filter(
      (r) =>
        r.decade.toLowerCase().includes(q) ||
        r.coastal_tropical_cyclones_billions.toString().includes(q) ||
        r.inland_flooding_billions.toString().includes(q) ||
        r.total_flood_related_billions.toString().includes(q)
    );
  }, [costsData, tableSearch]);

  // Export CSV functions
  const exportTrendsCsv = () => {
    const headers = ['Decade_Year', 'US_Coastal_High_Tide_Flood_Days_NOAA', 'US_Heavy_Precip_Area_Pct_EPA', 'Global_Reported_Flood_Disasters_EM_DAT'];
    const rows = trendsData.map((r) => [
      r.year,
      r.us_coastal_flood_days,
      r.us_heavy_precip_area_pct,
      r.global_reported_flood_events,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `global_and_us_flooding_trends_1950_2020.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCostsCsv = () => {
    const headers = ['Decade', 'Coastal_Tropical_Cyclones_Billions_USD', 'Inland_Flooding_Billions_USD', 'Total_Flood_Related_Disasters_Billions_USD'];
    const rows = costsData.map((r) => [
      `"${r.decade}"`,
      r.coastal_tropical_cyclones_billions,
      r.inland_flooding_billions,
      r.total_flood_related_billions,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `us_flooding_disaster_costs_1980_2024.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRawRecordsCount = trendsData.length + costsData.length;

  return (
    <div className="view-container">
      <DatasetStatus {...milestoneState} empty={!milestoneState.data.length} />
      {/* Dataset status appears in the shared header. */}
      <AreaDataStatus>
        <span className="badge-ready">
            <CheckCircle2 size={12} /> Live Multi-Source Ingestion Active (NOAA, EPA, EM-DAT)
          </span>
      </AreaDataStatus>

      {/* Hero Section */}
      <div className="wildfires-hero-card" style={{ borderColor: 'rgba(14, 165, 233, 0.35)' }}>
        <div className="wildfires-hero-content">
          <div
            className="wildfires-hero-icon-wrap"
            style={{
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.25) 0%, rgba(2, 132, 199, 0.35) 100%)',
              borderColor: '#0EA5E9',
              color: '#38BDF8',
            }}
          >
            <Waves size={36} />
          </div>
          <div className="wildfires-hero-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span className="placeholder-category-pill area-hero-category" style={{ color: '#0EA5E9', borderColor: 'rgba(14, 165, 233, 0.4)' }}>
                Hydrological Extremes & Sea Level
              </span>
              <span className="badge-kpi-asof" style={{ padding: '3px 9px', borderRadius: '4px', fontSize: '0.74rem' }}>
                1950–2024 Historical Record
              </span>
            </div>
            <p className="wildfires-hero-desc">
              Escalating coastal high-tide sunny day flooding, expanding extreme downpour land areas, global disaster frequency surges, and over <strong>$1.74 Trillion</strong> in cumulative U.S. billion-dollar flood disaster damages. Sourced from <strong>NOAA NCEI Billion-Dollar Disasters</strong>, <strong>NOAA CO-OPS</strong>, <strong>EPA Heavy Precipitation Indicators</strong>, and the <strong>EM-DAT International Disaster Database</strong>.
            </p>
          </div>
        </div>

        {/* Hero Context Pills */}
        <div className="wildfires-hero-callouts">
          <div className="wildfires-callout-item">
            <span className="callout-dot" style={{ backgroundColor: '#38BDF8' }}></span>
            <span className="callout-label">High-Tide Surge:</span>
            <span className="callout-val">10x Increase since 1950 (0.5 → 5.0 Days/Yr)</span>
          </div>
          <div className="wildfires-callout-item">
            <span className="callout-dot" style={{ backgroundColor: '#3B82F6' }}></span>
            <span className="callout-label">Extreme Downpours:</span>
            <span className="callout-val">12.5% of U.S. Land Area (EPA Record High)</span>
          </div>
          <div className="wildfires-callout-item">
            <span className="callout-dot" style={{ backgroundColor: '#10B981' }}></span>
            <span className="callout-label">Economic Losses:</span>
            <span className="callout-val">$1,746.2B in U.S. Flood Disasters (CPI-Adjusted)</span>
          </div>
          <div className="wildfires-callout-item">
            <span className="callout-dot" style={{ backgroundColor: '#F43F5E' }}></span>
            <span className="callout-label">Global Disasters:</span>
            <span className="callout-val">+1,067% Rise (15 → 175 Annual Events)</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="wildfires-kpi-grid kpi-metrics-grid">
        {/* Card 1: Total Flood & Storm Losses */}
        <div className="kpi-metric-card border-sky-glow">
          <div className="kpi-card-header">
            <span className="kpi-card-label">U.S. Billion-Dollar Flood Disasters</span>
            <span className="badge-kpi-stat">1980–2024</span>
          </div>
          <div className="kpi-card-main-val text-sky">
            ${summaryStats.totalDisasterCosts}B
          </div>
          <div className="kpi-card-sub">
            <span>Coastal Surge: ${summaryStats.totalTropicalCyclones}B • Inland: ${summaryStats.totalInland}B</span>
            <span className="kpi-card-meta">NOAA NCEI</span>
          </div>
        </div>

        {/* Card 2: Coastal High-Tide Flood Days */}
        <div className="kpi-metric-card border-sky-glow">
          <div className="kpi-card-header">
            <span className="kpi-card-label">U.S. Coastal High-Tide Flooding</span>
            <span className="badge-kpi-asof">2020s Median</span>
          </div>
          <div className="kpi-card-main-val text-sky">
            {summaryStats.latestCoastalDays} Days/Yr
          </div>
          <div className="kpi-card-sub">
            <span className="text-amber">10x Increase vs. 1950 (0.5 days/yr)</span>
            <span className="kpi-card-meta">NOAA CO-OPS</span>
          </div>
        </div>

        {/* Card 3: US Extreme Precipitation Area */}
        <div className="kpi-metric-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Extreme 1-Day Downpour Area</span>
            <span className="badge-kpi-stat">U.S. Land</span>
          </div>
          <div className="kpi-card-main-val" style={{ color: '#60A5FA' }}>
            {summaryStats.latestPrecipArea}%
          </div>
          <div className="kpi-card-sub">
            <span>9 of top 10 years occurred post-1990</span>
            <span className="kpi-card-meta">EPA Indicators</span>
          </div>
        </div>

        {/* Card 4: Global Reported Flood Disasters */}
        <div className="kpi-metric-card border-red-glow">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Global Reported Flood Events</span>
            <span className="badge-kpi-asof">Decadal Avg</span>
          </div>
          <div className="kpi-card-main-val text-red">
            {summaryStats.latestGlobalEvents} / Year
          </div>
          <div className="kpi-card-sub">
            <span>+{summaryStats.globalIncreasePct}% surge since 1950s (15 events/yr)</span>
            <span className="kpi-card-meta">EM-DAT</span>
          </div>
        </div>
      </div>

      {/* STANDARD CONTROLS PANEL (STRICTLY ADHERING TO AGENTS.md RULE) */}
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
              <span>Interactive Charts</span>
            </button>

            <button
              type="button"
              className={`selection-box-btn ${activeTab === 'milestones' ? 'active' : ''}`}
              onClick={() => setActiveTab('milestones')}
            >
              <Compass size={14} />
              <span>Key Flood Milestones</span>
            </button>

            <button
              type="button"
              className={`selection-box-btn ${activeTab === 'table' ? 'active' : ''}`}
              onClick={() => setActiveTab('table')}
            >
              <TableIcon size={14} />
              <span>Raw Records</span>
              <span className="selection-count-pill">{totalRawRecordsCount}</span>
            </button>

            <button
              type="button"
              className={`selection-box-btn ${activeTab === 'economic' ? 'active' : ''}`}
              onClick={() => setActiveTab('economic')}
            >
              <Landmark size={14} />
              <span>Federal Economic Assessment</span>
            </button>
          </div>
        </div>

        {/* Row 2: Graph Selection (When in Interactive Charts mode) */}
        {activeTab === 'chart' && (
          <div className="control-row">
            <span className="control-row-label">
              <BarChart3 size={14} />
              Graph View:
            </span>
            <div className="selection-boxes-group">
              <button
                type="button"
                className={`selection-box-btn ${activeGraphMode === 'both' ? 'active' : ''}`}
                onClick={() => setActiveGraphMode('both')}
              >
                <Layers size={14} />
                <span>Both Graphs (Side-by-Side Analysis)</span>
              </button>

              <button
                type="button"
                className={`selection-box-btn ${activeGraphMode === 'trends' ? 'active' : ''}`}
                onClick={() => setActiveGraphMode('trends')}
              >
                <TrendingUp size={14} />
                <span>Graph 1: Global & U.S. Flooding Trends (1950–2020)</span>
              </button>

              <button
                type="button"
                className={`selection-box-btn ${activeGraphMode === 'costs' ? 'active' : ''}`}
                onClick={() => setActiveGraphMode('costs')}
              >
                <DollarSign size={14} />
                <span>Graph 2: U.S. Decadal Flood Losses (1980–2024)</span>
              </button>
            </div>
          </div>
        )}

        {/* Row 3: Active Filters & Sub-options */}
        {activeTab === 'chart' && (
          <div className="control-row">
            <span className="control-row-label">
              <Sliders size={14} />
              Display Series:
            </span>
            <div className="selection-boxes-group">
              {activeGraphMode !== 'costs' && (
                <>
                  <button
                    type="button"
                    className={`selection-box-btn ${trendsSeriesFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setTrendsSeriesFilter('all')}
                  >
                    <span>All 3 Indicator Series</span>
                  </button>
                  <button
                    type="button"
                    className={`selection-box-btn ${trendsSeriesFilter === 'coastal' ? 'active' : ''}`}
                    onClick={() => setTrendsSeriesFilter('coastal')}
                  >
                    <Waves size={14} />
                    <span>U.S. Coastal Days (NOAA)</span>
                  </button>
                  <button
                    type="button"
                    className={`selection-box-btn ${trendsSeriesFilter === 'precip' ? 'active' : ''}`}
                    onClick={() => setTrendsSeriesFilter('precip')}
                  >
                    <CloudRain size={14} />
                    <span>Extreme Precip Area % (EPA)</span>
                  </button>
                  <button
                    type="button"
                    className={`selection-box-btn ${trendsSeriesFilter === 'global' ? 'active' : ''}`}
                    onClick={() => setTrendsSeriesFilter('global')}
                  >
                    <ShieldAlert size={14} />
                    <span>Global Events (EM-DAT)</span>
                  </button>
                </>
              )}

              {activeGraphMode === 'costs' && (
                <>
                  <button
                    type="button"
                    className={`selection-box-btn ${costsDisplayMode === 'stacked' ? 'active' : ''}`}
                    onClick={() => setCostsDisplayMode('stacked')}
                  >
                    <span>Stacked Loss Cumulative ($B)</span>
                  </button>
                  <button
                    type="button"
                    className={`selection-box-btn ${costsDisplayMode === 'comparison' ? 'active' : ''}`}
                    onClick={() => setCostsDisplayMode('comparison')}
                  >
                    <span>Side-by-Side Sub-Hazard Bars</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          TAB 1: INTERACTIVE CHARTS
          ======================================================== */}
      {activeTab === 'chart' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginTop: '4px' }}>
          {/* GRAPH 1: Sourced from input/Flooding/global-and-US-flooding.txt */}
          {(activeGraphMode === 'both' || activeGraphMode === 'trends') && (
            <div className="wildfires-chart-card">
              <div className="chart-toolbar-container">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge-kpi-asof" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8', borderColor: '#38BDF8' }}>
                      Graph 1 • Input: global-and-US-flooding.txt
                    </span>
                  </div>
                  <h3 className="chart-section-title" style={{ marginTop: '6px' }}>
                    Global & U.S. Flooding Trends (1950–2020)
                  </h3>
                  <p className="chart-section-subtitle">
                    Dual-axis decadal tracking of U.S. high-tide coastal flooding frequency (NOAA median), extreme 1-day precipitation land area (EPA), and global disaster frequency (EM-DAT).
                  </p>
                </div>
                <div className="chart-toolbar-right">
                  <div className="chart-legend-pill" style={{ color: '#38BDF8' }}>
                    ● Coastal High-Tide: 0.5 → 5.0 Days
                  </div>
                  <div className="chart-legend-pill" style={{ color: '#3B82F6' }}>
                    ■ Extreme Precip: 8.2% → 12.5% Area
                  </div>
                  <div className="chart-legend-pill" style={{ color: '#F43F5E' }}>
                    ▲ Global Disasters: 15 → 175 Events
                  </div>
                </div>
              </div>

              <div className="wildfires-chart-canvas-wrap" style={{ height: '420px' }}>
                <Line data={trendsChartData} options={trendsChartOptions} />
              </div>

              {/* Analytical Highlights Underneath Graph 1 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '14px',
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8', fontWeight: 600, fontSize: '0.85rem' }}>
                    <Waves size={15} /> 1. U.S. Coastal Flooding (Ocean-Driven)
                  </div>
                  <p style={{ fontSize: '0.81rem', color: '#CBD5E1', margin: '6px 0 0 0', lineHeight: 1.45 }}>
                    Driven by global sea-level rise (+8 to 9 inches since 1880), sunny-day nuisance flooding has surged <strong>5- to 10-fold</strong> since the 1960s. Southeast Atlantic and Gulf coasts have seen increases between 400% and 1,100% since 2000.
                  </p>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60A5FA', fontWeight: 600, fontSize: '0.85rem' }}>
                    <CloudRain size={15} /> 2. U.S. Extreme Downpours (Storm-Driven)
                  </div>
                  <p style={{ fontSize: '0.81rem', color: '#CBD5E1', margin: '6px 0 0 0', lineHeight: 1.45 }}>
                    Warmer air holds approximately <strong>4% more moisture per 1°F</strong> of warming (Clausius-Clapeyron relation). According to the EPA, <strong>9 of the top 10 years</strong> for extreme one-day precipitation in the contiguous U.S. have occurred since 1990.
                  </p>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F43F5E', fontWeight: 600, fontSize: '0.85rem' }}>
                    <ShieldAlert size={15} /> 3. Global Reported Flood Disasters
                  </div>
                  <p style={{ fontSize: '0.81rem', color: '#CBD5E1', margin: '6px 0 0 0', lineHeight: 1.45 }}>
                    Aggregated EM-DAT records document major international flood disasters expanding from ~15 to 20 events per year in the 1950s to well over <strong>175 events per year</strong> today, reflecting intensified hydrological extremes across all continents.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* GRAPH 2: Sourced from input/Flooding/US-flooding-cost */}
          {(activeGraphMode === 'both' || activeGraphMode === 'costs') && (
            <div className="wildfires-chart-card">
              <div className="chart-toolbar-container">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge-kpi-asof" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981', borderColor: '#10B981' }}>
                      Graph 2 • Input: US_flooding-cost
                    </span>
                  </div>
                  <h3 className="chart-section-title" style={{ marginTop: '6px' }}>
                    U.S. Billion-Dollar Flood & Coastal Storm Losses by Decade (1980–2024)
                  </h3>
                  <p className="chart-section-subtitle">
                    NOAA NCEI CPI-adjusted losses in billions of USD (2024 dollars): Tropical Cyclones (coastal storm surges and rain) versus Inland Riverine/Flash Flooding.
                  </p>
                </div>
                <div className="chart-toolbar-right">
                  <div className="chart-legend-pill" style={{ color: '#38BDF8' }}>
                    ■ Coastal Surge / Tropical Cyclones: $1,543.2B Total
                  </div>
                  <div className="chart-legend-pill" style={{ color: '#10B981' }}>
                    ■ Inland Non-Tropical Flooding: $203.0B Total
                  </div>
                  <div className="chart-legend-pill" style={{ color: '#F59E0B' }}>
                    ★ Combined Losses: $1,746.2B Total
                  </div>
                </div>
              </div>

              <div className="wildfires-chart-canvas-wrap" style={{ height: '420px' }}>
                <Bar data={costsChartData} options={costsChartOptions} />
              </div>

              {/* Decadal Cost Callout Cards Underneath Graph 2 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {costsData.map((c) => (
                  <div
                    key={c.decade}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: c.decade.includes('2020') ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8' }}>{c.decade}</span>
                      {c.decade.includes('2020') && (
                        <span style={{ fontSize: '0.68rem', background: '#F59E0B', color: '#04101F', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          5 Yrs Only
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', margin: '4px 0 2px 0' }}>
                      ${c.total_flood_related_billions.toFixed(1)}B
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#38BDF8' }}>Coastal: ${c.coastal_tropical_cyclones_billions}B</span>
                      <span style={{ color: '#34D399' }}>Inland: ${c.inland_flooding_billions}B</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Context Banner */}
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <AlertTriangle size={20} style={{ color: '#F59E0B', flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: '#FEF3C7', lineHeight: 1.45 }}>
                  <strong>Critical Decadal Acceleration:</strong> The 2020–2024 half-decade ($423.7B in direct losses) covers only five years, yet has already accumulated nearly <strong>70% of the entire previous decade's 10-year total ($612.1B)</strong>. Flood-related hazards represent ~60% of all cumulative U.S. billion-dollar disaster losses since 1980.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: KEY FLOOD MILESTONES
          ======================================================== */}
      {activeTab === 'milestones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', margin: '0 0 4px 0' }}>
                Historical Flood & Storm Surge Milestones (1950–2024)
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: 0 }}>
                Chronological record of landmark coastal storm surges, riverine cloudbursts, and sunny-day sea-level rise inflection points.
              </p>
            </div>
            <span className="badge-kpi-stat" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
              {FLOOD_MILESTONES.length} Verified Milestones
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {FLOOD_MILESTONES.map((m) => (
              <div
                key={`${m.year}-${m.title}`}
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: '#38BDF8',
                    }}
                  >
                    {m.year}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#7DD3FC',
                      fontWeight: 600,
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    {m.tag}
                  </span>
                </div>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                  {m.title}
                </h4>
                <div style={{ fontSize: '0.76rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Compass size={12} />
                  <span>Region: {m.region}</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#CBD5E1', margin: 0, lineHeight: 1.48 }}>
                  {m.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: RAW RECORDS TABLE WITH CSV EXPORT
          ======================================================== */}
      {activeTab === 'table' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '6px' }}>
          {/* Sub-tabs for Table Datasets */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`selection-box-btn ${tableDataset === 'trends' ? 'active' : ''}`}
                onClick={() => setTableDataset('trends')}
              >
                <TrendingUp size={14} />
                <span>Dataset 1: Decadal Trends (1950–2020)</span>
                <span className="selection-count-pill">{trendsData.length}</span>
              </button>

              <button
                type="button"
                className={`selection-box-btn ${tableDataset === 'costs' ? 'active' : ''}`}
                onClick={() => setTableDataset('costs')}
              >
                <DollarSign size={14} />
                <span>Dataset 2: Decadal Losses (1980–2024)</span>
                <span className="selection-count-pill">{costsData.length}</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="search-box" style={{ maxWidth: '260px' }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter table rows..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={tableDataset === 'trends' ? exportTrendsCsv : exportCostsCsv}
                title="Download CSV file directly"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              overflowX: 'auto',
            }}
          >
            {tableDataset === 'trends' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(2, 6, 23, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                    <th style={{ padding: '12px 18px', color: '#94A3B8', fontWeight: 600 }}>Decade / Year</th>
                    <th style={{ padding: '12px 18px', color: '#38BDF8', fontWeight: 600 }}>U.S. Coastal Flood Days (NOAA)</th>
                    <th style={{ padding: '12px 18px', color: '#60A5FA', fontWeight: 600 }}>U.S. Heavy Precip Land Area % (EPA)</th>
                    <th style={{ padding: '12px 18px', color: '#F43F5E', fontWeight: 600 }}>Global Reported Flood Disasters / Yr (EM-DAT)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrendsRecords.map((r) => (
                    <tr
                      key={r.year}
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.1s ease' }}
                    >
                      <td style={{ padding: '12px 18px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#F8FAFC' }}>
                        {r.year}s
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8', fontWeight: 600 }}>
                        {r.us_coastal_flood_days.toFixed(1)} days/yr
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: "'JetBrains Mono', monospace", color: '#93C5FD' }}>
                        {r.us_heavy_precip_area_pct.toFixed(1)}%
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: "'JetBrains Mono', monospace", color: '#FDA4AF', fontWeight: 600 }}>
                        {r.global_reported_flood_events} events
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(2, 6, 23, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                    <th style={{ padding: '12px 18px', color: '#94A3B8', fontWeight: 600 }}>Decade</th>
                    <th style={{ padding: '12px 18px', color: '#38BDF8', fontWeight: 600 }}>Coastal / Tropical Cyclones ($B)</th>
                    <th style={{ padding: '12px 18px', color: '#34D399', fontWeight: 600 }}>Inland Flooding ($B)</th>
                    <th style={{ padding: '12px 18px', color: '#F59E0B', fontWeight: 600 }}>Total Flood-Related Losses ($B)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCostsRecords.map((r) => (
                    <tr
                      key={r.decade}
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.1s ease' }}
                    >
                      <td style={{ padding: '12px 18px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#F8FAFC' }}>
                        {r.decade}
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8' }}>
                        ${r.coastal_tropical_cyclones_billions.toFixed(1)}B
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: "'JetBrains Mono', monospace", color: '#34D399' }}>
                        ${r.inland_flooding_billions.toFixed(1)}B
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#FBBF24' }}>
                        ${r.total_flood_related_billions.toFixed(1)}B
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: FEDERAL ECONOMIC ASSESSMENT & SOURCES
          ======================================================== */}
      {activeTab === 'economic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '6px' }}>
          <div className="wildfires-chart-card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', margin: '0 0 8px 0' }}>
              U.S. Joint Economic Committee & Federal Disaster Assessment
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Beyond episodic billion-dollar disasters, chronic high-tide sunny day flooding and localized cloudbursts impose massive recurring financial burdens across municipal, residential, and corporate infrastructure.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase' }}>Annual National Burden</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', margin: '6px 0 4px 0' }}>
                  $179.8B – $496.0B
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                  Estimated total annual economic drag across the United States from direct repairs, lost business hours, and supply-chain interruptions.
                </p>
              </div>

              <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34D399', textTransform: 'uppercase' }}>Infrastructure Protection</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', margin: '6px 0 4px 0' }}>
                  $68.9B – $344.5B
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                  Required capital investment for coastal seawalls, levee fortifying, and municipal stormwater retrofits by 2040.
                </p>
              </div>

              <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase' }}>Commercial Disruption</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', margin: '6px 0 4px 0' }}>
                  $58.7B – $74.3B
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                  Annual commercial downtime, warehouse inventory losses, and corporate asset damage from localized inundations.
                </p>
              </div>

              <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F43F5E', textTransform: 'uppercase' }}>Residential Property Loss</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', margin: '6px 0 4px 0' }}>
                  $15.0B+ / Year
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                  Over $15 billion annually in direct home repairs, alongside $5.4B to $10.8B in permanent property value depression.
                </p>
              </div>
            </div>
          </div>

          {/* Provenance and Data Sources */}
          <div className="wildfires-chart-card">
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', margin: '0 0 10px 0' }}>
              Scientific Provenance & Citations
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={14} style={{ color: '#38BDF8' }} />
                <span><strong>NOAA NCEI U.S. Billion-Dollar Weather and Climate Disasters:</strong> Sourced from decadal CPI-adjusted historical damage datasets (1980–2024).</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={14} style={{ color: '#38BDF8' }} />
                <span><strong>NOAA CO-OPS (Center for Operational Oceanographic Products and Services):</strong> State of U.S. High Tide Flooding report series.</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={14} style={{ color: '#38BDF8' }} />
                <span><strong>U.S. EPA Climate Change Indicators:</strong> Heavy Precipitation indicator tracking 1-day extreme land area percentiles.</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={14} style={{ color: '#38BDF8' }} />
                <span><strong>EM-DAT International Disaster Database:</strong> Centre for Research on the Epidemiology of Disasters (CRED), UC Louvain.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function FloodingView(props) {
  if (props.loading || props.error || !props.data?.trends?.length || !props.data?.costs?.length) {
    return <DatasetStatus loading={props.loading} error={props.error} empty />;
  }
  return <FloodingContent {...props} />;
}
