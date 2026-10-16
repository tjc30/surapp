import React from 'react';
import useDataset from '../hooks/useDataset';

export function DatasetStatus({ loading, error, empty = false }) {
  if (loading) return <p role="status">Loading database records…</p>;
  if (error) return <p role="alert">{error}. Use Sync to retry.</p>;
  if (empty) return <p role="status">No records in this database table. Import the dataset, then use Sync.</p>;
  return null;
}

export default function DatasetView({ name, children }) {
  const state = useDataset(name);
  if (state.loading || state.error || !state.data.length) {
    return <DatasetStatus {...state} empty={!state.data.length} />;
  }
  return children(state.data);
}
