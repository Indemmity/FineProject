# Alert Rules — Monitoring Thresholds

## LLM Service

| Metric | Threshold | Severity | Channel | Action |
|---|---|---|---|---|
| LLM error rate | > 5% over 5 min window | Critical | PagerDuty | Check Groq API status; fall back to mock mode |
| LLM latency P95 | > 10s over 10 requests | Warning | Slack | Check network; consider increasing timeout |
| LLM cache hit rate | < 40% over 1 hour | Warning | Slack | Review cache key generation; add warm-up queries |

## SMTP / Email Delivery

| Metric | Threshold | Severity | Channel | Action |
|---|---|---|---|---|
| SMTP failure rate | > 10% over 1 hour | Critical | Slack | Check SMTP credentials; verify rate limits |
| Bounce rate | > 5% over 100 sends | Warning | Slack | Review recipient list quality |
| Queue backlog | > 100 pending emails | Warning | Slack | Check rate limiter; scale sender workers |

## Application Health

| Metric | Threshold | Severity | Channel | Action |
|---|---|---|---|---|
| Health check failure | 3 consecutive failures | Critical | PagerDuty | Restart service; check dependencies |
| API error rate (5xx) | > 1% over 5 min | Warning | Slack | Check error logs for pattern |
| API latency P95 | > 500ms over 1 min | Warning | Slack | Profile slow endpoints; check DB queries |

## Infrastructure

| Metric | Threshold | Severity | Channel | Action |
|---|---|---|---|---|
| CPU usage | > 80% for 5 min | Warning | Slack | Consider scaling up |
| Memory usage | > 85% for 5 min | Warning | Slack | Check for memory leaks |
| Disk space | < 20% free | Critical | PagerDuty | Clean up uploads; extend volume |
| PostgreSQL connections | > 80% of max | Warning | Slack | Increase pool size; check idle connections |

## Business Metrics

| Metric | Threshold | Severity | Channel | Action |
|---|---|---|---|---|
| Zero jobs discovered (daily) | 0 jobs for 24h | Warning | Slack | Check harvester sources; verify adapters |
| Zero outreach sent (daily) | 0 sends for 24h | Info | Slack | Review application pipeline status |