# catch-app

> A frontend TypeScript PWA for browsing baseball statistics.

## What Is This?

`catch-app` is a progressive web application that displays baseball statistics
sourced from the MLB Stats API. Data collection and processing are handled by
the companion [catch-data](https://github.com/efischer19/catch-data) repository;
this repository is responsible for the user-facing frontend.

The project is built on the
[static-js-app-blueprint](https://github.com/efischer19/static-js-app-blueprint)
template, which provides the foundational directory structure, documentation, and
CI/CD configuration.

## Project Structure

| Path | Purpose |
| :--- | :--- |
| `src/` | Frontend source files — `index.html`, `assets/`, `scripts/` |
| `meta/adr/` | Architecture Decision Records — the logbook of *why* decisions were made |
| `meta/plans/` | Project plans and roadmaps |
| `docs-src/` | Source files for generated documentation (MkDocs) |
| `scripts/` | Utility and automation scripts |
| `.github/` | GitHub-specific configuration (issue templates, PR templates, Copilot instructions) |

### Key Files

- **`src/index.html`** — Application entry point with semantic HTML
- **`src/assets/styles.css`** — Responsive stylesheet with CSS custom properties and dark mode
- **`src/scripts/app.js`** — JavaScript entry point
- **`LICENSE.md`** — MIT License
- **`CODE_OF_CONDUCT.md`** — Contributor Covenant Code of Conduct
- **`SECURITY.md`** — Security policy and vulnerability reporting
- **`CONTRIBUTING.md`** — Guidelines for contributing to the project
- **`meta/adr/ADR-001-use_adrs.md`** — The founding ADR: use ADRs to document decisions

## Local Development

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run local quality checks
./scripts/local-ci-check.sh

# Build documentation (optional)
pip install -r docs-requirements.txt
./scripts/build-docs.sh
```

Open `src/index.html` directly in a browser to preview the application — no build step or dev server required.

## Deployment

The repository includes two GitHub Actions deployment workflows:

- **GitHub Pages** (`.github/workflows/deploy-pages.yml`) — deploys `src/` to
  GitHub Pages on every push to `main`. Enable it in **Settings → Pages → Source → GitHub Actions**.
- **AWS S3 + CloudFront** (`.github/workflows/deploy-aws.yml`) — optional,
  manually triggered. Configure the required repository variables
  (`AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET_NAME`,
  `CLOUDFRONT_DISTRIBUTION_ID`) before use.

## License

This project is licensed under the [MIT License](./LICENSE.md).
