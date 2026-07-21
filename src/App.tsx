import { useEffect, useMemo, useRef, useState } from 'react';
import { load as parseYaml } from 'js-yaml';
import { CvAiTailorPanel } from './components/CvAiTailorPanel';
import { CvGetStartedPanel } from './components/CvGetStartedPanel';
import { CvOnboardingWizard } from './components/CvOnboardingWizard';
import { CvSiteFooter } from './components/CvSiteFooter';
import { CvCompareView } from './components/CvCompareView';
import { CvDocument } from './components/CvDocument';
import { useCvLibrary } from './hooks/useCvLibrary';
import { useEditHistory } from './hooks/useEditHistory';
import { CvBackupControls } from './components/CvBackupControls';
import { CvMasterImportPanel } from './components/CvMasterImportPanel';
import {
  buildMasterImportPrompt,
  parseAiMasterYaml,
} from './lib/buildMasterImportPrompt';
import {
  buildTailorPrompt,
  parseAiTailorYaml,
} from './lib/buildTailorPrompt';
import { buildMasterFromOnboardingDraft } from './lib/onboarding/buildMasterFromDraft';
import type { OnboardingDraft } from './lib/onboarding/types';
import { isPlaceholderMaster } from './lib/isPlaceholderMaster';
import { compareResolvedCvs } from './lib/compareCv';
import type { CvBackup } from './lib/cvRepository';
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
import type { CvDataSource } from './lib/loadCvData';
import { mergeCvVersion } from './lib/mergeCvVersion';
import {
  buildCvPdfTitle,
  cvPageOverflows,
} from './lib/printCv';
import type {
  CvLibrary,
  CvMaster,
  CvVersion,
  ResolvedCv,
} from './types/cv';
import './AppShell.css';

type AppMode = 'preview' | 'compare';

