import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, freezeAppClock, mockGoldResponses, stubMediaPlayback } from "./helpers";

test.beforeEach(async ({ page }) => {
  await freezeAppClock(page, "2026-07-15T22:45:00Z");
  await stubMediaPlayback(page);
});

test("covers empty-state, doubleheader, postponed, and no-video schedule scenarios", async ({
  page,
}) => {
  await mockGoldResponses(page, { upcomingGamesFile: "upcoming-games-empty.json" });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Today's Slate" })).toBeVisible();
  await expect(page.getByText("No games scheduled today. Check back soon for the next slate.")).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto("/team/147");

  await expect(page.getByRole("heading", { name: "New York Yankees schedule" })).toBeVisible();
  await expect(page.locator(".schedule-game-label", { hasText: "Game 1" })).toHaveCount(2);
  await expect(page.locator(".schedule-game-label", { hasText: "Game 2" })).toHaveCount(2);
  await expect(page.locator(".schedule-status--postponed")).toHaveCount(2);
  await expect(page.getByText("No start time")).toHaveCount(2);
  await expectNoAxeViolations(page);

  await page.locator('a[href="/boxscore/8106"]:visible').click();

  await expect(page.getByRole("heading", { name: "Seattle Mariners @ New York Yankees" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Watch condensed game:/i })).toHaveCount(0);
  await expectNoAxeViolations(page);
});
