# CV Studio — Interview Self-Quiz

Work through **Part A** out loud (as if explaining to an interviewer). Then check **Part B**. Aim to answer without opening the codebase first.

Mark each question: ✅ know it / 🤔 fuzzy / ❌ blank. Re-read `docs/interview-technical-overview.md` for anything fuzzy.

---

## Part A — Questions only

### Product & motivation

1. In one sentence, what is CV Studio?
2. What problem does the master + overlay model solve that “duplicate the whole CV per job” does not?
3. Why is the app described as local-first / privacy-oriented?
4. What does “bring your own AI” mean here — what does the app do and **not** do?

### Domain model

5. What is the difference between `CvMaster`, `CvVersion`, and `ResolvedCv`?
6. Why do bullets, projects, and skill categories have stable `id`s?
7. Name three ways a version can change what appears on the PDF without editing master.
8. What always comes from master and cannot be overridden by a version?
9. What is the difference between a **base** and a **saved** version?
10. Which fields can live on a version but are **not** shown on the A4 CV?

### Merge engine

11. Walk through `mergeCvVersion` at a high level (inputs → steps → output).
12. If `experienceOrder` lists an unknown id, what happens?
13. If a bullet id is in both `hiddenBulletIds` and `bulletOverrides`, which wins?
14. What is `roleTitleOverrides`, and what is the product policy around it?

### Architecture & storage

15. What is `CvRepository`, and why does it exist?
16. How does the app decide between the file backend and the IndexedDB backend?
17. Where does personal CV data live in local dev vs on GitHub Pages?
18. What is `cvApiPlugin`, and why isn’t it available in production Pages?
19. What does a backup contain, and why would you export one?

### UI & export

20. How does PDF download actually work (no PDF library)?
21. Why set `document.title` before printing?
22. What is the “one A4 page” constraint, and how is overflow detected or checked in CI?
23. Does Edit mode write to master? What does undo/redo apply to?

### AI & parsing

24. Outline the Tailor-with-AI user flow (3–5 steps).
25. Why does the AI paste path need YAML “repair” logic?
26. What honesty constraints do the tailor prompts encode?

### Stack & tradeoffs

27. Why YAML instead of JSON for the CV source files?
28. Why print-to-PDF instead of Puppeteer / jsPDF?
29. Name one limitation you’d admit in an interview, and how you’d improve it.
30. If asked “walk me through the code,” which 3–5 files would you open first, and why?

### Stretch (deeper)

31. What happens if the selected saved version is deleted while you’re viewing it?
32. How does Compare work at a conceptual level (what is compared to what)?
33. Why might `App.tsx` be large, and what would a clean refactor look like?
34. Security: what threat model fits this app (and what doesn’t)?
35. Explain `orderByIds` behavior when the order array is a partial list.

---

## Part B — Answer key

### Product & motivation

1. **A local-first React/Vite app** that manages CVs as one YAML master of facts plus lightweight version overlays, with A4 preview and browser print-to-PDF.
2. **Avoids duplicating and drifting full resumes**; facts stay in one place; job-specific changes are small transforms (hide/reorder/override) keyed by IDs.
3. **No accounts / no cloud DB / no uploaded resumes** — data stays in local YAML (dev) or the user’s browser IndexedDB (Pages); AI is copy/paste to the user’s own chat tools.
4. App **builds prompts** and **parses pasted replies**. It does **not** store API keys or call OpenAI/Gemini/Claude.

### Domain model

5. **Master** = facts. **Version** = overlay transforms (`extends: 'master'`). **ResolvedCv** = merged view model the document renders.
6. So versions can **hide / reorder / override by reference** without depending on array position or duplicated text identity.
7. Examples: `headline`/`summary` override; `hiddenBulletIds` / `hiddenProjectIds`; `bulletOverrides` / `projectOverrides` / `skillOverrides`; order arrays; `experienceAdditions`.
8. **Name and contact** (from merge). (Also: Edit UI is designed not to rewrite master.)
9. **Base** = reusable profile (e.g. frontend / fullstack). **Saved** = per-job tailored copy (often with cover letter / notes).
10. e.g. `coverLetter`, `personalNote`, `jobDescription`, `notes`; plus master-only `applicantBrief` / `internalPeriod` (not PDF content). Tags are data, not a main document “chips” feature.

