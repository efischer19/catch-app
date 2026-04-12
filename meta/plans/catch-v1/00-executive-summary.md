# Catch App V1 — Executive Summary

> Planning document for the catch-app (frontend/UI) repository of the Catch
> project. For backend/data pipeline planning, see the companion catch-data
> repository.

## Vision

Catch is a zero-to-low-cost Progressive Web App that lets users browse MLB
schedules, view boxscores, and cast condensed-game highlight videos to Google
Cast devices. The frontend is a static TypeScript PWA that fetches pre-rendered
Gold JSON files from a CloudFront CDN — zero backend logic, zero server costs.

## Architecture Context

catch-app is one half of a two-repository architecture:

| Component | Repository | Technology |
| --- | --- | --- |
| Data ingestion & processing | catch-data | Python, AWS Lambda, S3 |
| Schema contract | catch-data → catch-app | JSON Schema via GitHub Actions |
| **Frontend PWA** | **catch-app** | **TypeScript, Vite, HTML/CSS** |

Data flows from the catch-data pipeline into Gold JSON files served via
CloudFront CDN. catch-app fetches these files and renders them in the browser:

```text
Gold JSON (S3 + CloudFront CDN)
        │
   fetch() from browser
        ▼
  catch-app PWA
        │
   ┌────┴────┐
   ▼         ▼
Browser    Google Cast
playback   (Chromecast)
```

## Epics & Sequencing

### Epic 1 — Project Bootstrap

Template-to-project cleanup: transform the static-js-app-blueprint template
into the catch-app project.

| # | Ticket | Summary |
| --- | --- | --- |
| 01-01 | [License to GPL](01-01-license-to-gpl.md) | Change MIT license to GPL-3.0-or-later |
| 01-02 | [Replace Placeholders](01-02-replace-template-placeholders.md) | Replace `{{PLACEHOLDER}}` tokens with catch-app values |
| 01-03 | [Customize README & Docs](01-03-customize-readme-and-docs.md) | Replace template README/docs with catch-app content |
| 01-04 | [Update CI Workflows](01-04-update-ci-workflows.md) | Update CI for TypeScript/frontend tooling |

**Dependencies:** None. This epic can begin immediately.

### Epic 2 — PWA Foundation

Establish the TypeScript build pipeline, type-safe data contract, data fetching
layer, and offline capability.

| # | Ticket | Summary |
| --- | --- | --- |
| 02-01 | [PWA Scaffold](02-01-pwa-scaffold.md) | Scaffold TypeScript PWA with Vite, manifest, ESLint, Vitest |
| 02-02 | [Schema Type Generation](02-02-schema-type-generation.md) | JSON Schema → TypeScript interfaces via `json-schema-to-typescript` |
| 02-03 | [Data Fetching Layer](02-03-data-fetching-layer.md) | Typed fetch layer with caching, error handling, timeout support |
| 02-04 | [Service Worker & Offline](02-04-service-worker-offline.md) | Workbox service worker with stale-while-revalidate caching |

**Dependencies:** Epic 1 (project must be bootstrapped first). Ticket 02-02
also depends on catch-data Epic 7 (Schema Sync) for the `schema.json` file,
but can use a placeholder schema during initial development.

### Epic 3 — Core UI

Build the four user-facing views that deliver the core product value.

