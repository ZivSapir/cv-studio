# cv-studio

Local-first CV editor: one YAML source of truth, base profiles, job-tailored versions, A4 preview, Edit mode, compare, and PDF export.

**Privacy:** your CV data stays on your machine (or in your browser). This project does not host accounts, sync to a cloud DB, or collect resumes.

**License:** [MIT](LICENSE)

## Two ways to use it

### 1) Web (GitHub Pages) — no install

Open the hosted site (after Pages is enabled): `https://zivsapir.github.io/cv-studio/`

- Data is stored in **your browser** (IndexedDB)
- Use **Export backup** regularly
- **Tailor with AI**: copy a prompt into your ChatGPT/Gemini, paste the YAML reply back
- Nothing is uploaded to our servers

### 2) Local developer mode

```bash
git clone https://github.com/ZivSapir/cv-studio.git
cd cv-studio
npm install
npm run setup
npm run dev
```

Open http://localhost:5173/

In local mode, Save / Edit / Set-as-base write YAML under `data/` via the Vite API.

## Bring your own AI

This app does **not** ship API keys or call OpenAI / Gemini / Claude for you.

1. Click **Tailor with AI**, paste a job description, **Copy prompt**
2. Paste into ChatGPT or Gemini in your browser
3. Paste the YAML reply back and **Apply as saved CV**

Optional later: paste a free Gemini API key (BYOK) — not in Phase 1.

## Repository layout

| File | In git? | Purpose |
|---|---|---|
| `data/master.example.yaml` | yes | Placeholder master CV |
| `data/bases/main-cv.example.yaml` | yes | Default general base template |
| `data/saved/*.example.yaml` | yes | Optional example tailored version |
| `data/master.yaml` | **no** (local) | Your personal CV facts (local mode) |
| `data/bases/*.yaml` | **no** (local) | Your base profiles (any number) |
| `data/saved/*.yaml` | **no** (local) | Your job-specific CVs |

## Workflow (local)

1. Run `npm run setup`, then edit `data/master.yaml`
2. Pick a Base CV or saved version
3. Reload / Edit / Compare / Download PDF

## Disclaimer

Provided as-is, without warranty. You are responsible for the accuracy of your CV and for complying with employers' and AI vendors' terms. Not affiliated with Cursor, OpenAI, Google, or any employer named in your files.

## Tailoring rules (for Cursor, local mode)

See [`.cursor/rules/cv-editing.mdc`](.cursor/rules/cv-editing.mdc).
