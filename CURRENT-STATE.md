# CURRENT-STATE — analyzer-talk2me

_Last updated: 2026-05-25_

## Live URLs
- https://analyzer.ftable.co.il (landing, redirects 307)
- https://ftable.co.il/hub/ (MEGA HUB, deployed 2026-05-25)
- https://empire-dashboard-five.vercel.app (legacy "deprecated" but still 200 — flagged for retirement)

## Recent changes
- 2026-05-25: MEGA HUB CSP fix shipped. New per-dir `/public_html/hub/.htaccess` with vjxqlqtlywovnbidovit in connect-src + frame-src *. Catalog updated in empire_dashboards.
- 2026-05-25: DEEP-DISC discovery confirmed `frontend_dashboard_data` is the CANONICAL Empire data EF (sole caller is this frontend).
- 2026-05-18: Anthropic proxy hardened — `anthropic-proxy` EF now `verify_jwt=true` (protected).

## Known issues / debt
- `empire-dashboard-five.vercel.app` still serves "Empire CEO Dashboard" — same audience as MEGA HUB. Decide retire vs un-deprecate.
- `empire-snapshot-public`, `monitor-dashboard`, `project-info` EFs have zero code callers — flagged for Roye to confirm bookmark/external usage before retire.

## In flight
- None active right now.
