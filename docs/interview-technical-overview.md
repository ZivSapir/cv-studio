# CV Studio — Technical Interview Overview

Use this to explain the project clearly in an interview. Speak from the **product idea** first, then the **architecture**, then one **deep dive** if they ask.

**Live app:** https://zivsapir.github.io/cv-studio/

---

## 30-second pitch

CV Studio is a **local-first** web app I built to manage many job-specific CVs without duplicating a full resume each time. There is one YAML **master** of facts, and lightweight **version overlays** that hide, reorder, and rephrase content for a role. The UI renders a single **A4 page** in React/CSS and exports PDF via the browser’s print dialog. Optional AI tailoring is **bring-your-own** — the app builds prompts; it never holds API keys or calls model APIs.

---

## Problem it solves

| Pain | Approach |
|------|----------|
| Full CV copy per job → drift / invented bullets | Master facts + overlays keyed by stable IDs |
| Need visual A4/PDF without Word | React preview + CSS `@media print` |
| Don’t want CV data in a cloud DB | IndexedDB in the browser, or local YAML files in dev |
| Want AI help without shipping keys | Copy prompt → paste YAML reply back |

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| UI | React 19 + TypeScript | Familiar, fast to iterate |
| Build | Vite 8 | Fast DX; plugin for local API |
| Data format | YAML (`js-yaml`) | Human-editable, git-friendly, Cursor-friendly |
| Diff | `diff` (structuredPatch) | Compare tailored vs base |
| PDF | Browser print CSS | Zero PDF library; true CSS layout |
| Hosting | GitHub Pages (static) | No server for the public app |
| Local persistence | Vite middleware → `data/*.yaml` | Real files while developing |
| Web persistence | IndexedDB | Offline after deploy |
| Lint | oxlint | Lightweight |
| Page-fit CI helper | Playwright | Headless A4 overflow check |

**Not in the stack:** Redux/Zustand, React Router, Nest/Express, jsPDF/Puppeteer for export, OpenAI SDK.

---

## Core idea: master + overlay → resolved CV

```
CvMaster (facts)  +  CvVersion (transforms)  →  mergeCvVersion()  →  ResolvedCv  →  CvDocument (A4)
```

### Master (`CvMaster`)

Source of truth for:

- name, headline, summary, contact
- experience (companies → roles → bullets with `id`s)
- projects, skills, education
- optional `applicantBrief` (cover-letter voice only — **not** on the PDF)

### Version (`CvVersion`)

Overlay that **extends** master. Typical fields:

- **Emphasis:** `headline`, `summary`, `bulletOverrides`, `projectOverrides`, `skillOverrides`
- **Space (one-page fit):** `hiddenBulletIds`, `hiddenProjectIds`
- **Order:** `experienceOrder`, `experienceBulletOrder`, `projectOrder`, `skillCategoryOrder`
- **Kinds:** `base` (reusable profiles) vs `saved` (per-job copies)
- **Extras (not on A4):** `coverLetter`, `personalNote`, `jobDescription`, `notes`

### Merge rules (important talking points)

Implemented in `src/lib/mergeCvVersion.ts`:

1. **Name + contact always from master** — versions cannot invent contact info.
2. Headline / summary / education: version override **or** master fallback.
3. Experience: master (+ optional `experienceAdditions`) → filter hidden bullets → reorder → apply bullet text overrides → optional role-title overrides.
4. Unknown IDs in order arrays are skipped; remaining items are appended.
5. Result is a plain `ResolvedCv` — what the document component renders.

**Product honesty rule:** job titles on the PDF should match master. `roleTitleOverrides` exists in the type for flexibility but AI prompts / editing rules ban inventing or renaming titles.

---

## Architecture

### High-level

```
main.tsx
  └─ App.tsx                    # orchestration (library, edit, compare, AI, print)
       ├─ useCvLibrary          # load/save via CvRepository
       ├─ useEditHistory        # undo/redo on version drafts
       ├─ mergeCvVersion        # pure function
       ├─ editCvVersion         # overlay mutators
       ├─ compareCv             # structured diff vs compare base
       ├─ printCv               # document.title + overflow helpers
       ├─ build*Prompt          # BYO-AI prompt builders
       └─ CvDocument            # A4 React + CSS
```

`App.tsx` is the composition root. Domain logic (merge, edit, compare, prompts) is mostly **React-free** in `src/lib/`.

### Dual storage backends (same interface)

`CvRepository` (`src/lib/cvRepository/types.ts`) abstracts:

- `loadMaster` / `loadLibrary`
- `updateVersion` / `saveCopy` / `promoteToBase` / `deleteSaved`
- `exportBackup` / `importBackup` / `importMaster` / …

**Detection** (`cvRepository/index.ts`):

1. In **DEV**, try `GET /api/cv/...` — if OK → **file** backend (Vite plugin writes YAML under `data/`).
2. Otherwise → **browser** backend (IndexedDB workspace).

So one UI works for both local development and the static GitHub Pages deploy.

