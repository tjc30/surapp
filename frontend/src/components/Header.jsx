import React from 'react';
import { ArrowLeft, Globe, RefreshCw, Thermometer, Database, Flame, Waves } from 'lucide-react';

export default function Header({
  activeView,
  activeTopic,
  onNavigate,
  unit,
  setUnit,
  loading,
  onRefresh,
}) {
  const isMenu = activeView === 'menu';
  const isSources = activeView === 'sources';
  const isFlame = activeTopic?.iconName === 'Flame';
  const isWaves = activeTopic?.iconName === 'Waves';

  return (
    <header className="header">
      <div className="header-left-cluster">
        {isSources && (
          <button
            className="btn-header-back"
            onClick={() => onNavigate('menu')}
            title="Return to Main Menu"
          >
            <ArrowLeft size={16} />
            <span>Main Menu</span>
          </button>
        )}

        <div
          className="brand"
          onClick={() => onNavigate('menu')}
          role="button"
          tabIndex={0}
          title="Click to go to Main Menu"
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-icon">
            {isMenu ? (
              <Globe className="icon-globe" size={22} />
            ) : isSources ? (
              <Database className="icon-globe" size={22} />
            ) : isFlame ? (
              <Flame className="icon-fire text-red" size={22} />
            ) : isWaves ? (
              <Waves className="icon-globe" style={{ color: '#0EA5E9' }} size={22} />
            ) : (
              <Thermometer className="icon-fire" size={22} />
            )}
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="title">
                {isMenu
                  ? 'Global Climate Crisis Dashboard'
                  : isSources
                  ? 'Data Sources & Metadata Catalog'
                  : activeTopic?.title || 'Global Climate Crisis Dashboard'}
              </h1>
            </div>
            <div className="subtitle-row">
              {isMenu ? (
                <p className="subtitle">
                  SurrealDB 3.3 • Axum 0.7 • Multi-Sector Climate Tracking
                </p>
              ) : isSources ? (
                <div className="breadcrumb-bar">
                  <span className="crumb-link" onClick={(e) => { e.stopPropagation(); onNavigate('menu'); }}>
                    Main Menu
                  </span>
                  <span className="crumb-sep">/</span>
                  <span className="crumb-current">Data Sources Catalog</span>
                  <span className="crumb-badge-live">● Live Registry</span>
                </div>
              ) : (
                <div className="breadcrumb-bar">
                  <button
                    type="button"
                    className="crumb-link crumb-back"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('menu');
                    }}
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                    Main
                  </button>
                  <span className="crumb-sep">/</span>
                  <span className="crumb-current">{activeTopic?.shortTitle || activeTopic?.title}</span>
                  {activeTopic?.status === 'active' && (
                    <span className="crumb-badge-live">● Live Dataset</span>
                  )}
                  {activeTopic?.status === 'blank' && (
                    <span className="crumb-badge-blank">○ In Development</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="header-actions">
        {activeView === 'temp-rise' && (
          <div className="unit-toggle-group">
            <button
              className={`btn-unit ${unit === 'C' ? 'active' : ''}`}
              onClick={() => setUnit('C')}
              title="Celsius (°C)"
            >
              °C
            </button>
            <button
              className={`btn-unit ${unit === 'F' ? 'active' : ''}`}
              onClick={() => setUnit('F')}
              title="Fahrenheit (°F)"
            >
              °F
            </button>
          </div>
        )}

        {/* Data Sources Catalog Button */}
        <button
          className={`btn ${isSources ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => onNavigate('sources')}
          title="Inspect Registered Data Sources & Provenance"
        >
          <Database size={14} />
          <span>Data Sources</span>
        </button>

        <div className="header-data-status">
          <div className="badge-live">
            <span className="pulse-dot"></span>
            SurrealDB Connected
          </div>
          <div id="area-data-status" />
        </div>

        <button className="btn btn-secondary btn-sm" onClick={onRefresh} title="Refresh climate data">
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Sync</span>
        </button>
      </div>
    </header>
  );
}
