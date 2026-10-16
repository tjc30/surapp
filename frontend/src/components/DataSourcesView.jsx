import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
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

  const manualSources = sources.filter(source => source.manually_maintained || source.manually_reviewed);
  const manualOnly = selectedType === 'manual';

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
        selectedType === 'all' || (selectedType === 'manual' ? s.manually_maintained || s.manually_reviewed : s.table_name === selectedType);
      return matchesSearch && matchesType;
    });
  }, [sources, searchQuery, selectedType]);

  const totalRecords = useMemo(() => {
    return sources.reduce((acc, curr) => acc + (curr.record_count || 0), 0);
  }, [sources]);

  return (
    <div className="sources-view-container">
      {/* Hero Header */}
      <div className="sources-hero-card">
        <p className="sources-hero-desc">
          Catalog of SurrealDB datasets used by the dashboard, including providers, coverage, record counts, and methodology.
        </p>

        {/* Stats Row */}
        <div className="sources-stats-row">
          <div className="source-stat-box">
            <span className="stat-box-label">Registered Datasets</span>
            <span className="stat-box-val text-amber">{sources.length} Datasets</span>
            <span className="stat-box-sub">Stored in SurrealDB</span>
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
      <div className="menu-controls-strip sources-controls-strip">
        <div className="search-box">
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
            type="button"
            className={`selection-box-btn catalog-all-sources ${selectedType === 'all' ? 'active' : ''}`}
            aria-pressed={selectedType === 'all'}
            onClick={() => setSelectedType('all')}
          >
            <Layers size={14} /> All Sources
            <span className="selection-count-pill">{sources.length}</span>
          </button>
          {sources.map((s) => (
            <button
              key={s.table_name}
              type="button"
              className={`selection-box-btn ${selectedType === s.table_name ? 'active' : ''}`}
              aria-pressed={selectedType === s.table_name}
              onClick={() => setSelectedType(s.table_name)}
            >
              table: {s.table_name}
            </button>
          ))}
          <button
            type="button"
            className={`selection-box-btn ${manualOnly ? 'active' : ''}`}
            aria-pressed={manualOnly}
            onClick={() => setSelectedType('manual')}
          >
            <TableIcon size={14} /> Manual Records
            <span className="selection-count-pill">{manualSources.length}</span>
          </button>
        </div>
      </div>

      {/* Sources Catalog Table */}
      <div className="table-wrapper">
        <div className="table-caption-box">
          <h3>{manualOnly ? 'Manually Maintained & Manually Reviewed Sources' : 'Registered Data Sources'}</h3>
          {manualOnly && (
            <div className="manual-source-explanation">
              <p><strong>Manually Maintained:</strong> A person edits or replaces the dataset when changes are needed; updates are not automatically obtained from the provider.</p>
              <p><strong>Manually Reviewed:</strong> A person checked the source and its interpretation for a dated snapshot. Review does not necessarily change the data or keep it current.</p>
              <p>A source can be both. These labels describe different activities; neither guarantees independent verification. Missing labels mean the activity is not documented.</p>
              <p>{manualSources.length} qualifying datasets · {filteredSources.length} shown after search filters. Counts below describe records in the source tables.</p>
            </div>
          )}
          <p>
            SurrealDB registry: <code>data_sources</code> • <code>/api/sources</code>
          </p>
        </div>

        <div className="table-scroll-area">
          <table className="custom-table sources-table">
            <thead>
              <tr>
                <th>Table / Dataset Name</th>
                {manualOnly && <th scope="col">Manual Handling</th>}
                <th>Data Type & Topic</th>
                <th>Authoritative Source</th>
                <th>Timespan & Records</th>
                <th>Latest Update</th>
                <th>Unit & Frequency</th>
                <th>Notes & Methodology</th>
              </tr>
            </thead>
            <tbody>
              {filteredSources.length === 0 && <tr><td colSpan={manualOnly ? 8 : 7}>{loading ? 'Loading catalog…' : 'No matching data sources.'}</td></tr>}
              {filteredSources.map((s) => (
                <tr key={s.table_name}>
                  <td>
                    <div className="table-pill-wrap">
                      <code className="code-pill code-pill-table">{s.table_name}</code>
                      <span className={`status-pill ${s.status.includes('automated') ? 'pill-green' : 'pill-amber'}`}>
                        {s.status.includes('automated') ? 'API Feed' : s.status.startsWith('database') ? 'Database' : 'Imported File'}
                      </span>
                    </div>
                  </td>

                  {manualOnly && (
                    <td>
                      <div className="manual-source-labels">
                        {s.manually_maintained && <span className="status-pill pill-amber">Manually Maintained</span>}
                        {s.manually_reviewed && <span className="status-pill pill-green">Manually Reviewed</span>}
                        {!s.manually_reviewed && <span className="source-sub-text">Review not documented</span>}
                      </div>
                    </td>
                  )}
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
