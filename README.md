# cv-studio

Local-first CV editor: one YAML source of truth, base profiles, job-tailored versions, A4 preview, Edit mode, compare, and PDF export.

**Privacy:** your CV data stays on your machine. This project does not host accounts, sync to a cloud, or collect resumes.

**License:** [MIT](LICENSE)

## Who it's for

Developers (and Cursor / VS Code users) who want a structured CV workflow without a SaaS resume builder.

## Quick start

```bash
git clone https://github.com/ZivSapir/cv-studio.git
cd cv-studio
npm install
npm run setup    # copies example YAML → local data files (skips files that already exist)
npm run dev
```

Open http://localhost:5173/

Save / edit / set-as-base / delete write YAML via the local Vite API (`npm run dev` only). Nothing is sent to a remote backend.

## Bring your own AI

This app does **not** ship API keys or call OpenAI / Gemini / Claude for you.

1. **Cursor (recommended):** open this folder; use [`.cursor/rules/cv-editing.mdc`](.cursor/rules/cv-editing.mdc); paste a job description in chat and ask for a `data/saved/<slug>.yaml`.
2. **Any chat LLM:** paste your `master.yaml` + the JD; ask for a saved-version YAML snippet; save it under `data/saved/`.
3. **No AI:** use **Edit** mode in the preview, or edit YAML by hand.

## Repository layout

| File | In git? | Purpose |
|---|---|---|
| `data/master.example.yaml` | yes | Placeholder master CV |
| `data/bases/*.example.yaml` | yes | Frontend / Data / Full-Stack base templates |
| `data/saved/*.example.yaml` | yes | Example tailored version |
| `data/master.yaml` | **no** (local) | Your personal CV facts |
| `data/bases/*.yaml` | **no** (local) | Your three base profiles |
| `data/saved/*.yaml` | **no** (local) | Your job-specific CVs |

## Workflow

1. Run `npm run setup`, then replace placeholders in `data/master.yaml` with your real content.
2. Pick a **Base CV** or saved version in the app.
3. **Reload** after file edits, or use **Edit** to tweak the active version in the preview.
4. **Compare** against the Frontend base, then **Download PDF**.

### Edit mode

- Edits save to the selected base/saved YAML only (not `master.yaml`).
- Use **Save as base…** to promote a version onto Frontend / Data / Full-Stack.
- Exit Edit before downloading PDF.
- Back up your local `data/` yourself if you need a content revert point (git ignores it).

## Disclaimer

Provided as-is, without warranty. You are responsible for the accuracy of your CV and for complying with employers' and AI vendors' terms. Not affiliated with Cursor, Wix, or any employer named in your local files.

## Tailoring rules (for Cursor)

See [`.cursor/rules/cv-editing.mdc`](.cursor/rules/cv-editing.mdc).
