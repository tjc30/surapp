import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Database,
  ExternalLink,
  Search,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Table as TableIcon,
} from 'lucide-react';

export default function DataSourcesView({
  sources,
  loading,
  onRefresh,
  onNavigate,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      const matchesSearch =
        searchQuery === '' ||
        s.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.source_org.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.data_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.notes.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        selectedType === 'all' || s.table_name === selectedType;
      return matchesSearch && matchesType;
    });
  }, [sources, searchQuery, selectedType]);

  const totalRecords = useMemo(() => {
    return sources.reduce((acc, curr) => acc + (curr.record_count || 0), 0);
  }, [sources]);

  return (
    <div className="sources-view-container">
      {/* Top Navigation Strip */}
      <div className="view-nav-strip">
        <button
          className="btn-back-menu-prominent"
          onClick={() => onNavigate('menu')}
          title="Return to Main Menu"
        >
          <ArrowLeft size={16} />
          <span>← Back to Main Menu</span>
        </button>

        <div className="view-breadcrumb-path">
          <span className="breadcrumb-link" onClick={() => onNavigate('menu')}>
            Main Menu
          </span>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb-active">Data Sources Catalog</span>
        </div>

        <div className="view-status-tag">
          <span className="badge-ready">
            <Database size={12} /> SurrealDB Schema Registry
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="sources-hero-card">
        <div className="sources-hero-top">
          <div className="sources-hero-icon">
            <Database size={28} />
          </div>
          <div>
            <h2 className="sources-hero-title">Data Sources & Metadata Catalog</h2>
            <p className="sources-hero-desc">
              Centralized registry of observational datasets loaded into SurrealDB. Automatically records table names, latest update timestamps, authoritative providers, scientific baselines, and notes.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="sources-stats-row">
          <div className="source-stat-box">
            <span className="stat-box-label">Registered Tables</span>
            <span className="stat-box-val text-amber">{sources.length} Tables</span>
            <span className="stat-box-sub">Active in SurrealDB</span>
          </div>

          <div className="source-stat-box">
            <span className="stat-box-label">Total Observations</span>
            <span className="stat-box-val text-sky">{totalRecords.toLocaleString()} Records</span>
            <span className="stat-box-sub">Across All Timespans</span>
          </div>

          <div className="source-stat-box">
            <span className="stat-box-label">Automated Pipelines</span>
            <span className="stat-box-val text-emerald">
              {sources.filter(s => s.status.includes('automated')).length} Live Feed
            </span>
            <span className="stat-box-sub">Our World in Data REST API</span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="menu-controls-strip">
        <div className="search-box" style={{ minWidth: '320px' }}>
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by table name, provider, keyword..."
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

        <div className="category-filter-group">
          <button
            className={`btn-filter ${selectedType === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedType('all')}
          >
            All Sources ({sources.length})
          </button>
          {sources.map((s) => (
            <button
              key={s.table_name}
              className={`btn-filter ${selectedType === s.table_name ? 'active' : ''}`}
              onClick={() => setSelectedType(s.table_name)}
            >
              table: {s.table_name}
            </button>
          ))}
        </div>
      </div>

      {/* Sources Catalog Table */}
      <div className="table-wrapper">
        <div className="table-caption-box">
          <h3>Registered Data Tables in SurrealDB</h3>
          <p>
            Synced from <code>data_sources</code> table • Axum <code>/api/sources</code>
          </p>
        </div>

        <div className="table-scroll-area">
          <table className="custom-table sources-table">
            <thead>
              <tr>
                <th>Table Name</th>
                <th>Data Type & Topic</th>
                <th>Authoritative Source</th>
                <th>Timespan & Records</th>
                <th>Latest Update</th>
                <th>Unit & Frequency</th>
                <th>Notes & Methodology</th>
              </tr>
            </thead>
            <tbody>
              {filteredSources.map((s) => (
                <tr key={s.table_name}>
                  <td>
                    <div className="table-pill-wrap">
                      <code className="code-pill code-pill-table">{s.table_name}</code>
                      <span className={`status-pill ${s.status.includes('automated') ? 'pill-green' : 'pill-amber'}`}>
                        {s.status.includes('automated') ? 'API Feed' : 'Local File'}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div className="source-name-cell">
                      <strong>{s.display_name}</strong>
                      <span className="source-sub-text">{s.data_type}</span>
                      <button
                        className="btn-text-link"
                        onClick={() => onNavigate(s.topic_id)}
                      >
                        Go to view →
                      </button>
                    </div>
                  </td>

                  <td>
                    <div className="source-org-cell">
                      <span>{s.source_org}</span>
                      {s.source_url && (
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-external-link"
                          title="Open official dataset source"
                        >
                          Source Link <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="source-timespan-cell">
                      <strong>{s.time_range}</strong>
                      <span className="mono-sub">{(s.record_count || 0).toLocaleString()} records</span>
                    </div>
                  </td>

                  <td>
                    <div className="source-date-cell">
                      <span className="date-current">
                        <Calendar size={12} /> {s.last_updated}
                      </span>
                      {s.next_update && (
                        <span className="date-next">
                          Next: {s.next_update}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="source-unit-cell">
                      <span className="unit-badge">{s.unit}</span>
                      <span className="mono-sub">{s.frequency}</span>
                    </div>
                  </td>

                  <td>
                    <div className="source-notes-cell">
                      <p>{s.notes}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return to Menu Footer */}
      <div className="view-bottom-return">
        <button
          className="btn btn-secondary btn-lg"
          onClick={() => onNavigate('menu')}
        >
          <ArrowLeft size={16} />
          <span>Return to Main Menu</span>
        </button>
      </div>
    </div>
  );
}
