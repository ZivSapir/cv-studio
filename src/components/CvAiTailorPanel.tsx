type CvAiTailorPanelProps = {
  jobDescription: string;
  aiReply: string;
  disabled?: boolean;
  onJobDescriptionChange: (value: string) => void;
  onAiReplyChange: (value: string) => void;
  onCopyPrompt: () => Promise<void>;
  onApplyReply: () => Promise<void>;
};

export const CvAiTailorPanel = ({
  jobDescription,
  aiReply,
  disabled,
  onJobDescriptionChange,
  onAiReplyChange,
  onCopyPrompt,
  onApplyReply,
}: CvAiTailorPanelProps) => {
  return (
    <section className="app-ai-panel">
      <h2 className="app-ai-panel-title">Tailor with AI (bring your own)</h2>
      <p className="app-ai-panel-copy">
        Copy a prompt to ChatGPT or Gemini in your browser, then paste the YAML reply here.
        Nothing is sent to our servers.
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
        <span>Paste AI YAML reply</span>
        <textarea
          rows={8}
          value={aiReply}
          disabled={disabled}
          onChange={(event) => onAiReplyChange(event.target.value)}
          placeholder="Paste the YAML the model returned"
        />
      </label>
      <div className="app-toolbar-actions app-toolbar-actions-inline">
        <button
          type="button"
          className="app-button app-button-secondary"
          disabled={disabled || !aiReply.trim()}
          onClick={() => void onApplyReply()}
        >
          Apply as saved CV
        </button>
      </div>
    </section>
  );
};
