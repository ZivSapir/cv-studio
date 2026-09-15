import { useState } from 'react';
import { TbKey, TbX } from 'react-icons/tb';

type CvCoverLetterPanelProps = {
  versionLabel: string;
  jobDescription: string;
  letterDraft: string;
  hasSavedLetter: boolean;
  hasApplicantBrief: boolean;
  canSave: boolean;
  disabled?: boolean;
  personalNoteDraft: string;
  hasSavedPersonalNote: boolean;
  hasSavedJobDescription: boolean;
  onPersonalNoteDraftChange: (value: string) => void;
  onCopyPersonalNote: () => Promise<void>;
  onJobDescriptionChange: (value: string) => void;
  onLetterDraftChange: (value: string) => void;
  onCopyPrompt: () => Promise<void>;
  onSaveLetter: () => Promise<void>;
  onCopyLetter: () => Promise<void>;
  onPrintLetter: () => void;
  onClearLetter: () => Promise<void>;
  onClose: () => void;
  hasGeminiKey: boolean;
  isGenerating: boolean;
  onOpenGeminiKeySettings: () => void;
  onGenerateWithGemini: () => Promise<void>;
};

type LetterTab = 'copy' | 'gemini';

export const CvCoverLetterPanel = ({
  versionLabel,
  jobDescription,
  letterDraft,
  personalNoteDraft,
  hasSavedLetter,
  hasSavedPersonalNote,
  hasSavedJobDescription,
  hasApplicantBrief,
  canSave,
  disabled,
  onJobDescriptionChange,
  onLetterDraftChange,
  onPersonalNoteDraftChange,
  onCopyPrompt,
  onSaveLetter,
  onCopyLetter,
  onCopyPersonalNote,
  onPrintLetter,
  onClearLetter,
  onClose,
  hasGeminiKey,
  isGenerating,
  onOpenGeminiKeySettings,
  onGenerateWithGemini,
}: CvCoverLetterPanelProps) => {
  const [tab, setTab] = useState<LetterTab>('copy');

  return (
    <section className="app-ai-panel">
      <div className="app-ai-panel-header">
        <h2 className="app-ai-panel-title">
          Cover letter
          {hasSavedLetter || hasSavedPersonalNote ? (
            <span className="app-cover-letter-badge"> saved</span>
          ) : null}
        </h2>
        <button
          type="button"
          className="app-panel-close"
          onClick={onClose}
        >
          <TbX aria-hidden />
          Close
        </button>
      </div>

      <div className="app-segmented">
        <button
          type="button"
          className={tab === 'copy' ? 'app-segment app-segment-active' : 'app-segment'}
          onClick={() => setTab('copy')}
        >
          Copy prompt
        </button>
        <button
          type="button"
          className={tab === 'gemini' ? 'app-segment app-segment-active' : 'app-segment'}
          onClick={() => setTab('gemini')}
        >
          Generate with Gemini
        </button>
      </div>

      <p className="app-ai-panel-copy">
        {canSave ? (
          <>
            Optional for this saved CV ({versionLabel}). If a job description is stored on this
            CV, it loads here automatically.
          </>
        ) : (
          <>
            Quick cover letter using {versionLabel} as the reference CV. This is not saved
            anywhere — copy the letter or download the PDF before you switch CVs or close the
            tab.
          </>
        )}
        {' '}
        {tab === 'copy'
          ? 'Copy a prompt to ChatGPT or Gemini, then paste the letter back below. Nothing is sent to our servers.'
          : 'Generates the letter directly from your Gemini API key — no copy/paste. Your key is stored only in this browser and sent straight to Google.'}
        {hasApplicantBrief
          ? ' Your master applicantBrief is included in the prompt.'
          : null}
      </p>
      <label className="app-ai-field">
        <span>Job description</span>
        <textarea
          rows={5}
          value={jobDescription}
          disabled={disabled}
          onChange={(event) => onJobDescriptionChange(event.target.value)}
          placeholder="Paste the job description here (saved with this CV)"
        />
        <span className="app-ai-field-hint">
          {canSave
            ? (hasSavedJobDescription
              ? 'Loaded from this saved CV. Shared with AI tailor; Save keeps it on this version.'
              : 'Saved on this CV when you Save or Apply a tailored YAML. Shared with AI tailor.')
            : 'Not saved anywhere — this is scratch text for this session only.'}
        </span>
      </label>
      {tab === 'copy' ? (
        <div className="app-toolbar-actions app-toolbar-actions-inline">
          <button
            type="button"
            className="app-button"
            disabled={disabled || !jobDescription.trim()}
            onClick={() => void onCopyPrompt()}
          >
            Copy prompt
          </button>
        </div>
      ) : (
        <div className="app-toolbar-actions app-toolbar-actions-inline">
          {hasGeminiKey ? (
            <button
              type="button"
              className="app-button"
              disabled={disabled || !jobDescription.trim() || isGenerating}
              onClick={() => void onGenerateWithGemini()}
            >
              {isGenerating ? 'Generating…' : 'Generate with Gemini'}
            </button>
          ) : (
            <button
              type="button"
              className="app-button"
              onClick={onOpenGeminiKeySettings}
            >
              <TbKey aria-hidden />
              Add Gemini key
            </button>
          )}
          {hasGeminiKey ? (
            <button
              type="button"
              className="app-button app-button-secondary"
              onClick={onOpenGeminiKeySettings}
            >
              Manage key
            </button>
          ) : null}
        </div>
      )}
      <label className="app-ai-field">
        <span>Cover letter</span>
        <textarea
          rows={12}
          value={letterDraft}
          disabled={disabled}
          onChange={(event) => onLetterDraftChange(event.target.value)}
          placeholder="Paste or write the cover letter here"
        />
      </label>
      <div className="app-toolbar-actions app-toolbar-actions-inline">
        {canSave ? (
          <button
            type="button"
            className="app-button"
            disabled={
              disabled
              || (
                !letterDraft.trim()
                && !personalNoteDraft.trim()
                && !jobDescription.trim()
                && !hasSavedLetter
                && !hasSavedPersonalNote
                && !hasSavedJobDescription
              )
            }
            onClick={() => void onSaveLetter()}
          >
            Save to this CV
          </button>
        ) : null}
        <button
          type="button"
          className="app-button app-button-secondary"
          disabled={disabled || !letterDraft.trim()}
          onClick={() => void onCopyLetter()}
        >
          Copy letter
        </button>
        <button
          type="button"
          className="app-button app-button-secondary"
          disabled={disabled || !letterDraft.trim()}
          onClick={onPrintLetter}
        >
          Download Cover Letter PDF
        </button>
        <button
          type="button"
          className="app-button app-button-danger"
          disabled={disabled || (!letterDraft.trim() && !hasSavedLetter)}
          onClick={() => void onClearLetter()}
        >
          Clear letter
        </button>
      </div>
      <label className="app-ai-field app-ai-field-personal-note">
        <span>Personal note (short)</span>
        <textarea
          rows={4}
          value={personalNoteDraft}
          disabled={disabled}
          onChange={(event) => onPersonalNoteDraftChange(event.target.value)}
          placeholder="2-4 sentences for email, LinkedIn, or an application text box"
        />
      </label>
      <div className="app-toolbar-actions app-toolbar-actions-inline">
        <button
          type="button"
          className="app-button app-button-secondary"
          disabled={disabled || !personalNoteDraft.trim()}
          onClick={() => void onCopyPersonalNote()}
        >
          Copy note
        </button>
      </div>
    </section>
  );
};
