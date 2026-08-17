import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { PageFitApp } from './PageFitApp';
import './index.css';

const pageFitVersionId = new URLSearchParams(window.location.search).get('pageFit');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pageFitVersionId ? (
      <PageFitApp versionId={pageFitVersionId} />
    ) : (
      <App />
    )}
  </StrictMode>,
);
