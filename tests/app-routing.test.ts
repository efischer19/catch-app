import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initRouter } from "../src/main";
import type { DataServiceClient } from "../src/services/data-service";
import type { GoldTeamSchedule } from "../src/types/generated";

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

const yankeesSchedule: GoldTeamSchedule = {
  games: [],
  last_updated: "2026-04-13T19:05:00Z",
  season_year: 2026,
  team_abbreviation: "NYY",
  team_id: 147,
  team_name: "New York Yankees",
};

function createDataService(schedule: GoldTeamSchedule = yankeesSchedule): DataServiceClient {
  return {
    clearCache: vi.fn(),
    getUpcomingGames: vi.fn().mockResolvedValue({
      ok: true,
      status: "success",
      data: {
        games: [],
        last_updated: "2026-04-13T19:05:00Z",
      },
      fromCache: false,
      lastUpdated: "2026-04-13T19:05:00Z",
    }),
    getTeamSchedule: vi.fn().mockResolvedValue({
      ok: true,
      status: "success",
      data: schedule,
      fromCache: false,
      lastUpdated: schedule.last_updated ?? null,
    }),
  };
}

const getViewHeading = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-view-heading="true"]');

describe("app routing", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    document.body.innerHTML = appShell;
    window.history.pushState({}, "", "/teams");
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.innerHTML = "";
    document.title = "Catch";
  });

  it("renders the Yankees schedule when loading the team route directly", () => {
    window.history.pushState({}, "", "/team/147");

    cleanup = initRouter(document, window, {
      dataService: createDataService(),
    });

    expect(getViewHeading()?.textContent).toBe("New York Yankees schedule");
    expect(document.title).toBe("Catch | New York Yankees");
    expect(
      document.querySelector('[aria-current="page"][data-team-link="true"]')
        ?.textContent,
    ).toContain("New York Yankees");
  });

  it("navigates between top-level views without a full page reload", () => {
    cleanup = initRouter(document, window, {
      dataService: createDataService(),
    });
    const pushStateSpy = vi.spyOn(window.history, "pushState");
    const teamsLink = document.querySelector<HTMLAnchorElement>(
      'a[href="/team/147"]',
    );
    expect(teamsLink).not.toBeNull();

    teamsLink?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );

    expect(pushStateSpy).toHaveBeenCalledWith({}, "", "/team/147");
    expect(window.location.pathname).toBe("/team/147");
    expect(getViewHeading()?.textContent).toBe("New York Yankees schedule");
    expect(document.activeElement).toBe(getViewHeading());
  });

  it("focuses the destination heading for top-level navigation changes", () => {
    cleanup = initRouter(document, window, {
      dataService: createDataService(),
    });
    const slateLink = document.querySelector<HTMLAnchorElement>('a[href="/"]');
    expect(slateLink).not.toBeNull();

    slateLink?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );

    expect(window.location.pathname).toBe("/");
    expect(getViewHeading()?.textContent).toBe("Today's Slate");
    expect(document.activeElement).toBe(getViewHeading());
  });

  it("supports arrow-key navigation and Enter selection in the team selector", () => {
    cleanup = initRouter(document, window, {
      dataService: createDataService(),
    });

    const oriolesLink = document.querySelector<HTMLAnchorElement>(
      'a[href="/team/110"]',
    );
    expect(oriolesLink).not.toBeNull();

    oriolesLink?.focus();
    oriolesLink?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );

    const redSoxLink = document.querySelector<HTMLAnchorElement>(
      'a[href="/team/111"]',
    );
    expect(document.activeElement).toBe(redSoxLink);

    redSoxLink?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(window.location.pathname).toBe("/team/111");
    expect(getViewHeading()?.textContent).toBe("Boston Red Sox schedule");
  });

  it("renders the accessibility statement route", () => {
    window.history.pushState({}, "", "/accessibility");

    cleanup = initRouter(document, window, {
      dataService: createDataService(),
    });

    expect(getViewHeading()?.textContent).toBe("Accessibility statement");
    expect(document.title).toBe("Catch | Accessibility statement");
    expect(document.body.textContent).toContain("Known limitations");
  });
});
