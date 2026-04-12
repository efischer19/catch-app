# feat: Replace template placeholders with catch-app project values

## What do you want to build?

Replace all `{{PLACEHOLDER}}` tokens inherited from the
static-js-app-blueprint template with concrete values for the catch-app
project. This includes project names, owner identifiers, and documentation
references throughout the entire repository.

## Acceptance Criteria

- [ ] `{{PROJECT_NAME}}` is replaced with `catch-app` in all files
- [ ] `{{GITHUB_OWNER}}` is replaced with `efischer19` in all documentation files
- [ ] `{{PROJECT_URL}}` is replaced with `https://github.com/efischer19/catch-app` in `meta/ROBOT_ETHICS.md`
- [ ] `{{APP_NAME}}`, `{{LIB_NAME}}`, and `{{CATEGORY_NAME}}` are replaced or their containing template files are removed (see 01-03)
- [ ] `meta/DEVELOPMENT_PHILOSOPHY.md` is updated to remove the "inherited from template" notice and reference catch-app specifically
- [ ] `meta/ROBOT_ETHICS.md` is updated with catch-app project name and URL, noting MLB Stats API as the data source consumed by the companion catch-data repo
- [ ] `.github/copilot-instructions.md` references `catch-app` instead of `{{PROJECT_NAME}}`
- [ ] No `{{...}}` placeholder tokens remain in any tracked file (excluding the `templates/` directory and `catch-data-ref` submodule)
- [ ] A `grep -r '{{' --include='*.md' --include='*.yml' --include='*.yaml' --include='*.html' --include='*.js' --include='*.css' --include='*.json'` returns zero results outside `templates/` and `catch-data-ref/`

## Implementation Notes

Run a comprehensive search for `{{` across all file types to build the
replacement map. The `templates/` directory contains readme templates that
legitimately use `{{...}}` syntax — leave those untouched or remove them as
part of ticket 01-03.

`meta/DEVELOPMENT_PHILOSOPHY.md` should be customized for catch-app: it is a
frontend TypeScript PWA, not a generic template project. Adjust the language to
reflect frontend-specific concerns (accessibility, performance, semantic HTML).

`meta/ROBOT_ETHICS.md` is mostly relevant to the catch-data repo (which does
the actual API scraping), but catch-app should retain it for context since the
app displays data sourced from those APIs. Update the User-Agent example to
reference `catch-app`.
