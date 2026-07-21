type CvBackupControlsProps = {
  disabled?: boolean;
  showResetToExamples?: boolean;
  onExport: () => Promise<void>;
  onImportBackupFile: (file: File) => Promise<void>;
  onImportMasterFile: (file: File) => Promise<void>;
  onResetToExamples: () => Promise<void>;
};

export const CvBackupControls = ({
  disabled,
  showResetToExamples,
  onExport,
  onImportBackupFile,
  onImportMasterFile,
  onResetToExamples,
}: CvBackupControlsProps) => {
  return (
    <div className="app-toolbar-group">
      <span className="app-label">Data files</span>
      <div className="app-toolbar-actions app-toolbar-actions-inline">
        <button
          type="button"
          className="app-button app-button-secondary"
          disabled={disabled}
          onClick={() => void onExport()}
        >
          Export backup
        </button>
        <label className={disabled ? 'app-file-button app-file-button-disabled' : 'app-file-button'}>
          Import backup
          <input
            type="file"
            accept="application/json,.json"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) {
                void onImportBackupFile(file);
              }
            }}
          />
        </label>
        <label className={disabled ? 'app-file-button app-file-button-disabled' : 'app-file-button'}>
          Import master YAML
          <input
            type="file"
            accept=".yaml,.yml,text/yaml"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) {
                void onImportMasterFile(file);
              }
            }}
          />
        </label>
        {showResetToExamples ? (
          <button
            type="button"
            className="app-button app-button-danger"
            disabled={disabled}
            title="Permanently deletes all browser CV data. Export a backup first."
            onClick={() => void onResetToExamples()}
          >
            Reset to examples…
          </button>
        ) : null}
      </div>
    </div>
  );
};
