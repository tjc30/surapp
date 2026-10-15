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
  Thermometer,
  TrendingUp,
  Calendar,
  Layers,
  RefreshCw,
  AlertCircle,
  Database,
  BarChart3,
  Sparkles,
  Activity,
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

export default function TemperatureRiseView({
  data,
  co2Data,
  stats,
  loading,
  error,
  fetchData,
  unit,
  setUnit,
  toUnit,
  unitSymbol,
  onNavigate,
}) {
  // Filter settings
  const [startYear, setStartYear] = useState(1850);
  const [endYear, setEndYear] = useState(2026);
  const [showConfidence, setShowConfidence] = useState(true);
  const [showPoints, setShowPoints] = useState(false);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'warmest' | 'temp_co2' | 'table'

  // Sync year ranges when data arrives
  React.useEffect(() => {
    if (data.length > 0) {
      setStartYear(data[0].year);
      setEndYear(data[data.length - 1].year);
    }
  }, [data]);

  // Filtered dataset for main anomaly chart & raw table
  const filteredData = useMemo(() => {
    return data.filter((d) => d.year >= startYear && d.year <= endYear);
  }, [data, startYear, endYear]);

  // Warmest years ranked
  const warmestYears = useMemo(() => {
    return [...data]
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);
  }, [data]);

  // Main interactive temperature anomaly chart data
  const chartData = useMemo(() => {
    const labels = filteredData.map((d) => d.year);
    const averages = filteredData.map((d) => toUnit(d.average));
    const upperBounds = filteredData.map((d) => toUnit(d.upper_bound));
    const lowerBounds = filteredData.map((d) => toUnit(d.lower_bound));

    const datasets = [];

    if (showConfidence) {
      datasets.push({
        label: `Upper Bound (+Uncertainty, ${unitSymbol})`,
        data: upperBounds,
        borderColor: 'rgba(236, 128, 128, 0.4)',
        backgroundColor: 'rgba(198, 16, 16, 0.12)',
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: '+1',
        tension: 0.25,
        order: 3,
      });

      datasets.push({
        label: `Lower Bound (-Uncertainty, ${unitSymbol})`,
        data: lowerBounds,
        borderColor: 'rgba(86, 147, 245, 0.4)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
        tension: 0.25,
        order: 4,
      });
    }

    datasets.push({
      label: `Average Temperature Anomaly (${unitSymbol})`,
      data: averages,
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.2)',
      borderWidth: 2.5,
      pointRadius: showPoints ? 3 : 0,
      pointHoverRadius: 6,
      pointBackgroundColor: '#F59E0B',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 1.5,
      tension: 0.2,
      fill: false,
      order: 1,
    });

    return { labels, datasets };
  }, [filteredData, showConfidence, showPoints, unit, unitSymbol]);

  // Main temperature anomaly chart options
  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
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
            title: (items) => `Year: ${items[0].label}`,
            label: (item) => {
              const val = Number(item.raw).toFixed(3);
              const sign = item.raw > 0 ? '+' : '';
              return ` ${item.dataset.label}: ${sign}${val} ${unitSymbol}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(51, 65, 85, 0.3)' },
          ticks: {
            color: '#64748B',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 14,
          },
        },
        y: {
          grid: {
            color: (ctx) => (ctx.tick.value === 0 ? 'rgba(248, 250, 252, 0.3)' : 'rgba(51, 65, 85, 0.25)'),
            lineWidth: (ctx) => (ctx.tick.value === 0 ? 1.5 : 1),
          },
          ticks: {
            color: '#64748B',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: (val) => `${val > 0 ? '+' : ''}${val.toFixed(1)} ${unitSymbol}`,
          },
          title: {
            display: true,
            text: `Temperature Anomaly relative to pre-industrial (${unitSymbol})`,
            color: '#94A3B8',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          },
        },
      },
    };
  }, [unit, unitSymbol]);

  // Combined 1959-2025 dataset for Global Avg. Temp and CO2 ppm
  const tempCo2Data = useMemo(() => {
    const co2Map = new Map();
    co2Data.forEach((item) => {
      co2Map.set(item.year, item.co2_ppm);
    });

    const tempMap = new Map();
    data.forEach((item) => {
      tempMap.set(item.year, item.average);
    });

    const combined = [];
    for (let y = 1959; y <= 2025; y++) {
      combined.push({
        year: y,
        temp_avg: tempMap.get(y) ?? null,
        co2_ppm: co2Map.get(y) ?? null,
      });
    }
    return combined;
  }, [data, co2Data]);

  // Statistics for 1959-2025 comparison
  const co2Stats = useMemo(() => {
    if (!tempCo2Data || tempCo2Data.length === 0) return null;
    const first = tempCo2Data[0];
    const last = tempCo2Data[tempCo2Data.length - 1];
    const tempDelta =
      last.temp_avg != null && first.temp_avg != null
        ? last.temp_avg - first.temp_avg
        : null;
    const co2Delta =
      last.co2_ppm != null && first.co2_ppm != null
        ? last.co2_ppm - first.co2_ppm
        : null;
    const co2Pct =
      co2Delta != null && first.co2_ppm
        ? (co2Delta / first.co2_ppm) * 100
        : null;

    return {
      firstYear: first.year,
      lastYear: last.year,
      firstTemp: first.temp_avg,
      lastTemp: last.temp_avg,
      firstCo2: first.co2_ppm,
      lastCo2: last.co2_ppm,
      tempDelta,
      co2Delta,
      co2Pct,
    };
  }, [tempCo2Data]);

  // Chart data for Global Avg. Temp and CO2 ppm (1959-2025)
  const tempCo2ChartData = useMemo(() => {
    const labels = tempCo2Data.map((d) => d.year);
    const tempAverages = tempCo2Data.map((d) => toUnit(d.temp_avg));
    const co2Ppm = tempCo2Data.map((d) => d.co2_ppm);

    return {
      labels,
      datasets: [
        {
          label: `Global Avg Temp Anomaly (${unitSymbol})`,
          data: tempAverages,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 2.5,
          pointRadius: showPoints ? 3 : 1.5,
          pointHoverRadius: 6,
          pointBackgroundColor: '#F59E0B',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
          tension: 0.25,
          yAxisID: 'y',
          order: 1,
        },
        {
          label: 'Atmospheric CO₂ (ppm)',
          data: co2Ppm,
          borderColor: '#38BDF8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          borderWidth: 2.5,
          pointRadius: showPoints ? 3 : 1.5,
          pointHoverRadius: 6,
          pointBackgroundColor: '#38BDF8',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
          tension: 0.25,
          yAxisID: 'y1',
          order: 2,
        },
      ],
    };
  }, [tempCo2Data, showPoints, unit, unitSymbol]);

  // Dual-axis chart options
  const co2ChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
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
            title: (items) => `Year: ${items[0].label}`,
            label: (item) => {
              const val = Number(item.raw);
              if (item.dataset.yAxisID === 'y') {
                const sign = val > 0 ? '+' : '';
                return ` ${item.dataset.label}: ${sign}${val.toFixed(3)} ${unitSymbol}`;
              } else {
                return ` ${item.dataset.label}: ${val.toFixed(2)} ppm`;
              }
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(51, 65, 85, 0.3)' },
          ticks: {
            color: '#64748B',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 14,
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: (ctx) => (ctx.tick.value === 0 ? 'rgba(248, 250, 252, 0.3)' : 'rgba(51, 65, 85, 0.25)'),
            lineWidth: (ctx) => (ctx.tick.value === 0 ? 1.5 : 1),
          },
          ticks: {
            color: '#F59E0B',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: (val) => `${val > 0 ? '+' : ''}${val.toFixed(2)} ${unitSymbol}`,
          },
          title: {
            display: true,
            text: `Global Avg Temp Anomaly (${unitSymbol})`,
            color: '#F59E0B',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' },
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: '#38BDF8',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: (val) => `${val} ppm`,
          },
          title: {
            display: true,
            text: 'Atmospheric CO₂ (ppm)',
            color: '#38BDF8',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' },
          },
        },
      },
    };
  }, [unit, unitSymbol]);

  const setPreset = (preset) => {
    if (!data.length) return;
    const max = data[data.length - 1].year;
    switch (preset) {
      case 'all':
        setStartYear(data[0].year);
        setEndYear(max);
        break;
      case '1900':
        setStartYear(1900);
        setEndYear(max);
        break;
      case '1950':
        setStartYear(1950);
        setEndYear(max);
        break;
      case '2000':
        setStartYear(2000);
        setEndYear(max);
        break;
      default:
        break;
    }
  };

  return (
    <div className="temp-view-container">
      {/* Dataset status appears in the shared header. */}
      <AreaDataStatus>
        <span className="badge-ready">● Live Dataset (1850–2026)</span>
      </AreaDataStatus>

      {error && (
        <div className="alert-card alert-error">
          <AlertCircle size={20} />
          <div>
            <h4>Error loading climate data</h4>
            <p>{error}</p>
          </div>
          <button className="btn btn-sm btn-outline" onClick={fetchData}>
            Retry
          </button>
        </div>
      )}

      {/* Stats KPI Cards */}
      {stats && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon-wrap icon-amber">
              <Thermometer size={20} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Latest Anomaly ({stats.latest_record?.year})</span>
              <div className="kpi-value text-amber">
                {stats.latest_record?.average > 0 ? '+' : ''}
                {toUnit(stats.latest_record?.average)?.toFixed(3)} {unitSymbol}
              </div>
              <span className="kpi-hint">
                Range: [{toUnit(stats.latest_record?.lower_bound)?.toFixed(2)}{unitSymbol}, {toUnit(stats.latest_record?.upper_bound)?.toFixed(2)}{unitSymbol}]
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrap icon-red">
              <TrendingUp size={20} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Warmest Year on Record</span>
              <div className="kpi-value text-red">
                {stats.warmest_year} ({stats.max_temp > 0 ? '+' : ''}{toUnit(stats.max_temp)?.toFixed(3)} {unitSymbol})
              </div>
              <span className="kpi-hint">Peak anomaly in 177 years</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrap icon-blue">
              <Calendar size={20} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Recorded Timespan</span>
              <div className="kpi-value text-blue">
                {stats.min_year} – {stats.max_year}
              </div>
              <span className="kpi-hint">{stats.count} annual observations</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrap icon-emerald">
              <Layers size={20} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Active Window</span>
              <div className="kpi-value text-emerald">
                {activeTab === 'temp_co2' ? tempCo2Data.length : filteredData.length} Years
              </div>
              <span className="kpi-hint">
                {activeTab === 'temp_co2' ? '1959 to 2025 (CO₂ & Temp)' : `${startYear} to ${endYear} selected`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Controls & Filter Panel */}
      <div className="control-bar">
        <div className="control-group">
          <span className="control-title">Presets:</span>
          <div className="preset-buttons">
            <button
              className={`btn btn-pill ${startYear === 1850 ? 'active' : ''}`}
              onClick={() => setPreset('all')}
            >
              1850–2026 (All)
            </button>
            <button
              className={`btn btn-pill ${startYear === 1900 ? 'active' : ''}`}
              onClick={() => setPreset('1900')}
            >
              1900–2026
            </button>
            <button
              className={`btn btn-pill ${startYear === 1950 ? 'active' : ''}`}
              onClick={() => setPreset('1950')}
            >
              1950–2026
            </button>
            <button
              className={`btn btn-pill ${startYear === 2000 ? 'active' : ''}`}
              onClick={() => setPreset('2000')}
            >
              2000–2026
            </button>
          </div>
        </div>

        <div className="control-group range-controls">
          <div className="range-item">
            <label>From: <strong>{startYear}</strong></label>
            <input
              type="range"
              min="1850"
              max={endYear}
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
            />
          </div>
          <div className="range-item">
            <label>To: <strong>{endYear}</strong></label>
            <input
              type="range"
              min={startYear}
              max="2026"
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="control-group toggle-group">
          {activeTab !== 'temp_co2' && (
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showConfidence}
                onChange={(e) => setShowConfidence(e.target.checked)}
              />
              <span>Uncertainty Bounds</span>
            </label>
          )}
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showPoints}
              onChange={(e) => setShowPoints(e.target.checked)}
            />
              <span>Data Points</span>
          </label>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          <BarChart3 size={16} /> Interactive Anomaly Chart
        </button>
        <button
          className={`tab-btn ${activeTab === 'warmest' ? 'active' : ''}`}
          onClick={() => setActiveTab('warmest')}
        >
          <Sparkles size={16} /> Top 10 Warmest Years
        </button>
        <button
          className={`tab-btn ${activeTab === 'temp_co2' ? 'active' : ''}`}
          onClick={() => setActiveTab('temp_co2')}
        >
          <Activity size={16} /> Global Avg. Temp and CO2 ppm
        </button>
        <button
          className={`tab-btn ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          <Database size={16} /> Raw Records ({filteredData.length})
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="panel-container">
        {activeTab === 'chart' && (
          <div className="chart-wrapper">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Global Land & Ocean Temperature Anomaly</h3>
                <p className="chart-caption">
                  Showing <span className="highlight-text">Average</span> with shaded <span className="highlight-text">Upper & Lower Bounds</span> ({unitSymbol})
                </p>
              </div>
              <div className="chart-legend-custom">
                <span className="legend-chip legend-amber">Average</span>
                <span className="legend-chip legend-band">Upper / Lower Bounds</span>
              </div>
            </div>
            <div className="canvas-box">
              {loading ? (
                <div className="loading-state">
                  <RefreshCw className="spin" size={32} />
                  <p>Fetching records from SurrealDB via Axum...</p>
                </div>
              ) : (
                <Line data={chartData} options={chartOptions} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'warmest' && (
          <div className="table-wrapper">
            <div className="table-caption-box">
              <h3>Top 10 Highest Temperature Anomalies on Record</h3>
              <p>Calculated across all 177 years in table <code>temps</code> ({unitSymbol})</p>
            </div>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Year</th>
                  <th>Average Anomaly</th>
                  <th>Lower Bound</th>
                  <th>Upper Bound</th>
                  <th>Uncertainty Span</th>
                </tr>
              </thead>
              <tbody>
                {warmestYears.map((item, idx) => (
                  <tr key={item.year} className={idx === 0 ? 'row-gold' : ''}>
                    <td>
                      <span className={`rank-badge rank-${idx + 1}`}>#{idx + 1}</span>
                    </td>
                    <td className="year-cell"><strong>{item.year}</strong></td>
                    <td className="temp-val text-amber">
                      +{toUnit(item.average).toFixed(3)} {unitSymbol}
                    </td>
                    <td className="mono-sub">+{toUnit(item.lower_bound).toFixed(3)} {unitSymbol}</td>
                    <td className="mono-sub">+{toUnit(item.upper_bound).toFixed(3)} {unitSymbol}</td>
                    <td className="mono-sub">±{toUnit((item.upper_bound - item.lower_bound) / 2).toFixed(3)} {unitSymbol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'temp_co2' && (
          <div className="chart-wrapper">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Global Avg. Temp and CO2 ppm (1959–2025)</h3>
                <p className="chart-caption">
                  Dual-axis comparison of NOAA Global Mean Temperature Anomalies ({unitSymbol}) and NOAA Mauna Loa CO₂ Concentration (ppm) from <code className="code-pill">CO2/NOAA CO2 mean 1959-2025.csv</code>.
                </p>
              </div>
              <div className="chart-legend-custom">
                <span className="legend-chip legend-amber">Avg Temp Anomaly ({unitSymbol})</span>
                <span className="legend-chip legend-co2">Atmospheric CO₂ (ppm)</span>
              </div>
            </div>
            <div className="canvas-box">
              {loading ? (
                <div className="loading-state">
                  <RefreshCw className="spin" size={32} />
                  <p>Fetching climate & CO₂ data from SurrealDB...</p>
                </div>
              ) : (
                <Line data={tempCo2ChartData} options={co2ChartOptions} />
              )}
            </div>

            {co2Stats && (
              <div className="co2-summary-grid">
                <div className="co2-summary-card">
                  <span className="summary-title">{co2Stats.firstYear} Baseline</span>
                  <div className="summary-val-row">
                    <span className="text-amber">
                      {co2Stats.firstTemp > 0 ? '+' : ''}
                      {toUnit(co2Stats.firstTemp)?.toFixed(3)} {unitSymbol}
                    </span>
                    <span className="summary-sep">•</span>
                    <span className="text-blue">{co2Stats.firstCo2?.toFixed(2)} ppm</span>
                  </div>
                  <span className="summary-sub">Start of NOAA continuous CO₂ observation</span>
                </div>

                <div className="co2-summary-card">
                  <span className="summary-title">{co2Stats.lastYear} Current Observation</span>
                  <div className="summary-val-row">
                    <span className="text-amber">
                      {co2Stats.lastTemp > 0 ? '+' : ''}
                      {toUnit(co2Stats.lastTemp)?.toFixed(3)} {unitSymbol}
                    </span>
                    <span className="summary-sep">•</span>
                    <span className="text-blue">{co2Stats.lastCo2?.toFixed(2)} ppm</span>
                  </div>
                  <span className="summary-sub">Latest annual recorded measurements</span>
                </div>

                <div className="co2-summary-card">
                  <span className="summary-title">67-Year Increase (1959–2025)</span>
                  <div className="summary-val-row">
                    <span className="text-amber">
                      +{toUnit(co2Stats.tempDelta)?.toFixed(3)} {unitSymbol}
                    </span>
                    <span className="summary-sep">•</span>
                    <span className="text-blue">
                      +{co2Stats.co2Delta?.toFixed(2)} ppm (+{co2Stats.co2Pct?.toFixed(1)}%)
                    </span>
                  </div>
                  <span className="summary-sub">Parallel trajectory between atmospheric CO₂ and global warming</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'table' && (
          <div className="table-wrapper">
            <div className="table-caption-box">
              <h3>All Records ({filteredData.length} Years)</h3>
              <p>Filtered from {startYear} to {endYear} ({unitSymbol})</p>
            </div>
            <div className="table-scroll-area">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Average Anomaly</th>
                    <th>Lower Bound</th>
                    <th>Upper Bound</th>
                    <th>Confidence Range</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.year}>
                      <td><strong>{item.year}</strong></td>
                      <td className={`temp-val ${item.average > 0 ? 'text-amber' : 'text-blue'}`}>
                        {item.average > 0 ? '+' : ''}{toUnit(item.average).toFixed(3)} {unitSymbol}
                      </td>
                      <td className="mono-sub">
                        {item.lower_bound > 0 ? '+' : ''}{toUnit(item.lower_bound).toFixed(3)} {unitSymbol}
                      </td>
                      <td className="mono-sub">
                        {item.upper_bound > 0 ? '+' : ''}{toUnit(item.upper_bound).toFixed(3)} {unitSymbol}
                      </td>
                      <td className="mono-sub">
                        [{toUnit(item.lower_bound).toFixed(2)}, {toUnit(item.upper_bound).toFixed(2)}] {unitSymbol}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
