import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initRouter } from "../src/main";
import type { DataServiceClient } from "../src/services/data-service";
import type { GoldTeamInfo, GoldTeamSchedule } from "../src/types/generated";

const appShell = `
  <p id="status-announcements"></p>
  <header>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/" data-nav-link="true">Today's Slate</a></li>
        <li><a href="/teams" data-nav-link="true">Teams</a></li>
      </ul>
    </nav>
    <button id="theme-toggle" type="button">
      <span class="icon"></span>
      <span class="label"></span>
    </button>
  </header>
  <main id="main-content"><div id="app-view"></div></main>
`;

const yankees: GoldTeamInfo = {
  abbreviation: "NYY",
  division: "AL East",
  id: 147,
  league: "American League",
  name: "New York Yankees",
};

const redSox: GoldTeamInfo = {
  abbreviation: "BOS",
  division: "AL East",
  id: 111,
  league: "American League",
  name: "Boston Red Sox",
};

const blueJays: GoldTeamInfo = {
  abbreviation: "TOR",
  division: "AL East",
  id: 141,
  league: "American League",
  name: "Toronto Blue Jays",
};

const orioles: GoldTeamInfo = {
  abbreviation: "BAL",
  division: "AL East",
  id: 110,
  league: "American League",
  name: "Baltimore Orioles",
};

const sampleSchedule: GoldTeamSchedule = {
  games: [
    {
      away_team: orioles,
      boxscore_summary: null,
      condensed_game_url: null,
      date: "2026-05-02T17:05:00Z",
      game_pk: 5002,
      home_team: yankees,
      score: null,
      score_display: null,
      status: "Scheduled",
    },
    {
      away_team: redSox,
      boxscore_summary: null,
      condensed_game_url: "https://media.test/yankees-redsox.mp4",
      date: "2026-04-01T17:05:00Z",
      game_pk: 5001,
      home_team: yankees,
      score: {
        away: 3,
        home: 5,
      },
      score_display: "3-5",
      status: "Final",
    },
    {
      away_team: redSox,
      boxscore_summary: null,
      condensed_game_url: null,
      date: "2026-04-10T17:05:00Z",
      game_pk: 5003,
      home_team: yankees,
      score: null,
      score_display: null,
      status: "Postponed",
    },
    {
      away_team: blueJays,
      boxscore_summary: null,
      condensed_game_url: null,
      date: "2026-04-15T17:05:00Z",
      game_pk: 5004,
      home_team: yankees,
      score: {
        away: 2,
        home: 4,
      },
      score_display: "2-4",
      status: "In Progress",
    },
    {
      away_team: yankees,
      boxscore_summary: null,
      condensed_game_url: null,
      date: "2026-04-20T17:05:00Z",
      game_number: 1,
      game_pk: 5005,
      home_team: orioles,
      score: null,
      score_display: null,
      status: "Scheduled",
    },
    {
      away_team: yankees,
      boxscore_summary: null,
      condensed_game_url: null,
      date: "2026-04-20T22:35:00Z",
      game_number: 2,
      game_pk: 5006,
      home_team: orioles,
      score: null,
      score_display: null,
      status: "Scheduled",
    },
  ],
  last_updated: "2026-04-13T19:05:00Z",
  season_year: 2026,
  team_abbreviation: "NYY",
  team_id: 147,
  team_name: "New York Yankees",
};

function createDataService(
  getTeamSchedule: DataServiceClient["getTeamSchedule"],
): DataServiceClient {
  return {
    clearCache: vi.fn(),
    getTeamSchedule,
    getUpcomingGames: vi.fn(),
  };
}

describe("team schedule view", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    document.body.innerHTML = appShell;
    window.history.pushState({}, "", "/team/147");
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.innerHTML = "";
    document.title = "Catch";
  });

  it("loads and renders the schedule with grouped games and actions", async () => {
    let resolveSchedule:
      | ((value: Awaited<ReturnType<DataServiceClient["getTeamSchedule"]>>) => void)
      | undefined;
    const dataService = createDataService(
      () =>
        new Promise((resolve) => {
          resolveSchedule = resolve;
        }),
    );

    cleanup = initRouter(document, window, { dataService });

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      "Loading schedule",
    );

    resolveSchedule?.({
      ok: true,
      status: "success",
      data: sampleSchedule,
      fromCache: false,
      lastUpdated: sampleSchedule.last_updated ?? null,
    });

    await vi.waitFor(() => {
      expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    });

    const monthHeadings = [
      ...document.querySelectorAll<HTMLElement>(".schedule-month__heading"),
    ].map((heading) => heading.textContent);
    expect(monthHeadings).toEqual(["April 2026", "May 2026"]);

    expect(document.querySelectorAll(".schedule-card")).toHaveLength(6);
    expect(document.querySelectorAll(".schedule-table")).toHaveLength(2);
    expect(document.querySelectorAll("th[scope='col']")).toHaveLength(10);
    expect(document.body.textContent).toContain("Last updated");
    expect(document.body.textContent).toContain("Scheduled");
    expect(document.body.textContent).toContain("Postponed");
    expect(document.body.textContent).toContain("Score as of last update.");
    expect(document.body.textContent).toContain("Game 1");
    expect(document.body.textContent).toContain("Game 2");
    expect(document.body.textContent).toContain("New York Yankees 5, Boston Red Sox 3");

    const expectedStartTime = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date("2026-04-20T17:05:00Z"));
    expect(document.body.textContent).toContain(expectedStartTime);

    const boxscoreLink = document.querySelector<HTMLAnchorElement>(
      'a[href="/boxscore/5001"]',
    );
    expect(boxscoreLink?.textContent).toBe("Boxscore");

    const watchLink = document.querySelector<HTMLAnchorElement>(
      'a[href^="/watch/?"]',
    );
    expect(watchLink?.textContent).toBe("Watch Condensed Game");
    const watchUrl = new URL(watchLink?.href ?? "http://localhost/");
    expect(watchUrl.searchParams.get("src")).toBe(
      "https://media.test/yankees-redsox.mp4",
    );

    boxscoreLink?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );

    expect(window.location.pathname).toBe("/boxscore/5001");
    expect(document.querySelector("h2")?.textContent).toBe("Boxscore");
    expect(document.title).toBe("Catch | Boxscore");
  });

  it("shows an error with retry when loading fails", async () => {
    const getTeamSchedule = vi
      .fn<DataServiceClient["getTeamSchedule"]>()
      .mockResolvedValueOnce({
        ok: false,
        status: "error",
        error: {
          kind: "network",
          message: "Unable to reach the data service right now.",
          url: "https://cdn.catch.test/gold/team_147.json",
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: "success",
        data: sampleSchedule,
        fromCache: false,
        lastUpdated: sampleSchedule.last_updated ?? null,
      });

    cleanup = initRouter(document, window, {
      dataService: createDataService(getTeamSchedule),
    });

    await vi.waitFor(() => {
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        "Unable to reach the data service right now.",
      );
    });

    const retryButton = document.querySelector<HTMLButtonElement>(
      ".schedule-error button.schedule-action",
    );
    expect(retryButton?.textContent).toBe("Retry");

    retryButton?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('[role="alert"]')).toBeNull();
      expect(document.body.textContent).toContain("Watch Condensed Game");
    });

    expect(getTeamSchedule).toHaveBeenCalledTimes(2);
  });
});
