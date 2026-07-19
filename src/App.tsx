import { useEffect, useMemo, useRef, useState } from 'react';
import { CvCompareView } from './components/CvCompareView';
import { CvDocument } from './components/CvDocument';
import { useCvLibrary } from './hooks/useCvLibrary';
import { compareCvVersions } from './lib/compareCv';
import { loadMasterCv, type CvDataSource } from './lib/loadCvData';
import { mergeCvVersion } from './lib/mergeCvVersion';
import {
  applyCvPrintScale,
  clearCvPrintScale,
  cvNeedsOverflowWarning,
} from './lib/printCv';
import type { CvVersion, ResolvedCv } from './types/cv';
import './AppShell.css';

type AppMode = 'preview' | 'compare';

function getAllVersions(library: {
  base: CvVersion;
  saved: CvVersion[];
}): CvVersion[] {
  return [library.base, ...library.saved];
}

export const App = () => {
  const pageRef = useRef<HTMLElement>(null);
  const [dataSource, setDataSource] = useState<CvDataSource>('local');
  const {
    library,
    isLoading,
    error,
    reloadLibrary,
    saveCopy,
    setAsBase,
    removeSaved,
  } = useCvLibrary(dataSource);

  const master = useMemo(
    () => loadMasterCv(dataSource),
    [dataSource],
  );

  const [selectedVersionId, setSelectedVersionId] = useState('base');
  const [mode, setMode] = useState<AppMode>('preview');
  const [overflowsPage, setOverflowsPage] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isExampleMode = dataSource === 'example';

  useEffect(() => {
    setSelectedVersionId('base');
    setMode('preview');
    setActionMessage(null);
    setActionError(null);
  }, [dataSource]);

  useEffect(() => {
    if (!library) {
      return;
    }

    const allVersions = getAllVersions(library);
    const stillExists = allVersions.some((version) => version.id === selectedVersionId);

    if (!stillExists) {
      setSelectedVersionId(library.base.id);
    }
  }, [library, selectedVersionId]);

  const selectedVersion = useMemo(() => {
    if (!library) {
      return null;
    }

    return getAllVersions(library).find((version) => version.id === selectedVersionId) ?? library.base;
  }, [library, selectedVersionId]);

  const resolvedCv = useMemo((): ResolvedCv | null => {
    if (!selectedVersion) {
      return null;
    }

    return mergeCvVersion(master, selectedVersion);
  }, [master, selectedVersion]);

  const baseResolvedCv = useMemo((): ResolvedCv | null => {
    if (!library) {
      return null;
    }

    return mergeCvVersion(master, library.base);
  }, [library, master]);

  const diffs = useMemo(() => {
    if (!library || !selectedVersion || selectedVersion.id === library.base.id) {
      return [];
    }

    return compareCvVersions(
      library.base,
      selectedVersion,
      mergeCvVersion(master, library.base).experience,
      mergeCvVersion(master, selectedVersion).experience,
    );
  }, [library, master, selectedVersion]);

  useEffect(() => {
    const pageElement = pageRef.current;
    if (!pageElement || mode !== 'preview') {
      setOverflowsPage(false);
      return;
    }

    const measureOverflow = () => {
      setOverflowsPage(cvNeedsOverflowWarning(pageElement));
    };

    measureOverflow();

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(pageElement);
    window.addEventListener('resize', measureOverflow);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureOverflow);
    };
  }, [resolvedCv, mode]);

  const handleDownloadPdf = () => {
    const pageElement = pageRef.current;
    if (!pageElement) {
      window.print();
      return;
    }

    applyCvPrintScale(pageElement);

    const cleanup = () => {
      clearCvPrintScale(pageElement);
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    requestAnimationFrame(() => window.print());
  };

  const handleSaveCopy = async () => {
    if (!selectedVersion) {
      return;
    }

    const label = window.prompt('Name for this saved CV:', `${selectedVersion.label} copy`);
    if (!label?.trim()) {
      return;
    }

    setActionError(null);

    try {
      const savedVersion = await saveCopy(label.trim(), selectedVersion.id);
      setSelectedVersionId(savedVersion.id);
      setActionMessage(`Saved "${savedVersion.label}".`);
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : 'Failed to save CV copy.';
      setActionError(message);
    }
  };

  const handleSetAsBase = async () => {
    if (!selectedVersion) {
      return;
    }

    const confirmed = window.confirm(
      `Replace the base CV with "${selectedVersion.label}"?`,
    );

    if (!confirmed) {
      return;
    }

    setActionError(null);

    try {
      await setAsBase(selectedVersion.id);
      setSelectedVersionId('base');
      setActionMessage('Base CV updated.');
    } catch (promoteError) {
      const message = promoteError instanceof Error
        ? promoteError.message
        : 'Failed to update base CV.';
      setActionError(message);
    }
  };

  const handleDeleteSaved = async () => {
    if (!selectedVersion || selectedVersion.kind !== 'saved') {
      return;
    }

    const confirmed = window.confirm(
      `Delete saved CV "${selectedVersion.label}"?`,
    );

    if (!confirmed) {
      return;
    }

    setActionError(null);

    try {
      await removeSaved(selectedVersion.id);
      setSelectedVersionId('base');
      setActionMessage('Saved CV deleted.');
    } catch (deleteError) {
      const message = deleteError instanceof Error
        ? deleteError.message
        : 'Failed to delete saved CV.';
      setActionError(message);
    }
  };

  if (isLoading) {
    return (
      <main className="app-shell">
        <p className="app-status">Loading CV library…</p>
      </main>
    );
  }

  if (error || !library || !selectedVersion || !resolvedCv || !baseResolvedCv) {
    return (
      <main className="app-shell">
        <p className="app-error">{error ?? 'Failed to load CV library.'}</p>
      </main>
    );
  }

  const isBaseSelected = selectedVersion.id === library.base.id;
  const isSavedSelected = selectedVersion.kind === 'saved';

  return (
    <main className="app-shell">
      <header className="app-toolbar">
        <div className="app-toolbar-row">
          <div className="app-toolbar-group">
            <label
              className="app-label"
              htmlFor="cv-version"
            >
              CV
            </label>
            <select
              id="cv-version"
              className="app-select"
              value={selectedVersionId}
              onChange={(event) => setSelectedVersionId(event.target.value)}
            >
              <optgroup label="Base">
                <option value={library.base.id}>{library.base.label}</option>
              </optgroup>
              {library.saved.length ? (
                <optgroup label="Saved">
                  {library.saved.map((version) => (
                    <option
                      key={version.id}
                      value={version.id}
                    >
                      {version.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>

          <div className="app-toolbar-group">
            <span className="app-label">Data</span>
            <div className="app-segmented">
              <button
                type="button"
                className={dataSource === 'local' ? 'app-segment app-segment-active' : 'app-segment'}
                onClick={() => setDataSource('local')}
              >
                My CV
              </button>
              <button
                type="button"
                className={dataSource === 'example' ? 'app-segment app-segment-active' : 'app-segment'}
                onClick={() => setDataSource('example')}
              >
                Public template
              </button>
            </div>
          </div>

          <div className="app-toolbar-group">
            <span className="app-label">View</span>
            <div className="app-segmented">
              <button
                type="button"
                className={mode === 'preview' ? 'app-segment app-segment-active' : 'app-segment'}
                onClick={() => setMode('preview')}
              >
                Preview
              </button>
              <button
                type="button"
                className={mode === 'compare' ? 'app-segment app-segment-active' : 'app-segment'}
                onClick={() => setMode('compare')}
                disabled={isBaseSelected}
              >
                Compare
              </button>
            </div>
          </div>
        </div>

        <div className="app-toolbar-actions">
          <button
            type="button"
            className="app-button app-button-secondary"
            onClick={() => void reloadLibrary()}
          >
            Reload
          </button>
          <button
            type="button"
            className="app-button app-button-secondary"
            onClick={() => void handleSaveCopy()}
            disabled={isExampleMode}
          >
            Save copy
          </button>
          <button
            type="button"
            className="app-button app-button-secondary"
            onClick={() => void handleSetAsBase()}
            disabled={isBaseSelected || isExampleMode}
          >
            Set as base
          </button>
          {isSavedSelected ? (
            <button
              type="button"
              className="app-button app-button-danger"
              onClick={() => void handleDeleteSaved()}
              disabled={isExampleMode}
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            className="app-button"
            onClick={handleDownloadPdf}
          >
            Download PDF
          </button>
        </div>
      </header>

      {isExampleMode ? (
        <p
          className="app-info-banner"
          role="status"
        >
          Viewing the public GitHub template. Your local CV files are unchanged.
        </p>
      ) : null}

      {actionMessage ? (
        <p
          className="app-message"
          role="status"
        >
          {actionMessage}
        </p>
      ) : null}

      {actionError ? (
        <p
          className="app-error-banner"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      {overflowsPage && mode === 'preview' ? (
        <p
          className="app-warning"
          role="status"
        >
          This version overflows one page. Ask Cursor to shorten bullets or hide lower-priority items.
        </p>
      ) : null}

      {mode === 'preview' ? (
        <div className="app-preview">
          <CvDocument
            cv={resolvedCv}
            pageRef={pageRef}
          />
        </div>
      ) : (
        <CvCompareView
          baseCv={baseResolvedCv}
          compareCv={resolvedCv}
          diffs={diffs}
        />
      )}
    </main>
  );
};
