import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { PageFitApp } from './PageFitApp';
import { CvErrorBoundary } from './components/CvErrorBoundary';
import './index.css';

const searchParams = new URLSearchParams(window.location.search);
const pageFitVersionId = searchParams.get('pageFit');
const pageFitLayout = searchParams.get('layout') === 'single-column' ? 'single-column' : 'two-column';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CvErrorBoundary>
      {pageFitVersionId ? (
        <PageFitApp
          versionId={pageFitVersionId}
          layout={pageFitLayout}
        />
      ) : (
        <App />
      )}
    </CvErrorBoundary>
  </StrictMode>,
);
