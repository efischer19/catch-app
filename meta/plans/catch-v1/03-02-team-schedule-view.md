# feat: Implement team schedule view

## What do you want to build?

Build the team schedule page that displays a selected team's full-season
schedule. The view fetches `gold/team_{teamId}.json` from the CDN via the data
fetching layer (ticket 02-03) and renders each game as a list/card showing
date, opponent, score (if completed), game status, and links to the boxscore
or "Watch Condensed Game" action.

## Acceptance Criteria

- [ ] The team schedule view loads and displays data from `gold/team_{teamId}.json` via the DataService
- [ ] Each game shows: date, home/away indicator, opponent name, start time (for scheduled games), final score (for completed games)
- [ ] Completed games show a "Boxscore" link/button that navigates to the boxscore view
- [ ] Completed games with a condensed game URL show a "Watch Condensed Game" button
- [ ] Scheduled/future games show "Scheduled" status with start time in the user's local timezone
- [ ] Postponed games show "Postponed" status with appropriate visual styling
- [ ] The schedule is displayed in chronological order with month/date grouping
- [ ] A loading indicator displays while the Gold JSON is being fetched
- [ ] An error state displays if the fetch fails, with a retry button
- [ ] The `last_updated` timestamp is displayed to communicate data freshness
- [ ] The view is responsive: card layout on mobile, table layout on desktop

## Implementation Notes

**⚾ Baseball Edge-Case Hunter notes:**

- **Doubleheaders:** Two games on the same date should be clearly labeled
  "Game 1" and "Game 2". Do not collapse them into a single row.
- **In-progress games:** If a game is marked "In Progress," display the
  status but note that the score is from the last nightly data update, not
  live. Consider a subtle "Score as of last update" label to set user
  expectations.
- **Off days:** Days with no game should NOT be shown. Only render actual
  game dates (162 games, not 365 rows).
- **Spring Training:** If present in the Gold data, either filter them out or
  display them in a separate collapsible section. The Gold layer should
  ideally filter them, but the frontend should be defensive.

**♿ Accessibility Coordinator notes:**

- Use a `<table>` element for the desktop layout with proper `<thead>`,
  `<th scope="col">`, and `<td>` elements. Tables are well-supported by
  screen readers for tabular data.
- For the mobile card layout, use `<article>` elements with accessible
  headings for each game.
- Loading state: use `aria-busy="true"` on the content region during fetch.
- Score display should be screen-reader friendly: "Yankees 5, Red Sox 3" not
  just "5-3". Provide visually hidden text as an alternative to the compact
  visual format.

**⚡ PWA Performance Fanatic notes:**

- Team schedule JSON is typically 50-150 KB. With service worker caching
  (ticket 02-04), returning users see cached data instantly while fresh data
  loads in the background.
- Consider lazy-rendering past months: show the current month and nearby
  games by default, and load earlier months on scroll or expand. This reduces
  initial render time for a full 162-game schedule.
