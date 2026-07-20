import { useEffect, useMemo, useRef, useState } from 'react';
import { CvCompareView } from './components/CvCompareView';
import { CvDocument } from './components/CvDocument';
import { useCvLibrary } from './hooks/useCvLibrary';
import { useEditHistory } from './hooks/useEditHistory';
import { compareResolvedCvs } from './lib/compareCv';
import {
  listHiddenBullets,
  listHiddenProjects,
  moveBullet,
  moveExperience,
  moveProject,
  setBulletText,
  setProjectField,
  setVersionHeadline,
  setVersionSummary,
  toggleHiddenBullet,
  toggleHiddenProject,
  versionPayloadForSave,
} from './lib/editCvVersion';
import { loadMasterCv, type CvDataSource } from './lib/loadCvData';
import { mergeCvVersion } from './lib/mergeCvVersion';
import {
  buildCvPdfTitle,
  cvPageOverflows,
} from './lib/printCv';
import type {
  CvBaseProfileId,
  CvLibrary,
  CvVersion,
  ResolvedCv,
} from './types/cv';
import { CV_BASE_PROFILE_IDS } from './types/cv';
import './AppShell.css';

type AppMode = 'preview' | 'compare';

const DEFAULT_VERSION_ID = 'frontend-cv';

const BASE_PROFILE_LABELS: Record<CvBaseProfileId, string> = {
  'frontend-cv': 'Frontend CV',
  'data-engineer-cv': 'Data Engineer / Analyst CV',
  'fullstack-cv': 'Full-Stack & AI CV',
};

function getAllVersions(library: CvLibrary): CvVersion[] {
  return [...library.bases, ...library.saved];
}

