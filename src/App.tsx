import { useEffect, useMemo, useRef, useState } from 'react';
import { load as parseYaml } from 'js-yaml';
import { TbSettings } from 'react-icons/tb';
import { CvAiTailorPanel } from './components/CvAiTailorPanel';
import { CvCoverLetterPanel } from './components/CvCoverLetterPanel';
import { CoverLetterDocument } from './components/CoverLetterDocument';
import { CvGetStartedPanel } from './components/CvGetStartedPanel';
import { CvOnboardingWizard } from './components/CvOnboardingWizard';
import { CvSiteFooter } from './components/CvSiteFooter';
import { CvCompareView } from './components/CvCompareView';
import { CvDocument } from './components/CvDocument';
import { useCvLibrary } from './hooks/useCvLibrary';
import { useEditHistory } from './hooks/useEditHistory';
import { CvDataSettingsModal } from './components/CvDataSettingsModal';
import { CvToolbarMenu } from './components/CvToolbarMenu';
import { CvToolsSidebar } from './components/CvToolsSidebar';
import type { SidebarSection } from './components/CvToolsSidebar';
import { CvVersionSelect } from './components/CvVersionSelect';
import { CvMasterImportPanel } from './components/CvMasterImportPanel';
import {
  buildMasterImportPrompt,
  parseAiMasterYaml,
} from './lib/buildMasterImportPrompt';
import {
  buildCoverLetterPdfTitle,
  buildCoverLetterPrompt,
} from './lib/buildCoverLetterPrompt';
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
  measureCvPageFit,
} from './lib/printCv';
import type {
  CvLibrary,
  CvMaster,
  CvVersion,
  ResolvedCv,
} from './types/cv';
import './AppShell.css';

type AppMode = 'preview' | 'compare';

