# Home Test Suite

This folder contains the first focused unit and integration test pass for the home tab.

## What is covered

- `homeUtils.test.js`: pure helper logic for formatting, progress math, date labels, and goal conversions
- `homeComponents.test.js`: presentational home components and modal button callbacks
- `useHomeDashboard.test.js`: mocked Supabase data loading and daily aggregation logic
- `WeeklyKpiRow.test.js`: weekly summary loading, backend compatibility fallbacks, and rendered KPI values
- `HomeScreen.test.js`: home screen integration, quick actions, completion cards, modal flows, and navigation pushes

## How these tests work

- The suite is isolated under `tests/home` so it stays separate from app source files.
- Supabase calls are mocked in the hook and KPI tests. These tests verify frontend data-loading behavior without hitting a live backend.
- Home screen navigation is mocked, so route assertions check the payload passed to `router.push`.
- Shared Jest setup lives in `/Users/diegoguardiola/Desktop/Ascension-main/jest.setup.js`.

## Commands

Run only the home suite:

```bash
npm run test:home
```

Run the full Jest suite once, non-interactively:

```bash
npm run test:ci
```

Run Jest in watch mode:

```bash
npm test
```

Run one specific file:

```bash
npx jest tests/home/HomeScreen.test.js --runInBand
```

## How to instruct Codex

Useful prompts:

- "Run `npm run test:home` and fix any failures."
- "Add coverage for the next home component in `tests/home`."
- "Extend the mocked Supabase home tests to cover an error state."
- "Convert this home interaction bug into a regression test under `tests/home/HomeScreen.test.js` first, then fix it."
