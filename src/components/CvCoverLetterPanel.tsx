type CvCoverLetterPanelProps = {
  versionLabel: string;
  jobDescription: string;
  letterDraft: string;
  hasSavedLetter: boolean;
  hasApplicantBrief: boolean;
  disabled?: boolean;
  personalNoteDraft: string;
  hasSavedPersonalNote: boolean;
  onPersonalNoteDraftChange: (value: string) => void;
  onCopyPersonalNote: () => Promise<void>;
  onJobDescriptionChange: (value: string) => void;
  onLetterDraftChange: (value: string) => void;
  onCopyPrompt: () => Promise<void>;
  onSaveLetter: () => Promise<void>;
  onCopyLetter: () => Promise<void>;
  onPrintLetter: () => void;
  onClearLetter: () => Promise<void>;
};

export const CvCoverLetterPanel = ({
  versionLabel,
  jobDescription,
  letterDraft,
  personalNoteDraft,
  hasSavedLetter,
  hasSavedPersonalNote,
  hasApplicantBrief,
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
}: CvCoverLetterPanelProps) => {
  return (
    <section className="app-ai-panel">
      <h2 className="app-ai-panel-title">
        Cover letter
        {hasSavedLetter || hasSavedPersonalNote ? (
          <span className="app-cover-letter-badge"> saved</span>
        ) : null}
      </h2>
      <p className="app-ai-panel-copy">
        Optional for this saved CV ({versionLabel}). Copy a prompt to ChatGPT or Gemini,
        paste the letter back, edit, then save. Nothing is sent to our servers.
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
          placeholder="Paste the job description here"
        />
      </label>
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
        <button
          type="button"
          className="app-button"
          disabled={
            disabled
            || (
              !letterDraft.trim()
              && !personalNoteDraft.trim()
              && !hasSavedLetter
              && !hasSavedPersonalNote
            )
          }
          onClick={() => void onSaveLetter()}
        >
          Save to this CV
        </button>
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
          Print / PDF
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
          placeholder="2–4 sentences for email, LinkedIn, or an application text box"
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
