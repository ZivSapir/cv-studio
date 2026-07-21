type CvMasterImportPanelProps = {
  cvText: string;
  aiReply: string;
  disabled?: boolean;
  onCvTextChange: (value: string) => void;
  onAiReplyChange: (value: string) => void;
  onCopyPrompt: () => Promise<void>;
  onApplyReply: () => Promise<void>;
  onClose: () => void;
};

export const CvMasterImportPanel = ({
  cvText,
  aiReply,
  disabled,
  onCvTextChange,
  onAiReplyChange,
  onCopyPrompt,
  onApplyReply,
  onClose,
}: CvMasterImportPanelProps) => {
  return (
    <section className="app-ai-panel">
      <div className="app-ai-panel-header">
        <h2 className="app-ai-panel-title">Import existing CV with AI</h2>
        <button
          type="button"
          className="app-button app-button-secondary app-button-small"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <p className="app-ai-panel-copy">
        Paste your current CV text, copy a prompt to ChatGPT or Gemini, then paste the master
        YAML reply here. Nothing is sent to our servers.
      </p>
      <label className="app-ai-field">
        <span>Your existing CV text</span>
        <textarea
          rows={6}
          value={cvText}
          disabled={disabled}
          onChange={(event) => onCvTextChange(event.target.value)}
          placeholder="Paste from LinkedIn, Word, a PDF export, or any plain-text CV"
        />
      </label>
      <div className="app-toolbar-actions app-toolbar-actions-inline">
        <button
          type="button"
          className="app-button"
          disabled={disabled || !cvText.trim()}
          onClick={() => void onCopyPrompt()}
        >
          Copy prompt
        </button>
      </div>
      <label className="app-ai-field">
        <span>Paste AI master YAML reply</span>
        <textarea
          rows={10}
          value={aiReply}
          disabled={disabled}
          onChange={(event) => onAiReplyChange(event.target.value)}
          placeholder="Paste the master YAML the model returned (starts with name:)"
        />
      </label>
      <div className="app-toolbar-actions app-toolbar-actions-inline">
        <button
          type="button"
          className="app-button app-button-secondary"
          disabled={disabled || !aiReply.trim()}
          onClick={() => void onApplyReply()}
        >
          Apply as master CV
        </button>
      </div>
    </section>
  );
};
