# cv-studio

Local CV editor for tailoring resume versions from a single source of truth.

## What it does

- **`data/master.yaml`** — verified facts (experience, skills, education)
- **`data/base.yaml`** — your default CV overrides
- **`data/saved/*.yaml`** — job-specific tailored versions
- Live A4 preview, base vs. draft compare, PDF export

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/

Save / set-as-base / delete actions write YAML files via the dev API (`npm run dev` only).

## Workflow

1. Edit content in YAML (or ask Cursor to tailor a version for a job posting).
2. Click **Reload** in the app to pick up file changes.
3. Use **Compare** against base, then **Download PDF**.
