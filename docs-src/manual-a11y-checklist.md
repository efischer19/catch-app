# Manual accessibility checklist

Use this checklist before release and whenever Catch adds a new view or major UI control.

## Screen reader regression script

### VoiceOver (macOS or iOS)

1. Open Catch and navigate to **Today's Slate**.
2. Confirm VoiceOver announces the page heading, date groups, and each matchup.
3. Move to **Teams** and verify the team selector announces the visible "Select a team" label and the current team.
4. Open a team schedule and confirm game status, score, and action links are announced clearly.
5. Open a boxscore and confirm the R/H/E table caption, row headers, and pitching decisions are read meaningfully.
6. Open the watch page and verify the player, Cast controls, and status announcements are spoken clearly.
7. Start and stop a Cast session if a device is available, and confirm the state changes are announced.

### NVDA (Windows)

1. Repeat the VoiceOver flow in Firefox or Chrome with NVDA enabled.
2. Confirm headings, landmarks, links, buttons, range inputs, and live-region announcements match the expected spoken feedback.
3. Verify the watch page skip link moves focus to the main content region.

## Keyboard-only regression checks

1. Press `Tab` from the top of each page and confirm the skip link appears first.
2. Activate the skip link and confirm focus moves to the page's main content region.
3. Navigate the main navigation, team selector, boxscore actions, and watch controls without using a mouse.
4. Confirm focus order follows the visual reading order and the visible focus ring remains obvious in both light and dark themes.

## Reduced motion and contrast checks

1. Enable **Reduce Motion** in the operating system and verify theme-toggle interactions do not animate.
2. Verify text, status badges, and footer links continue to meet WCAG 2.1 AA contrast thresholds in both themes.
