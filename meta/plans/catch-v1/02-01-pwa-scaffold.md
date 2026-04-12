# feat: Scaffold catch-app TypeScript PWA with Vite build tooling

## What do you want to build?

Initialize the catch-app repository as a TypeScript Progressive Web App with
Vite as the build tool, a `manifest.json`, and the foundational project
structure. This replaces the template's vanilla HTML/CSS/JS setup with a modern
TypeScript build pipeline while preserving the existing semantic HTML and
accessibility foundations.

The app will be a static site with zero backend — it fetches pre-rendered JSON
files from the CloudFront CDN and renders them in the browser.

## Acceptance Criteria

- [ ] The project is initialized with Vite and TypeScript (vanilla-ts template, no framework initially)
- [ ] A `manifest.json` is configured with app name "Catch", theme color, icons, and `display: standalone`
- [ ] The app builds to a static `dist/` directory with `index.html`, CSS, JS bundles, and manifest
- [ ] A dev server runs locally with hot reload via `npm run dev`
- [ ] The build produces optimized, minified output suitable for CDN hosting
- [ ] An initial Lighthouse audit scores 90+ on the PWA category (with a basic service worker placeholder)
- [ ] ESLint and Prettier are configured for TypeScript
- [ ] `package.json` includes scripts: `dev`, `build`, `preview`, `lint`, `typecheck`
- [ ] The `README.md` documents local setup, dev server, build, and deployment commands
- [ ] The project uses GPL-3.0-or-later license (set in ticket 01-01)
- [ ] Existing semantic HTML structure, skip-to-content link, and accessibility attributes from the template are preserved in the new setup

## Implementation Notes

**📝 ADR Consideration:**

This ticket requires an ADR to document the frontend framework decision. The
PRD lists React, Vue, or Vanilla TS as options. Recommendation for V1:

- **Vanilla TS with Vite** is the best fit for V1 (4 simple views, no complex
  state). It aligns with the KISS philosophy in `DEVELOPMENT_PHILOSOPHY.md`,
  minimizes bundle size, and avoids framework lock-in for a simple app.
- If developer experience strongly favors a framework, **Preact** (3 KB) is a
  good middle ground — React-compatible API with minimal bundle cost.
- Document the decision and rationale in `meta/adr/ADR-002-frontend-framework.md`.

**⚡ PWA Performance Fanatic notes:**

- Vite provides fast builds, tree-shaking, and optimal code splitting out of
  the box. It is the standard choice for modern frontend projects.
- Set a performance budget: total initial JS bundle < 50 KB gzipped. The app
  is simple enough that this is achievable with vanilla TS.
- Configure asset hashing for cache-busting on deployment.

**♿ Accessibility Coordinator notes:**

- Preserve `<html lang="en">` from the existing template.
- Keep the skip-to-content link in the initial HTML.
- Maintain semantic HTML elements (`<main>`, `<nav>`, `<header>`, `<footer>`)
  from the template as the layout foundation.

**🤑 FinOps Miser notes:**

- Hosting: GitHub Pages is already configured in the template's deploy
  workflow. It offers free static site hosting and is sufficient for V1.
  Cloudflare Pages or Vercel are alternatives if custom domain or edge
  performance is needed later.

**🧪 QA notes:**

- Configure Vitest as the test runner (pairs naturally with Vite). Add a
  placeholder test to verify the setup works.
