import AreaDataStatus from './AreaDataStatus';
import React from 'react';
import {
  Thermometer,
  Activity,
  Waves,
  Sun,
  Zap,
  Trees,
  Flame,
  Layers,
  Database,
  BarChart3,
  Clock,
  Sparkles,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

const ICON_MAP = {
  Thermometer,
  Activity,
  Waves,
  Sun,
  Zap,
  Trees,
  Flame,
};

export default function TopicPlaceholderView({ topic, sources = [], onNavigate }) {
  if (!topic) {
    return (
      <div className="placeholder-view-container">
        <p>Topic not found.</p>
      </div>
    );
  }

  const IconComponent = ICON_MAP[topic.iconName] || Layers;
  const isCo2 = topic.id === 'co2-rise';
  const co2Source = sources.find((s) => s.table_name === 'co2');

  return (
    <div className="placeholder-view-container">
      {/* Dataset status appears in the shared header. */}
      <AreaDataStatus>
        {isCo2 ? (
            <span className="badge-ready">
              <CheckCircle2 size={12} /> Automated Data Feed Loaded (1,874 Records)
            </span>
          ) : (
            <span className="badge-blank-indicator">
              <Clock size={12} /> Blank Selection / In Development
            </span>
          )}
      </AreaDataStatus>

      {/* Topic Hero Card */}
      <div
        className="placeholder-hero-card"
        style={{
          borderColor: `${topic.accentColor}33`,
        }}
      >
        <div className="placeholder-hero-top">
          <div
            className="placeholder-hero-icon"
            style={{
              backgroundColor: `${topic.accentColor}18`,
              borderColor: `${topic.accentColor}44`,
              color: topic.accentColor,
            }}
          >
            <IconComponent size={36} />
          </div>

          <div className="placeholder-hero-info">
            <div className="placeholder-category-pill">
              {topic.categoryLabel}
            </div>
            <h2 className="placeholder-hero-title">{topic.title}</h2>
            <p className="placeholder-hero-desc">{topic.description}</p>
          </div>
        </div>
      </div>

      {/* SPECIAL CO2 AUTOMATED FEED SHOWCASE */}
      {isCo2 && co2Source && (
        <div className="co2-live-feed-card">
          <div className="co2-live-header">
            <div className="co2-live-badge">
              <span className="pulse-dot-green"></span>
              <span>LIVE AUTOMATED DATA FEED ACTIVE IN SURREALDB</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('sources')}
            >
              <Database size={13} /> View in Data Sources Catalog →
            </button>
          </div>

          <div className="co2-live-metrics-grid">
            <div className="co2-metric-box">
              <span className="metric-box-title">Timespan Loaded</span>
              <span className="metric-box-val text-sky">-803,719 BCE to 2025 CE</span>
              <span className="metric-box-sub">EPICA Antarctic Ice Cores & Mauna Loa</span>
            </div>

            <div className="co2-metric-box">
              <span className="metric-box-title">Latest Observation (2025)</span>
              <span className="metric-box-val text-amber">425.62 ppm</span>
              <span className="metric-box-sub">+52% Above Pre-Industrial Baseline</span>
            </div>

            <div className="co2-metric-box">
              <span className="metric-box-title">API Provider & Pipeline</span>
              <span className="metric-box-val text-emerald">Our World in Data (OWID)</span>
              <span className="metric-box-sub">NOAA GML & EPA Harmonized Series</span>
            </div>

            <div className="co2-metric-box">
              <span className="metric-box-title">Next Scheduled Update</span>
              <span className="metric-box-val text-muted">2026-11-10</span>
              <span className="metric-box-sub">Monthly Ingestion Cadence</span>
            </div>
          </div>

          <div className="co2-live-endpoints-row">
            <div className="endpoint-item">
              <span className="endpoint-label">Live CSV API:</span>
              <a
                href="https://ourworldindata.org/grapher/co2-long-term-concentration.csv?v=1&csvType=full&useColumnShortNames=true"
                target="_blank"
                rel="noopener noreferrer"
                className="endpoint-link"
              >
                co2-long-term-concentration.csv <ExternalLink size={12} />
              </a>
            </div>

            <div className="endpoint-item">
              <span className="endpoint-label">Live Metadata JSON:</span>
              <a
                href="https://ourworldindata.org/grapher/co2-long-term-concentration.metadata.json?v=1&csvType=full&useColumnShortNames=true"
                target="_blank"
                rel="noopener noreferrer"
                className="endpoint-link"
              >
                co2-long-term-concentration.metadata.json <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Planned Architecture Workspace */}
      <div className="blank-workspace-card">
        <div className="blank-canvas-banner">
          <div className="blank-canvas-icon-wrap">
            <Layers size={28} className="blank-pulse-icon" />
          </div>
          <div>
            <h3 className="blank-canvas-heading">
              {isCo2
                ? 'CO₂ Table Ingested — Full Interactive Visualizations Coming Soon'
                : 'Module Currently Blank — Data Pipeline Under Construction'}
            </h3>
            <p className="blank-canvas-sub">
              {isCo2
                ? 'SurrealDB table `co2` is now fully loaded via automated Our World In Data API feed. Full 800,000-year interactive timeline charts and annual growth rate accelerators are being built for this view.'
                : 'This area covers one of the key pillars of our climate observatory. Data ingestion pipelines are being constructed to link SurrealDB with authoritative scientific datasets for this topic.'}
            </p>
          </div>
        </div>

        <div className="blank-spec-grid">
          {/* Column 1: Planned Data Sources */}
          <div className="spec-card">
            <div className="spec-card-header">
              <Database size={16} className="spec-icon text-sky" />
              <h4>Planned Scientific Data Sources</h4>
            </div>
            <ul className="spec-list">
              {topic.dataSources.map((ds, idx) => (
                <li key={idx}>
                  <strong>{ds}</strong>
                </li>
              ))}
              <li>SurrealDB 3.3 time-series schema tables & queries</li>
            </ul>
          </div>

          {/* Column 2: Planned Visualizations & Metrics */}
          <div className="spec-card">
            <div className="spec-card-header">
              <BarChart3 size={16} className="spec-icon text-amber" />
              <h4>Anticipated Features & Visualizations</h4>
            </div>
            <ul className="spec-list">
              {topic.plannedFeatures.map((feat, idx) => (
                <li key={idx}>{feat}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick Action Navigation Bar */}
        <div className="blank-actions-bar">

          <div className="blank-actions-right">
            <span className="blank-action-hint">
              Explore live observational data:
            </span>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => onNavigate('temp-rise')}
            >
              <Thermometer size={16} />
              <span>View Temperature Rise Module →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
