# feat: Change license from MIT to GPL-3.0

## What do you want to build?

Replace the template repository's MIT license with the GNU General Public
License v3.0 (GPL-3.0-or-later) as explicitly required by the project owner.
Update `LICENSE.md` with the full GPL-3.0 text and ensure all metadata
references (README, documentation, etc.) reflect the new license.

## Acceptance Criteria

- [ ] `LICENSE.md` contains the full text of the GPL-3.0-or-later license
- [ ] The copyright holder is set to the project owner (efischer19)
- [ ] The root `README.md` license badge/reference is updated to say GPL-3.0
- [ ] `CONTRIBUTING.md` is updated to reference the GPL-3.0 license
- [ ] No references to "MIT" remain in the repository (excluding git history and the `catch-data-ref` submodule)

## Implementation Notes

This is the first ticket in the bootstrap epic and has no dependencies. The
GPL-3.0 license is copyleft — all derivative works must also be open source
under GPL-3.0. This is intentional and appropriate for a personal project
consuming unofficial public APIs.

The full GPL-3.0 text can be sourced from
https://www.gnu.org/licenses/gpl-3.0.txt.

Search the entire repo with
`grep -ri "MIT" --include="*.md" --include="*.yml" --include="*.json"` to find
all references that need updating. Note that
`.github/workflows/deploy-aws.yml` and CI workflow files may reference MIT in
action licenses — those are third-party references and do not need changing.

This ticket mirrors `catch-data` ticket 01-01. Both repos should use the same
license.
