import { fireEvent, screen, within } from "@testing-library/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initRouter } from "../src/main";
import type { DataServiceClient } from "../src/services/data-service";
import { initWatchPage } from "../src/watch/watch";
import type { GoldTeamSchedule, GoldUpcomingGames } from "../src/types/generated";
import { readGoldFixture } from "./helpers/gold-fixtures";

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

function renderWatchDom(): void {
  document.body.innerHTML = `
    <p id="watch-status-announcements" aria-live="polite"></p>
    <div id="cast-button-container" hidden></div>
    <main id="watch-main">
      <video id="watch-video"></video>
      <h1 id="watch-title"></h1>
      <p id="watch-subtitle"></p>
      <section id="casting-controls" hidden>
        <h2 id="casting-controls-heading">Casting controls</h2>
        <p id="cast-device-status"></p>
        <button id="cast-play-pause" type="button"></button>
        <button id="cast-stop" type="button"></button>
        <label for="cast-seek">Seek</label>
        <input id="cast-seek" type="range" min="0" max="0" step="1" value="0">
        <p id="cast-timeline"></p>
        <label for="cast-volume">Volume</label>
        <input id="cast-volume" type="range" min="0" max="100" step="1" value="100">
      </section>
    </main>
  `;
}

function createDataService(
  schedule: GoldTeamSchedule = readGoldFixture<GoldTeamSchedule>("team_147.json"),
  upcomingGames: GoldUpcomingGames = readGoldFixture<GoldUpcomingGames>("upcoming-games.json"),
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
    getUpcomingGames: vi.fn().mockResolvedValue({
      ok: true,
      status: "success",
      data: upcomingGames,
      fromCache: false,
      lastUpdated: upcomingGames.last_updated ?? null,
    }),
  };
}

