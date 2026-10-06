# Week-1 Definition of Done

Heartbeat-only URLs = **fail**. The demo must prove all five items.

Week-1 stale rule (also in `STALE-RULE.md` and `/docs`):

> stale/zero for week 1 means count==0 on a ping; unchanged-count-across-N-periods is week 2+.

Assume the app is at `$APP` (local default `http://127.0.0.1:43147`). Cookie jar: `cookies.txt`.

```bash
export APP=http://127.0.0.1:43147
EMAIL="demo-$(date +%s)@example.com"
curl -fsS -c cookies.txt -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"correct-horse\"}" \
  "$APP/api/auth/signup"
CHECK=$(curl -fsS -b cookies.txt -H 'content-type: application/json' \
  -d '{"name":"DoD","periodSeconds":20,"graceSeconds":5,"assertZero":true}' \
  "$APP/api/checks" | python3 -c 'import json,sys; print(json.load(sys.stdin)["check"]["id"])')
```

Confirm `$CHECK` matches UUIDv4: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.

## 1. Overdue quiet alert

```bash
curl -fsS -b cookies.txt -H 'content-type: application/json' \
  -d '{"secondsAgo":40}' "$APP/api/checks/$CHECK/backdate"
curl -fsS -b cookies.txt -X POST "$APP/api/cron/evaluate"
curl -fsS -b cookies.txt "$APP/api/checks/$CHECK" | python3 -m json.tool
```

Expect an `alerts[]` row with `"type": "overdue"`. The evaluator log (or Resend stub payload) names the quiet check.

## 2. `?count=0` / zero-path alert

```bash
curl -fsS "$APP/p/$CHECK?count=0"
curl -fsS -b cookies.txt "$APP/api/checks/$CHECK" | python3 -m json.tool
```

Expect `"zeroAlert": true` on the ping response and an `alerts[]` row with `"type": "zero_count"`.

Control cases:

```bash
curl -fsS "$APP/p/$CHECK"            # no zero alert
curl -fsS "$APP/p/$CHECK?count=4"    # no zero alert
```

## 3. Meta-heartbeat

```bash
curl -fsS "$APP/api/meta/status"
curl -fsS -b cookies.txt -X POST "$APP/api/meta/silence"
curl -fsS -b cookies.txt -X POST "$APP/api/cron/evaluate"
curl -fsS "$APP/api/meta/status"
```

After silence + evaluate: a `meta` alert is recorded (P0 subject) and the dashboard banner reads **P0 — meta-heartbeat is quiet** until the next healthy tick. The evaluator always self-pings *after* checking the previous self-check, so a missed scheduler is what trips P0.

## 4. Ping hardening

Unguessable IDs — create two checks and confirm both IDs are UUIDv4. A non-v4 path 404s:

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$APP/p/not-a-uuid"
# 404
```

Rate limit — 30 hits / 60s per UUID, then 429:

```bash
for i in $(seq 1 31); do
  curl -s -o /tmp/ping-body -w '%{http_code}\n' "$APP/p/$CHECK?count=1"
done | tail -n 3
# last line 429, body error=rate_limited, Retry-After set
```

## 5. One concrete stale rule

Implemented in `lib/stale.ts` (`isWeek1ZeroCount`). Documented here, in `STALE-RULE.md`, in the README, and on `/docs`.

| Signal | Rule | Alert type |
| --- | --- | --- |
| Zero / stale (week 1) | `count` present AND `count == 0` | `zero_count` |
| Overdue / quiet | no successful ping within period+grace | `overdue` |
| Unchanged count across N periods | **not week 1** | — |

`scripts/verify-dod.sh` runs 1–4 against a live `$APP`.