function getCompareBase(library: CvLibrary): CvVersion {
  return (
    library.bases.find((version) => version.id === library.compareBaseId)
    ?? library.bases[0]
  );
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
    updateVersion,
    setAsBase,
    removeSaved,
  } = useCvLibrary(dataSource);

  const master = useMemo(
    () => loadMasterCv(dataSource),
    [dataSource],
  );

  const [selectedVersionId, setSelectedVersionId] = useState(DEFAULT_VERSION_ID);
  const [mode, setMode] = useState<AppMode>('preview');
  const [isEditing, setIsEditing] = useState(false);
  const {
    draftVersion,
    canUndo,
    canRedo,
    reset: resetEditHistory,
    clear: clearEditHistory,
    applyStructural,
    applyText,
    commitText,
    undo,
    redo,
  } = useEditHistory();
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [overflowsPage, setOverflowsPage] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isExampleMode = dataSource === 'example';

  useEffect(() => {
    setSelectedVersionId(DEFAULT_VERSION_ID);
    setMode('preview');
    setIsEditing(false);
    clearEditHistory();
    setActionMessage(null);
    setActionError(null);
  }, [clearEditHistory, dataSource]);

  useEffect(() => {
    if (!library) {
      return;
    }

    const allVersions = getAllVersions(library);
    const stillExists = allVersions.some((version) => version.id === selectedVersionId);

    if (!stillExists) {
      setSelectedVersionId(getCompareBase(library).id);
      setIsEditing(false);
      clearEditHistory();
    }
  }, [clearEditHistory, library, selectedVersionId]);

  const selectedVersion = useMemo(() => {
    if (!library) {
      return null;
    }

    return getAllVersions(library).find((version) => version.id === selectedVersionId)
      ?? getCompareBase(library);
  }, [library, selectedVersionId]);

  const activeVersion = isEditing && draftVersion
    ? draftVersion
    : selectedVersion;

  const resolvedCv = useMemo((): ResolvedCv | null => {
    if (!activeVersion) {
      return null;
    }

    return mergeCvVersion(master, activeVersion);
  }, [master, activeVersion]);

  const compareBase = useMemo(() => {
    if (!library) {
      return null;
    }

    return getCompareBase(library);
  }, [library]);

  const baseResolvedCv = useMemo((): ResolvedCv | null => {
    if (!compareBase) {
      return null;
    }

    return mergeCvVersion(master, compareBase);
  }, [compareBase, master]);

  const diffs = useMemo(() => {
    if (!baseResolvedCv || !resolvedCv || !compareBase) {
      return [];
    }

    if (selectedVersion?.id === compareBase.id) {
      return [];
    }

    return compareResolvedCvs(baseResolvedCv, resolvedCv);
  }, [baseResolvedCv, resolvedCv, selectedVersion, compareBase]);

  const hiddenBullets = useMemo(() => {
    if (!isEditing || !draftVersion) {
      return [];
    }

    return listHiddenBullets(master, draftVersion);
  }, [draftVersion, isEditing, master]);

  const hiddenProjects = useMemo(() => {
    if (!isEditing || !draftVersion) {
      return [];
    }

    return listHiddenProjects(master, draftVersion);
  }, [draftVersion, isEditing, master]);

  useEffect(() => {
    const pageElement = pageRef.current;
    if (!pageElement || mode !== 'preview') {
      setOverflowsPage(false);
      return;
    }

    const measureOverflow = () => {
      setOverflowsPage(cvPageOverflows(pageElement));
    };

    measureOverflow();

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(pageElement);
    window.addEventListener('resize', measureOverflow);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureOverflow);
    };
  }, [resolvedCv, mode, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const hasModifier = event.metaKey || event.ctrlKey;

      if (!hasModifier) {
        return;
      }

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isEditing, redo, undo]);

  const handleSelectVersion = (versionId: string) => {
    if (isEditing) {
      const confirmed = window.confirm(
        'Discard unsaved edits and switch CV?',
      );

      if (!confirmed) {
        return;
      }

      setIsEditing(false);
      clearEditHistory();
    }

    setSelectedVersionId(versionId);
  };

  const handleEnterEditMode = () => {
    if (!selectedVersion || isExampleMode) {
      return;
    }

    setMode('preview');
    resetEditHistory(selectedVersion);
    setIsEditing(true);
    setActionMessage(null);
    setActionError(null);
  };

  const handleCancelEditMode = () => {
    if (!isEditing) {
      return;
    }

    const confirmed = window.confirm('Discard unsaved edits?');

    if (!confirmed) {
      return;
    }

    setIsEditing(false);
    clearEditHistory();
  };

  const handleSaveEdits = async () => {
    if (!draftVersion) {
      return;
    }

    commitText();
    setIsSavingEdits(true);
    setActionError(null);

    try {
      const saved = await updateVersion(versionPayloadForSave(draftVersion));
      setSelectedVersionId(saved.id);
      setIsEditing(false);
      clearEditHistory();
      setActionMessage(`Saved edits to "${saved.label}".`);
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : 'Failed to save edits.';
      setActionError(message);
    } finally {
      setIsSavingEdits(false);
    }
  };

  const handleDownloadPdf = () => {
    if (isEditing) {
      setActionError('Exit Edit mode (Save or Cancel) before downloading PDF.');
      return;
    }

    const pageElement = pageRef.current;
    const previousTitle = document.title;
    const pdfTitle = resolvedCv
      ? buildCvPdfTitle(resolvedCv.name, resolvedCv.headline)
      : 'CV';
    document.title = pdfTitle;

    const cleanup = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    if (!pageElement) {
      window.print();
      return;
    }

    requestAnimationFrame(() => window.print());
  };

  const handleSaveCopy = async () => {
    if (!selectedVersion || isEditing) {
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
    if (!selectedVersion || isEditing) {
      return;
    }

    const options = CV_BASE_PROFILE_IDS
      .map((id, index) => `${index + 1}) ${BASE_PROFILE_LABELS[id]}`)
      .join('\n');
    const answer = window.prompt(
      `Replace which base with "${selectedVersion.label}"?\n\n${options}\n\nEnter 1, 2, or 3:`,
      '1',
    );

    if (!answer?.trim()) {
      return;
    }

    const choice = Number.parseInt(answer.trim(), 10);
    const targetBaseId = CV_BASE_PROFILE_IDS[choice - 1];

    if (!targetBaseId) {
      setActionError('Enter 1, 2, or 3 to choose a base profile.');
      return;
    }

    const confirmed = window.confirm(
      `Replace "${BASE_PROFILE_LABELS[targetBaseId]}" with "${selectedVersion.label}"?`,
    );

    if (!confirmed) {
      return;
    }

    setActionError(null);

    try {
      const baseVersion = await setAsBase(selectedVersion.id, targetBaseId);
      setSelectedVersionId(baseVersion.id);
      setActionMessage(`Updated base: ${BASE_PROFILE_LABELS[targetBaseId]}.`);
    } catch (promoteError) {
      const message = promoteError instanceof Error
        ? promoteError.message
        : 'Failed to update base CV.';
      setActionError(message);
    }
  };

  const handleDeleteSaved = async () => {
    if (!selectedVersion || selectedVersion.kind !== 'saved' || isEditing) {
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
      setSelectedVersionId(DEFAULT_VERSION_ID);
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

  const isCompareBaseSelected = selectedVersion.id === compareBase?.id;
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
              disabled={isEditing}
              onChange={(event) => handleSelectVersion(event.target.value)}
            >
              <optgroup label="Base CVs">
                {library.bases.map((version) => (
                  <option
                    key={version.id}
                    value={version.id}
                  >
                    {version.label}
                  </option>
                ))}
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
                disabled={isEditing}
                onClick={() => setDataSource('local')}
              >
                My CV
              </button>
              <button
                type="button"
                className={dataSource === 'example' ? 'app-segment app-segment-active' : 'app-segment'}
                disabled={isEditing}
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
                className={mode === 'preview' && !isEditing ? 'app-segment app-segment-active' : 'app-segment'}
                disabled={isEditing}
                onClick={() => setMode('preview')}
              >
                Preview
              </button>
              <button
                type="button"
                className={isEditing ? 'app-segment app-segment-active' : 'app-segment'}
                disabled={isExampleMode}
                onClick={() => {
                  if (isEditing) {
                    return;
                  }

                  handleEnterEditMode();
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className={mode === 'compare' ? 'app-segment app-segment-active' : 'app-segment'}
                onClick={() => setMode('compare')}
                disabled={isCompareBaseSelected || isEditing}
              >
                Compare
              </button>
            </div>
          </div>
        </div>

        <div className="app-toolbar-actions">
          {isEditing ? (
            <>
              <button
                type="button"
                className="app-button app-button-secondary"
                onClick={undo}
                disabled={!canUndo || isSavingEdits}
              >
                Undo
              </button>
              <button
                type="button"
                className="app-button app-button-secondary"
                onClick={redo}
                disabled={!canRedo || isSavingEdits}
              >
                Redo
              </button>
              <button
                type="button"
                className="app-button"
                onClick={() => void handleSaveEdits()}
                disabled={isSavingEdits}
              >
                {isSavingEdits ? 'Saving…' : 'Save edits'}
              </button>
              <button
                type="button"
                className="app-button app-button-secondary"
                onClick={handleCancelEditMode}
                disabled={isSavingEdits}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
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
                disabled={isExampleMode}
              >
                Save as base…
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
            </>
          )}
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

      {isEditing ? (
        <p
          className="app-info-banner"
          role="status"
        >
          Editing &quot;{selectedVersion.label}&quot; only. Changes write to that YAML on Save,
          not master. Use Save as base… afterward if you want a base profile updated.
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
          Content overflows the page. Shorten the summary or bullets, or hide lower-priority items.
        </p>
      ) : null}

      {isEditing && (hiddenBullets.length > 0 || hiddenProjects.length > 0) ? (
        <section className="app-hidden-panel">
          <h2 className="app-hidden-panel-title">Hidden items</h2>
          {hiddenBullets.length > 0 ? (
            <ul className="app-hidden-list">
              {hiddenBullets.map((bullet) => (
                <li key={bullet.id}>
                  <span className="app-hidden-item-text">{bullet.text}</span>
                  <button
                    type="button"
                    className="app-button app-button-secondary app-button-small"
                    onClick={() => {
                      applyStructural((version) => toggleHiddenBullet(version, bullet.id));
                    }}
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {hiddenProjects.length > 0 ? (
            <ul className="app-hidden-list">
              {hiddenProjects.map((project) => (
                <li key={project.id}>
                  <span className="app-hidden-item-text">{project.title}</span>
                  <button
                    type="button"
                    className="app-button app-button-secondary app-button-small"
                    onClick={() => {
                      applyStructural((version) => toggleHiddenProject(version, project.id));
                    }}
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {mode === 'preview' || isEditing ? (
        <div className="app-preview">
          <CvDocument
            cv={resolvedCv}
            pageRef={pageRef}
            isEditing={isEditing}
            editActions={isEditing ? {
              onHeadlineChange: (value) => {
                applyText((version) => setVersionHeadline(version, value));
              },
              onSummaryChange: (value) => {
                applyText((version) => setVersionSummary(version, value));
              },
              onBulletTextChange: (bulletId, text) => {
                applyText((version) => setBulletText(version, bulletId, text));
              },
              onProjectTitleChange: (projectId, title) => {
                applyText((version) => setProjectField(
                  version,
                  projectId,
                  'title',
                  title,
                ));
              },
              onProjectDescriptionChange: (projectId, description) => {
                applyText((version) => setProjectField(
                  version,
                  projectId,
                  'description',
                  description,
                ));
              },
              onTextCommit: commitText,
              onMoveExperience: (experienceId, direction) => {
                applyStructural((version) => moveExperience(
                  master,
                  version,
                  experienceId,
                  direction,
                ));
              },
              onMoveBullet: (experienceId, bulletId, direction) => {
                applyStructural((version) => moveBullet(
                  master,
                  version,
                  experienceId,
                  bulletId,
                  direction,
                ));
              },
              onMoveProject: (projectId, direction) => {
                applyStructural((version) => moveProject(
                  master,
                  version,
                  projectId,
                  direction,
                ));
              },
              onHideBullet: (bulletId) => {
                applyStructural((version) => toggleHiddenBullet(version, bulletId));
              },
              onHideProject: (projectId) => {
                applyStructural((version) => toggleHiddenProject(version, projectId));
              },
            } : undefined}
          />
        </div>
      ) : (
        <CvCompareView
          baseCv={baseResolvedCv}
          compareCv={resolvedCv}
          baseLabel={compareBase?.label ?? 'Base CV'}
          diffs={diffs}
        />
      )}
    </main>
  );
};
