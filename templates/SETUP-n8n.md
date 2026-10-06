# n8n → DidItRun

Import `n8n-diditrun-heartbeat.json` (Workflows → Import from File).

1. Create a check in the DidItRun dashboard. Copy the UUID.
2. In n8n, set environment variables (or replace in the HTTP node):
   - `DIDITRUN_URL` — your app origin, e.g. `https://example.vercel.app`
   - `DIDITRUN_CHECK_ID` — the UUIDv4 from the dashboard
3. Wire **Resolve record count** after the node that knows how many records you processed. The template reads `$json.count`, then `$json.items.length`, then `0`.
4. Leave `?count=` on the request. Week-1 stale/zero means `count==0` on a ping. Omitting count is a plain heartbeat.

Attach this as the last step of the real workflow, not a separate “monitoring” flow that can fail independently of the work.

Place the same HTTP Request on the Error Workflow if you want an explicit `/p/<uuid>/fail` when n8n throws.
