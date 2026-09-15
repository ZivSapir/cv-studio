# cv-studio

Local-first CV editor: one YAML source of truth, base profiles, job-tailored versions, A4 preview, Edit mode, compare, and PDF export.

**Live app:** [zivsapir.github.io/cv-studio](https://zivsapir.github.io/cv-studio/)

**Privacy:** your CV data stays on your machine (or in your browser). No accounts, no cloud DB, no resume collection. See the in-app footer for full details.

**License:** [MIT](LICENSE) — © Ziv Sapir

## Two ways to use it

Pick one depending on whether you already pay for an AI coding agent.

| | Option 1: Web app | Option 2: Local + coding agent |
|---|---|---|
| Cost | Free, no account, no API key | Requires a coding agent with an active plan (e.g. Cursor, Claude Code) |
| Install | None — open a URL | `git clone` + `npm install` (Node.js required) |
| Tailoring a CV | Copy a prompt into ChatGPT/Gemini/Claude yourself and paste the reply back, or generate directly with your own Gemini API key (optional) | You paste the job description straight to your agent in the editor; it edits the YAML files for you |
| Data location | Your browser (IndexedDB) | Plain YAML files on your disk under `data/` |

Either way you end up in the same CV Studio preview to review, compare, and export a PDF — this only changes how the tailoring step happens.

### Option 1: Web app — no install, no API key

Open the hosted site (after Pages is enabled): `https://zivsapir.github.io/cv-studio/`

- Data is stored in **your browser** (IndexedDB)
- Use **Export backup** regularly
- **Tailor with AI**: copy a prompt into your ChatGPT/Gemini and paste the reply back, or paste your own Gemini API key to generate directly — see [Bring your own AI](#bring-your-own-ai) below for the exact steps
- **Cover letter** (saved CVs only): optional BYO-AI letter per application; print to PDF
- Nothing is uploaded to our servers

### Option 2: Local + coding agent (Cursor / Claude Code / similar)

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

**Tailoring a CV with your agent:**

1. Fill in your CV via the in-app onboarding wizard, or by hand-editing `data/master.yaml`.
2. Open the `cv-studio` folder in Cursor or Claude Code (or another coding agent).
3. Paste a job description into the agent's chat and ask it to tailor a CV for that role — no separate copy/paste of a prompt is needed, the agent edits the files directly.
4. The agent follows [`.cursor/rules/cv-editing.mdc`](.cursor/rules/cv-editing.mdc) — generic honesty/tailoring rules, not specific to any one person — and writes a job-tailored version to `data/saved/`. (Cursor reads that file automatically; [`CLAUDE.md`](CLAUDE.md) points Claude Code at the same rules.)
5. Back in the browser, click **Reload**, then open the new version to review, compare, and export the PDF.

**Sharing this with someone else:** this repo is public, so a friend can clone it and run the exact steps above for their own CV without you adding them as a GitHub collaborator — no invite or repo permissions needed, they just need their own Cursor/Claude Code (or similar) setup. Everything each person creates under `data/` is gitignored and stays local to their own machine — nothing gets pushed back into this shared repo unless someone deliberately commits it.

## Bring your own AI

This app does **not** ship API keys or call OpenAI / Gemini / Claude for you by default. Pick either path, per CV — both are available in the same **Tailor with AI** panel:

**Copy/paste (any model, no key needed):**

1. Click **Tailor with AI**, paste a job description, **Copy prompt**
2. Paste into ChatGPT, Gemini, Claude, or any AI chat you already use
3. Paste the YAML reply back and **Apply as saved CV**

**Direct with your own Gemini key (optional):**

1. Switch to the **Generate with Gemini** tab and click **Add Gemini key** — paste a free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Paste a job description and click **Generate with Gemini** — no copy/paste round trip
3. Use **Request a change** to ask for follow-up edits (e.g. "shorten the summary")

Your key is stored only in your browser (localStorage) and sent straight to Google when you generate — never through this app's servers, in either the web app or local dev mode, since the Gemini call is entirely client-side.

Prompts instruct the model to **emphasize facts from your master CV only** — not to invent skills or rename job titles. You are responsible for reviewing before you apply.

### Cover letter (optional)

On a **saved** CV, click **Cover letter**:

1. Job description loads automatically if it was stored when you tailored or last saved this CV (otherwise paste once)
2. **Copy prompt** (uses master + this tailored CV + JD) and paste into any AI chat — or switch to **Generate with Gemini** to skip the copy/paste, using the same key as above
3. Edit the result, **Save to this CV** (also stores the JD for next time)
4. **Copy letter** or **Print / PDF** when you need to attach it

Optional on master YAML: `applicantBrief` — short voice / extra context included in the cover-letter prompt (not shown on the A4 CV).

## Repository layout

| File | In git? | Purpose |
|---|---|---|
| `data/master.example.yaml` | yes | Placeholder master CV |
| `data/bases/main-cv.example.yaml` | yes | Default general base template |
| `data/saved/*.example.yaml` | yes | Optional example tailored version |
| `data/master.yaml` | **no** (local) | Your personal CV facts (local mode) |
| `data/bases/*.yaml` | **no** (local) | Your base profiles (any number) |
| `data/saved/*.yaml` | **no** (local) | Your job-specific CVs |

## Disclaimer

CV Studio is provided **as-is**, without warranty (MIT License). You are responsible for the accuracy of your CV and for third-party AI tools you use. AI prompts are either copied by you into ChatGPT/Gemini under their terms, or — if you opt into the Gemini BYOK option — sent directly from your browser to Google's API using your own key; either way, nothing goes through this app's servers. Not affiliated with OpenAI, Google, Cursor, or any employer named in your files.

## Tailoring rules (for Cursor / Claude Code, local mode)

The rules the agent follows ([`.cursor/rules/cv-editing.mdc`](.cursor/rules/cv-editing.mdc)) are generic — safe to reuse as-is by anyone who clones this repo. Optionally keep your own private, not-committed "knowledge base" file (background, metrics, a do-not-oversell list) outside `data/` and tell your agent where it lives; the rules file will use it alongside `data/master.yaml` when tailoring.
