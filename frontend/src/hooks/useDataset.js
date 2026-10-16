import { useEffect, useState } from 'react';

export default function useDataset(name) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    let controller;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      setState({ data: [], loading: true, error: null });
      try {
        const response = await fetch(`/api/datasets/${encodeURIComponent(name)}`, { signal });
        if (!response.ok) throw new Error(`Could not load ${name} (HTTP ${response.status})`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid dataset response');
        if (!signal.aborted) setState({ data, loading: false, error: null });
      } catch (error) {
        if (!signal.aborted) setState({ data: [], loading: false, error: error.message });
      }
    };
    load();
    window.addEventListener('refresh-datasets', load);
    return () => { controller?.abort(); window.removeEventListener('refresh-datasets', load); };
  }, [name]);
  return state;
}
