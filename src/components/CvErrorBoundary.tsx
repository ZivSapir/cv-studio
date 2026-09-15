import { Component, type ErrorInfo, type ReactNode } from 'react';
import { DB_NAME } from '../lib/cvRepository/browserStore';

type CvErrorBoundaryProps = {
  children: ReactNode;
};

type CvErrorBoundaryState = {
  error: Error | null;
  isClearing: boolean;
};

/**
 * Last-resort catch for render-time crashes (e.g. a malformed CV import that slipped past
 * validation). Without this, an uncaught error blanks the page with no way back except manually
 * clearing browser storage — this keeps a Reload path and reassures the user their stored data
 * (IndexedDB / local YAML files) was not touched by the crash itself.
 */
export class CvErrorBoundary extends Component<CvErrorBoundaryProps, CvErrorBoundaryState> {
  state: CvErrorBoundaryState = { error: null, isClearing: false };

  static getDerivedStateFromError(error: Error): Pick<CvErrorBoundaryState, 'error'> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('CV Studio crashed:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleClearBrowserData = (): void => {
    const confirmed = window.confirm(
      'This permanently deletes all CV data stored in this browser (master CV, bases, saved '
      + 'versions) and cannot be undone. Only do this if reloading did not fix the problem and '
      + 'you have a backup, or do not mind starting over.\n\n'
      + 'Delete stored CV data and reload?',
    );

    if (!confirmed) {
      return;
    }

    this.setState({ isClearing: true });
    const request = indexedDB.deleteDatabase(DB_NAME);
    const reload = () => window.location.reload();
    request.onsuccess = reload;
    request.onerror = reload;
    request.onblocked = reload;
  };

  render(): ReactNode {
    const { error, isClearing } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <main className="app-shell">
        <div className="app-crash">
          <h1 className="app-crash-title">Something went wrong</h1>
          <p className="app-crash-copy">
            CV Studio hit an unexpected error and could not keep rendering. Nothing stored in
            this browser (or on disk in local mode) was touched — reloading usually recovers.
          </p>
          <p
            className="app-error-banner"
            role="alert"
          >
            {error.message}
          </p>
          <div className="app-toolbar-actions-inline">
            <button
              type="button"
              className="app-button"
              onClick={this.handleReload}
            >
              Reload
            </button>
          </div>
          <p className="app-crash-hint">
            If reloading keeps failing, the most likely cause is malformed CV data (e.g. an
            imported file). In local dev mode, check the YAML files under{' '}
            <code>data/</code>. In the browser-storage web app, you can clear the stored CV data
            as a last resort — only do this if you have exported a backup, since it cannot be
            undone.
          </p>
          <div className="app-toolbar-actions-inline">
            <button
              type="button"
              className="app-button app-button-secondary"
              onClick={this.handleClearBrowserData}
              disabled={isClearing}
            >
              {isClearing ? 'Clearing…' : 'Clear stored CV data (browser mode) & reload'}
            </button>
          </div>
        </div>
      </main>
    );
  }
}
