# GEMS — analyzer-talk2me

> Empire HQ frontend. Living document of non-obvious lessons specific to this project.
> Created 2026-05-25 by DEEP-DISC standardization sweep.

## How to read this file
```
### Title (date)
**Symptom:** what you observed
**Root cause:** what was actually wrong
**Fix:** what worked
**Lesson:** the principle to remember
```

## GEMs to date

### MEGA HUB CSP blocks Supabase calls (2026-05-25)
**Symptom:** Hub at ftable.co.il/hub/ loaded but "Enter Hub" failed; console: `Refused to connect to vjxqlqtlywovnbidovit.supabase.co — violates connect-src`.
**Root cause:** Domain-level CSP on `/public_html/.htaccess` listed only the OLD ftable Supabase (`uiyqswnhrbfctafeihdh`) in connect-src. The hub auth EF lives on the empire Supabase (`vjxqlqtlywovnbidovit`).
**Fix:** Per-directory `/public_html/hub/.htaccess` with its own CSP via `Header always set` (overrides parent for this directory only). Added `vjxqlqtlywovnbidovit.supabase.co` (+wss) to connect-src + `frame-src *` for embedded dashboards. Main ftable site CSP untouched.
**Lesson:** `Header always set` in a per-directory .htaccess **replaces** the parent header for that directory. A `<meta http-equiv="Content-Security-Policy">` cannot loosen a server-sent CSP — it can only tighten. When a parent CSP blocks a child SPA, the surgical fix is a per-dir .htaccess.

### `frontend_dashboard_data` is the ONE canonical data EF (2026-05-25)
**Symptom:** Empire-hq had 5 dashboard-data EFs (`empire-snapshot-public`, `frontend_dashboard_data`, `monitor-dashboard`, `project-info`, dead `analyzer-pages`).
**Root cause:** Accreted over time; no clear contract.
**Fix:** DEEP-DISC confirmed `frontend_dashboard_data` is the SOLE EF imported by talk2me-frontend (`src/lib/api.ts:9`). Others have zero code callers.
**Lesson:** When in doubt about which empire data EF to call, use `frontend_dashboard_data`. The others might be live but are not in the supported app graph.
