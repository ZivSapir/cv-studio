# Demo recording script (fictional data)

All files in this folder are **made up** for tutorials and screen recordings. No real person, employer, or job posting.

## Files

| File | Purpose |
|---|---|
| `alex-chen-master.yaml` | Fictional master CV (import as master) |
| `maple-analytics-backend-jd.txt` | Fictional job description for Tailor with AI |
| `maple-analytics-tailored.yaml` | Pre-built saved version (backup if AI paste fails mid-recording) |
| `alex-chen-demo-backup.json` | One-click full library import |

## Suggested recording flow (~5–8 min)

### Setup (live site or preview)

1. **Reset to examples…** (or use incognito) so you start clean.
2. **Data files → Import backup** → choose `alex-chen-demo-backup.json`  
   *Alternative:* **Import master YAML** → `alex-chen-master.yaml`, then add tailored saved via AI or import `maple-analytics-tailored.yaml` through a saved import if you add that path — backup is easiest.*

3. Confirm preview shows **Alex Chen** (not "Your Name").

### Show core value (1–2 min)

4. Select **Main CV** vs a saved version in the CV dropdown.
5. **Compare** — show diff vs base.
6. **Edit** — tweak a bullet, **Save edits**.
7. **Download PDF** — quick print preview.

### Tailor with AI (2–3 min)

8. Open `maple-analytics-backend-jd.txt` in a text editor; copy the job body.
9. **Tailor with AI** → paste JD → **Copy prompt** → paste into ChatGPT/Gemini.
10. Paste YAML reply → **Apply as saved CV**  
    *Fallback:* paste content from `maple-analytics-tailored.yaml` if the model returns bad YAML.*

11. Select the new saved version; show headline/summary and hidden frontend bullet.

### Privacy wrap-up (30 sec)

12. Scroll to footer — data stays in browser, export backup, disclaimer.

## Local dev recording

Same flow on `npm run dev`, but copy YAML into `data/` or use Import backup in the UI (browser backend still used unless file API — actually local dev uses file API).

For local file mode demo: copy `alex-chen-master.yaml` to `data/master.yaml` and tailored file to `data/saved/maple-analytics-backend.yaml`, then **Reload**.

## Legal note

"Maple Analytics", "Meridian Software", "Harbor Tech Studio", and "Alex Chen" are fictional. Do not imply affiliation with any real company in published video titles without a "demo / fictional" label.
