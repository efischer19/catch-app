import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initRouter } from "../src/main";
import type { DataServiceClient } from "../src/services/data-service";
import type {
  GoldBoxscoreSummary,
  GoldTeamInfo,
  GoldTeamSchedule,
} from "../src/types/generated";

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

const orioles: GoldTeamInfo = {
  abbreviation: "BAL",
  division: "AL East",
  id: 110,
  league: "American League",
  name: "Baltimore Orioles",
};

const noSaveBoxscore: GoldBoxscoreSummary = {
  away_e: 0,
  away_h: 6,
  away_r: 2,
  home_e: 1,
  home_h: 8,
  home_r: 4,
  losing_pitcher: "Dean Kremer (1-2)",
  save_pitcher: null,
  winning_pitcher: "Carlos Rodón (4-1)",
};

const sampleSchedule: GoldTeamSchedule = {
  games: [
    {
      away_team: redSox,
      boxscore_summary: null,
      condensed_game_url: null,
      date: "2026-04-01T17:05:00Z",
      game_pk: 9001,
      home_team: yankees,
      score: {
        away: 1,
        home: 2,
      },
      score_display: "1-2",
      status: "Final",
    },
    {
      away_team: orioles,
      boxscore_summary: null,
      condensed_game_url: null,
      date: "2026-04-04T17:05:00Z",
      game_pk: 9002,
      home_team: yankees,
      score: null,
      score_display: null,
      status: "Postponed",
    },
    {
      away_team: orioles,
      boxscore_summary: noSaveBoxscore,
      condensed_game_url: null,
      date: "2026-04-05T17:05:00Z",
      game_pk: 9003,
      home_team: yankees,
      score: {
        away: 2,
        home: 4,
      },
      score_display: "2-4",
      status: "Final",
    },
  ],
  last_updated: "2026-04-13T19:05:00Z",
  season_year: 2026,
  team_abbreviation: "NYY",
  team_id: 147,
  team_name: "New York Yankees",
};

function createDataService(
  schedule: GoldTeamSchedule = sampleSchedule,
): DataServiceClient {
  return {
    clearCache: vi.fn(),
    getTeamSchedule: vi.fn().mockResolvedValue({
      ok: true,
      status: "success",
      data: schedule,
      fromCache: false,
      lastUpdated: schedule.last_updated ?? null,
    }),
    getUpcomingGames: vi.fn(),
  };
}

describe("boxscore view", () => {
  let cleanup: (() => void) | undefined;

  const getViewHeading = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('[data-view-heading="true"]');

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

  async function waitForSchedule(): Promise<void> {
    await vi.waitFor(() => {
      expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    });
  }

  it("shows a friendly unavailable message and returns to the previous schedule", async () => {
    cleanup = initRouter(document, window, {
      dataService: createDataService(),
    });

    await waitForSchedule();

    document.querySelector<HTMLAnchorElement>('a[href="/boxscore/9001"]')?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );

    expect(document.body.textContent).toContain("Boxscore data not yet available");

    document.querySelector<HTMLButtonElement>(".boxscore-view__controls button")?.click();

    expect(window.location.pathname).toBe("/team/147");
    expect(getViewHeading()?.textContent).toBe("New York Yankees schedule");
  });

  it("shows a postponed-game message instead of crashing", async () => {
    cleanup = initRouter(document, window, {
      dataService: createDataService(),
    });

    await waitForSchedule();

    window.history.pushState({}, "", "/boxscore/9002");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(document.querySelector("h2")?.textContent).toBe(
      "Baltimore Orioles @ New York Yankees",
    );
    expect(document.body.textContent).toContain(
      "Boxscore unavailable for postponed games.",
    );
  });

  it("renders accessible R/H/E headers and omits the save row when no save was recorded", async () => {
    cleanup = initRouter(document, window, {
      dataService: createDataService(),
    });

    await waitForSchedule();

    window.history.pushState({}, "", "/boxscore/9003");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(
      [...document.querySelectorAll<HTMLTableCellElement>('th[scope="col"]')].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(["Team", "R", "H", "E"]);
    expect(
      [...document.querySelectorAll<HTMLTableCellElement>('th[scope="row"]')].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(["Baltimore Orioles", "New York Yankees"]);
    expect(document.body.textContent).toContain("Winning Pitcher");
    expect(document.body.textContent).toContain("Carlos Rodón (4-1)");
    expect(document.body.textContent).not.toContain("Save");
  });
});