| # | Ticket | Summary |
| --- | --- | --- |
| 03-01 | [Team Selector](03-01-team-selector.md) | Team picker (30 teams by league/division) and client-side routing |
| 03-02 | [Team Schedule View](03-02-team-schedule-view.md) | Full-season schedule with scores, statuses, and boxscore links |
| 03-03 | [Today's Slate](03-03-todays-slate.md) | Landing page showing today's and upcoming MLB games |
| 03-04 | [Boxscore View](03-04-boxscore-view.md) | R/H/E boxscore detail with pitcher info and video link |

**Dependencies:** Epic 2 (PWA foundation, data fetching layer, and generated
types must be in place).

### Epic 4 — Media & Casting

Video playback in the browser and Google Cast integration for Chromecast.

| # | Ticket | Summary |
| --- | --- | --- |
| 04-01 | [Video Player](04-01-video-player.md) | Native `<video>` player for condensed game `.mp4` files |
| 04-02 | [Google Cast](04-02-google-cast-integration.md) | Cast Web Sender SDK with Default Media Receiver |

**Dependencies:** Epic 3 (UI views must exist to host the video player and
Cast button).

### Epic 5 — Quality & Accessibility

Comprehensive quality assurance: accessibility compliance, performance
optimization, and automated testing.

| # | Ticket | Summary |
| --- | --- | --- |
| 05-01 | [WCAG Accessibility](05-01-accessibility-wcag.md) | WCAG 2.1 AA audit, automated axe-core testing, screen reader verification |
| 05-02 | [Performance](05-02-performance-optimization.md) | Core Web Vitals targets, Lighthouse CI, bundle optimization |
| 05-03 | [E2E Test Suite](05-03-e2e-test-suite.md) | Playwright E2E tests, visual regression, unit/component test coverage |

**Dependencies:** Epics 3 and 4 (all views and features must be built before
the comprehensive quality pass). Note: individual tickets in earlier epics
include accessibility and testing criteria — this epic is for the holistic
audit and CI integration.

## Dependency Graph

```text
Epic 1: Bootstrap ──────────────────────────────────────────────┐
    │                                                           │
    ▼                                                           │
Epic 2: PWA Foundation ─────────────────────────────────────┐   │
    │                                                       │   │
    ▼                                                       │   │
Epic 3: Core UI ────────────────────────────────────────┐   │   │
    │                                                   │   │   │
    ▼                                                   │   │   │
Epic 4: Media & Casting ───────────────────────────┐    │   │   │
    │                                              │    │   │   │
    ▼                                              ▼    ▼   ▼   ▼
Epic 5: Quality & Accessibility ◄──────────────────────────────┘
```

Epics are strictly sequential: each builds on the previous. Within each epic,
tickets are ordered but can overlap where dependencies allow (e.g., 03-01 and
03-03 could start in parallel since they share only the Epic 2 foundation).

## Persona Review Summary

Each ticket has been reviewed through the following lenses:

| Persona | Key Concerns Addressed |
| --- | --- |
| 🤑 **FinOps Miser** | Free static hosting (GitHub Pages), no runtime server costs, minimal CDN bandwidth via caching |
| ⚾ **Baseball Edge-Case Hunter** | Doubleheaders, rainouts, postponements, All-Star break, no-condensed-game scenarios, off-season staleness |
| 📺 **Living Room Tester** | Default Media Receiver for Cast, `.mp4` URL validation, CORS risk documentation, cross-device testing |
| ⚡ **PWA Performance Fanatic** | < 50 KB gzipped JS, Lighthouse 95+, service worker caching, lazy-loaded video player, system fonts |
| ♿ **Accessibility Coordinator** | WCAG 2.1 AA, semantic HTML, keyboard navigation, screen reader testing, `aria-live` for state changes |
| 🧪 **QA-for-the-Future Fanatic** | Vitest unit tests, Playwright E2E, axe-core in CI, visual regression baselines, mocked Gold JSON fixtures |
| 😴 **Lazy Maintainer** | Zero manual maintenance, automated schema sync, service worker auto-updates, no manual type definitions |

## ADR Decisions Needed

Several tickets identify architectural decisions that should be documented
as ADRs in this repository:

| Ticket | Proposed ADR Topic |
| --- | --- |
| 02-01 | Frontend framework/tooling selection (Vanilla TS + Vite vs React/Preact/Vue) |
| 02-04 | Service worker caching strategy (precache vs stale-while-revalidate vs network-only) |
| 03-01 | Client-side routing approach (History API vs router library) |

## Cross-Repo Dependencies

| catch-app Ticket | Depends on catch-data | What's Needed |
| --- | --- | --- |
| 02-02 (Schema Types) | Epic 7: Schema Sync | `schema.json` file synced to catch-app via automated PR |
| 02-03 (Data Fetching) | Epic 5: Gold Serving | Gold JSON files available on CloudFront CDN |
| 03-02, 03-03 (Views) | Epic 5: Gold Serving | `team_{id}.json` and `upcoming_games.json` endpoints live |
| 04-01 (Video Player) | Epic 3: Bronze Ingestion | `condensed_game_url` populated in Gold data |

For initial catch-app development, mock Gold JSON files can be used until the
catch-data pipeline is operational.

## Ticket Count

| Epic | Tickets |
| --- | --- |
| 1: Project Bootstrap | 4 |
| 2: PWA Foundation | 4 |
| 3: Core UI | 4 |
| 4: Media & Casting | 2 |
| 5: Quality & Accessibility | 3 |
| **Total** | **17** |
