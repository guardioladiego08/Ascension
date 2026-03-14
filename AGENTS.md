# Codex Project Rules

## Change Logging

After every code edit, update `LESSONS_LEARNED.md` in the project root before finishing the task.

Each new entry should include:

1. Date
2. File or feature affected
3. What changed
4. Why it changed
5. Insight, risk, or rule to remember next time

## Scope

Use the log for any code change, including bug fixes, refactors, feature work, configuration changes, and behavior adjustments.

Skip the log for:

1. Pure formatting changes
2. Renames with no behavior change
3. Read-only analysis with no code edits

## Entry Format

Append entries to the top of `LESSONS_LEARNED.md` using this structure:

```md
## YYYY-MM-DD - Short Title

- File/Feature: ...
- What changed: ...
- Why: ...
- Insight: ...
```

Keep entries concise, factual, and free of secrets.