### Local API (dev only)

`server/cvApiPlugin.ts` is a Vite plugin: HTTP handlers under `/api/cv/*` that read/write `data/master.yaml`, `data/bases/`, `data/saved/`. It is **not** part of the production static build — Pages has no Node server.

### PDF export

There is **no** server-side PDF generator.

1. Layout is fixed CSS A4 (`210mm × 297mm`).
2. `buildCvPdfTitle` sets `document.title` to something like `Name - Headline` (sanitized) so the print dialog’s suggested filename is useful.
3. `window.print()` + `@media print` styles produce the PDF.
4. Download is blocked while Edit mode is active (avoid printing a half-edited draft).

### Page-fit

Fitting **one A4 page** is a hard product goal. Overflow is measured via DOM (`scrollHeight` vs `clientHeight`). `PageFitApp` + `?pageFit=<versionId>` + Playwright (`npm run check-page-fit`) automate regression checks.

### BYO-AI (no model calls)

1. Build a large prompt from master + job description (`buildTailorPrompt`, cover letter, master import).
2. User copies it into ChatGPT/Gemini.
3. User pastes YAML (or letter text) back.
4. App parses with `js-yaml`, with repair heuristics for common AI YAML mistakes (fences, indentation, `*` lists, etc.).
5. Result becomes a saved version / updated master / letter on the version.

Privacy + zero ops; tradeoff = manual paste UX and fragile YAML → repair layer.

---

## Data on disk (local mode)

| Path | Git? | Role |
|------|------|------|
| `data/master.yaml` | no | Personal facts |
| `data/bases/*.yaml` | no | Base profiles (frontend, fullstack, …) |
| `data/saved/*.yaml` | no | Job-tailored versions |
| `data/*.example.yaml` | yes | Templates for setup / public demo |
| `data/backups/` | no | JSON full exports |

`npm run setup` copies examples → local files if missing.  
`npm run backup` writes a full JSON backup of master + bases + saved.

---

## Key features (map to UI)

| Feature | How it works |
|---------|----------------|
| Live A4 preview | `CvDocument` from `ResolvedCv` |
| Edit mode | Mutates **version overlay**, not master; undo/redo (`useEditHistory`) |
| Bases vs saved | Reusable profiles vs per-application copies; promote saved → base |
| Compare | Merge both versions → `compareResolvedCvs` + line diffs |
| Tailor with AI | Prompt out / YAML in → new saved CV |
| Cover letter | Stored on saved version; separate print document |
| Onboarding / import | Wizard if placeholder master; AI import from pasted CV text |
| Backup | JSON export/import (UI + CLI) |
| My CV vs Public template | Switch data source: local workspace vs committed examples |

---

## Design decisions worth defending

1. **Overlays instead of full copies** — smaller diffs, one fact source; cost is ID discipline and merge logic.
2. **Master not editable from the main Edit UI** — reduces accidental fact drift; master changes via YAML / import / onboarding.
3. **Repository interface + two backends** — static hosting without rewriting the app.
4. **Print-to-PDF** — layout fidelity and no dependency; less pixel control than Puppeteer/PDFKit.
5. **BYO-AI** — privacy and no backend; UX is copy/paste and YAML must be resilient.
6. **Soft validation** — TypeScript types + conventions; no Zod. Hardened parse path is mainly the AI paste flow.
7. **One-page constraint** — forces intentional hide/shorten; tooling (`check-page-fit`) backs it up.

---

## How you’d demo / walk through code

**Demo path:** open a base → Edit (hide a bullet, change summary) → Compare → Download PDF → Tailor with AI (show prompt, don’t need a live model).

**Code path if they dig:**

1. `src/types/cv.ts` — domain model  
2. `src/lib/mergeCvVersion.ts` — the “engine”  
3. `src/lib/cvRepository/` — storage abstraction  
4. `src/components/CvDocument.tsx` — presentation  
5. `server/cvApiPlugin.ts` — why local YAML works in `npm run dev`

---

## Honest limitations (good interview answers)

- Not multi-device sync (IndexedDB is per-browser; backups are manual).
- No runtime schema validation on every load.
- AI quality depends on the external model + user review.
- Print CSS PDF ≠ pixel-perfect cross-browser print engines.
- `App.tsx` is a large orchestrator — fair “what would you refactor next?” answer: split workflows / context.

---

## Soundbites

- “Master is facts; versions are transforms keyed by stable IDs.”
- “Same `CvRepository` interface — files in dev, IndexedDB on Pages.”
- “PDF is CSS print, not a PDF library.”
- “AI is offline BYO — we ship prompt engineering and YAML repair, not API calls.”
- “One A4 page is a product constraint, enforced in the UI and with Playwright.”

---

## Quick run commands

```bash
npm install
npm run setup
npm run dev          # http://localhost:5173/ + /api/cv
npm run build        # static dist, base /cv-studio/
npm run backup
npm run check-page-fit -- <version-id>
```
