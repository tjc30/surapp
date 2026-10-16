import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { getPagePath } from '../data/pagePaths';

export default function Breadcrumbs({ activeView, onNavigate }) {
  const path = getPagePath(activeView);

  return (
    <nav className="breadcrumb-bar" aria-label="Breadcrumb">
      {path.map((page, index) => (
        <React.Fragment key={page.id}>
          {index > 0 && <span className="crumb-sep" aria-hidden="true">/</span>}
          {index === path.length - 1 ? (
            <span className="crumb-current" aria-current="page">{page.shortTitle || page.title}</span>
          ) : (
            <a
              className="crumb-link crumb-back"
              href={`#${page.id}`}
              onClick={event => {
                if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onNavigate(page.id);
              }}
            >
              {page.id === 'menu' && <ArrowLeft size={14} aria-hidden="true" />}
              {page.shortTitle || page.title}
            </a>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
