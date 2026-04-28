import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import type { GoldTeamSchedule, GoldUpcomingGames } from "../../src/types/generated";
import { readGoldFixture } from "../helpers/gold-fixtures";

export async function freezeAppClock(page: Page, isoTimestamp: string): Promise<void> {
  await page.addInitScript(({ isoTimestamp: now }) => {
    const fixedNow = new Date(now).valueOf();
    Date.now = () => fixedNow;
  }, { isoTimestamp });
}

export async function stubMediaPlayback(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value(this: HTMLMediaElement) {
        this.dataset.playbackState = "playing";
        this.dispatchEvent(new Event("play"));
        return Promise.resolve();
      },
      writable: true,
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value(this: HTMLMediaElement) {
        this.dataset.playbackState = "paused";
        this.dispatchEvent(new Event("pause"));
      },
      writable: true,
    });
  });
}

export async function mockGoldResponses(
  page: Page,
  options: {
    teamScheduleFile?: string;
    upcomingGamesFile?: string;
  } = {},
): Promise<void> {
  const fixtures = {
    teamSchedule: readGoldFixture<GoldTeamSchedule>(options.teamScheduleFile ?? "team_147.json"),
    upcomingGames: readGoldFixture<GoldUpcomingGames>(
      options.upcomingGamesFile ?? "upcoming-games.json",
    ),
  };

  await page.route("https://www.gstatic.com/**", async (route) => {
    await route.fulfill({
      body: "",
      contentType: "application/javascript",
      status: 200,
    });
  });

  await page.route("**/gold/*.json", async (route) => {
    const requestUrl = new URL(route.request().url());
    const fileName = requestUrl.pathname.split("/").at(-1);

    if (fileName === "upcoming_games.json") {
      await route.fulfill({
        body: JSON.stringify(fixtures.upcomingGames),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    if (fileName === "team_147.json") {
      await route.fulfill({
        body: JSON.stringify(fixtures.teamSchedule),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({ error: "Fixture not found" }),
      contentType: "application/json",
      status: 404,
    });
  });
}

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(
    accessibilityScanResults.violations,
    accessibilityScanResults.violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join("\n"),
  ).toEqual([]);
}
