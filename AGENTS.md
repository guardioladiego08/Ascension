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

## Screen Composition

When building or significantly changing screens, prefer splitting non-trivial UI into focused reusable components instead of keeping a large monolithic screen file.

Use this default structure when it helps:

1. Screen entry file for composition and routing
2. Local presentational components for major sections
3. Local hooks or helpers for data loading and derived view state
4. Shared local styles or utilities when a screen grows large

Prioritize this split when it improves:

1. Reusability
2. Context efficiency for future edits
3. Readability of the main screen file
4. Safer iteration on individual sections without touching unrelated code

## Schema Documentation

Whenever a schema is updated, or the user shares schema context that matters to future work, store that information in `docs/schema/<schema-name>/` instead of leaving it only in chat.

For each schema folder, maintain these files:

1. `README.md` for a short summary and navigation
2. `context.md` for business rules, user-provided context, and assumptions
3. `locations.md` for canonical source files such as migrations, SQL, generated types, tests, and seeds
4. `changes.md` for dated notes about schema changes and why they were made

Also update `docs/schema/SCHEMA_INDEX.md` so schema information is easy to find quickly.
