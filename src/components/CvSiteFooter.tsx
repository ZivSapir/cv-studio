type CvSiteFooterProps = {
  isBrowserBackend: boolean;
};

const GITHUB_REPO_URL = 'https://github.com/ZivSapir/cv-studio';
const LICENSE_URL = 'https://github.com/ZivSapir/cv-studio/blob/main/LICENSE';

export const CvSiteFooter = ({
  isBrowserBackend,
}: CvSiteFooterProps) => {
  return (
    <footer className="app-site-footer">
      <section className="app-site-footer-section">
        <h2 className="app-site-footer-title">About CV Studio</h2>
        <p className="app-site-footer-lead">
          A local-first CV editor: one YAML source of truth, base profiles, job-specific
          versions, A4 preview, and PDF export — without accounts or cloud storage.
        </p>
        <ul className="app-site-footer-list">
          <li>
            <strong>YAML source of truth</strong> — master facts once; versions use
            lightweight overrides instead of duplicating whole files.
          </li>
          <li>
            <strong>Master → base → saved</strong> — e.g. a Frontend base profile plus
            per-job saved tweaks (headline, summary, hidden bullets, reorder).
          </li>
          <li>
            <strong>Bring your own AI</strong> — copy a structured prompt to ChatGPT or
            Gemini; paste the YAML reply back. No API keys or LLM calls from this app.
          </li>
          <li>
            <strong>A4-first</strong> — live preview and edit with one-page layout in mind.
          </li>
        </ul>
      </section>

      <section className="app-site-footer-section">
        <h3 className="app-site-footer-subtitle">Your data stays yours</h3>
        {isBrowserBackend ? (
          <p>
            On this website, your CV lives in <strong>your browser only</strong> (IndexedDB).
            It is not uploaded to our servers, and the site owner cannot see it. Other visitors
            see the public example until they add their own data. Use <strong>Export backup</strong> regularly.
          </p>
        ) : (
          <p>
            In local dev mode, your CV files sit in the <code>data/</code> folder on your
            machine. Nothing is sent to the internet unless you choose to (e.g. pasting a prompt
            into an AI chat yourself).
          </p>
        )}
        <p>
          There are no logins, analytics on your CV content, or resume databases behind this
          project. Clearing browser site data or losing an unexported backup can delete web
          copies — keep backups.
        </p>
      </section>

      <section className="app-site-footer-section">
        <h3 className="app-site-footer-subtitle">Disclaimer</h3>
        <p>
          CV Studio is provided <strong>as-is</strong>, without warranty of any kind (see MIT
          License). You are solely responsible for the accuracy and legality of your CV and for
          how you use AI tools. This app does not verify facts, guarantee interview outcomes, or
          endorse employers mentioned in your files.
        </p>
        <p>
          AI tailoring sends text you choose to third-party services (ChatGPT, Gemini, etc.)
          under <em>their</em> terms — not through this app&apos;s servers. Not affiliated with
          OpenAI, Google, Cursor, or any employer.
        </p>
      </section>

      <p className="app-site-footer-legal">
        © {new Date().getFullYear()} Ziv Sapir.
        {' '}
        <a
          href={LICENSE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          MIT License
        </a>
        {' · '}
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Source on GitHub
        </a>
      </p>
    </footer>
  );
};
