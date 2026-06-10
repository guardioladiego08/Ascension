# PostHog Tracking History and Reference

Use this file to keep a dated history of tracking changes and a quick reference for event properties and feature coverage.

## Change History Log

Add newest entries at the top.

### Entry template

```md
## YYYY-MM-DD - Short change title

- Type: added | updated | deprecated | fixed
- Event(s): `event_name_1`, `event_name_2`
- What changed: ...
- Why: ...
- Files touched: `path/to/file.tsx`, `path/to/helper.ts`
- Validation: PostHog Live Events / dashboard / test notes
- Risk/Follow-up: ...
```

## Event Change History

| Date | Type | Event(s) | Summary | Files touched | Validation | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | added | `example_event_name` | Initial instrumentation | `app/example.tsx` | Live Events | - |

## Property Dictionary (Reference)

Use this section to define canonical meaning and allowed values for shared properties.

| Property | Type | Allowed values / format | Used by events | Notes |
| --- | --- | --- | --- | --- |
| `screen_name` | string | route/screen identifier | `*` | Use stable screen keys |
| `platform` | string | `ios`, `android`, `web` | `*` | Derive from app runtime |
| `app_version` | string | semantic version | `*` | From app config/build |
| `session_id` | string | UUID | session-related events | Do not reuse across sessions |
| `timestamp_client` | string | ISO-8601 | `*` | Client timestamp when event was sent |

## Feature-to-Event Coverage Map

| Feature area | Primary events | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| Indoor cardio | - | planned | @owner | Add save/share/delete events |
| Outdoor cardio | - | planned | @owner | Add start/pause/resume/finish events |
| Strength | - | planned | @owner | Add workout start/complete events |
| Nutrition | - | planned | @owner | Add meal log/edit/delete events |
| Social | - | planned | @owner | Add post/share/follow events |

## References

- PostHog Product Docs: [https://posthog.com/docs](https://posthog.com/docs)
- PostHog Event Capture: [https://posthog.com/docs/product-analytics/capture-events](https://posthog.com/docs/product-analytics/capture-events)
- PostHog Events API: [https://posthog.com/docs/api/events](https://posthog.com/docs/api/events)
