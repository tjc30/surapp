import React, { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Trees, Globe, Map, Layers, Sliders, Activity, Table as TableIcon, Download, ExternalLink } from 'lucide-react';
import AreaDataStatus from './AreaDataStatus';
import DatasetView from './DatasetView';
const forestStudyUrl = 'https://www.frontiersin.org/journals/remote-sensing/articles/10.3389/frsen.2022.856903/full';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ReforestationView() {
  return <DatasetView name="tree_cover_change_2000_2020">{records => <ReforestationContent forestRecords={records} />}</DatasetView>;
}

function ReforestationContent({ forestRecords }) {
  const [view, setView] = useState('chart');
  const [scope, setScope] = useState('world');
  const records = forestRecords.filter(row => scope === 'world' ? row.region === 'World' : row.region !== 'World');
  const data = {
    labels: records.map(row => row.region),
    datasets: [
      { label: 'Tree-cover loss', data: records.map(row => -row.gross_loss_mha), backgroundColor: '#F87171', borderRadius: 4 },
      { label: 'Tree-cover gain', data: records.map(row => row.gross_gain_mha), backgroundColor: '#34D399', borderRadius: 4 },
      { label: 'Reported net change', data: records.map(row => row.net_change_mha), backgroundColor: '#38BDF8', borderRadius: 4 },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#E2E8F0' } },
      tooltip: { callbacks: { label: context => `${context.dataset.label}: ${context.parsed.y > 0 ? '+' : ''}${context.parsed.y} Mha` } },
    },
    scales: {
      x: { ticks: { color: '#CBD5E1' }, grid: { display: false } },
      y: { title: { display: true, text: 'Million hectares (Mha) · 2000–2020 total', color: '#CBD5E1' }, ticks: { color: '#CBD5E1' }, grid: { color: context => context.tick.value === 0 ? '#94A3B8' : 'rgba(255,255,255,0.08)' } },
    },
  };
  const download = () => {
    const fields = ['region', 'gross_loss_mha', 'gross_gain_mha', 'net_change_mha'];
    const forestCsv = [fields.join(','), ...forestRecords.map(row => fields.map(field => row[field]).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([forestCsv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tree_cover_change_2000_2020.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="forest-view">
      <AreaDataStatus><span className="badge-ready">UMD / WRI · 2000–2020 · Matched loss & gain</span></AreaDataStatus>
      <section className="forest-intro">
        <div className="placeholder-category-pill area-hero-category"><Trees size={16} aria-hidden="true" /> Forest Recovery • Global Tree-Cover Balance</div>
        <p>Compare satellite-mapped tree-cover loss, gain and net change over the same 20-year interval. Gain includes natural regrowth and plantations as well as restoration; it does not measure restoration success alone.</p>
      </section>

      <div className="controls-panel">
        <div className="control-row">
          <span className="control-row-label"><Layers size={14} /> View Mode:</span>
          <div className="selection-boxes-group">
            <button type="button" className={`selection-box-btn ${view === 'chart' ? 'active' : ''}`} aria-pressed={view === 'chart'} onClick={() => setView('chart')}><Activity size={14} />Interactive Chart</button>
            <button type="button" className={`selection-box-btn ${view === 'table' ? 'active' : ''}`} aria-pressed={view === 'table'} onClick={() => setView('table')}><TableIcon size={14} />Raw Records<span className="selection-count-pill">{records.length}</span></button>
          </div>
        </div>
        <div className="control-row">
          <span className="control-row-label"><Sliders size={14} /> Geography:</span>
          <div className="selection-boxes-group">
            <button type="button" className={`selection-box-btn ${scope === 'world' ? 'active' : ''}`} aria-pressed={scope === 'world'} onClick={() => setScope('world')}><Globe size={14} />World</button>
            <button type="button" className={`selection-box-btn ${scope === 'regions' ? 'active' : ''}`} aria-pressed={scope === 'regions'} onClick={() => setScope('regions')}><Map size={14} />Regional Comparison</button>
          </div>
        </div>
      </div>

      <section className="forest-analysis">
        <div className="forest-analysis-heading">
          <div><h2 className="chart-title">Tree-cover loss versus gain & net change</h2><p className="transport-note">{scope === 'world' ? 'World' : 'Six source regions'} · 2000–2020 cumulative change · not annual rates (1 hectare ≈ 2.471 acres; 1 million hectares [Mha] = 10,000 km² ≈ 3,861 mi²)</p></div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={download}><Download size={14} />Download all 7 records</button>
        </div>
        {view === 'chart' ? (
          <div className="forest-chart"><Bar data={data} options={options} role="img" aria-label="Tree-cover loss, gain and net change in million hectares from 2000 to 2020. Exact values are available in Raw Records." /></div>
        ) : (
          <div className="table-scroll-area"><table className="custom-table sources-table"><thead><tr><th scope="col">Region</th><th scope="col">Loss (Mha)</th><th scope="col">Gain (Mha)</th><th scope="col">Reported net change (Mha)</th></tr></thead><tbody>{records.map(row => <tr key={row.region}><td>{row.region}</td><td>{row.gross_loss_mha}</td><td>{row.gross_gain_mha}</td><td>{row.net_change_mha > 0 ? '+' : ''}{row.net_change_mha}</td></tr>)}</tbody></table></div>
        )}
        <p className="transport-note">Loss is plotted below zero; raw loss values are positive areas. Net change is a separate reported measure, not an additional loss to add to the red bars. Independently rounded source values can differ: the global reported net is −101 Mha, while 131 − 231 = −100 Mha.</p>
        <p className="transport-note">Tree cover means trees at least 5 metres tall, including natural and planted trees. These figures do not measure biodiversity recovery or carbon removals. New growth does not replace the ecological value of old-growth forests.</p>
        <div className="forest-source-links">
          <a href={forestStudyUrl} target="_blank" rel="noopener noreferrer">Potapov et al. (2022), Table 1 <ExternalLink size={12} /></a>
          <a href="https://www.wri.org/insights/tracking-global-tree-cover-gain" target="_blank" rel="noopener noreferrer">WRI interpretation <ExternalLink size={12} /></a>
        </div>
      </section>
    </div>
  );
}
