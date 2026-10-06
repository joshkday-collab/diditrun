#!/usr/bin/env bash
set -euo pipefail

APP="${APP:-http://127.0.0.1:43147}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

say() { printf '\n== %s ==\n' "$*"; }

say "signup"
EMAIL="dod-$(date +%s)@example.com"
curl -fsS -c "$JAR" -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"correct-horse\"}" \
  "$APP/api/auth/signup" >/tmp/diditrun-signup.json

say "create check"
CHECK=$(curl -fsS -b "$JAR" -H 'content-type: application/json' \
  -d '{"name":"DoD","periodSeconds":20,"graceSeconds":5,"assertZero":true}' \
  "$APP/api/checks" | python3 -c 'import json,sys; print(json.load(sys.stdin)["check"]["id"])')
echo "CHECK=$CHECK"
echo "$CHECK" | grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

say "1 zero-count alert"
ZERO=$(curl -fsS "$APP/p/$CHECK?count=0")
echo "$ZERO"
echo "$ZERO" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["zeroAlert"] is True, d'

say "2 control: omitted count is not zero"
PLAIN=$(curl -fsS "$APP/p/$CHECK")
echo "$PLAIN"
echo "$PLAIN" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["zeroAlert"] is False, d'

say "3 overdue quiet alert"
curl -fsS -b "$JAR" -H 'content-type: application/json' \
  -d '{"secondsAgo":40}' "$APP/api/checks/$CHECK/backdate" >/dev/null
EVAL=$(curl -fsS -b "$JAR" -X POST "$APP/api/cron/evaluate")
echo "$EVAL"
echo "$EVAL" | python3 -c 'import json,sys; d=json.load(sys.stdin); types=[f["type"] for f in d.get("fired",[])]; assert "overdue" in types, d'

say "4 meta P0"
curl -fsS -b "$JAR" -X POST "$APP/api/meta/silence" >/dev/null
META_EVAL=$(curl -fsS -b "$JAR" -X POST "$APP/api/cron/evaluate")
echo "$META_EVAL"
echo "$META_EVAL" | python3 -c 'import json,sys; d=json.load(sys.stdin); types=[f["type"] for f in d.get("fired",[])]; assert "meta" in types, d'

say "5 unguessable + 404"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$APP/p/not-a-uuid")
test "$CODE" = "404"

say "6 rate limit 429"
LAST=200
for _ in $(seq 1 31); do
  LAST=$(curl -s -o /tmp/diditrun-rl -w '%{http_code}' "$APP/p/$CHECK?count=1")
done
echo "last status=$LAST"
test "$LAST" = "429"

say "PASS — week-1 DoD items 1–5"
