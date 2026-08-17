# cv-studio

Local-first CV editor: one YAML source of truth, base profiles, job-tailored versions, A4 preview, Edit mode, compare, and PDF export.

**Live app:** [zivsapir.github.io/cv-studio](https://zivsapir.github.io/cv-studio/)

**Privacy:** your CV data stays on your machine (or in your browser). No accounts, no cloud DB, no resume collection. See the in-app footer for full details.

**License:** [MIT](LICENSE) — © Ziv Sapir

## Two ways to use it

### 1) Web (GitHub Pages) — no install

Open the hosted site (after Pages is enabled): `https://zivsapir.github.io/cv-studio/`

- Data is stored in **your browser** (IndexedDB)
- Use **Export backup** regularly
- **Tailor with AI**: copy a prompt into your ChatGPT/Gemini, paste the YAML reply back
- **Cover letter** (saved CVs only): optional BYO-AI letter per application; print to PDF
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

**Your real CV lives here (gitignored):**

| Path | Contents |
|------|----------|
| `data/master.yaml` | Facts: experience, projects, skills, education |
| `data/bases/main-cv.yaml` | Main / default profile |
| `data/bases/*.yaml` | Other base profiles |
| `data/saved/*.yaml` | Job-tailored versions |

Run `npm run backup` to write `data/backups/cv-studio-backup-latest.json` (full export of master + all bases + saved). Copy that file to iCloud/Drive occasionally — it is not committed to git.

In the UI, use **My CV** (not Public template) and **Export backup** for the same JSON while `npm run dev` is running.

## Bring your own AI

This app does **not** ship API keys or call OpenAI / Gemini / Claude for you.

1. Click **Tailor with AI**, paste a job description, **Copy prompt**
2. Paste into ChatGPT or Gemini in your browser
3. Paste the YAML reply back and **Apply as saved CV**

Prompts instruct the model to **emphasize facts from your master CV only** — not to invent skills or rename job titles. You are responsible for reviewing before you apply.

### Cover letter (optional)

On a **saved** CV, click **Cover letter**:

1. Paste the job description, **Copy prompt** (uses master + this tailored CV)
2. Paste the plain-text letter back, edit, **Save to this CV**
3. **Copy letter** or **Print / PDF** when you need to attach it

Optional on master YAML: `applicantBrief` — short voice / extra context included in the cover-letter prompt (not shown on the A4 CV).

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

CV Studio is provided **as-is**, without warranty (MIT License). You are responsible for the accuracy of your CV and for third-party AI tools you use. AI prompts are copied by you into ChatGPT/Gemini under their terms — this app does not call those APIs. Not affiliated with OpenAI, Google, Cursor, or any employer named in your files.

## Tailoring rules (for Cursor, local mode)

See [`.cursor/rules/cv-editing.mdc`](.cursor/rules/cv-editing.mdc).
