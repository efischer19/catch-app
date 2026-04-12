# feat: Update CI workflows for catch-app frontend tooling

## What do you want to build?

Update the existing CI/CD workflows inherited from the template to reflect
catch-app's needs as a TypeScript PWA. This includes preparing the CI pipeline
for TypeScript linting, type-checking, and building, and ensuring the
deployment workflows are correctly configured.

## Acceptance Criteria

- [ ] `.github/workflows/ci.yml` includes steps for: npm install, TypeScript type-checking, linting (ESLint), and building the project
- [ ] The CI workflow runs on PRs to `main` and pushes to `main`
- [ ] The markdown lint and ADR status check jobs remain intact
- [ ] `.github/workflows/deploy-pages.yml` is verified to deploy the correct output directory (`dist/` after build step is added, or `src/` initially)
- [ ] `.github/workflows/deploy-aws.yml` is updated to sync the built output directory instead of raw `src/`
- [ ] Pre-commit hooks in `.pre-commit-config.yaml` are updated to include relevant frontend checks (e.g., ESLint, Prettier)
- [ ] The `create-planned-issues.yml` workflow is verified to work with the `meta/plans/catch-v1/` path
- [ ] A manual `workflow_dispatch` of the CI workflow succeeds on the updated branch

## Implementation Notes

The current CI runs pre-commit hooks, ADR status checks, and markdown linting.
For catch-app, add a new job (or extend the existing quality-checks job) that:

1. Sets up Node.js (LTS version)
2. Runs `npm ci`
3. Runs `npm run lint` (ESLint)
4. Runs `npm run typecheck` (tsc --noEmit)
5. Runs `npm run build` (Vite build)
6. Runs `npm test` (when tests exist)

The specific Node.js version and npm scripts depend on the framework decision
made in ticket 02-01. This ticket should be implemented after 02-01 so the CI
matches the chosen tooling.

**📝 ADR Consideration:**

- No new ADR needed here — CI configuration follows standard practices. The
  framework decision ADR from ticket 02-01 will inform the specific CI steps.

**😴 Lazy Maintainer notes:**

- Use `actions/setup-node` with a `.node-version` or `.nvmrc` file to pin the
  Node.js version. This avoids CI breakage from Node.js version changes.
- Cache `node_modules` via `actions/cache` or `actions/setup-node`'s built-in
  caching to speed up CI runs.
