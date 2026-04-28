# catch-app

> A frontend TypeScript PWA for browsing baseball statistics.

## What Is This?

`catch-app` is a progressive web application (PWA) for browsing MLB schedules
and boxscores, with Chromecast casting support. Data collection and processing
are handled by the companion [catch-data](https://github.com/efischer19/catch-data)
repository; this repository is responsible for the user-facing frontend.

## Architecture Overview

Catch uses a two-repository architecture:

- **[catch-data](https://github.com/efischer19/catch-data)** (Python backend) —
  fetches data from the MLB Stats API, processes it into a compact "Gold JSON"
  format, and publishes static JSON files to a CDN.
- **catch-app** (this repo) — a static frontend PWA that reads those Gold JSON
  files from the CDN and renders schedules, boxscores, and Chromecast controls.
  No server-side logic is required; the app is deployed as a static site.

## Project Structure

| Path | Purpose |
| :--- | :--- |
| `src/` | Frontend source files — `index.html`, `main.ts`, `assets/` |
| `public/` | Static assets copied as-is to `dist/` (PWA manifest, icons) |
| `tests/` | Vitest test files |
| `meta/adr/` | Architecture Decision Records — the logbook of *why* decisions were made |
| `meta/plans/` | Project plans and roadmaps |
| `docs-src/` | Source files for generated documentation (MkDocs) |
| `scripts/` | Utility and automation scripts |
| `.github/` | GitHub-specific configuration (issue templates, PR templates, Copilot instructions) |

### Key Files

- **`src/index.html`** — Application entry point with semantic HTML
- **`src/main.ts`** — TypeScript entry point (theme toggle, interactive behavior)
- **`src/assets/styles.css`** — Responsive stylesheet with CSS custom properties and dark mode
- **`public/sw.js`** — Service worker with app-shell precache + Gold JSON stale-while-revalidate
- **`public/offline.html`** — Accessible offline fallback page
- **`public/manifest.json`** — PWA web app manifest
- **`vite.config.ts`** — Vite build configuration
- **`tsconfig.json`** — TypeScript compiler configuration
- **`eslint.config.js`** — ESLint flat configuration for TypeScript
- **`LICENSE.md`** — GPL License
- **`meta/adr/ADR-001-use_adrs.md`** — The founding ADR: use ADRs to document decisions
- **`meta/adr/ADR-002-frontend-framework.md`** — ADR: Vanilla TypeScript with Vite

## Local Development

### Prerequisites

- **Node.js** (see `.node-version` for the required version)
- **npm** (bundled with Node.js)

### Setup

```bash
# Install dependencies
npm install

# Start the dev server with hot reload
npm run dev
```

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite dev server with hot module replacement |
| `npm run build` | Type-check and build optimized production output to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint on all TypeScript files |
| `npm run generate-types` | Generate strict TypeScript interfaces from `src/schema/schema.json` |
| `npm run typecheck` | Run the TypeScript compiler in check-only mode |
| `npm test` | Run Vitest test suite |
| `npm run test:coverage` | Run Vitest with a coverage report in `coverage/` |
| `npm run test:e2e` | Run Playwright E2E and visual regression tests |
| `npm run test:e2e:update-snapshots` | Intentionally update Playwright screenshot baselines |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting without modifying files |

### Schema-to-Type Workflow

- `src/schema/schema.json` is the committed contract synced from `catch-data`.
- `src/types/generated.ts` is generated at build/test/typecheck time and is
  intentionally ignored in Git to avoid merge conflicts.
- Run `npm run generate-types` after schema changes to refresh the generated
  interfaces locally.
- `npm run typecheck`, `npm run build`, and `npm test` all generate the types
  automatically before running.
- `src/types/generated-smoke.ts` provides a compile-time smoke test that imports
  the generated interfaces and asserts nullable fields stay typed as `| null`
  instead of optional properties.

### Quality Checks

```bash
# Install pre-commit hooks (requires Python)
pip install pre-commit
pre-commit install

# Run local quality checks
./scripts/local-ci-check.sh

# Build documentation (optional)
pip install -r docs-requirements.txt
./scripts/build-docs.sh
```

## Testing

Catch now ships with layered automated testing:

- **Unit tests** cover the Gold JSON data service, formatting utilities, schema-backed
  fixture validation, and team constants.
- **Component tests** use Testing Library with jsdom to exercise the team selector,
  schedule rendering, boxscore rendering, and watch controls with mock data.
- **E2E + visual regression tests** use Playwright with mocked Gold JSON responses
  and `@axe-core/playwright` scans so the critical user flow stays deterministic and
  independent of the live CDN.

### Run Tests Locally

```bash
# Install dependencies once
npm install

# Unit + component tests
npm test

# Coverage report (open coverage/index.html after the run)
npm run test:coverage

# Install the Playwright browser once per machine
npx playwright install chromium

# E2E + visual regression tests
npm run test:e2e
```

### Update Visual Snapshots

Visual baselines live beside the Playwright specs under `tests/e2e/`. Update them
only when an intentional UI change has been reviewed:

```bash
npm run test:e2e:update-snapshots
```

Review the changed snapshot files before committing them.

### Add a New E2E Scenario

1. Add or extend a Gold JSON fixture in `tests/fixtures/gold/`.
2. Keep the fixture valid against `src/schema/schema.json` so `tests/gold-fixtures.test.ts`
   continues to enforce the contract.
3. Reuse `tests/e2e/helpers.ts` to freeze time, mock `/gold/*.json`, stub video
   playback, and run an accessibility scan for each newly visited page.
4. Add any intentional screenshot updates with
   `npm run test:e2e:update-snapshots`.

## Contributing

Contributions are welcome! Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md)
for guidelines on reporting bugs, suggesting features, and submitting changes.

## Deployment

The repository includes two GitHub Actions deployment workflows:

- **GitHub Pages** (`.github/workflows/deploy-pages.yml`) — builds with Vite
  and deploys `dist/` to GitHub Pages on every push to `main`. Enable it in
  **Settings → Pages → Source → GitHub Actions**.
- **AWS S3 + CloudFront** (`.github/workflows/deploy-aws.yml`) — optional,
  manually triggered. Configure the required repository variables
  (`AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET_NAME`,
  `CLOUDFRONT_DISTRIBUTION_ID`) before use.

## License

This project is licensed under a [GPL License](./LICENSE.md).
