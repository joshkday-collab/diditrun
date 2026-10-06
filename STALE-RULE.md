# Week-1 stale / zero-records rule

stale/zero for week 1 means count==0 on a ping; unchanged-count-across-N-periods is week 2+.

A ping is a zero-records assertion when the `count` query param (or JSON `count` field) is **present** and **equal to 0**. That fires a `zero_count` alert even though the heartbeat itself succeeded — the workflow ran green and processed nothing. Omitting `count` is a plain heartbeat. `count=17` is work done. Overdue is a separate rule: no successful ping within `period_seconds + grace_seconds` fires a quiet alert. Fail pings (`/p/<uuid>/fail`) are received but do not reset the quiet clock.
