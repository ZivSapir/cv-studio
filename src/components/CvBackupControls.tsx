export type CvFolderSyncControls = {
  folderName: string | null;
  onConnect: () => Promise<void>;
  onSync: () => Promise<void>;
  onDisconnect: () => Promise<void>;
};

type CvBackupControlsProps = {
  disabled?: boolean;
  folderSync?: CvFolderSyncControls;
  showResetToExamples?: boolean;
  onExport: () => Promise<void>;
  onImportBackupFile: (file: File) => Promise<void>;
  onImportMasterFile: (file: File) => Promise<void>;
  onResetToExamples: () => Promise<void>;
};

export const CvBackupControls = ({
  disabled,
  folderSync,
  showResetToExamples,
  onExport,
  onImportBackupFile,
  onImportMasterFile,
  onResetToExamples,
}: CvBackupControlsProps) => {
  return (
    <div className="app-toolbar-group">
      {folderSync ? (
        <>
          <span className="app-label">Local data folder</span>
          <div className="app-toolbar-actions app-toolbar-actions-inline">
            {folderSync.folderName ? (
              <>
                <button
                  type="button"
                  className="app-button app-button-secondary"
                  disabled={disabled}
                  title="Replaces CVs in this browser with the files in the connected folder."
                  onClick={() => void folderSync.onSync()}
                >
                  Sync from &quot;{folderSync.folderName}&quot;
                </button>
                <button
                  type="button"
                  className="app-button app-button-secondary"
                  disabled={disabled}
                  onClick={() => void folderSync.onDisconnect()}
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                type="button"
                className="app-button app-button-secondary"
                disabled={disabled}
                title="Pick the data folder of your cv-studio project. Files are read in your browser and never uploaded."
                onClick={() => void folderSync.onConnect()}
              >
                Connect data folder
              </button>
            )}
          </div>
        </>
      ) : null}
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
