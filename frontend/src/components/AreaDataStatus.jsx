import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function AreaDataStatus({ children }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    setTarget(document.getElementById('area-data-status'));
  }, []);

  return target ? createPortal(children, target) : null;
}
