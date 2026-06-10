# PostHog Event Tracking Registry

Use this file as the source of truth for what events should exist, where they fire, and what properties they must include.

## How to use this file

1. Add a row before implementing a new event.
2. Keep naming in `snake_case`.
3. Mark `Status` as `implemented` only after QA verifies it in PostHog.
4. Link each event to the exact file where `posthog.capture(...)` is called.
5. Do not track secrets or direct PII (raw email, phone, full name, etc.).

## Event Status Legend

- `planned`: Defined but not yet instrumented.
- `implemented`: Instrumented and verified in PostHog.
- `deprecated`: No longer emitted; kept for historical reference.

## Event Inventory

| Event name | Status | Screen/Flow | Trigger | Required properties | Optional properties | Source file | Owner | Last verified |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `example_event_name` | planned | Example flow | User taps Example CTA | `user_id`, `screen_name` | `session_id` | `app/example.tsx` | @owner | YYYY-MM-DD |

## Naming and Property Rules (PostHog)

- Event names: `domain_object_action` (example: `cardio_session_saved`).
- Property names: lowercase `snake_case`.
- Use stable IDs where possible (`session_id`, `workout_id`, `post_id`).
- Include context properties consistently:
  - `screen_name`
  - `platform` (`ios`, `android`, `web`)
  - `app_version`
  - `timestamp_client` (ISO-8601)

## QA Checklist (Before marking implemented)

- Event appears in PostHog Live Events.
- Event name and property keys match this file exactly.
- Required properties are present and correctly typed.
- Event is emitted once per expected user action (no duplicates).
- Sensitive data policy is respected.
