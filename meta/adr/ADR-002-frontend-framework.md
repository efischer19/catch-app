---
title: "ADR-002: Use Vanilla TypeScript with Vite for the Frontend"
status: "Accepted"
date: "2026-04-12"
tags:
  - "frontend"
  - "tooling"
  - "architecture"
---

## Context

- **Problem:** The catch-app repository needs a frontend build pipeline to
  support TypeScript, PWA features, and optimized production builds. The
  existing setup uses vanilla HTML/CSS/JS with no build step. We need to choose
  a frontend framework (or no framework) and a build tool.
- **Constraints:** The app is simple — four views (schedule, boxscore, about,
  settings) with no complex state management. Bundle size must stay small for
  PWA performance. The development philosophy favors simplicity (YAGNI, KISS).

## Decision

We will use **Vanilla TypeScript with Vite** as the frontend stack for V1.

1. **No framework** — The app's four simple views do not require the complexity
   of React, Vue, or Angular. Vanilla TypeScript with DOM APIs is sufficient.
2. **Vite** — Provides fast dev server with HMR, optimized production builds
   with tree-shaking, asset hashing, and code splitting out of the box.
3. **Vitest** — Pairs naturally with Vite for unit testing.
4. **ESLint + Prettier** — Standard TypeScript linting and formatting.

## Considered Options

1. **Vanilla TypeScript + Vite (chosen)**
    - *Pros:* Minimal bundle size, no framework lock-in, aligns with KISS
      philosophy, fastest possible load times, zero framework learning curve.
    - *Cons:* Manual DOM manipulation can be verbose for complex UIs. No
      built-in component model or state management.
2. **Preact + Vite**
    - *Pros:* React-compatible API at 3 KB, component model simplifies UI
      composition, large ecosystem of compatible libraries.
    - *Cons:* Adds a dependency for features not needed in V1. Overkill for
      four simple views.
3. **React + Vite**
    - *Pros:* Largest ecosystem, most developer familiarity, strong tooling.
    - *Cons:* ~40 KB min+gzip runtime, excessive for a simple app, framework
      lock-in, violates YAGNI for V1.

## Consequences

- **Positive:** Minimal bundle size (target < 50 KB gzipped total), no
  framework lock-in, fast builds, aligns with the development philosophy's
  emphasis on simplicity.
- **Negative:** If the app grows significantly in complexity (many interactive
  components, complex state), a framework may become desirable. This decision
  can be revisited via a new ADR.
- **Future Implications:** If a framework is needed later, Preact is the
  recommended upgrade path due to its small size and React API compatibility.
