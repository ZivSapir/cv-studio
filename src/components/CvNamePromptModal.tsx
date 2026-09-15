import { useState } from 'react';
import { TbX } from 'react-icons/tb';

type CvNamePromptModalProps = {
  title: string;
  fieldLabel: string;
  defaultValue: string;
  confirmLabel: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export const CvNamePromptModal = ({
  title,
  fieldLabel,
  defaultValue,
  confirmLabel,
  onConfirm,
  onClose,
}: CvNamePromptModalProps) => {
  const [value, setValue] = useState(defaultValue);

  const submit = () => {
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    onConfirm(trimmed);
  };

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
        aria-labelledby="name-prompt-title"
      >
        <div className="app-modal-header">
          <h2
            id="name-prompt-title"
            className="app-modal-title"
          >
            {title}
          </h2>
          <button
            type="button"
            className="app-sidebar-close"
            aria-label="Close"
            onClick={onClose}
          >
            <TbX aria-hidden />
          </button>
        </div>

        <div className="app-modal-section">
          <label className="app-ai-field">
            <span>{fieldLabel}</span>
            <input
              type="text"
              value={value}
              autoFocus
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submit();
                }
              }}
            />
          </label>
          <div className="app-toolbar-actions app-toolbar-actions-inline">
            <button
              type="button"
              className="app-button"
              disabled={!value.trim()}
              onClick={submit}
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              className="app-button app-button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
