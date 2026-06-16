# PROJECT-RULES — analyzer-talk2me

> Invariants and "do not" rules. Update when a rule changes.

## Iron rules
1. **All counts read via `frontend_dashboard_data` Edge Function.** No direct backend reads from the React tree. See `src/lib/api.ts:9`. This is the canonical Empire data API (confirmed sole caller in DEEP-DISC 2026-05-25).
2. **Supabase project is `vjxqlqtlywovnbidovit` (empire-hq).** Shared with: talk2me, analyzer-standalone, leadsmachine, roofing-leads, 11steps-action-queue, billionaire-market.
3. **Hub deploy uses `cc_deploy_hub_path_v1` SECURITY DEFINER RPC** on the feature-table Supabase project (uiyqswnhrbfctafeihdh), which calls cpanel-deploy EF with a deploy_token from `deploy_tokens` table. Path is relative to `/public_html`.
4. **MEGA HUB at `ftable.co.il/hub/`** has its own per-directory `.htaccess` with CSP allowing `vjxqlqtlywovnbidovit.supabase.co` (+wss) and `frame-src *`. Do not strip those.

## Do not
- Do not bypass the EF API layer for prototype convenience. The whole point is that the front-end has zero RLS surface.
- Do not edit the hub `.htaccess` casually — verify with `curl -I https://ftable.co.il/hub/` after.
