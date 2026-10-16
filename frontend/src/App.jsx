import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ReforestationView from './components/ReforestationView';
import ElectricTransportationView from './components/ElectricTransportationView';
import MainMenu from './components/MainMenu';
import TemperatureRiseView from './components/TemperatureRiseView';
import TopicPlaceholderView from './components/TopicPlaceholderView';
import DataSourcesView from './components/DataSourcesView';
import Co2RiseView from './components/Co2RiseView';
import WildfiresView from './components/WildfiresView';
import DroughtsView from './components/DroughtsView';
import FloodingView from './components/FloodingView';
import GreenEnergyView from './components/GreenEnergyView';
import { TOPICS, getTopicById } from './data/topics';

export default function App() {
  const [activeView, setActiveView] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      if (hash && (hash === 'menu' || hash === 'sources' || getTopicById(hash))) {
        return hash;
      }
    }
    return 'menu';
  });

  const [data, setData] = useState([]);
  const [co2Data, setCo2Data] = useState([]);
  const [wildfireData, setWildfireData] = useState([]);
  const [droughtData, setDroughtData] = useState([]);
  const [floodData, setFloodData] = useState(null);
  const [stats, setStats] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Unit conversion: 'C' (Celsius) or 'F' (Fahrenheit)
  const [unit, setUnit] = useState('C');
  const toUnit = (val) => (val == null ? null : unit === 'F' ? val * 1.8 : val);
  const unitSymbol = `°${unit}`;

  // Fetch all endpoints including /api/sources and /api/drought
  const fetchData = async () => {
    window.dispatchEvent(new Event('refresh-datasets'));
    setLoading(true);
    setError(null);
    try {
      const [tempsRes, statsRes, co2Res, sourcesRes, firesRes, droughtRes, floodRes] = await Promise.all([
        fetch('/api/temps'),
        fetch('/api/stats'),
        fetch('/api/co2'),
        fetch('/api/sources'),
        fetch('/api/wildfires'),
        fetch('/api/drought'),
        fetch('/api/flooding'),
      ]);

      if (!tempsRes.ok) {
        throw new Error(`Failed to fetch temperature data (HTTP ${tempsRes.status})`);
      }
      if (!statsRes.ok) {
        throw new Error(`Failed to fetch stats (HTTP ${statsRes.status})`);
      }

      const tempsData = await tempsRes.json();
      const statsData = await statsRes.json();
      let co2Json = [];
      if (co2Res.ok) {
        co2Json = await co2Res.json();
      }
      let sourcesJson = [];
      if (sourcesRes.ok) {
        sourcesJson = await sourcesRes.json();
      }
      let firesJson = [];
      if (firesRes && firesRes.ok) {
        firesJson = await firesRes.json();
      }
      let droughtJson = [];
      if (droughtRes && droughtRes.ok) {
        droughtJson = await droughtRes.json();
      }
      let floodJson = null;
      if (floodRes && floodRes.ok) {
        floodJson = await floodRes.json();
      }

      setData(tempsData);
      setStats(statsData);
      setCo2Data(co2Json);
      setSources(sourcesJson);
      setWildfireData(firesJson);
      setDroughtData(droughtJson);
      setFloodData(floodJson);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred loading climate datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen to browser hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'menu' || !hash) {
        setActiveView('menu');
      } else if (hash === 'sources') {
        setActiveView('sources');
      } else if (getTopicById(hash)) {
        setActiveView(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (viewId) => {
    setActiveView(viewId);
    if (viewId === 'menu') {
      window.location.hash = 'menu';
    } else {
      window.location.hash = viewId;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeTopic = activeView === 'menu' || activeView === 'sources' ? null : getTopicById(activeView);

  return (
    <div className="app-container">
      <Header
        activeView={activeView}
        activeTopic={activeTopic}
        onNavigate={handleNavigate}
        unit={unit}
        setUnit={setUnit}
        loading={loading}
        onRefresh={fetchData}
      />

      <main className="main-content">
        {activeView === 'menu' && (
          <MainMenu
            topics={TOPICS}
            onNavigate={handleNavigate}
            stats={stats}
            loading={loading}
          />
        )}

        {activeView === 'temp-rise' && (
          <TemperatureRiseView
            data={data}
            co2Data={co2Data}
            stats={stats}
            loading={loading}
            error={error}
            fetchData={fetchData}
            unit={unit}
            setUnit={setUnit}
            toUnit={toUnit}
            unitSymbol={unitSymbol}
            onNavigate={handleNavigate}
          />
        )}

        {activeView === 'co2-rise' && (
          <Co2RiseView
            onNavigate={handleNavigate}
            sources={sources}
          />
        )}

        {(activeView === 'wildfires' || activeView === 'extreme-weather') && (
          <WildfiresView
            data={wildfireData}
            loading={loading}
            error={error}
            onNavigate={handleNavigate}
            sources={sources}
            onRefresh={fetchData}
          />
        )}

        {activeView === 'droughts' && (
          <DroughtsView
            data={droughtData}
            loading={loading}
            error={error}
            onNavigate={handleNavigate}
            sources={sources}
            onRefresh={fetchData}
          />
        )}

        {activeView === 'flooding' && (
          <FloodingView
            data={floodData}
            loading={loading}
            error={error}
            onNavigate={handleNavigate}
            sources={sources}
            onRefresh={fetchData}
          />
        )}

        {activeView === 'reforestation' && <ReforestationView />}

        {activeView === 'electric-transportation' && <ElectricTransportationView onNavigate={handleNavigate} />}

        {activeView === 'green-energy' && <GreenEnergyView onNavigate={handleNavigate} />}

        {activeView === 'sources' && (
          <DataSourcesView
            sources={sources}
            loading={loading}
            onRefresh={fetchData}
            onNavigate={handleNavigate}
          />
        )}

        {activeView !== 'menu' &&
          activeView !== 'temp-rise' &&
          activeView !== 'co2-rise' &&
          activeView !== 'wildfires' &&
          activeView !== 'extreme-weather' &&
          activeView !== 'droughts' &&
          activeView !== 'flooding' &&
          activeView !== 'reforestation' &&
          activeView !== 'electric-transportation' &&
          activeView !== 'green-energy' &&
          activeView !== 'sources' && (
            <TopicPlaceholderView
              topic={activeTopic}
              sources={sources}
              onNavigate={handleNavigate}
            />
          )}
      </main>
    </div>
  );
}
