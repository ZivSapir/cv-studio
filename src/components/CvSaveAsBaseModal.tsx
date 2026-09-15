import { useState } from 'react';
import { TbX } from 'react-icons/tb';
import type { CvVersion } from '../types/cv';

type SaveAsBaseMode = 'create' | 'replace';

type CvSaveAsBaseModalProps = {
  sourceLabel: string;
  bases: CvVersion[];
  onCreate: (label: string) => void;
  onReplace: (targetBaseId: string) => void;
  onClose: () => void;
};

export const CvSaveAsBaseModal = ({
  sourceLabel,
  bases,
  onCreate,
  onReplace,
  onClose,
}: CvSaveAsBaseModalProps) => {
  const [mode, setMode] = useState<SaveAsBaseMode>('create');
  const [label, setLabel] = useState(sourceLabel);
  const [targetBaseId, setTargetBaseId] = useState(bases[0]?.id ?? '');

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
        aria-labelledby="save-as-base-title"
      >
        <div className="app-modal-header">
          <div>
            <h2
              id="save-as-base-title"
              className="app-modal-title"
            >
              Save "{sourceLabel}" as a base CV
            </h2>
            <p className="app-modal-copy">
              Base CVs are the starting points other tailored versions compare against.
            </p>
          </div>
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
          <div className="app-settings-segmented">
            <button
              type="button"
              className={
                mode === 'create'
                  ? 'app-settings-segment app-settings-segment-active'
                  : 'app-settings-segment'
              }
              onClick={() => setMode('create')}
            >
              Create new
            </button>
            <button
              type="button"
              className={
                mode === 'replace'
                  ? 'app-settings-segment app-settings-segment-active'
                  : 'app-settings-segment'
              }
              disabled={bases.length === 0}
              onClick={() => setMode('replace')}
            >
              Replace existing
            </button>
          </div>
        </div>

        {mode === 'create' ? (
          <div className="app-modal-section">
            <label className="app-ai-field">
              <span>Name for the new base CV</span>
              <input
                type="text"
                value={label}
                autoFocus
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
            <div className="app-toolbar-actions app-toolbar-actions-inline">
              <button
                type="button"
                className="app-button"
                disabled={!label.trim()}
                onClick={() => onCreate(label.trim())}
              >
                Create base
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
        ) : (
          <div className="app-modal-section">
            <span className="app-label">Base to replace</span>
            <ul className="app-radio-list">
              {bases.map((base) => (
                <li key={base.id}>
                  <label>
                    <input
                      type="radio"
                      name="target-base"
                      value={base.id}
                      checked={targetBaseId === base.id}
                      onChange={() => setTargetBaseId(base.id)}
                    />
                    {base.label}
                  </label>
                </li>
              ))}
            </ul>
            <p className="app-modal-copy">
              This overwrites the selected base with "{sourceLabel}" and cannot be undone.
            </p>
            <div className="app-toolbar-actions app-toolbar-actions-inline">
              <button
                type="button"
                className="app-button app-button-danger"
                disabled={!targetBaseId}
                onClick={() => onReplace(targetBaseId)}
              >
                Replace base
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
        )}
      </section>
    </div>
  );
};
