# TODOS

## Deferred from Eng Review (2026-03-21)

### 1. Table partitioning for `usage_events`
**What:** Partition usage_events by month using Postgres native range partitioning.
**Why:** Append-only billing table grows unbounded. At scale, aggregation queries will degrade.
**Trigger:** When monthly aggregation queries exceed 100ms or row count exceeds 50M.
**Context:** Current growth estimate: ~300K rows/month at 10K daily invocations. Postgres handles 3.6M rows/year without partitioning.
**Depends on:** Nothing — can be done independently at any time.

### 2. Handle 4 critical failure gaps
**What:** Add error handling for: (1) DB connection failure during auth → return 503, (2) S3/DB inconsistency → return clear error + alert, (3) Usage event write failure → write to fallback queue, (4) Client disconnect → cancel Claude API call via AbortController.
**Why:** These are silent failures that either hang the user or lose billing data. Identified during eng review failure mode analysis.
**Trigger:** Post-MVP hardening, before any external users.
**Context:** Each gap is independently fixable. Priority order: #1 (auth hang) > #4 (orphaned calls) > #3 (billing data loss) > #2 (S3 inconsistency).
**Depends on:** Core invocation flow being implemented first.

### 3. Database indexes on hot query paths
**What:** Create indexes on usage_events(user_id, created_at), usage_events(skill_id, created_at), and users(api_key_hash).
**Why:** Usage history and creator analytics queries will full-table-scan without indexes.
**Trigger:** When query latency exceeds 50ms or table exceeds 1M rows.
**Context:** UNIQUE constraints on skills.slug and users.email already create implicit indexes. Use `CREATE INDEX CONCURRENTLY` to avoid write locks.
**Depends on:** Schema being finalized.
