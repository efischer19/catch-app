# feat: Implement boxscore detail view

## What do you want to build?

Build the boxscore detail view that displays when a user clicks on a completed
game. The view shows runs/hits/errors per team, winning/losing/save pitchers,
and summary stats included in the Gold data. This is rendered as an overlay or
sub-page of the team schedule or today's slate views.

## Acceptance Criteria

- [ ] Clicking a completed game from the team schedule or today's slate opens the boxscore view
- [ ] The boxscore displays: team names, final score (R/H/E line), winning pitcher, losing pitcher, save pitcher (if applicable)
- [ ] R/H/E is displayed in a traditional baseball box format (team rows, R/H/E columns)
- [ ] The view includes a "Watch Condensed Game" button if `condensed_game_url` is available
- [ ] The view includes a back/close button to return to the previous view
- [ ] If boxscore data is not yet available for a completed game, display "Boxscore data not yet available"
- [ ] The view works as a client-side navigation (no additional API call needed — data is embedded in the Gold JSON)
- [ ] The view is responsive: compact layout on mobile, fuller layout on desktop
- [ ] The view is keyboard-navigable and screen-reader friendly

## Implementation Notes

**Key design decision:** The boxscore data is embedded in the Gold team
schedule and upcoming games JSON files. No additional API call is needed to
display the boxscore — the data is already loaded when the user opened the
schedule. This means the boxscore view can render instantly from in-memory
data.

**⚾ Baseball Edge-Case Hunter notes:**

- **No save:** Many games have no save. The "Save" field should only display
  when a save was recorded. Don't show "Save: None" or an empty field.
- **Extra innings:** The R/H/E line shows totals, not per-inning. This is
  correct for V1 — a per-inning linescore is out of scope.
- **Ties (extremely rare):** Exhibition or spring training games can end in
  ties. Handle gracefully if present in Gold data (display both scores with
  a "Tied" indicator).
- **Postponed games:** Should not have a "Boxscore" link in the schedule. If
  a user somehow navigates to a boxscore URL for a postponed game (e.g., via
  bookmark), show an appropriate message instead of crashing.

**♿ Accessibility Coordinator notes:**

- The R/H/E table must have proper table headers: `<th scope="col">` for R,
  H, E columns and `<th scope="row">` for team names.
- Screen readers should be able to read the score meaningfully: "Yankees: 5
  runs, 9 hits, 1 error. Red Sox: 3 runs, 7 hits, 0 errors." Use
  `aria-label` or visually hidden text to supplement the compact visual
  display.
- The pitcher information should use a definition list (`<dl>`) or similar
  semantic structure: `<dt>Winning Pitcher</dt><dd>Cole (10-3)</dd>`.
- The "Watch Condensed Game" button should have a descriptive `aria-label`,
  e.g., "Watch condensed game: Yankees vs Red Sox, July 10".

**⚡ PWA Performance Fanatic notes:**

- No additional fetch needed for boxscore data. Render time should be
  sub-frame (< 16ms) since all data is already in memory from the schedule
  fetch.
