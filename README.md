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
- **`LICENSE.md`** — MIT License
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
| `npm run typecheck` | Run the TypeScript compiler in check-only mode |
| `npm test` | Run Vitest test suite |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting without modifying files |

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

This project is licensed under the [MIT License](./LICENSE.md).
