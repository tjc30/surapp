import AreaDataStatus from './AreaDataStatus';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
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
  Activity,
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
} from 'lucide-react';

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Historical climate & human civilization reference milestones
const MILESTONES = [
  {
    year: -10000,
    title: 'Start of the Holocene Epoch',
    co2: 248.9,
    description: 'Retreat of continental ice sheets and emergence of early human agriculture and settlements.',
    tag: 'Paleoclimate Baseline',
  },
  {
    year: -5000,
    title: 'Mid-Holocene Climate Optimum',
    co2: 261.2,
    description: 'Warm, stable global climate supporting early agricultural societies in Mesopotamia, the Nile, and Indus valleys.',
    tag: 'Agricultural Expansion',
  },
  {
    year: -2500,
    title: 'Egyptian Old Kingdom & Bronze Age',
    co2: 265.8,
    description: 'Pyramids of Giza constructed; atmospheric CO2 remains strictly locked between 260 and 270 ppm.',
    tag: 'Ancient Civilizations',
  },
  {
    year: 0,
    title: 'Common Era / Roman Empire',
    co2: 276.4,
    description: 'Peak Roman and Han Dynasty agricultural land use; stable atmospheric baseline continues.',
    tag: 'Classical Era',
  },
  {
    year: 1750,
    title: 'Onset of Industrial Revolution',
    co2: 277.0,
    description: 'Invention of James Watt\'s steam engine; beginning of coal-powered mechanization in Britain.',
    tag: 'Pre-Industrial Benchmark',
  },
  {
    year: 1850,
    title: 'Official IPCC Benchmark (1850–1900)',
    co2: 285.2,
    description: 'Global industrialization gathers pace. Pre-industrial atmospheric benchmark conventionally set at ~280 ppm.',
    tag: 'Industrial Dawn',
  },
  {
    year: 1958,
    title: 'Keeling Curve Initiated',
    co2: 315.3,
    description: 'Dr. Charles David Keeling begins continuous in-situ atmospheric monitoring at NOAA Mauna Loa Observatory, Hawaii.',
    tag: 'Instrumental Era',
  },
  {
    year: 2013,
    title: 'Breaching 400 ppm Threshold',
    co2: 396.5,
    description: 'Daily Mauna Loa CO2 readings permanently cross 400 ppm for the first time in over 3 million years (Pliocene epoch).',
    tag: 'Critical Planetary Boundary',
  },
  {
    year: 2025,
    title: 'Present Day Atmospheric Peak',
    co2: 427.35,
    description: 'Global annual mean exceeds 426 ppm (427.35 ppm NOAA Mauna Loa), +52% above the 10,000-year Holocene baseline.',
    tag: 'Modern Record Peak',
  },
];

