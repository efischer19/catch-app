import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, freezeAppClock, mockGoldResponses, stubMediaPlayback } from "./helpers";

test.beforeEach(async ({ page }) => {
  await freezeAppClock(page, "2026-07-15T22:45:00Z");
  await stubMediaPlayback(page);
  await mockGoldResponses(page);
});

test("verifies skip links and accessibility coverage on dedicated views", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.goto("/teams");
  await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto("/accessibility");
  await expect(page.getByRole("heading", { name: "Accessibility statement" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the manual accessibility checklist" })).toBeVisible();
  await expect(page.getByText("Known limitations")).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto(
    "/watch/?src=https://media.test/game.mp4&title=Yankees%20vs%20Red%20Sox&subtitle=Condensed%20Game",
  );
  await expect(page.getByRole("heading", { name: "Yankees vs Red Sox" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#watch-main")).toBeFocused();
  await expectNoAxeViolations(page);
});
