# feat: Replace template README and docs with catch-app content

## What do you want to build?

Replace the template README.md (which documents the static-js-app-blueprint
template) with a project-specific README for catch-app. Clean up or remove
template-only files and directories that are not relevant to the catch-app
project, such as the `templates/` directory.

## Acceptance Criteria

- [ ] `README.md` describes catch-app: what it is (MLB schedule/boxscore PWA with Chromecast casting), how to set it up locally, and how to contribute
- [ ] `README.md` references the companion `catch-data` repository and explains the two-repo architecture at a high level
- [ ] The `templates/` directory is removed (contains readme templates for the blueprint, not relevant to catch-app)
- [ ] `src/README.md` is updated to describe the catch-app source file structure
- [ ] `src/index.html` title and content are updated from "Static JS App" to "Catch"
- [ ] `SECURITY.md` contact information is reviewed and updated for the catch-app project
- [ ] `mkdocs.yml` site name and description are updated for catch-app
- [ ] `docs-src/index.md` is updated with catch-app-specific content
- [ ] The footer in `src/index.html` no longer references the static-js-app-blueprint template

## Implementation Notes

The README should be concise and focus on:

1. What Catch is (one paragraph)
2. Architecture overview (frontend PWA fetching Gold JSON from CDN)
3. Local development setup (`npm install`, `npm run dev`, etc.)
4. Contributing guidelines (link to `CONTRIBUTING.md`)
5. License (GPL-3.0)

The `templates/` directory contains `readme/apps.md`, `readme/libs.md`, and
`readme/scripts.md` — these are scaffolding helpers from the blueprint template
and have no purpose in catch-app. Remove them.

The `src/index.html` changes here should be minimal — just updating the title,
heading, and placeholder content. The actual app UI is built in later epics.
Keep the existing semantic HTML structure, skip-to-content link, and
accessibility features as a foundation to build on.
