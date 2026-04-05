# Badges Schema Notes

This folder documents the shared `badges` schema used for strength, running, and nutrition achievements.

## Files

- `context.md`: badge product rules, visibility assumptions, and unlock model notes
- `locations.md`: canonical migrations, RPCs, and app entry points that read or write badge data
- `changes.md`: dated notes about badge schema rollouts and follow-up decisions

## Current focus

- Shared badge tables for badge families, tiers, user progress, and unlock history
- Strength badge rollout for milestones, streaks, and record-based badges
- Running badge rollout for indoor and outdoor runs, including streak, distance, elevation, and pace/time record series
- Nutrition badge rollout for logged-day milestones, goal-hit consistency, meal coverage, and single-day nutrition records
- Shared RPC surfaces for summary screens, progress sections, and social badge chips
