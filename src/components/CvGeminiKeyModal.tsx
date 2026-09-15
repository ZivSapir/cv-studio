import { useState } from 'react';
import { TbX } from 'react-icons/tb';

type CvGeminiKeyModalProps = {
  hasKey: boolean;
  onSave: (apiKey: string) => void;
  onRemove: () => void;
  onClose: () => void;
};

export const CvGeminiKeyModal = ({
  hasKey,
  onSave,
  onRemove,
  onClose,
}: CvGeminiKeyModalProps) => {
  const [draft, setDraft] = useState('');

  return (
    <div
      className="app-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="app-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gemini-key-title"
      >
        <div className="app-modal-header">
          <div>
            <h2
              id="gemini-key-title"
              className="app-modal-title"
            >
              Gemini API key
            </h2>
            <p className="app-modal-copy">
              Stored only in this browser (localStorage) and sent directly to Google when you
              generate — never to any server of ours. Get a free key at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
              >
                aistudio.google.com/apikey
              </a>
              .
            </p>
          </div>
          <button
            type="button"
            className="app-sidebar-close"
            aria-label="Close Gemini key settings"
            onClick={onClose}
          >
            <TbX aria-hidden />
          </button>
        </div>

        <div className="app-modal-section">
          <label className="app-ai-field">
            <span>{hasKey ? 'Replace key' : 'API key'}</span>
            <input
              type="password"
              value={draft}
              autoComplete="off"
              placeholder={hasKey ? 'Key is saved — paste a new one to replace it' : 'Paste your Gemini API key'}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <div className="app-toolbar-actions app-toolbar-actions-inline">
            <button
              type="button"
              className="app-button"
              disabled={!draft.trim()}
              onClick={() => {
                onSave(draft.trim());
                setDraft('');
                onClose();
              }}
            >
              Save
            </button>
            {hasKey ? (
              <button
                type="button"
                className="app-button app-button-secondary"
                onClick={() => {
                  onRemove();
                  onClose();
                }}
              >
                Remove key
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};