### Merge engine

11. Take master + version → build experience (filter hidden bullets, reorder, overrides, additions) → projects/skills with hide/override/order → headline/summary/education fallbacks → return `ResolvedCv`.
12. **Unknown ids are skipped**; remaining items not listed are **appended** after the ordered ones.
13. **Hidden wins** for visibility: the bullet is filtered out before/while building the list, so an override on a hidden id does not show it.
14. Schema field to remap role titles by current title string. **Product/AI rules forbid inventing or renaming titles** — titles should match master for honesty.

### Architecture & storage

15. An interface for load/save/import/export of master + library so the UI doesn’t care about storage.
16. In **DEV**, probe `/api/cv/...`; if OK → file repo; else → browser (IndexedDB). Production/static → browser.
17. **Dev:** `data/master.yaml`, `data/bases/`, `data/saved/` (gitignored). **Pages:** IndexedDB (`cv-studio` workspace).
18. Vite middleware exposing `/api/cv` to read/write YAML on disk during `npm run dev`. Static Pages deploy has **no Node server**, so the plugin isn’t serving APIs there.
19. JSON `{ version: 1, exportedAt, master, bases, saved }` — full workspace snapshot for backup / migrate / recover.

### UI & export

20. Render A4 with CSS → `window.print()` → user saves as PDF from the print dialog.
21. Suggested **download/print filename** often comes from the document title (`Name - Headline`, sanitized).
22. Product goal: fit one page. UI measures overflow (`scrollHeight` vs `clientHeight`); `check-page-fit` + Playwright + `?pageFit=` headless mode for automation.
23. **No** — edits mutate the **version overlay/draft**. Undo/redo is for that draft history (`useEditHistory`).

### AI & parsing

24. Paste JD → Copy prompt → paste into ChatGPT/Gemini → paste YAML reply → parse/repair → Apply as saved CV (then human review).
25. Models often return markdown fences, bad indentation, `*` lists, folded summary quirks — without repair, `js-yaml` fails and UX dies.
26. Emphasize **only facts from master**; don’t invent skills/experience; don’t use `roleTitleOverrides` / don’t rename titles.

### Stack & tradeoffs

27. Human-editable, comments-friendly, nice for Cursor/agents, familiar resume-as-text workflow; round-trips with `js-yaml`.
28. True CSS layout, zero PDF dependency, works offline in the browser; tradeoff = less control than a dedicated PDF engine / headless Chromium pipeline.
29. Examples: no multi-device sync; soft validation; large `App.tsx`; print engine differences; AI paste friction. Improvements: sync/backup UX, Zod schema, split feature modules, optional BYOK later.
30. Suggested order: `types/cv.ts` → `mergeCvVersion.ts` → `cvRepository/` → `CvDocument.tsx` → (`cvApiPlugin.ts` or `buildTailorPrompt.ts` depending on the question).

### Stretch

31. App should **fall back** to a sensible version (e.g. compare base) rather than crash on a missing id — know that selection is resilient.
32. Resolve **current version** and **compare base** to two `ResolvedCv`s, then produce structured field diffs (via `diff` / `compareCv`) for the compare UI.
33. It owns many workflows (library, edit, compare, AI, print, onboarding). Refactor: feature panels + hooks/context per workflow; keep merge/repo pure.
34. **Fits:** local trusted YAML, user-pasted AI text, localhost file API with no auth. **Doesn’t claim:** multi-tenant SaaS hardening, untrusted remote YAML RCE sandboxing as a primary threat — data is user-controlled; Pages has no write API.
35. Items whose ids appear in the order array come first (in that order); any items not mentioned are **appended** in their original relative order.

---

## Suggested practice session (45–60 min)

1. Read the overview once (10 min).
2. Answer Part A out loud, no notes (25 min).
3. Check Part B; rewrite weak answers in your own words (15 min).
4. Dry-run demo: open app → base → edit → compare → print → show AI prompt panel (10 min).

### Bonus interviewer questions to rehearse

- “Why not just use Google Docs / Notion?”
- “If this became a SaaS, what would you change first?”
- “How would you add collaborative editing?”
- “How do you prevent users (or AI) from lying on the CV?”
- “What’s the hardest bug you hit building this?”
