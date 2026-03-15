# Supabase Schema Context

Use this file for durable schema context that should not live only in chat.

## 2026-03-14 - SQL guidance workflow

- For Supabase SQL work, combine the local skill in `.agents/skills/supabase-postgres-best-practices/`, this schema documentation folder, and the actual SQL under `supabase/`.
- The skill should guide query quality, indexing, pagination, RPC design, and RLS performance patterns.
- Project-specific rules still come from this repo's schema docs and migrations, not from the generic skill examples.

Capture information such as:

1. Domain rules
2. Naming decisions
3. Data ownership boundaries
4. Assumptions behind tables, views, RPCs, triggers, and policies
5. User-provided constraints or edge cases

Add new notes at the top when they materially affect future schema work.
