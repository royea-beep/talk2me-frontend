# TALK2ME Frontend Scaffold - Handoff to pm-talk2me

> Written by Strategic AI during scaffold execution 2026-05-18.
> pm-talk2me has been dormant 24+ days. Council voted 6-0 to scaffold in absence.
> Governance row: roye_action_items.slug = pm_talk2me_dormancy_decision_2026_05_16 (p2).

---

## TL;DR for pm-talk2me on reactivation

1. The frontend exists. It runs on localhost:3000 via `npm run dev`.
2. It is **read-only**. It reads 4 backend tables through ONE Edge Function (frontend_dashboard_data) with a strict column whitelist.
3. **NOTHING mutates backend state from this frontend.** No INSERTs, no UPDATEs, no cron changes, no other-EF changes.
4. The Edge Function explicitly excludes `knowledge_vault.content` and `knowledge_vault.description` because those columns contain live secrets (Telegram bot_token, etc.) per Council audit.
5. There is no auth yet. Iteration 1 = single-user (Roye on his machine). Auth is iteration 2 territory.

---

## What scaffold added

### New code (in this repo)
```
src/
  app/
    layout.tsx              - Shell: sidebar + topbar + main, dark theme
    page.tsx                - Home with 4 stat cards (counts via EF)
    projects/page.tsx       - Lists project_pipeline rows
    gprompts/page.tsx       - Lists gprompt_registry rows
    knowledge/page.tsx      - Lists knowledge_vault rows (metadata only)
    sessions/page.tsx       - Server entry for sessions
    sessions/SessionsClient.tsx - Client component with Load-more
    api/health/route.ts     - Health endpoint, verifies EF reachable
    api/sessions-page/route.ts - Paginated proxy used by SessionsClient
  components/
    ExpandableRow.tsx       - Reusable click-to-expand table row
    Sidebar.tsx             - Left nav (5 items)
  lib/
    api.ts                  - fetchTable() / fetchCount() wrappers around EF
```

### New Supabase Edge Function (in Supabase, NOT this repo)
- Name: `frontend_dashboard_data`
- Slug: 2cabc111-5243-40c9-8b2e-a79aa665e330
- verify_jwt: false (anon-callable; auth done by column/table whitelist server-side)
- Internal: uses SUPABASE_SERVICE_ROLE_KEY (already in EF env)
- Whitelisted tables: project_pipeline, gprompt_registry, knowledge_vault, zpm_sessions
- Per-table column whitelist enforced strictly (see EF source in Supabase Studio)
- Smoke test verified zero secrets leak through

### Cron jobs
**Untouched.** HC.2 satisfied. No cron.job rows added/changed.

### Other Edge Functions
**Untouched.** HC.3 satisfied. The only EF added has the required `frontend_` prefix.

---

## Files pm-talk2me should review first when reactivated

In this order:

1. `HANDOFF.md` (this file) - the why and what
2. `docs/SCAFFOLD_REPORT.md` - point-in-time facts (counts, gates, timing)
3. `src/lib/api.ts` - the entire backend contract is here, 50 lines
4. Supabase Studio - Edge Function `frontend_dashboard_data` source (column whitelist is the security boundary)
5. `src/app/page.tsx` - home; everything else is similar structure
6. `src/app/sessions/SessionsClient.tsx` - the only meaningful client component (pagination)

If anything looks off after review, see "Rollback" at the bottom.

---

## What is still TBD (iteration 2+)

These were explicitly out of scope per V3 LOCKED DECISIONS:

| Deferred | Why | Notes |
|---|---|---|
| Authentication | LOCKED #4 | Single-user iter-1. When added, RLS policies on `authenticated` role likely cover most reads already. |
| Custom domain | LOCKED #3 | Suggested `talk2me.ftable.co.il`, defer until launch. |
| Production deploy | LOCKED instruction | "No deploy to prod unless Big Boss says ship or deploy." `vercel dev` only for now. |
| Charts / visualizations | OUT OF SCOPE | Iter 2. |
| ZPM session deep-dives | OUT OF SCOPE | Iter 2. Right now sessions page shows metadata only. |
| Search / filters | OUT OF SCOPE | Iter 2. Currently sort-by-recency only. |
| Mobile responsive polish | OUT OF SCOPE | Tailwind defaults only. |
| Settings / profile pages | OUT OF SCOPE | No user yet. |
| Edit / create / delete UI | LOCKED | Read-only by design. |
| Any UI library (shadcn etc) | LOCKED | Iter 2 may add shadcn. |
| Knowledge content preview | Security | The 54-rows-with-secrets audit blocks direct content exposure. Iter 2 may add a redacting EF (`frontend_knowledge_preview`) with regex-based secret strip. |

---

## Dependencies added

Created by `create-next-app@latest`:
- next (v16.2.6)
- react, react-dom
- typescript, @types/node, @types/react, @types/react-dom
- tailwindcss v4, @tailwindcss/postcss
- 47 total packages, 2 moderate severity advisories (default Next 16 audit)

**No additional runtime deps added by this scaffold.** `@supabase/supabase-js` was intentionally NOT installed - all backend access goes via the EF using plain `fetch`, which is lighter and more transparent.

---

## Governance link

- Council vote: 6-0 to scaffold (May 16 2026, see council recap in chat history).
- Governance row: `roye_action_items.slug = pm_talk2me_dormancy_decision_2026_05_16` (priority p2). When pm-talk2me reactivates, the `what_to_do` field documents options.
- Failed first attempt: `bot_tasks.id = b34111a9-35ec-4b8c-920e-f44b16024001` (status=failed, verdict=gates_failed, gate=G1). Audit trail preserved.
- This (successful) attempt: `bot_tasks.id = 4f7544cb-15a3-4132-a9d2-24e467517a23`.

---

## Rollback

Drop everything in 3 commands:

```bash
# Delete frontend code (local)
rm -rf /c/Projects/_empire/talk2me-frontend

# Delete GitHub repo
gh repo delete royea-beep/talk2me-frontend --yes

# Delete Edge Function from Supabase
supabase functions delete frontend_dashboard_data --project-ref vjxqlqtlywovnbidovit
```

Zero side effects elsewhere. No backend tables touched. No cron jobs created. No other EFs touched.