const DEFAULT_VERSION_ID = 'main-cv';

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
    backendKind,
    library,
    master,
    isLoading,
    error,
    reloadLibrary,
    saveCopy,
    updateVersion,
    setAsBase,
    removeSaved,
    exportBackup,
    importBackup,
    importMaster,
    importSavedVersion,
    resetToExamples,
  } = useCvLibrary(dataSource);

  const [selectedVersionId, setSelectedVersionId] = useState(DEFAULT_VERSION_ID);
  const [mode, setMode] = useState<AppMode>('preview');
  const [isEditing, setIsEditing] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showMasterImportPanel, setShowMasterImportPanel] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [cvImportText, setCvImportText] = useState('');
  const [masterAiReply, setMasterAiReply] = useState('');
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const masterImportInputRef = useRef<HTMLInputElement>(null);
  const backupImportInputRef = useRef<HTMLInputElement>(null);

  const isExampleMode = dataSource === 'example';
  const isBrowserBackend = backendKind === 'browser';
  const canMutateData = !isExampleMode && !isEditing;
  const needsOnboarding = !isExampleMode && Boolean(master && isPlaceholderMaster(master));

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
    if (!activeVersion || !master) {
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
    if (!compareBase || !master) {
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
    if (!isEditing || !draftVersion || !master) {
      return [];
    }

    return listHiddenBullets(master, draftVersion);
  }, [draftVersion, isEditing, master]);

  const hiddenProjects = useMemo(() => {
    if (!isEditing || !draftVersion || !master) {
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
    if (!selectedVersion || !library || isEditing) {
      return;
    }

    const modeAnswer = window.prompt(
      `Save "${selectedVersion.label}" as a base CV:\n\n1) Create new base\n2) Replace existing base\n\nEnter 1 or 2:`,
      '1',
    );

    if (!modeAnswer?.trim()) {
      return;
    }

    const modeChoice = Number.parseInt(modeAnswer.trim(), 10);
    setActionError(null);

    try {
      if (modeChoice === 1) {
        const label = window.prompt(
          'Name for the new base CV:',
          selectedVersion.label,
        )?.trim();

        if (!label) {
          return;
        }

        const confirmed = window.confirm(
          `Create new base "${label}" from "${selectedVersion.label}"?`,
        );

        if (!confirmed) {
          return;
        }

        const baseVersion = await setAsBase(selectedVersion.id, {
          mode: 'create',
          label,
        });
        setSelectedVersionId(baseVersion.id);
        setActionMessage(`Created base: ${label}.`);
        return;
      }

      if (modeChoice !== 2) {
        setActionError('Enter 1 to create a new base or 2 to replace an existing one.');
        return;
      }

      if (library.bases.length === 0) {
        setActionError('No existing bases to replace. Choose create new base instead.');
        return;
      }

      const options = library.bases
        .map((base, index) => `${index + 1}) ${base.label}`)
        .join('\n');
      const replaceAnswer = window.prompt(
        `Replace which base with "${selectedVersion.label}"?\n\n${options}\n\nEnter a number:`,
        '1',
      );

      if (!replaceAnswer?.trim()) {
        return;
      }

      const replaceChoice = Number.parseInt(replaceAnswer.trim(), 10);
      const targetBase = library.bases[replaceChoice - 1];

      if (!targetBase) {
        setActionError(`Enter a number between 1 and ${library.bases.length}.`);
        return;
      }

      const confirmed = window.confirm(
        `Replace "${targetBase.label}" with "${selectedVersion.label}"?`,
      );

      if (!confirmed) {
        return;
      }

      const baseVersion = await setAsBase(selectedVersion.id, {
        mode: 'replace',
        targetBaseId: targetBase.id,
      });
      setSelectedVersionId(baseVersion.id);
      setActionMessage(`Updated base: ${targetBase.label}.`);
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

  const handleExportBackup = async () => {
    setActionError(null);

    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `cv-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setActionMessage('Backup downloaded.');
    } catch (exportError) {
      const message = exportError instanceof Error
        ? exportError.message
        : 'Failed to export backup.';
      setActionError(message);
    }
  };

  const handleImportBackupFile = async (file: File) => {
    setActionError(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text) as CvBackup;
      const confirmed = window.confirm(
        'Replace all local CV data in this browser/workspace with the backup?',
      );

      if (!confirmed) {
        return;
      }

      await importBackup(backup);
      setSelectedVersionId(DEFAULT_VERSION_ID);
      setActionMessage('Backup imported.');
    } catch (importError) {
      const message = importError instanceof Error
        ? importError.message
        : 'Failed to import backup.';
      setActionError(message);
    }
  };

  const handleImportMasterFile = async (file: File) => {
    setActionError(null);

    try {
      const text = await file.text();
      const nextMaster = parseYaml(text) as CvMaster;
      const confirmed = window.confirm(
        'Replace your master CV with this YAML file?',
      );

      if (!confirmed) {
        return;
      }

      await importMaster(nextMaster);
      setActionMessage('Master CV imported.');
    } catch (importError) {
      const message = importError instanceof Error
        ? importError.message
        : 'Failed to import master YAML.';
      setActionError(message);
    }
  };

  const handleResetToExamples = async () => {
    setActionError(null);

    const confirmed = window.confirm(
      'Reset to the default example CV (Main CV only)? This replaces all browser-stored data.',
    );

    if (!confirmed) {
      return;
    }

    try {
      await resetToExamples();
      setSelectedVersionId(DEFAULT_VERSION_ID);
      setActionMessage('Reset to example data.');
    } catch (resetError) {
      const message = resetError instanceof Error
        ? resetError.message
        : 'Failed to reset example data.';
      setActionError(message);
    }
  };

  const handleCompleteOnboarding = async (draft: OnboardingDraft) => {
    const nextMaster = buildMasterFromOnboardingDraft(draft);
    await importMaster(nextMaster);

    const mainBase = library?.bases.find((base) => base.id === 'main-cv')
      ?? library?.bases[0];

    if (mainBase) {
      await updateVersion({
        ...mainBase,
        headline: draft.headline,
        summary: draft.summary,
      });
      setSelectedVersionId(mainBase.id);
    }

    setShowOnboarding(false);
    setActionMessage('Your CV is ready. Export a backup so you do not lose it.');
  };

  const handleCopyMasterImportPrompt = async () => {
    if (!cvImportText.trim()) {
      return;
    }

    setActionError(null);

    try {
      const prompt = buildMasterImportPrompt(cvImportText);
      await navigator.clipboard.writeText(prompt);
      setActionMessage('Prompt copied. Paste it into ChatGPT or Gemini, then paste the master YAML reply below.');
    } catch (copyError) {
      const message = copyError instanceof Error
        ? copyError.message
        : 'Failed to copy prompt.';
      setActionError(message);
    }
  };

  const handleApplyMasterImportReply = async () => {
    if (!masterAiReply.trim()) {
      return;
    }

    setActionError(null);

    try {
      const nextMaster = parseAiMasterYaml(masterAiReply);
      await importMaster(nextMaster);

      const mainBase = library?.bases.find((base) => base.id === 'main-cv')
        ?? library?.bases[0];

      if (mainBase) {
        await updateVersion({
          ...mainBase,
          headline: nextMaster.headline,
          summary: nextMaster.summary,
        });
        setSelectedVersionId(mainBase.id);
      }

      setShowMasterImportPanel(false);
      setCvImportText('');
      setMasterAiReply('');
      setActionMessage('Master CV imported. Export a backup so you do not lose it.');
    } catch (applyError) {
      const message = applyError instanceof Error
        ? applyError.message
        : 'Failed to apply master YAML.';
      setActionError(message);
    }
  };

  const handleCopyAiPrompt = async () => {
    if (!master || !jobDescription.trim()) {
      return;
    }

    setActionError(null);

    try {
      const prompt = buildTailorPrompt(master, jobDescription);
      await navigator.clipboard.writeText(prompt);
      setActionMessage('Prompt copied. Paste it into ChatGPT or Gemini, then paste the YAML reply below.');
    } catch (copyError) {
      const message = copyError instanceof Error
        ? copyError.message
        : 'Failed to copy prompt.';
      setActionError(message);
    }
  };

  const handleApplyAiReply = async () => {
    if (!aiReply.trim()) {
      return;
    }

    setActionError(null);

    try {
      const parsed = parseAiTailorYaml(aiReply) as CvVersion;

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('AI reply is not a YAML object.');
      }

      if (!parsed.label && !parsed.id) {
        throw new Error('YAML must include at least label or id.');
      }

      const saved = await importSavedVersion({
        ...parsed,
        extends: 'master',
        label: parsed.label || parsed.id,
      });
      setSelectedVersionId(saved.id);
      setShowAiPanel(false);
      setAiReply('');
      setActionMessage(`Created saved CV "${saved.label}".`);
    } catch (applyError) {
      const message = applyError instanceof Error
        ? applyError.message
        : 'Failed to apply AI YAML.';
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

  if (error || !library || !master || !selectedVersion || !resolvedCv || !baseResolvedCv) {
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

          <CvBackupControls
            disabled={!canMutateData}
            showResetToExamples={isBrowserBackend}
            onExport={handleExportBackup}
            onImportBackupFile={handleImportBackupFile}
            onImportMasterFile={handleImportMasterFile}
            onResetToExamples={handleResetToExamples}
          />
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
                className="app-button app-button-secondary"
                onClick={() => setShowAiPanel((open) => !open)}
                disabled={isExampleMode || isEditing}
              >
                {showAiPanel ? 'Hide AI tailor' : 'Tailor with AI'}
              </button>
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
          Viewing the public template. Your My CV data is unchanged.
        </p>
      ) : null}

      {isBrowserBackend && !isExampleMode ? (
        <p
          className="app-info-banner"
          role="status"
        >
          Web mode: your CV data stays in this browser only. Use Export backup so you do not lose it.
        </p>
      ) : null}

      {isEditing ? (
        <p
          className="app-info-banner"
          role="status"
        >
          Editing &quot;{selectedVersion.label}&quot; only. Changes write to that version on Save,
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

      <input
        ref={masterImportInputRef}
        type="file"
        accept=".yaml,.yml,text/yaml"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            void handleImportMasterFile(file);
          }
        }}
      />
      <input
        ref={backupImportInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            void handleImportBackupFile(file);
          }
        }}
      />

      {needsOnboarding && !showOnboarding && !isEditing ? (
        <CvGetStartedPanel
          onStartWizard={() => setShowOnboarding(true)}
          onImportFromAi={() => setShowMasterImportPanel(true)}
          onImportMaster={() => masterImportInputRef.current?.click()}
          onImportBackup={() => backupImportInputRef.current?.click()}
        />
      ) : null}

      {showMasterImportPanel && !isExampleMode && !isEditing ? (
        <CvMasterImportPanel
          cvText={cvImportText}
          aiReply={masterAiReply}
          onCvTextChange={setCvImportText}
          onAiReplyChange={setMasterAiReply}
          onCopyPrompt={handleCopyMasterImportPrompt}
          onApplyReply={handleApplyMasterImportReply}
          onClose={() => setShowMasterImportPanel(false)}
        />
      ) : null}

      {showOnboarding && !isExampleMode ? (
        <CvOnboardingWizard
          onCancel={() => setShowOnboarding(false)}
          onComplete={handleCompleteOnboarding}
        />
      ) : null}

      {showAiPanel && !isExampleMode && !isEditing ? (
        <CvAiTailorPanel
          jobDescription={jobDescription}
          aiReply={aiReply}
          onJobDescriptionChange={setJobDescription}
          onAiReplyChange={setAiReply}
          onCopyPrompt={handleCopyAiPrompt}
          onApplyReply={handleApplyAiReply}
        />
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

      <CvSiteFooter isBrowserBackend={isBrowserBackend} />
    </main>
  );
};
