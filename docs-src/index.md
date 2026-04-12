# Catch Documentation

Welcome to the official documentation for **Catch** (`catch-app`).

## Overview

Catch is a progressive web app (PWA) for browsing MLB schedules and boxscores,
with Chromecast casting support. It uses a two-repository architecture:

- **[catch-data](https://github.com/efischer19/catch-data)** — Python backend
  that fetches data from the MLB Stats API and publishes Gold JSON files to a CDN.
- **catch-app** (this repo) — static frontend PWA that reads those JSON files
  and renders schedules, boxscores, and Chromecast controls.

## Getting Started

1. **Clone the repository** and install dependencies:

   ```bash
   npm install
   ```

2. **Start the dev server** with hot reload:

   ```bash
   npm run dev
   ```

3. **Install pre-commit hooks** to run quality checks locally:

   ```bash
   pip install pre-commit
   pre-commit install
   ```

4. **Run local quality checks** at any time with:

   ```bash
   ./scripts/local-ci-check.sh
   ```

## Project Structure

```text
catch-app/
├── src/              # Frontend source files
│   ├── index.html    # Entry point with semantic HTML
│   ├── main.ts       # TypeScript entry point
│   ├── assets/
│   │   ├── styles.css    # Stylesheet with CSS custom properties
│   │   └── favicon.svg   # Placeholder favicon
│   └── README.md         # Documents src/ structure and conventions
├── public/           # Static assets (manifest, icons)
├── tests/            # Vitest test files
├── meta/             # Development philosophy, ADRs, and plans
├── docs-src/         # Documentation source files (MkDocs)
├── scripts/          # Utility and automation scripts
└── .github/          # GitHub-specific configuration
```

## Development Philosophy

All work in this project follows the
[Development Philosophy](DEVELOPMENT_PHILOSOPHY.md), which emphasizes:

- **Code is for Humans First** — Clarity over cleverness
- **Favor Simplicity** — Static-first design with minimal complexity
- **Confidence Through Testing** — Comprehensive automated tests
- **Clean Commit History** — Atomic commits with descriptive messages

## Contributing

For information on contributing to this project, see the
[Contributing Guidelines](CONTRIBUTING.md).

## Getting Help

- Check the documentation pages listed in the navigation
- Review the [Architecture Decision Records](https://github.com/efischer19/catch-app/tree/main/meta/adr)
  for context on past decisions
- [Open an issue](https://github.com/efischer19/catch-app/issues)
  if you find a bug or want to suggest a feature
