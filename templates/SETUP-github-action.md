# GitHub Action → DidItRun

1. Create a check in DidItRun. Copy the UUIDv4.
2. Repo → Settings → Secrets: `DIDITRUN_CHECK_ID`.
3. Optional variable: `DIDITRUN_URL` (your deployed origin).
4. Copy `github-action-diditrun.yml` to `.github/workflows/diditrun.yml`.
5. For a job that already knows a record count, set `COUNT` in the env block (from a previous step output). `count=0` is the week-1 zero-records assertion.

## Evaluator tick (Hobby cron is daily)

Vercel Hobby only runs scheduled cron once per day. Add a second workflow that hits the evaluator every 15 minutes:

```yaml
name: DidItRun evaluate
on:
  schedule:
    - cron: "*/15 * * * *"
  workflow_dispatch:
jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS -X POST -H "Authorization: Bearer ${{ secrets.DIDITRUN_CRON_SECRET }}" "${{ vars.DIDITRUN_URL }}/api/cron/evaluate"
```

Local `next dev` ticks the evaluator itself via `instrumentation.ts`.