export default function Co2RiseView({
  onNavigate,
  sources = [],
}) {
  const [co2Data, setCo2Data] = useState([]);
  const [noaaData, setNoaaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Time preset: '10k' | '2k' | '1850' | '1959'
  const [timePreset, setTimePreset] = useState('10k');
  const [showHoloceneEnvelope, setShowHoloceneEnvelope] = useState(true);
  const [showNoaaOverlay, setShowNoaaOverlay] = useState(true);
  const [showMilestoneMarkers, setShowMilestoneMarkers] = useState(true);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'milestones' | 'table'

  // Table search & pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const itemsPerPage = 15;

  // Fetch both 10K year CO2 composite and NOAA direct data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [owidRes, noaaRes] = await Promise.all([
          fetch('/api/co2?start_year=-10000&end_year=2025'),
          fetch('/api/co2/noaa'),
        ]);

        if (!owidRes.ok) {
          throw new Error(`Failed to load 10K-year CO2 data (HTTP ${owidRes.status})`);
        }

        const owidJson = await owidRes.json();
        let noaaJson = [];
        if (noaaRes.ok) {
          noaaJson = await noaaRes.json();
        }

        if (isMounted) {
          setCo2Data(owidJson);
          setNoaaData(noaaJson);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError(err.message || 'Error loading atmospheric CO2 records');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute domain bounds based on preset
  const { minYear, maxYear } = useMemo(() => {
    switch (timePreset) {
      case '2k':
        return { minYear: 0, maxYear: 2025 };
      case '1850':
        return { minYear: 1850, maxYear: 2025 };
      case '1959':
        return { minYear: 1959, maxYear: 2025 };
      case '10k':
      default:
        return { minYear: -10000, maxYear: 2025 };
    }
  }, [timePreset]);

  // Filtered records for current display
  const currentFilteredData = useMemo(() => {
    return co2Data.filter((d) => d.year >= minYear && d.year <= maxYear);
  }, [co2Data, minYear, maxYear]);

  // Key summary statistics
  const summaryStats = useMemo(() => {
    if (!co2Data.length) return null;

    // Holocene baseline (years < 1850)
    const holoceneRecords = co2Data.filter((d) => d.year <= 1850);
    const holoceneValues = holoceneRecords.map((d) => d.co2_ppm);
    const holoceneMin = holoceneValues.length ? Math.min(...holoceneValues) : 248.9;
    const holoceneMax = holoceneValues.length ? Math.max(...holoceneValues) : 285.5;
    const holoceneAvg =
      holoceneValues.length
        ? holoceneValues.reduce((a, b) => a + b, 0) / holoceneValues.length
        : 268.4;

    // Latest value (prefer NOAA if available, else OWID)
    const latestNoaa = noaaData.length ? noaaData[noaaData.length - 1] : null;
    const latestOwid = co2Data[co2Data.length - 1];
    const latestValue = latestNoaa ? latestNoaa.co2_ppm : latestOwid?.co2_ppm ?? 427.35;
    const latestYear = latestNoaa ? latestNoaa.year : latestOwid?.year ?? 2025;

    const deltaAboveBaseline = latestValue - holoceneAvg;
    const pctAboveBaseline = (deltaAboveBaseline / holoceneAvg) * 100;

    // 1959 to 2025 surge (modern Keeling era)
    const val1959 = noaaData.length ? noaaData[0].co2_ppm : 315.98;
    const modernSurge = latestValue - val1959;

    return {
      latestValue,
      latestYear,
      holoceneAvg,
      holoceneMin,
      holoceneMax,
      deltaAboveBaseline,
      pctAboveBaseline,
      val1959,
      modernSurge,
      totalCount: co2Data.length,
      noaaCount: noaaData.length,
    };
  }, [co2Data, noaaData]);

  // Chart data configuration
  const chartData = useMemo(() => {
    if (!co2Data.length) return { datasets: [] };

    const datasets = [];

    // 1. Holocene natural baseline envelope (260 - 280 ppm)
    if (showHoloceneEnvelope && minYear < 1850) {
      datasets.push({
        label: 'Holocene Upper Natural Envelope (280 ppm)',
        data: [
          { x: minYear, y: 280 },
          { x: Math.min(1850, maxYear), y: 280 },
        ],
        borderColor: 'rgba(52, 211, 153, 0.4)',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderWidth: 1,
        borderDash: [5, 4],
        pointRadius: 0,
        fill: '+1',
        tension: 0,
        order: 4,
      });

      datasets.push({
        label: 'Holocene Lower Natural Envelope (260 ppm)',
        data: [
          { x: minYear, y: 260 },
          { x: Math.min(1850, maxYear), y: 260 },
        ],
        borderColor: 'rgba(52, 211, 153, 0.4)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [5, 4],
        pointRadius: 0,
        fill: false,
        tension: 0,
        order: 5,
      });
    }

    // 2. Primary 10,000-year ice core + modern atmospheric composite line
    const owidPoints = currentFilteredData.map((d) => ({
      x: d.year,
      y: d.co2_ppm,
      source: d.source,
    }));

    datasets.push({
      label: 'Atmospheric CO₂ Concentration (Ice Core + NOAA Composite)',
      data: owidPoints,
      borderColor: '#38BDF8',
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      borderWidth: 2.75,
      pointRadius: timePreset === '1959' ? 3 : timePreset === '1850' ? 2 : 0,
      pointHoverRadius: 6,
      pointBackgroundColor: '#38BDF8',
      pointBorderColor: '#0F172A',
      pointBorderWidth: 1.5,
      tension: 0.15,
      fill: {
        target: 'origin',
        above: 'rgba(56, 189, 248, 0.06)',
      },
      order: 2,
    });

    // 3. NOAA Mauna Loa direct in-situ overlay line
    if (showNoaaOverlay && noaaData.length && maxYear >= 1959) {
      const filteredNoaa = noaaData
        .filter((d) => d.year >= Math.max(1959, minYear) && d.year <= maxYear)
        .map((d) => ({
          x: d.year,
          y: d.co2_ppm,
          source: 'NOAA Global Monitoring Laboratory (In-Situ Mauna Loa)',
        }));

      if (filteredNoaa.length) {
        datasets.push({
          label: 'NOAA Mauna Loa Annual Mean (Direct In-Situ Continuous)',
          data: filteredNoaa,
          borderColor: '#F59E0B',
          backgroundColor: 'transparent',
          borderWidth: 2.2,
          pointRadius: timePreset === '1959' ? 3.5 : 2,
          pointHoverRadius: 6,
          pointBackgroundColor: '#F59E0B',
          pointBorderColor: '#0F172A',
          pointBorderWidth: 1.5,
          tension: 0.2,
          fill: false,
          order: 1,
        });
      }
    }

    // 4. Milestone markers
    if (showMilestoneMarkers) {
      const visibleMilestones = MILESTONES.filter(
        (m) => m.year >= minYear && m.year <= maxYear
      ).map((m) => ({
        x: m.year,
        y: m.co2,
        milestone: m,
      }));

      if (visibleMilestones.length) {
        datasets.push({
          label: 'Historical Climate Milestones',
          data: visibleMilestones,
          borderColor: '#EC4899',
          backgroundColor: '#EC4899',
          borderWidth: 0,
          pointRadius: 6,
          pointHoverRadius: 9,
          pointStyle: 'rectRot',
          showLine: false,
          order: 0,
        });
      }
    }

    return { datasets };
  }, [
    co2Data,
    noaaData,
    currentFilteredData,
    minYear,
    maxYear,
    timePreset,
    showHoloceneEnvelope,
    showNoaaOverlay,
    showMilestoneMarkers,
  ]);

  // Chart options
  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: '#94A3B8',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
            boxWidth: 14,
            boxHeight: 14,
            usePointStyle: true,
            filter: (item) => !item.text.includes('Lower Natural Envelope'),
          },
        },
        tooltip: {
          backgroundColor: '#0F172A',
          borderColor: '#334155',
          borderWidth: 1,
          titleColor: '#F8FAFC',
          bodyColor: '#CBD5E1',
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const yr = items[0].parsed.x;
              const formattedYear =
                yr < 0
                  ? `${Math.abs(yr).toLocaleString()} BCE`
                  : yr === 0
                  ? '0 CE'
                  : `${yr} CE`;
              return `Year: ${formattedYear}`;
            },
            label: (item) => {
              const yr = item.parsed.x;
              const val = item.parsed.y;
              const rawPoint = item.raw;

              if (rawPoint?.milestone) {
                return [
                  ` ◆ ${rawPoint.milestone.title}`,
                  ` Concentration: ${val.toFixed(2)} ppm`,
                  ` Note: ${rawPoint.milestone.description}`,
                ];
              }

              const diffBase = val - 268.4;
              const sign = diffBase > 0 ? '+' : '';
              const pct = (diffBase / 268.4) * 100;
              return [
                ` ${item.dataset.label}: ${val.toFixed(2)} ppm`,
                ` Holocene baseline anomaly: ${sign}${diffBase.toFixed(1)} ppm (${sign}${pct.toFixed(1)}%)`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: minYear,
          max: maxYear,
          grid: {
            color: 'rgba(100, 116, 139, 0.2)',
          },
          ticks: {
            color: '#F8FAFC',
            font: { family: "'JetBrains Mono', monospace", size: 11.5, weight: '600' },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: timePreset === '10k' ? 12 : 10,
            callback: (val) => {
              if (val < 0) return `${Math.abs(val).toLocaleString()} BCE`;
              if (val === 0) return '0 CE';
              return `${val} CE`;
            },
          },
          title: {
            display: true,
            text: 'Timeline: Calendar Year (Negative = BCE, Positive = CE)',
            color: '#CBD5E1',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '700' },
          },
        },
        y: {
          type: 'linear',
          min: 240,
          max: 440,
          grid: {
            color: (ctx) =>
              ctx.tick.value === 280
                ? 'rgba(52, 211, 153, 0.35)'
                : ctx.tick.value === 400
                ? 'rgba(239, 68, 68, 0.35)'
                : 'rgba(51, 65, 85, 0.2)',
            lineWidth: (ctx) =>
              ctx.tick.value === 280 || ctx.tick.value === 400 ? 1.5 : 1,
          },
          ticks: {
            color: '#7DD3FC',
            font: { family: "'JetBrains Mono', monospace", size: 11.5, weight: '600' },
            callback: (val) => `${val} ppm`,
          },
          title: {
            display: true,
            text: 'Atmospheric CO₂ Mole Fraction (ppm)',
            color: '#38BDF8',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' },
          },
        },
      },
    };
  }, [minYear, maxYear, timePreset]);

  // Filtered raw records for table
  const tableRecords = useMemo(() => {
    return currentFilteredData.filter((r) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const yrStr = r.year.toString();
      const yrBce = r.year < 0 ? `${Math.abs(r.year)} bce` : `${r.year} ce`;
      const ppmStr = r.co2_ppm.toString();
      const srcStr = (r.source || '').toLowerCase();
      return (
        yrStr.includes(term) ||
        yrBce.includes(term) ||
        ppmStr.includes(term) ||
        srcStr.includes(term)
      );
    });
  }, [currentFilteredData, searchTerm]);

  const totalPages = Math.ceil(tableRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (tablePage - 1) * itemsPerPage;
    return tableRecords.slice(start, start + itemsPerPage);
  }, [tableRecords, tablePage]);

  return (
    <div className="temp-view-container co2-view-container">
      {/* Dataset status appears in the shared header. */}
      <AreaDataStatus>
        <span className="badge-ready">
            <span className="pulse-dot-green"></span>
            ● Live Data (10,000 BCE–2025 CE)
          </span>
      </AreaDataStatus>

      {/* Hero Headline Section */}
      <section className="detail-hero-banner co2-hero-banner">
        <div className="detail-hero-content">
          <div className="detail-category-badge">
            <Activity size={14} />
            <span>Greenhouse Gas Driver • Planetary Carbon Cycle</span>
          </div>
          <h2 className="detail-hero-title">
            Atmospheric CO₂ Level Rise: <span className="gradient-text-sky">10,000-Year Record</span>
          </h2>
          <p className="detail-hero-desc">
            Direct comparison of multi-millennial Antarctic ice core air bubbles (EPICA Dome C & Law Dome)
            with modern high-precision optical in-situ measurements at NOAA Mauna Loa Observatory.
            Reveals 10,000 years of remarkable Holocene stability (~260–280 ppm) followed by the modern industrial explosion past 427 ppm.
          </p>
        </div>

        <div className="detail-hero-meta-box">
          <div className="meta-box-item">
            <span className="meta-label">Total Records</span>
            <span className="meta-val text-sky">{co2Data.length} Points</span>
          </div>
          <div className="meta-box-item">
            <span className="meta-label">Time Coverage</span>
            <span className="meta-val text-slate">10,000 BCE – 2025 CE</span>
          </div>
          <div className="meta-box-item">
            <span className="meta-label">Catalog Tables</span>
            <span
              className="meta-val text-amber clickable"
              onClick={() => onNavigate('sources')}
              title="Click to view SurrealDB data sources catalog"
            >
              `co2` & `co2_noaa` →
            </span>
          </div>
        </div>
      </section>

      {/* KPI Summary Cards */}
      {summaryStats && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon-wrap icon-sky">
              <Activity size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Current 2025 Peak CO₂</span>
              <div className="kpi-value-row">
                <span className="kpi-value text-sky">
                  {summaryStats.latestValue.toFixed(1)}
                  <span className="kpi-unit"> ppm</span>
                </span>
                <span className="kpi-badge badge-warning">
                  +{summaryStats.pctAboveBaseline.toFixed(0)}% vs Base
                </span>
              </div>
              <span className="kpi-meta">
                NOAA Mauna Loa Continuous Mean (2025)
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrap icon-emerald">
              <Sparkles size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">10,000-Yr Holocene Mean</span>
              <div className="kpi-value-row">
                <span className="kpi-value text-emerald">
                  {summaryStats.holoceneAvg.toFixed(1)}
                  <span className="kpi-unit"> ppm</span>
                </span>
                <span className="kpi-badge badge-success">
                  {summaryStats.holoceneMin.toFixed(0)}–{summaryStats.holoceneMax.toFixed(0)} Range
                </span>
              </div>
              <span className="kpi-meta">
                Unprecedented 10-millennia natural climate stability
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrap icon-amber">
              <TrendingUp size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Anthropogenic Accumulation</span>
              <div className="kpi-value-row">
                <span className="kpi-value text-amber">
                  +{summaryStats.deltaAboveBaseline.toFixed(1)}
                  <span className="kpi-unit"> ppm</span>
                </span>
                <span className="kpi-badge badge-danger">
                  Surpassed 400 in 2013
                </span>
              </div>
              <span className="kpi-meta">
                Trapped atmospheric greenhouse excess since 1850
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrap icon-rose">
              <AlertTriangle size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Accumulation Velocity</span>
              <div className="kpi-value-row">
                <span className="kpi-value text-rose">
                  +2.4<span className="kpi-unit"> ppm/yr</span>
                </span>
                <span className="kpi-badge badge-danger">~200× Faster</span>
              </div>
              <span className="kpi-meta">
                Modern decadal rate vs &lt;0.01 ppm/century Holocene
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Analysis Card */}
      <div className="main-chart-card">
        {/* Top Header Strip with Title & "Full 10,000..." line */}
        <div className="chart-card-header">
          <div className="chart-header-left">
            <div className="chart-icon-box">
              <Activity size={20} className="text-sky" />
            </div>
            <div>
              <h3 className="chart-title">Atmospheric Carbon Dioxide Trajectory</h3>
              <p className="chart-subtitle">
                {timePreset === '10k' && 'Full 10,000-Year Holocene Epoch Perspective (10,000 BCE – 2025 CE)'}
                {timePreset === '2k' && 'Two Millennia Perspective: Roman Empire to Anthropocene (0 – 2025 CE)'}
                {timePreset === '1850' && 'Industrial Revolution to Modern Era (1850 – 2025 CE)'}
                {timePreset === '1959' && 'NOAA Mauna Loa Instrumental Keeling Curve (1959 – 2025 CE)'}
              </p>
            </div>
          </div>
        </div>

        {/* Unified 3-Line Selection Controls (Identical box look, open space, check color on select) */}
        <div className="co2-controls-panel">
          {/* Line 1 Selection: View Mode */}
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
                <span>Historical Milestones</span>
              </button>
              <button
                type="button"
                className={`selection-box-btn ${activeTab === 'table' ? 'active' : ''}`}
                onClick={() => setActiveTab('table')}
              >
                <TableIcon size={14} />
                <span>Raw Records</span>
                <span className="selection-count-pill">{currentFilteredData.length}</span>
              </button>
            </div>
          </div>

          {/* Line 2 Selection: Time Horizon */}
          <div className="control-row">
            <span className="control-row-label">
              <Calendar size={14} />
              Time Horizon:
            </span>
            <div className="selection-boxes-group">
              <button
                type="button"
                className={`selection-box-btn ${timePreset === '10k' ? 'active' : ''}`}
                onClick={() => setTimePreset('10k')}
              >
                <span>10,000 Years (Holocene)</span>
              </button>
              <button
                type="button"
                className={`selection-box-btn ${timePreset === '2k' ? 'active' : ''}`}
                onClick={() => setTimePreset('2k')}
              >
                <span>2,000 Years (0–2025)</span>
              </button>
              <button
                type="button"
                className={`selection-box-btn ${timePreset === '1850' ? 'active' : ''}`}
                onClick={() => setTimePreset('1850')}
              >
                <span>Industrial Era (1850–2025)</span>
              </button>
              <button
                type="button"
                className={`selection-box-btn ${timePreset === '1959' ? 'active' : ''}`}
                onClick={() => setTimePreset('1959')}
              >
                <span>NOAA In-Situ (1959–2025)</span>
              </button>
            </div>
          </div>

          {/* Line 3 Selection: Data Overlays (Active in Chart mode) */}
          {activeTab === 'chart' && (
            <div className="control-row">
              <span className="control-row-label">
                <Sparkles size={14} />
                Data Overlays:
              </span>
              <div className="selection-boxes-group">
                <label className={`selection-box-btn ${showHoloceneEnvelope ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={showHoloceneEnvelope}
                    onChange={(e) => setShowHoloceneEnvelope(e.target.checked)}
                    className="box-checkbox"
                  />
                  <span>Holocene Envelope (260–280 ppm)</span>
                </label>

                <label className={`selection-box-btn ${showNoaaOverlay ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={showNoaaOverlay}
                    onChange={(e) => setShowNoaaOverlay(e.target.checked)}
                    className="box-checkbox"
                  />
                  <span>NOAA Mauna Loa Overlay</span>
                </label>

                <label className={`selection-box-btn ${showMilestoneMarkers ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={showMilestoneMarkers}
                    onChange={(e) => setShowMilestoneMarkers(e.target.checked)}
                    className="box-checkbox"
                  />
                  <span>Milestone Markers</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Interactive Chart */}
        {activeTab === 'chart' && (
          <div className="chart-content-area">

            {/* Canvas Container */}
            <div className="chart-wrapper-canvas co2-chart-canvas">
              {loading ? (
                <div className="chart-loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading 10,000-year paleoclimate ice core and atmospheric records...</p>
                </div>
              ) : error ? (
                <div className="chart-error-state">
                  <AlertTriangle size={24} className="text-rose" />
                  <p>{error}</p>
                </div>
              ) : (
                <Line data={chartData} options={chartOptions} />
              )}
            </div>

            {/* Scientific Insight Ribbon */}
            <div className="chart-insight-strip">
              <div className="insight-badge">
                <Sparkles size={14} />
                <span>The Holocene "Hockey Stick" Phenomenon</span>
              </div>
              <p className="insight-text">
                For approximately 10,000 years, atmospheric CO₂ varied within a remarkably tight band of{' '}
                <strong>250 to 285 ppm</strong>. This climatic stability fostered the development of human agriculture, cities, and civilization.
                Beginning in the late 19th century with large-scale fossil fuel combustion and deforestation, concentrations surged from{' '}
                <strong>285 ppm in 1850 to over 427 ppm in 2025</strong>—a rate of increase unprecedented in the 800,000-year ice core record.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Historical Milestones */}
        {activeTab === 'milestones' && (
          <div className="milestones-view-area">
            <div className="milestones-header">
              <h4>Historical Epochs & Atmospheric Milestones</h4>
              <p>Key moments in paleoclimatology, civilization development, and the carbon cycle.</p>
            </div>

            <div className="milestones-grid">
              {MILESTONES.map((m, idx) => {
                const yrFormatted =
                  m.year < 0
                    ? `${Math.abs(m.year).toLocaleString()} BCE`
                    : m.year === 0
                    ? '0 CE'
                    : `${m.year} CE`;
                const deltaFromBase = m.co2 - 268.4;
                const sign = deltaFromBase > 0 ? '+' : '';

                return (
                  <div key={idx} className="milestone-card">
                    <div className="milestone-card-top">
                      <span className="milestone-year-badge">{yrFormatted}</span>
                      <span className="milestone-tag">{m.tag}</span>
                    </div>

                    <h4 className="milestone-title">{m.title}</h4>
                    <p className="milestone-desc">{m.description}</p>

                    <div className="milestone-co2-box">
                      <div className="co2-metric-group">
                        <span className="co2-metric-label">Atmospheric CO₂</span>
                        <span className="co2-metric-val">{m.co2.toFixed(1)} ppm</span>
                      </div>
                      <div className="co2-anomaly-group">
                        <span className="co2-metric-label">Vs Holocene Base</span>
                        <span className={`co2-anomaly-val ${deltaFromBase > 10 ? 'text-amber' : 'text-emerald'}`}>
                          {sign}{deltaFromBase.toFixed(1)} ppm
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Raw Data Records */}
        {activeTab === 'table' && (
          <div className="co2-table-area">
            <div className="table-filter-bar">
              <div className="search-box">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search year, concentration (ppm), or source..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setTablePage(1);
                  }}
                  className="search-input"
                />
              </div>

              <div className="table-count-badge">
                Showing {tableRecords.length} records matching time horizon ({minYear < 0 ? `${Math.abs(minYear)} BCE` : `${minYear} CE`} to {maxYear} CE)
              </div>
            </div>

            <div className="table-responsive">
              <table className="climate-data-table">
                <thead>
                  <tr>
                    <th>Year / Era</th>
                    <th>Atmospheric CO₂ (ppm)</th>
                    <th>Anomaly vs Base (268.4 ppm)</th>
                    <th>Primary Archive / Source</th>
                    <th>Location / Method</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((r, i) => {
                    const yrFormatted =
                      r.year < 0
                        ? `${Math.abs(r.year).toLocaleString()} BCE`
                        : r.year === 0
                        ? '0 CE'
                        : `${r.year} CE`;
                    const delta = r.co2_ppm - 268.4;
                    const sign = delta > 0 ? '+' : '';

                    return (
                      <tr key={i}>
                        <td className="year-cell font-mono">{yrFormatted}</td>
                        <td className="font-mono text-sky font-semibold">
                          {r.co2_ppm.toFixed(2)} ppm
                        </td>
                        <td className="font-mono">
                          <span className={`delta-tag ${delta > 20 ? 'delta-high' : 'delta-normal'}`}>
                            {sign}{delta.toFixed(2)} ppm
                          </span>
                        </td>
                        <td className="text-slate text-sm">{r.source || 'Our World In Data Composite'}</td>
                        <td className="text-slate text-sm">
                          {r.location || (r.year >= 1958 ? 'Mauna Loa In-Situ' : 'Antarctic Ice Cores')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="table-pagination">
                <button
                  className="btn-page"
                  disabled={tablePage === 1}
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page {tablePage} of {totalPages}
                </span>
                <button
                  className="btn-page"
                  disabled={tablePage === totalPages}
                  onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Database & Paleoclimate Architecture Details */}
      <section className="paleo-info-card">
        <div className="paleo-info-header">
          <Database size={18} className="text-amber" />
          <div>
            <h4 className="paleo-info-title">SurrealDB 3.3 Paleoclimate Data Architecture</h4>
            <p className="paleo-info-subtitle">
              How ancient atmospheric air bubbles and modern infrared spectroscopy are unified in the database.
            </p>
          </div>
        </div>

        <div className="paleo-features-grid">
          <div className="paleo-feature-box">
            <div className="paleo-feature-num">01</div>
            <h4>Antarctic Ice Cores (EPICA & Law Dome)</h4>
            <p>
              Snowfall falling on the Antarctic plateau compacts over millennia into glacial firn and solid ice,
              sealing ambient atmospheric air into hermetic bubbles. Chemical extraction reveals continuous CO₂ levels spanning 800,000 years.
            </p>
            <span className="table-badge-mono">Table: `co2` (OWID Composite)</span>
          </div>

          <div className="paleo-feature-box">
            <div className="paleo-feature-num">02</div>
            <h4>NOAA Mauna Loa Keeling Curve</h4>
            <p>
              Located at 3,397 meters elevation atop Mauna Loa volcano in Hawaii, NOAA's Global Monitoring Laboratory
              continuously measures clean mid-tropospheric air far removed from local vegetation and human industrial centers.
            </p>
            <span className="table-badge-mono">Table: `co2_noaa` (NOAA GML)</span>
          </div>

          <div className="paleo-feature-box">
            <div className="paleo-feature-num">03</div>
            <h4>Data Sources Catalog Integration</h4>
            <p>
              Both datasets are cataloged in the SurrealDB `data_sources` table with complete update schedules,
              methodology metadata, API endpoints, and citation records.
            </p>
            <button
              className="btn-inline-catalog"
              onClick={() => onNavigate('sources')}
            >
              Explore Data Sources Catalog →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