const DEFAULT_VERSION_ID = 'fullstack-cv';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openSection, setOpenSection] = useState<SidebarSection | null>(null);
  const [showDataSettings, setShowDataSettings] = useState(false);
  const [showMasterImportPanel, setShowMasterImportPanel] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [coverLetterDraft, setCoverLetterDraft] = useState('');
  const [personalNoteDraft, setPersonalNoteDraft] = useState('');
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
  const [pageFit, setPageFit] = useState<{ status: 'overflow' | 'sparse'; sparePx: number } | null>(
    null,
  );
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
    if (needsOnboarding) {
      return;
    }

    setShowMasterImportPanel(false);
    setShowOnboarding(false);
  }, [needsOnboarding]);

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

  useEffect(() => {
    setCoverLetterDraft(selectedVersion?.coverLetter ?? '');
    setPersonalNoteDraft(selectedVersion?.personalNote ?? '');
    if (selectedVersion?.kind === 'saved') {
      setJobDescription(selectedVersion.jobDescription ?? '');
    }
    if (selectedVersion?.kind !== 'saved') {
      setOpenSection((section) => (section === 'coverLetter' ? null : section));
    }
  }, [
    selectedVersion?.id,
    selectedVersion?.coverLetter,
    selectedVersion?.personalNote,
    selectedVersion?.jobDescription,
    selectedVersion?.kind,
  ]);

  useEffect(() => {
    if (isEditing || isExampleMode) {
      setOpenSection(null);
    }
  }, [isEditing, isExampleMode]);

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
      setPageFit(null);
      return;
    }

    let cancelled = false;

    const measureOverflow = () => {
      if (cancelled) {
        return;
      }

      const { overflows, sparePx } = measureCvPageFit(pageElement);

      if (overflows) {
        setPageFit({ status: 'overflow', sparePx });
      } else if (sparePx > 75) {
        setPageFit({ status: 'sparse', sparePx });
      } else {
        setPageFit(null);
      }
    };

    measureOverflow();

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(pageElement);
    window.addEventListener('resize', measureOverflow);

    void document.fonts.ready.then(() => {
      if (cancelled) {
        return;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(measureOverflow);
      });
    });

    return () => {
      cancelled = true;
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

  useEffect(() => {
    if (!showDataSettings && !showMasterImportPanel && openSection === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (showDataSettings) {
        setShowDataSettings(false);
        return;
      }

      if (showMasterImportPanel) {
        setShowMasterImportPanel(false);
        return;
      }

      setOpenSection(null);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openSection, showDataSettings, showMasterImportPanel]);

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
    setOpenSection(null);
    setActionMessage(null);
    setActionError(null);
  };

  const handleDataSourceChange = (source: CvDataSource) => {
    if (source === dataSource) {
      return;
    }

    if (isEditing) {
      return;
    }

    setDataSource(source);
    setOpenSection(null);
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

  const handleSaveEditAsCopy = async () => {
    if (!draftVersion) {
      return;
    }

    commitText();

    const label = window.prompt(
      'Name for this saved CV:',
      `${draftVersion.label} copy`,
    )?.trim();

    if (!label) {
      return;
    }

    setIsSavingEdits(true);
    setActionError(null);

    try {
      const saved = await importSavedVersion({
        ...versionPayloadForSave(draftVersion),
        label,
      });
      setSelectedVersionId(saved.id);
      setIsEditing(false);
      clearEditHistory();
      setActionMessage(`Saved as copy: "${saved.label}".`);
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : 'Failed to save copy.';
      setActionError(message);
    } finally {
      setIsSavingEdits(false);
    }
  };

  const handleSaveToCurrentVersion = async () => {
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
      setActionMessage(`Saved "${saved.label}".`);
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : 'Failed to save edits.';
      setActionError(message);
    } finally {
      setIsSavingEdits(false);
    }
  };

  const handleUpdateBaseFromEdits = async () => {
    if (!draftVersion) {
      return;
    }

    const confirmed = window.confirm(
      `Update base CV "${draftVersion.label}" in place? This replaces the current base.`,
    );

    if (!confirmed) {
      return;
    }

    await handleSaveToCurrentVersion();
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
      setShowMasterImportPanel(false);
      setShowOnboarding(false);
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
      setShowMasterImportPanel(false);
      setShowOnboarding(false);
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

    const exportFirst = window.confirm(
      'Reset deletes ALL CV data stored in this browser — master, bases, and saved versions.\n\n'
      + 'This cannot be undone. Export a backup first if you might need this data again.\n\n'
      + 'Click OK to reset anyway, or Cancel to go back and export.',
    );

    if (!exportFirst) {
      return;
    }

    const confirmed = window.confirm(
      'Last check: permanently delete everything and restore the example CV?',
    );

    if (!confirmed) {
      return;
    }

    try {
      await resetToExamples();
      setSelectedVersionId(DEFAULT_VERSION_ID);
      setShowMasterImportPanel(false);
      setShowOnboarding(false);
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

    const mainBase = library?.bases.find((base) => base.id === 'fullstack-cv' || base.id === 'main-cv')
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
    if (!aiReply.trim() || isEditing || isExampleMode) {
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

      const trimmedJd = jobDescription.trim();
      const saved = await importSavedVersion({
        ...parsed,
        extends: 'master',
        label: parsed.label || parsed.id,
        ...(trimmedJd ? { jobDescription: trimmedJd } : {}),
      });
      setSelectedVersionId(saved.id);
      setOpenSection(null);
      setAiReply('');
      setActionMessage(
        trimmedJd
          ? `Created saved CV "${saved.label}" (job description stored).`
          : `Created saved CV "${saved.label}".`,
      );
    } catch (applyError) {
      const message = applyError instanceof Error
        ? applyError.message
        : 'Failed to apply AI YAML.';
      setActionError(message);
    }
  };

  const handleCopyCoverLetterPrompt = async () => {
    if (!master || !resolvedCv || !jobDescription.trim()) {
      return;
    }

    setActionError(null);

    try {
      const prompt = buildCoverLetterPrompt({
        master,
        resolvedCv,
        jobDescription,
        versionLabel: selectedVersion?.label,
      });
      await navigator.clipboard.writeText(prompt);
      setActionMessage(
        'Cover letter prompt copied. Paste into ChatGPT or Gemini, then paste the letter below.',
      );
    } catch (copyError) {
      const message = copyError instanceof Error
        ? copyError.message
        : 'Failed to copy cover letter prompt.';
      setActionError(message);
    }
  };

  const handleSaveCoverLetter = async () => {
    if (!selectedVersion || selectedVersion.kind !== 'saved' || isEditing || isExampleMode) {
      return;
    }

    setActionError(null);

    try {
      const nextLetter = coverLetterDraft.trim();
      const nextNote = personalNoteDraft.trim();
      const nextJd = jobDescription.trim();
      const saved = await updateVersion({
        ...selectedVersion,
        coverLetter: nextLetter,
        personalNote: nextNote,
        jobDescription: nextJd,
      });
      setCoverLetterDraft(saved.coverLetter ?? '');
      setPersonalNoteDraft(saved.personalNote ?? '');
      setJobDescription(saved.jobDescription ?? '');
      setActionMessage(`Application text saved on "${saved.label}".`);
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : 'Failed to save cover letter.';
      setActionError(message);
    }
  };

  const handleCopyCoverLetter = async () => {
    if (!coverLetterDraft.trim()) {
      return;
    }

    setActionError(null);

    try {
      await navigator.clipboard.writeText(coverLetterDraft.trim());
      setActionMessage('Cover letter copied.');
    } catch (copyError) {
      const message = copyError instanceof Error
        ? copyError.message
        : 'Failed to copy cover letter.';
      setActionError(message);
    }
  };

  const handleCopyPersonalNote = async () => {
    if (!personalNoteDraft.trim()) {
      return;
    }

    setActionError(null);

    try {
      await navigator.clipboard.writeText(personalNoteDraft.trim());
      setActionMessage('Personal note copied.');
    } catch (copyError) {
      const message = copyError instanceof Error
        ? copyError.message
        : 'Failed to copy personal note.';
      setActionError(message);
    }
  };

  const handlePrintCoverLetter = () => {
    if (!coverLetterDraft.trim()) {
      return;
    }

    if (isEditing) {
      setActionError('Exit Edit mode before printing the cover letter.');
      return;
    }

    const previousTitle = document.title;
    const pdfTitle = buildCoverLetterPdfTitle(
      master?.name ?? 'Applicant',
      selectedVersion?.label ?? 'Role',
    );
    document.title = pdfTitle;
    document.body.classList.add('app-print-cover-letter');

    const cleanup = () => {
      document.title = previousTitle;
      document.body.classList.remove('app-print-cover-letter');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    requestAnimationFrame(() => window.print());
  };

  const handleClearCoverLetter = async () => {
    if (!selectedVersion || selectedVersion.kind !== 'saved' || isEditing || isExampleMode) {
      return;
    }

    setCoverLetterDraft('');

    if (!selectedVersion.coverLetter?.trim()) {
      return;
    }

    setActionError(null);

    try {
      await updateVersion({
        ...selectedVersion,
        coverLetter: '',
      });
      setActionMessage(`Cover letter cleared on "${selectedVersion.label}".`);
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : 'Failed to clear cover letter.';
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
  const isEditingBase = selectedVersion.kind === 'base'
    || library.bases.some((base) => base.id === selectedVersion.id);

  const toolsAvailable = !isExampleMode && !isEditing;
  const coverLetterAvailable = isSavedSelected && toolsAvailable;

  const coverLetterSectionContent = coverLetterAvailable ? (
    <CvCoverLetterPanel
      versionLabel={selectedVersion.label}
      jobDescription={jobDescription}
      letterDraft={coverLetterDraft}
      personalNoteDraft={personalNoteDraft}
      hasSavedLetter={Boolean(selectedVersion.coverLetter?.trim())}
      hasSavedPersonalNote={Boolean(selectedVersion.personalNote?.trim())}
      hasSavedJobDescription={Boolean(selectedVersion.jobDescription?.trim())}
      hasApplicantBrief={Boolean(master.applicantBrief?.trim())}
      onJobDescriptionChange={setJobDescription}
      onLetterDraftChange={setCoverLetterDraft}
      onPersonalNoteDraftChange={setPersonalNoteDraft}
      onCopyPrompt={handleCopyCoverLetterPrompt}
      onSaveLetter={handleSaveCoverLetter}
      onCopyLetter={handleCopyCoverLetter}
      onCopyPersonalNote={handleCopyPersonalNote}
      onPrintLetter={handlePrintCoverLetter}
      onClearLetter={handleClearCoverLetter}
      onClose={() => setOpenSection(null)}
    />
  ) : null;

  const aiTailorSectionContent = toolsAvailable ? (
    <CvAiTailorPanel
      jobDescription={jobDescription}
      aiReply={aiReply}
      onJobDescriptionChange={setJobDescription}
      onAiReplyChange={setAiReply}
      onCopyPrompt={handleCopyAiPrompt}
      onApplyReply={handleApplyAiReply}
      onClose={() => setOpenSection(null)}
    />
  ) : null;

  return (
    <main className="app-shell">
      <CvToolsSidebar
        isOpen={sidebarOpen}
        openSection={openSection}
        isCoverLetterAvailable={coverLetterAvailable}
        areToolsAvailable={toolsAvailable}
        coverLetterUnavailableHint={
          isEditing
            ? 'Exit Edit mode first'
            : isExampleMode
              ? 'Not available on the public template'
              : isSavedSelected
                ? undefined
                : 'Save a copy of this CV first'
        }
        aiTailorUnavailableHint={
          isEditing
            ? 'Exit Edit mode first'
            : isExampleMode
              ? 'Not available on the public template'
              : undefined
        }
        onClose={() => setSidebarOpen(false)}
        onToggleSection={(section) => {
          setOpenSection((current) => (current === section ? null : section));
        }}
        coverLetterContent={coverLetterSectionContent}
        aiTailorContent={aiTailorSectionContent}
      />

      {showDataSettings ? (
        <CvDataSettingsModal
          dataSource={dataSource}
          dataSourceDisabled={isEditing}
          dataActionsDisabled={!canMutateData}
          showResetToExamples={isBrowserBackend}
          onClose={() => setShowDataSettings(false)}
          onDataSourceChange={handleDataSourceChange}
          onExport={handleExportBackup}
          onImportBackupFile={handleImportBackupFile}
          onImportMasterFile={handleImportMasterFile}
          onResetToExamples={handleResetToExamples}
        />
      ) : null}

      <div className="app-main">
        <header className="app-toolbar">
          {!sidebarOpen ? (
            <button
              type="button"
              className="app-button app-button-secondary app-toolbar-sidebar-open"
              onClick={() => setSidebarOpen(true)}
            >
              Tools
            </button>
          ) : null}

          <CvVersionSelect
            bases={library.bases}
            saved={library.saved}
            value={selectedVersionId}
            disabled={isEditing}
            onChange={handleSelectVersion}
          />

          <div className="app-segmented app-segmented-center">
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

          <div className="app-toolbar-actions">
            <button
              type="button"
              className="app-button app-button-secondary app-settings-trigger"
              aria-label="Open data settings"
              title="Data settings"
              onClick={() => setShowDataSettings(true)}
            >
              <TbSettings aria-hidden />
            </button>
            <span
              className="app-toolbar-divider"
              aria-hidden
            />
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
                {isEditingBase ? (
                  <>
                    <button
                      type="button"
                      className="app-button"
                      onClick={() => void handleSaveEditAsCopy()}
                      disabled={isSavingEdits}
                    >
                      {isSavingEdits ? 'Saving…' : 'Save as copy…'}
                    </button>
                    <button
                      type="button"
                      className="app-button app-button-secondary"
                      onClick={() => void handleUpdateBaseFromEdits()}
                      disabled={isSavingEdits}
                    >
                      Update base
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="app-button"
                      onClick={() => void handleSaveToCurrentVersion()}
                      disabled={isSavingEdits}
                    >
                      {isSavingEdits ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="app-button app-button-secondary"
                      onClick={() => void handleSaveEditAsCopy()}
                      disabled={isSavingEdits}
                    >
                      Save as copy…
                    </button>
                  </>
                )}
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
                <CvToolbarMenu
                  label="More CV actions"
                  items={[
                    {
                      id: 'save-copy',
                      label: 'Save copy',
                      disabled: isExampleMode,
                      onSelect: () => void handleSaveCopy(),
                    },
                    {
                      id: 'save-as-base',
                      label: 'Save as base…',
                      disabled: isExampleMode,
                      onSelect: () => void handleSetAsBase(),
                    },
                    {
                      id: 'reload',
                      label: 'Reload',
                      onSelect: () => void reloadLibrary(),
                    },
                    ...(isSavedSelected
                      ? [{
                          id: 'delete',
                          label: 'Delete saved CV',
                          isDanger: true,
                          disabled: isExampleMode,
                          onSelect: () => void handleDeleteSaved(),
                        }]
                      : []),
                  ]}
                />
                <button
                  type="button"
                  className="app-button"
                  onClick={handleDownloadPdf}
                >
                  Download CV PDF
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
          {isEditingBase
            ? `Editing base "${selectedVersion.label}". Save as copy creates a new version; Update base overwrites this base profile.`
            : `Editing "${selectedVersion.label}". Save updates this version. Save as copy creates a separate version.`}
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

      {pageFit?.status === 'overflow' && mode === 'preview' ? (
        <p
          className="app-warning"
          role="status"
        >
          Content overflows the page. Shorten the summary or bullets, or hide lower-priority items.
        </p>
      ) : null}

      {pageFit?.status === 'sparse' && mode === 'preview' ? (
        <p
          className="app-info-banner"
          role="status"
        >
          Page looks under-filled (~{Math.round(pageFit.sparePx)}px spare). Add back a relevant
          bullet, project, or richer wording before sending this CV.
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

      <div
        className={
          mode === 'compare' && !isEditing
            ? 'app-preview app-preview-print-source'
            : 'app-preview'
        }
        aria-hidden={mode === 'compare' && !isEditing}
      >
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
        <CoverLetterDocument text={coverLetterDraft} />
      </div>

      {mode === 'compare' && !isEditing ? (
        <CvCompareView
          baseCv={baseResolvedCv}
          compareCv={resolvedCv}
          baseLabel={compareBase?.label ?? 'Base CV'}
          diffs={diffs}
        />
      ) : null}

      <CvSiteFooter isBrowserBackend={isBrowserBackend} />
      </div>
    </main>
  );
};
