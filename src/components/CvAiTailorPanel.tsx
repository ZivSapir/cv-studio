import { useState } from 'react';
import { TbKey, TbX } from 'react-icons/tb';

type CvAiTailorPanelProps = {
  jobDescription: string;
  aiReply: string;
  disabled?: boolean;
  onJobDescriptionChange: (value: string) => void;
  onAiReplyChange: (value: string) => void;
  onCopyPrompt: () => Promise<void>;
  onApplyReply: () => Promise<void>;
  onClose: () => void;
  hasGeminiKey: boolean;
  isGenerating: boolean;
  onOpenGeminiKeySettings: () => void;
  onGenerateWithGemini: () => Promise<void>;
  canRefine: boolean;
  refineInstruction: string;
  isRefining: boolean;
  pageFitHint?: { status: 'overflow' | 'sparse'; sparePx: number } | null;
  onRefineInstructionChange: (value: string) => void;
  onRefineWithGemini: () => Promise<void>;
};

type TailorTab = 'copy' | 'gemini';

export const CvAiTailorPanel = ({
  jobDescription,
  aiReply,
  disabled,
  onJobDescriptionChange,
  onAiReplyChange,
  onCopyPrompt,
  onApplyReply,
  onClose,
  hasGeminiKey,
  isGenerating,
  onOpenGeminiKeySettings,
  onGenerateWithGemini,
  canRefine,
  refineInstruction,
  isRefining,
  pageFitHint,
  onRefineInstructionChange,
  onRefineWithGemini,
}: CvAiTailorPanelProps) => {
  const [tab, setTab] = useState<TailorTab>('copy');

  return (
    <section className="app-ai-panel">
      <div className="app-ai-panel-header">
        <h2 className="app-ai-panel-title">Tailor with AI</h2>
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

      <label className="app-ai-field">
        <span>Job description</span>
        <textarea
          rows={5}
          value={jobDescription}
          disabled={disabled}
          onChange={(event) => onJobDescriptionChange(event.target.value)}
          placeholder="Paste the job description here"
        />
        <span className="app-ai-field-hint">
          Shared with cover letter. Stored on the saved CV when you apply.
        </span>
      </label>

      {tab === 'copy' ? (
        <>
          <p className="app-ai-panel-copy">
            Copy a prompt to ChatGPT or Gemini in your browser, then paste the YAML reply here.
            Nothing is sent to our servers.
          </p>
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
        </>
      ) : (
        <>
          <p className="app-ai-panel-copy">
            Generates a saved CV directly from your Gemini API key — no copy/paste. Your key is
            stored only in this browser and sent straight to Google.
          </p>
          <div className="app-toolbar-actions app-toolbar-actions-inline app-toolbar-actions-gemini">
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

          {canRefine ? (
            <>
              <label className="app-ai-field">
                <span>Request a change</span>
                <textarea
                  rows={3}
                  value={refineInstruction}
                  disabled={disabled || isRefining}
                  onChange={(event) => onRefineInstructionChange(event.target.value)}
                  placeholder='e.g. "Shorten the summary" or "lead with the Acme project instead"'
                />
              </label>
              {pageFitHint ? (
                <button
                  type="button"
                  className="app-ai-fit-hint"
                  disabled={disabled || isRefining}
                  onClick={() =>
                    onRefineInstructionChange(
                      pageFitHint.status === 'overflow'
                        ? `Tighten wording and hide a lower-priority bullet or project — the page is overflowing by about ${Math.round(pageFitHint.sparePx)}px.`
                        : `Add back a relevant hidden bullet or expand wording — the page has about ${Math.round(pageFitHint.sparePx)}px of empty space.`,
                    )
                  }
                >
                  {pageFitHint.status === 'overflow'
                    ? 'Use suggestion: tighten to fit the page'
                    : 'Use suggestion: fill out the page more'}
                </button>
              ) : null}
              <div className="app-toolbar-actions app-toolbar-actions-inline">
                <button
                  type="button"
                  className="app-button app-button-secondary"
                  disabled={disabled || !refineInstruction.trim() || isRefining}
                  onClick={() => void onRefineWithGemini()}
                >
                  {isRefining ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </section>
  );
};
