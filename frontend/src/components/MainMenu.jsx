import React, { useState, useMemo } from 'react';
import {
  Thermometer,
  Activity,
  Waves,
  Sun,
  Zap,
  Trees,
  Flame,
  ArrowRight,
  ShieldAlert,
  Leaf,
  Search,
  CheckCircle2,
  Clock,
  Compass,
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

export default function MainMenu({
  topics,
  onNavigate,
  stats,
  loading,
}) {
  const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'problem' | 'solution'
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchesCategory =
        filterCategory === 'all' || t.category === filterCategory;
      const matchesSearch =
        searchQuery === '' ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [topics, filterCategory, searchQuery]);

  const problemCount = topics.filter((t) => t.category === 'problem').length;
  const solutionCount = topics.filter((t) => t.category === 'solution').length;

  return (
    <div className="main-menu-container">
      {/* Compact Hero Section */}
      <section className="portal-hero">
        <div className="portal-hero-top-row">
          {/* Left: Problems Caused by ... Title */}
          <div className="hero-title-left">
            <h2 className="portal-hero-title">
              Problems Caused by Global Temperature Rise <br />
              <span className="gradient-text-hero">& Clean Energy Solutions</span>
            </h2>
          </div>

          {/* Right: Narrowed Peak Temp and Atmospheric CO2 blocks (interactive) */}
          <div className="hero-kpi-right">
            <div
              className="hero-metric-chip-narrow clickable"
              onClick={() => onNavigate('temp-rise')}
              title="Click to explore Temperature Anomaly records (1850–2026)"
              role="button"
              tabIndex={0}
            >
              <span className="metric-chip-label">Peak Temp Anomaly</span>
              <span className="metric-chip-value text-amber">
                {stats?.latest_record?.average > 0 ? '+' : ''}
                {stats?.latest_record?.average?.toFixed(2) ?? '+1.33'}°C
              </span>
              <span className="metric-chip-sub">Pre-Industrial Base →</span>
            </div>

            <div
              className="hero-metric-chip-narrow clickable"
              onClick={() => onNavigate('co2-rise')}
              title="Click to explore 10,000-Year Atmospheric CO2 record (-10,000 BCE to 2025 CE)"
              role="button"
              tabIndex={0}
            >
              <span className="metric-chip-label">Atmospheric CO₂</span>
              <span className="metric-chip-value text-sky">427.4 ppm</span>
              <span className="metric-chip-sub">+52% vs 280 ppm Base →</span>
            </div>
          </div>
        </div>

        {/* Single line description that extends across and under some of the two blocks */}
        <p className="portal-hero-desc-single">
          An interactive scientific dashboard tracking primary indicators, escalating ecological consequences, and clean energy solutions.
        </p>
      </section>

      {/* Filter and Search Controls */}
      <div className="menu-controls-strip">
        <div className="category-filter-group">
          <button
            className={`btn-filter ${filterCategory === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCategory('all')}
          >
            All Areas ({topics.length})
          </button>
          <button
            className={`btn-filter ${filterCategory === 'problem' ? 'active' : ''}`}
            onClick={() => setFilterCategory('problem')}
          >
            <ShieldAlert size={14} />
            <span>Problems & Impacts ({problemCount})</span>
          </button>
          <button
            className={`btn-filter ${filterCategory === 'solution' ? 'active' : ''}`}
            onClick={() => setFilterCategory('solution')}
          >
            <Leaf size={14} />
            <span>Solutions & Transition ({solutionCount})</span>
          </button>
        </div>

        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Filter topics (e.g., temperature, flooding, CO2, green energy)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* Topic Cards Grid (Without bottom footer section below the line) */}
      <div className="topics-grid">
        {filteredTopics.map((topic) => {
          const IconComponent = ICON_MAP[topic.iconName] || Thermometer;
          const isActive = topic.status === 'active';

          return (
            <div
              key={topic.id}
              className={`topic-card ${isActive ? 'card-ready' : 'card-blank-preview'}`}
              onClick={() => onNavigate(topic.id)}
              role="button"
              tabIndex={0}
              title={`Click to open ${topic.title}`}
              style={{
                '--card-accent': topic.accentColor,
              }}
            >
              {/* Card Header */}
              <div className="topic-card-header">
                <span className={`category-tag tag-${topic.category}`}>
                  {topic.categoryLabel}
                </span>

                <div className="header-right-badges">
                  {isActive ? (
                    <span className="badge-status-live">
                      <span className="pulse-dot-green"></span>
                      Live Data
                    </span>
                  ) : (
                    <span className="badge-status-blank">
                      <Clock size={11} />
                      Blank / In Dev
                    </span>
                  )}
                  <span className="card-open-arrow">
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>

              {/* Icon & Title */}
              <div className="topic-title-section">
                <div
                  className="topic-icon-wrap"
                  style={{
                    backgroundColor: `${topic.accentColor}18`,
                    borderColor: `${topic.accentColor}44`,
                    color: topic.accentColor,
                  }}
                >
                  <IconComponent size={22} />
                </div>
                <div>
                  <h3 className="topic-card-title">{topic.title}</h3>
                  <p className="topic-card-sub">{topic.shortTitle}</p>
                </div>
              </div>

              {/* Summary Description */}
              <p className="topic-card-desc">{topic.summary}</p>

              {/* Planned / Active Feature Highlights */}
              <div className="topic-features-list">
                {topic.plannedFeatures.slice(0, 2).map((feat, idx) => (
                  <div key={idx} className="feature-item">
                    <CheckCircle2 size={13} className="feature-bullet" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Educational Framework Section */}
      <section className="portal-framework-box">
        <div className="framework-header">
          <Compass size={18} className="framework-icon" />
          <div>
            <h3 className="framework-title">Global Temperature Rise - Conceptual Architecture</h3>
            <p className="framework-subtitle">
              From greenhouse accumulation to cascading ecological disruption and global renewable solutions.
            </p>
          </div>
        </div>

        <div className="framework-columns">
          <div className="framework-col">
            <div className="col-num">01</div>
            <h4>Thermal Driver</h4>
            <p>
              Accumulation of atmospheric CO₂ traps thermal infrared radiation, driving the 1850–2026 upward anomaly curve.
            </p>
            <span className="col-link" onClick={() => onNavigate('temp-rise')}>
              Inspect Temperature Data →
            </span>
          </div>

          <div className="framework-col">
            <div className="col-num">02</div>
            <h4>Compounding Impacts</h4>
            <p>
              Excess planetary heat fuels intensified hydrologic extremes: coastal inundation, droughts, and fires.
            </p>
            <span className="col-link" onClick={() => onNavigate('flooding')}>
              Explore Flooding & Droughts →
            </span>
          </div>

          <div className="framework-col">
            <div className="col-num">03</div>
            <h4>Decarbonization Pathways</h4>
            <p>
              Halting warming requires exponential clean electricity adoption alongside natural ecosystem restoration.
            </p>
            <span className="col-link" onClick={() => onNavigate('green-energy')}>
              Explore Green Energy Increases →
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
