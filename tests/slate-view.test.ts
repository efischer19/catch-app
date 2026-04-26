import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initRouter } from "../src/main";
import type { DataServiceClient } from "../src/services/data-service";
import type { GoldTeamInfo, GoldUpcomingGames } from "../src/types/generated";

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

const dodgers: GoldTeamInfo = {
  abbreviation: "LAD",
  division: "NL West",
  id: 119,
  league: "National League",
  name: "Los Angeles Dodgers",
};

const padres: GoldTeamInfo = {
  abbreviation: "SD",
  division: "NL West",
  id: 135,
  league: "National League",
  name: "San Diego Padres",
};

const cubs: GoldTeamInfo = {
  abbreviation: "CHC",
  division: "NL Central",
  id: 112,
  league: "National League",
  name: "Chicago Cubs",
};

const brewers: GoldTeamInfo = {
  abbreviation: "MIL",
  division: "NL Central",
  id: 158,
  league: "National League",
  name: "Milwaukee Brewers",
};

const sampleUpcomingGames: GoldUpcomingGames = {
  games: [
    {
      away_team: redSox,
      boxscore_summary: null,
      condensed_game_url: "https://media.test/redsox-yankees.mp4",
      date: "2026-04-26T17:05:00Z",
      game_pk: 7001,
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
      date: "2026-04-26T21:05:00Z",
      game_number: 2,
      game_pk: 7002,
      home_team: yankees,
      score: null,
      score_display: null,
      status: "Scheduled",
    },
    {
      away_team: padres,
      boxscore_summary: null,
      condensed_game_url: null,
      date: "2026-04-27T02:10:00Z",
      game_pk: 7003,
      home_team: dodgers,
      score: {
        away: 2,
        home: 1,
      },
      score_display: "2-1",
      status: "In Progress",
    },
    {
      away_team: cubs,
      boxscore_summary: null,
      condensed_game_url: null,
      date: "2026-04-28T00:40:00Z",
      game_pk: 7004,
      home_team: brewers,
      score: null,
      score_display: null,
      status: "Scheduled",
    },
  ],
  last_updated: "2026-04-26T13:15:00Z",
};

function createDataService(
  getUpcomingGames: DataServiceClient["getUpcomingGames"],
): DataServiceClient {
  return {
    clearCache: vi.fn(),
    getTeamSchedule: vi.fn(),
    getUpcomingGames,
  };
}

describe("today's slate view", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-04-26T15:00:00Z").valueOf());
    document.body.innerHTML = appShell;
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    document.title = "Catch";
  });

  async function flushSlateRender(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it("loads and renders grouped upcoming games with today emphasis and actions", async () => {
    let resolveUpcomingGames:
      | ((value: Awaited<ReturnType<DataServiceClient["getUpcomingGames"]>>) => void)
      | undefined;
    const dataService = createDataService(
      () =>
        new Promise((resolve) => {
          resolveUpcomingGames = resolve;
        }),
    );

    cleanup = initRouter(document, window, { dataService });

    expect(document.querySelector("h2")?.textContent).toBe("Today's Slate");
    expect(document.title).toBe("Catch | Today's Slate");
    expect(document.querySelector('[aria-current="page"]')?.textContent).toBe(
      "Today's Slate",
    );
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      "Loading today's slate",
    );

    resolveUpcomingGames?.({
      ok: true,
      status: "success",
      data: sampleUpcomingGames,
      fromCache: false,
      lastUpdated: sampleUpcomingGames.last_updated ?? null,
    });

    await flushSlateRender();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();

    const dateHeadings = [
      ...document.querySelectorAll<HTMLElement>(".slate-date-group__heading"),
    ].map((heading) => heading.textContent?.replace(/\s+Today$/, ""));
    expect(dateHeadings).toEqual([
      "Sunday, April 26, 2026",
      "Monday, April 27, 2026",
      "Tuesday, April 28, 2026",
    ]);

    expect(
      document.querySelector(".slate-date-group--today [aria-current='date']")?.textContent,
    ).toContain("Today");
    expect(document.querySelectorAll(".slate-game")).toHaveLength(4);
    expect(document.body.textContent).toContain("Boston Red Sox @ New York Yankees");
    expect(document.body.textContent).toContain("San Diego Padres @ Los Angeles Dodgers");
    expect(document.body.textContent).toContain("Final");
    expect(document.body.textContent).toContain("In Progress");
    expect(document.body.textContent).toContain("Game 2");
    expect(document.body.textContent).toContain("Boston Red Sox 3, New York Yankees 5");
    expect(document.body.textContent).toContain("Score as of last update.");
    expect(document.body.textContent).toContain("Last updated");

    const expectedStartTime = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date("2026-04-28T00:40:00Z"));
    expect(document.body.textContent).toContain(expectedStartTime);

    const boxscoreLink = document.querySelector<HTMLAnchorElement>(
      'a[href="/boxscore/7001"]',
    );
    expect(boxscoreLink?.textContent).toBe("Boxscore");

    const watchLink = document.querySelector<HTMLAnchorElement>('a[href^="/watch/?"]');
    expect(watchLink?.textContent).toBe("Watch Condensed Game");
  });

  it("shows a friendly empty state when no games are scheduled", async () => {
    cleanup = initRouter(document, window, {
      dataService: createDataService(async () => ({
        ok: true,
        status: "success",
        data: {
          games: [],
          last_updated: "2026-04-26T13:15:00Z",
        },
        fromCache: false,
        lastUpdated: "2026-04-26T13:15:00Z",
      })),
    });

    await flushSlateRender();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();

    expect(document.body.textContent).toContain("No games scheduled today.");
  });

  it("shows an error with retry when the slate request fails", async () => {
    const getUpcomingGames = vi
      .fn<DataServiceClient["getUpcomingGames"]>()
      .mockResolvedValueOnce({
        ok: false,
        status: "error",
        error: {
          kind: "network",
          message: "Unable to reach the data service right now.",
          url: "https://cdn.catch.test/gold/upcoming_games.json",
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: "success",
        data: sampleUpcomingGames,
        fromCache: false,
        lastUpdated: sampleUpcomingGames.last_updated ?? null,
      });

    cleanup = initRouter(document, window, {
      dataService: createDataService(getUpcomingGames),
    });

    await flushSlateRender();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Unable to reach the data service right now.",
    );

    const retryButton = document.querySelector<HTMLButtonElement>(
      ".schedule-error button.schedule-action",
    );
    retryButton?.click();

    await flushSlateRender();
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(document.body.textContent).toContain("Boston Red Sox @ New York Yankees");

    expect(getUpcomingGames).toHaveBeenCalledTimes(2);
  });
});
