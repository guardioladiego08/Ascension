---
name: fitness-mobile-ui-system
description: Design dark-theme mobile fitness app UI systems, tokens, components, motion, accessibility specs, and reusable assets for iOS and Android. Use when Codex needs to create or extend a modern fitness product design system, specify workout/run/goals/settings screens, generate WCAG-compliant dark themes, avoid Apple Activity ring lookalikes, or produce implementation-ready CSS, SwiftUI, and Jetpack Compose snippets.
---

# Fitness Mobile UI System

Use this skill to produce concrete, token-driven fitness UI specs that stay dark across all states and map cleanly to Apple HIG, Material 3, and WCAG 2.2.

## Workflow

1. Start with `references/fitness-dark-theme-system.md` as the canonical output shape.
2. Use Accent Palette D by default unless the user asks for A, B, C, or E.
3. Keep the neutral foundation palette fixed and swap only one accent palette at a time.
4. Keep goal-completion visuals distinct from Apple Activity rings; prefer the bundled hexagon, capsule ladder, spiral, and droplet widgets.
5. Preserve minimum targets of 44pt on iOS, 48dp on Android, and 24 CSS px for WCAG where applicable.
6. Keep loading, empty, and modal states dark. Do not introduce bright white flashes.

## Output Rules

- Mirror the section order from `references/fitness-dark-theme-system.md` unless the user asks for a smaller subset.
- When the user wants raw tokens, load `assets/fitness-dark-theme-tokens.json`.
- When the user wants reusable vector shapes, use the SVGs in `assets/`.
- For numeric timers, pace, distance, and weight readouts, use monospaced digits.
- For charts and goal status, pair color with shape, icon, label, or pattern so the UI does not depend on color alone.

## Resources

- `references/fitness-dark-theme-system.md`: Canonical cross-platform design system spec and code snippets.
- `assets/fitness-dark-theme-tokens.json`: Machine-friendly token export.
- `assets/goal-widget-hexagon-tank.svg`: Vertical tank-fill progress widget.
- `assets/goal-widget-capsule-ladder.svg`: Segmented capsule progress widget.
- `assets/goal-widget-spiral-square.svg`: Rounded-square spiral progress widget.
- `assets/goal-widget-droplet-fill.svg`: Droplet progress widget.