describe("component rendering", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = appShell;
    window.history.pushState({}, "", "/teams");
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.innerHTML = "";
    document.title = "Catch";
  });

  it("renders the team selector with semantic league and division groupings", async () => {
    window.history.pushState({}, "", "/team/147");

    cleanup = initRouter(document, window, {
      dataService: createDataService(),
    });

    await screen.findByRole("heading", { name: "New York Yankees schedule" });

    const teamSelector = screen.getByRole("navigation", { name: "MLB teams" });
    expect(within(teamSelector).getByRole("heading", { name: "AL" })).toBeTruthy();
    expect(within(teamSelector).getByRole("heading", { name: "NL" })).toBeTruthy();
    expect(within(teamSelector).getAllByRole("link")).toHaveLength(30);
    expect(
      within(teamSelector).getByRole("link", { name: "New York Yankees" }).getAttribute(
        "aria-current",
      ),
    ).toBe("page");
  });

  it("renders the schedule view with doubleheaders, postponements, and actions", async () => {
    cleanup = initRouter(document, window, {
      dataService: createDataService(),
    });
    fireEvent.click(screen.getByRole("link", { name: "New York Yankees" }));

    await screen.findByRole("heading", { name: "New York Yankees schedule" });

    expect(screen.getAllByText(/Game [12]/)).toHaveLength(4);
    expect(screen.getAllByText("Postponed")).toHaveLength(2);
    expect(screen.getAllByText("No start time")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Boxscore" }).length).toBeGreaterThan(0);
  });

  it("renders the boxscore view from cached schedule data", async () => {
    window.history.pushState({}, "", "/team/147");

    cleanup = initRouter(document, window, {
      dataService: createDataService(),
    });

    await screen.findByRole("heading", { name: "New York Yankees schedule" });
    const [boxscoreLink] = screen.getAllByRole("link", { name: "Boxscore" });
    expect(boxscoreLink).toBeTruthy();
    fireEvent.click(boxscoreLink);

    await screen.findByRole("heading", { name: "Boston Red Sox @ New York Yankees" });
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("Winning Pitcher")).toBeTruthy();
    expect(screen.queryByText("Save")).toBeNull();
    expect(screen.getByRole("link", { name: /Watch condensed game:/i })).toBeTruthy();
  });

  it("renders and updates video player cast controls", async () => {
    const castStateListeners: Array<(event: CastContextEvent) => void> = [];
    const sessionStateListeners: Array<(event: CastContextEvent) => void> = [];
    const remotePlayerListeners: Array<() => void> = [];
    const loadMedia = vi.fn(async () => undefined);

    renderWatchDom();
    window.history.replaceState(
      {},
      "",
      "/watch/?src=https://media.test/game.mp4&title=Yankees%20vs%20Red%20Sox&subtitle=Condensed%20Game",
    );

    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
    });

    Object.defineProperty(globalThis, "cast", {
      configurable: true,
      value: {
        framework: {
          CastContext: {
            getInstance: () => ({
              addEventListener: vi.fn(
                (eventType: string, listener: (event: CastContextEvent) => void) => {
                  if (eventType === "cast-state-changed") {
                    castStateListeners.push(listener);
                  } else {
                    sessionStateListeners.push(listener);
                  }
                },
              ),
              endCurrentSession: vi.fn(),
              getCastState: () => "NO_DEVICES_AVAILABLE",
              getCurrentSession: () => ({
                getCastDevice: () => ({ friendlyName: "Living Room TV" }),
                loadMedia,
              }),
              setOptions: vi.fn(),
            }),
          },
          CastContextEventType: {
            CAST_STATE_CHANGED: "cast-state-changed",
            SESSION_STATE_CHANGED: "session-state-changed",
          },
          CastState: {
            NO_DEVICES_AVAILABLE: "NO_DEVICES_AVAILABLE",
          },
          RemotePlayer: function RemotePlayer() {
            return {
              currentTime: 84,
              displayName: "Living Room TV",
              duration: 120,
              isConnected: true,
              isPaused: true,
              volumeLevel: 0.4,
            };
          },
          RemotePlayerController: function RemotePlayerController() {
            return {
              addEventListener: vi.fn((_eventType: string, listener: () => void) => {
                remotePlayerListeners.push(listener);
              }),
              playOrPause: vi.fn(),
              seek: vi.fn(),
              setVolumeLevel: vi.fn(),
            };
          },
          RemotePlayerEventType: {
            CURRENT_TIME_CHANGED: "CURRENT_TIME_CHANGED",
            DURATION_CHANGED: "DURATION_CHANGED",
            IS_CONNECTED_CHANGED: "IS_CONNECTED_CHANGED",
            IS_PAUSED_CHANGED: "IS_PAUSED_CHANGED",
            VOLUME_LEVEL_CHANGED: "VOLUME_LEVEL_CHANGED",
          },
          SessionState: {
            SESSION_ENDED: "SESSION_ENDED",
            SESSION_RESUMED: "SESSION_RESUMED",
            SESSION_STARTED: "SESSION_STARTED",
          },
        },
      } satisfies CastFrameworkApi,
      writable: true,
    });
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: {
        cast: {
          AutoJoinPolicy: {
            ORIGIN_SCOPED: "ORIGIN_SCOPED",
          },
          media: {
            DEFAULT_MEDIA_RECEIVER_APP_ID: "CC1AD845",
            GenericMediaMetadata: function GenericMediaMetadata() {
              return {};
            },
            LoadRequest: function LoadRequest(mediaInfo: ChromeCastMediaInfo) {
              return { mediaInfo } satisfies CastLoadRequest & { mediaInfo: ChromeCastMediaInfo };
            },
            MediaInfo: function MediaInfo(contentId: string) {
              return { contentId } as ChromeCastMediaInfo & { contentId: string };
            },
            StreamType: {
              BUFFERED: "BUFFERED",
            },
          },
        },
      } satisfies ChromeCastApi,
      writable: true,
    });

    const controller = initWatchPage();
    expect(controller).not.toBeNull();
    controller?.handleCastApiAvailable(true);

    castStateListeners[0]?.({ castState: "CONNECTED" });
    sessionStateListeners[0]?.({ sessionState: "SESSION_STARTED" });
    await Promise.resolve();

    for (const listener of remotePlayerListeners) {
      listener();
    }

    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
    expect((screen.getByRole("slider", { name: "Seek" }) as HTMLInputElement).value).toBe("84");
    expect((screen.getByRole("slider", { name: "Volume" }) as HTMLInputElement).value).toBe(
      "40",
    );
    expect(screen.getByText("Connected to Living Room TV.")).toBeTruthy();
  });
});
