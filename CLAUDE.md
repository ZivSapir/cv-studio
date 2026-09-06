# CV Studio

Local-first CV editor: one YAML source of truth (`data/master.yaml`), role-flavored base profiles (`data/bases/`), and job-tailored saved versions (`data/saved/`), rendered as an A4 preview with PDF export. See [README.md](README.md) for setup (`npm install && npm run setup && npm run dev`).

## CV tailoring workflow

Before tailoring a CV, editing a saved/base YAML, or writing a cover letter, **read [.cursor/rules/cv-editing.mdc](.cursor/rules/cv-editing.mdc) in full** — it is the single source of truth for the tailoring rules (evidence hierarchy, honesty rules, page-fit check workflow, cover letter shape) and applies regardless of which editor/agent is being used.

If the user has a personal knowledge base file (a private, local file with background/depth that isn't in `data/master.yaml`), ask where it lives and read it alongside master.yaml, per the rules file.
