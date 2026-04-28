import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, freezeAppClock, mockGoldResponses, stubMediaPlayback } from "./helpers";

test.beforeEach(async ({ page }) => {
  await freezeAppClock(page, "2026-07-15T22:45:00Z");
  await stubMediaPlayback(page);
  await mockGoldResponses(page);
});

test("lets a fan move from today's slate to a team schedule, boxscore, and video player", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Today's Slate" })).toBeVisible();
  await expect(page.getByText("Boston Red Sox @ New York Yankees")).toBeVisible();
  await expectNoAxeViolations(page);
  await expect(page).toHaveScreenshot("critical-path-slate.png", { fullPage: true });

  await page.getByRole("link", { name: "Teams" }).click();
  await page.getByRole("link", { name: "New York Yankees" }).click();

  await expect(page.getByRole("heading", { name: "New York Yankees schedule" })).toBeVisible();
  await expect(page.locator(".schedule-game-label", { hasText: "Game 1" })).toHaveCount(2);
  await expectNoAxeViolations(page);
  await expect(page).toHaveScreenshot("critical-path-team-schedule.png", { fullPage: true });

  await page.locator('a[href="/boxscore/8101"]:visible').click();

  await expect(page.getByRole("heading", { name: "Boston Red Sox @ New York Yankees" })).toBeVisible();
  await expect(page.getByText("Winning Pitcher")).toBeVisible();
  await expect(page.getByText("Save")).toHaveCount(0);
  await expectNoAxeViolations(page);
  await expect(page).toHaveScreenshot("critical-path-boxscore.png", { fullPage: true });

  await page.getByRole("link", { name: /Watch condensed game:/i }).click();

  await expect(page).toHaveURL(/\/watch\/\?/);
  await expect(page.getByRole("heading", { name: "Boston Red Sox at New York Yankees" })).toBeVisible();
  await expectNoAxeViolations(page);
  await expect(page).toHaveScreenshot("critical-path-watch.png", { fullPage: true });

  await page.locator("video").evaluate(async (video: HTMLVideoElement) => {
    await video.play();
  });
  await expect(page.locator("video")).toHaveAttribute("data-playback-state", "playing");
});
