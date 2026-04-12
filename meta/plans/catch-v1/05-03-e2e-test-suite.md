# feat: End-to-end and visual regression test suite

## What do you want to build?

Build a comprehensive automated test suite for catch-app that covers unit
tests, component tests, and end-to-end (E2E) tests. The suite should provide
high confidence that the app works correctly across all views and interactions,
and catch visual regressions automatically.

## Acceptance Criteria

- [ ] Unit tests cover: data fetching layer, data transformation/formatting utilities, team list constant validation
- [ ] Component tests cover: team selector rendering, schedule view rendering with mock data, boxscore view rendering, video player controls
- [ ] E2E tests cover the critical user path: open app → view today's slate → select a team → view schedule → open boxscore → play video
- [ ] E2E tests use a test framework (e.g., Playwright) with mocked Gold JSON responses (no real CDN dependency)
- [ ] Visual regression tests capture screenshots of key views and compare against baseline snapshots
- [ ] All tests run in CI on every PR
- [ ] Test coverage report is generated and accessible (tracked but not gated on a specific percentage)
- [ ] Tests complete in under 2 minutes in CI
- [ ] A testing README section documents: how to run tests locally, how to update visual snapshots, how to add new E2E scenarios

## Implementation Notes

**🧪 QA-for-the-Future Fanatic notes — this is the central testing ticket:**

- **Unit tests:** Use Vitest (pairs naturally with Vite from ticket 02-01).
  Test pure functions: date formatting, score display formatting, timezone
  conversion, team lookup by ID, error message generation.
- **Component tests:** Use Testing Library (`@testing-library/dom` or a
  framework-specific variant) for component-level tests. Test that components
  render correctly with mock data and respond to user interactions.
- **E2E tests:** Use Playwright for cross-browser E2E testing. Playwright
  supports Chrome, Firefox, and WebKit — critical for verifying a PWA across
  browsers.
- **Visual regression:** Use Playwright's built-in screenshot comparison.
  Start with Playwright screenshots (free, no external service dependency).
  A tool like Percy or Chromatic can be added later if needed.

**Mock data strategy:**

- E2E tests should intercept `fetch` requests and return mock Gold JSON
  responses. This makes tests fast, deterministic, and independent of the
  data pipeline's state.
- Use the same JSON Schema from catch-data to validate mock data fixtures,
  ensuring test data is realistic and matches the contract.

**⚾ Baseball Edge-Case Hunter notes:**

Include E2E scenarios for:

1. A team schedule with a doubleheader
2. Today's slate with no games (All-Star break empty state)
3. A boxscore with no save pitcher
4. A game with no condensed video available
5. A postponed game in the schedule

**♿ Accessibility Coordinator notes:**

- Integrate `axe-core` into E2E tests via `@axe-core/playwright`. Run an
  accessibility scan on each page visited during E2E scenarios. This catches
  regressions automatically without needing separate a11y test runs.

**😴 Lazy Maintainer notes:**

- Visual regression baselines should be updated intentionally (via a commit),
  not automatically. This forces a human review of any visual changes.
- E2E tests with mocked data don't break when the pipeline changes — they
  only break when the frontend code changes. This eliminates false positives
  from data pipeline issues.
