import React, { useState } from 'react';
import { Car, Truck, Bus, TrainFront, Ship, Bike, Layers, Sliders, LayoutGrid, Table as TableIcon, ExternalLink, Database } from 'lucide-react';
import AreaDataStatus from './AreaDataStatus';
import DatasetView from './DatasetView';

const icons = { Car, Truck, Bus, TrainFront, Ship, Bike };

export default function ElectricTransportationView({ onNavigate }) {
  return <DatasetView name="electric-transportation">{records => <TransportationContent transportModes={records} onNavigate={onNavigate} />}</DatasetView>;
}

function TransportationContent({ transportModes, onNavigate }) {
  const transportReferences = Object.fromEntries(transportModes.map(item => [item.source, item.reference]));
  const [mode, setMode] = useState('all');
  const [view, setView] = useState('overview');
  const visible = transportModes.filter(item => mode === 'all' || mode === item.id);

  return (
    <div className="transport-view">
      <AreaDataStatus><span className="badge-ready">IEA & EMSA · 6 modes · Research snapshot</span></AreaDataStatus>
      <section className="transport-intro">
        <div className="placeholder-category-pill area-hero-category">Clean Mobility • Road, Rail & Water</div>
        <p>Explore electric cars, trucks, buses, trains, boats and motorbikes through sourced adoption indicators and technology summaries. Each figure retains its own year, geography and definition.</p>
        <p className="transport-note">Reviewed 15 October 2026. Road results cover 2025; rail uses an older baseline; maritime evidence is qualitative. These measures describe different things and should not be ranked as equivalent adoption rates.</p>
      </section>

      <div className="controls-panel">
        <div className="control-row">
          <span className="control-row-label"><Layers size={14} /> View Mode:</span>
          <div className="selection-boxes-group">
            <button type="button" className={`selection-box-btn ${view === 'overview' ? 'active' : ''}`} aria-pressed={view === 'overview'} onClick={() => setView('overview')}><LayoutGrid size={14} /> Overview</button>
            <button type="button" className={`selection-box-btn ${view === 'records' ? 'active' : ''}`} aria-pressed={view === 'records'} onClick={() => setView('records')}><TableIcon size={14} /> Evidence Records <span className="selection-count-pill">{visible.length}</span></button>
          </div>
        </div>
        <div className="control-row">
          <span className="control-row-label"><Sliders size={14} /> Transport Mode:</span>
          <div className="selection-boxes-group">
            <button type="button" className={`selection-box-btn ${mode === 'all' ? 'active' : ''}`} aria-pressed={mode === 'all'} onClick={() => setMode('all')}>All Modes</button>
            {transportModes.map(item => { const Icon = icons[item.icon]; return <button type="button" key={item.id} className={`selection-box-btn ${mode === item.id ? 'active' : ''}`} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}><Icon size={14} />{item.name}</button>; })}
          </div>
        </div>
      </div>

      {view === 'overview' ? (
        <div className="transport-grid">
          {visible.map(item => { const Icon = icons[item.icon]; const ref = transportReferences[item.source]; return (
            <article className="transport-card" key={item.id}>
              <h2><Icon size={22} aria-hidden="true" />{item.name}</h2>
              <div className="transport-period">{item.period}</div>
              <div className="transport-metric">{item.metric}</div>
              <div className="transport-measure">{item.measure}</div>
              <p>{item.summary}</p>
              <p className="transport-note">{item.scope}</p>
              <a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.name} <ExternalLink size={12} /></a>
            </article>
          ); })}
        </div>
      ) : (
        <div className="table-scroll-area transport-table-scroll">
          <table className="custom-table transport-table">
            <thead><tr>{['Mode', 'Reported indicator', 'Period / geography', 'Definition & scope', 'Source'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{visible.map(item => <tr key={item.id}><td>{item.name}</td><td><strong>{item.metric}</strong><br />{item.measure}</td><td>{item.period}</td><td>{item.scope}</td><td><a href={transportReferences[item.source].url} target="_blank" rel="noopener noreferrer">{transportReferences[item.source].name}</a></td></tr>)}</tbody>
          </table>
        </div>
      )}
      <button type="button" className="btn btn-secondary" onClick={() => onNavigate('sources')}><Database size={14} /> View all research sources in the Data Sources catalog</button>
    </div>
  );
}
