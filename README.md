# cv-studio

Local CV editor for tailoring resume versions from a single source of truth.

## What it does

- **`data/master.yaml`** — verified facts (experience, skills, education)
- **`data/bases/*.yaml`** — three base CV profiles (Frontend, Data, Full-Stack)
- **`data/saved/*.yaml`** — job-specific tailored versions
- Live A4 preview, compare vs Frontend base, PDF export

## Quick start

```bash
npm install
npm run setup    # copies example YAML → your local data files (skipped if you already have them)
npm run dev
```

Open http://localhost:5173/

Save / set-as-base / delete actions write YAML files via the dev API (`npm run dev` only).

## Repository layout

| File | In git? | Purpose |
|---|---|---|
| `data/master.example.yaml` | yes | Template with placeholders — fork/start here |
| `data/bases/*.example.yaml` | yes | Base profile templates (Frontend, Data, Full-Stack) |
| `data/saved/*.example.yaml` | yes | Example tailored version |
| `data/master.yaml` | **no** (local) | Your personal CV data |
| `data/bases/*.yaml` | **no** (local) | Your three base CV profiles |
| `data/saved/*.yaml` | **no** (local) | Your saved tailored CVs |

## Workflow

1. Edit `data/master.yaml` with your real content (or ask Cursor to tailor a saved version for a job).
2. Pick a **Base CV** from the dropdown (Frontend, Data, or Full-Stack).
3. Click **Reload** in the app to pick up file changes.
4. Use **Compare** against the Frontend base, then **Download PDF**.

## Tailoring rules (for Cursor)

See `.cursor/rules/cv-editing.mdc` — honest emphasis only, no invented experience, past tense for prior employers.
