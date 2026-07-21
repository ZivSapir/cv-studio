type CvGetStartedPanelProps = {
  onStartWizard: () => void;
  onImportMaster: () => void;
  onImportBackup: () => void;
};

export const CvGetStartedPanel = ({
  onStartWizard,
  onImportMaster,
  onImportBackup,
}: CvGetStartedPanelProps) => {
  return (
    <section className="app-get-started">
      <h2 className="app-get-started-title">Create your CV</h2>
      <p className="app-get-started-copy">
        You are viewing placeholder data. Add your real CV to start tailoring, editing, and exporting.
      </p>
      <div className="app-get-started-actions">
        <button
          type="button"
          className="app-button"
          onClick={onStartWizard}
        >
          Start guided setup
        </button>
        <button
          type="button"
          className="app-button app-button-secondary"
          onClick={onImportMaster}
        >
          Import master YAML
        </button>
        <button
          type="button"
          className="app-button app-button-secondary"
          onClick={onImportBackup}
        >
          Import backup
        </button>
      </div>
    </section>
  );
};
