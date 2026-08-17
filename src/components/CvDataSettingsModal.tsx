import { TbX } from 'react-icons/tb';
import type { CvDataSource } from '../lib/loadCvData';
import { CvBackupControls } from './CvBackupControls';

type CvDataSettingsModalProps = {
  dataSource: CvDataSource;
  dataSourceDisabled?: boolean;
  dataActionsDisabled?: boolean;
  showResetToExamples: boolean;
  onClose: () => void;
  onDataSourceChange: (source: CvDataSource) => void;
  onExport: () => Promise<void>;
  onImportBackupFile: (file: File) => Promise<void>;
  onImportMasterFile: (file: File) => Promise<void>;
  onResetToExamples: () => Promise<void>;
};

export const CvDataSettingsModal = ({
  dataSource,
  dataSourceDisabled,
  dataActionsDisabled,
  showResetToExamples,
  onClose,
  onDataSourceChange,
  onExport,
  onImportBackupFile,
  onImportMasterFile,
  onResetToExamples,
}: CvDataSettingsModalProps) => {
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
        aria-labelledby="data-settings-title"
      >
        <div className="app-modal-header">
          <div>
            <h2
              id="data-settings-title"
              className="app-modal-title"
            >
              Data settings
            </h2>
            <p className="app-modal-copy">
              Choose the data source and manage local backups.
            </p>
          </div>
          <button
            type="button"
            className="app-sidebar-close"
            aria-label="Close data settings"
            onClick={onClose}
          >
            <TbX aria-hidden />
          </button>
        </div>

        <div className="app-modal-section">
          <span className="app-label">Data source</span>
          <div className="app-settings-segmented">
            <button
              type="button"
              className={
                dataSource === 'local'
                  ? 'app-settings-segment app-settings-segment-active'
                  : 'app-settings-segment'
              }
              disabled={dataSourceDisabled}
              onClick={() => onDataSourceChange('local')}
            >
              My CV
            </button>
            <button
              type="button"
              className={
                dataSource === 'example'
                  ? 'app-settings-segment app-settings-segment-active'
                  : 'app-settings-segment'
              }
              disabled={dataSourceDisabled}
              onClick={() => onDataSourceChange('example')}
            >
              Public template
            </button>
          </div>
        </div>

        <div className="app-modal-section">
          <CvBackupControls
            disabled={dataActionsDisabled}
            showResetToExamples={showResetToExamples}
            onExport={onExport}
            onImportBackupFile={onImportBackupFile}
            onImportMasterFile={onImportMasterFile}
            onResetToExamples={onResetToExamples}
          />
        </div>
      </section>
    </div>
  );
};
