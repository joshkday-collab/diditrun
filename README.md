# DidItRun

Push heartbeat monitor. Alerts when n8n / Make / Zapier / GitHub Actions / cron goes quiet **or** finishes green with zero records. No API keys.

**Wedge:** silent success via `?count=`. A green run that processed nothing is the product. Plain heartbeats without assertions are a fail for week 1.

> stale/zero for week 1 means count==0 on a ping; unchanged-count-across-N-periods is week 2+.

Contact: Josh · [jdenquiryautopilot@gmail.com](mailto:jdenquiryautopilot@gmail.com)

## What ships

- `GET|POST /p/<uuid>` — success heartbeat, optional `?count=N` (or JSON `{ "count": N }`)
- `GET|POST /p/<uuid>/fail` — explicit fail (received, not a success)
- Period + grace per check; overdue = no successful ping within period+grace
- Week-1 zero assert: `count` present and `count == 0` → `zero_count` alert
- UUIDv4 check IDs (capability tokens) + 30 req / 60s sliding window (429)
- Meta-heartbeat: the evaluator pings itself; a miss is P0
- Landing, free signup (≤10 checks), pricing, dashboard, email channel
- Billing stub for Solo £5 / Pro £12 (no live Stripe)
- Resend when `RESEND_API_KEY` is set; otherwise log + persist a stub
- n8n import + GitHub Action recipes in `templates/`

Out of week 1: SMS, live Telegram bot, agency multi-tenant, API-key polling, Midwatch scrape, live Stripe, paid hosts.

## Run locally (no paid infra)

```bash
cp .env.example .env.local
npm install
npm run dev
```

App: [http://127.0.0.1:43147](http://127.0.0.1:43147)

With Supabase env vars unset, DidItRun uses a JSON file store under `.data/` so the wedge is demoable on a laptop. Sign up, create a check, prove the five DoD items in `DONE.md`.

```bash
chmod +x scripts/verify-dod.sh
APP=http://127.0.0.1:43147 ./scripts/verify-dod.sh
```

## Supabase (production)

1. Create a free Supabase project (do not reuse an unrelated project).
2. Run `supabase/migrations/20261006100000_init.sql` in the SQL editor, or:

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

3. Copy URL, anon key, and **service role** into `.env.local` / Vercel env.
4. Enable Email auth. The `private.handle_new_user` trigger inserts `profiles`.
5. Ping routes use the service role. The UUID is the capability token — RLS never allows strangers to read another user's checks. `anon` cannot insert pings.

**Vercel without Supabase:** the file store writes `/tmp/diditrun` and will reset between instances. Use Supabase for a real deploy.

## Environment

See `.env.example`. Never commit `.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | recommended | Origin printed on ping URLs |
| `SESSION_SECRET` | local mode | HMAC for the session cookie |
| `NEXT_PUBLIC_SUPABASE_URL` | prod | Postgres + Auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod | Browser / SSR client |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | Ping + evaluator (server only) |
| `RESEND_API_KEY` | optional | Alert email; stub if missing |
| `RESEND_FROM` | optional | Needs Josh's verified sending domain |
| `CRON_SECRET` | recommended on Vercel | Authorise `/api/cron/evaluate` |

## Vercel deploy notes

- Framework preset: Next.js. Install command `npm install`, build `npm run build`.
- Hobby cron is **once per day** (`vercel.json` fires `0 8 * * *`). For minute-scale overdue/meta, add `templates/github-action-evaluate.yml` or call `/api/cron/evaluate` from an external cron. Local `next dev` ticks every 15s via `instrumentation.ts`. Every public ping also sweeps opportunistically.
- Set the env vars above. Do not expose the service role to the browser.
- Resend sending domain is a Josh unlock. Until then, alerts persist with `channel=log`.

## Billing

`lib/billing.ts` is the abstract checkout. Solo / Pro buttons record a `billing_intents` row and show the stub message. No Stripe keys in this repo.

## Copy constraints (lane)

- Never pitch “cheaper Healthchecks”.
- Allowed: catch green runs that did nothing, across tools, without handing over keys.
- No clinic / venue / Enquiry Autopilot B2B soft forms, no digital packs.

## Docs

- `STALE-RULE.md` — the one week-1 rule
- `DONE.md` — hard DoD + curl
- `/docs` — same rule in-product
- `templates/SETUP-n8n.md` and `templates/SETUP-github-action.md`
