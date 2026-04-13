import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWatchMedia, initWatchPage } from "../src/watch/watch";

function setWatchDom(): void {
  document.body.innerHTML = `
    <p id="watch-status-announcements" aria-live="polite"></p>
    <div id="cast-button-container" hidden></div>
    <main id="watch-main">
      <video id="watch-video"></video>
      <h1 id="watch-title"></h1>
      <p id="watch-subtitle"></p>
      <section id="casting-controls" hidden>
        <p id="cast-device-status"></p>
        <button id="cast-play-pause" type="button"></button>
        <button id="cast-stop" type="button"></button>
        <input id="cast-seek" type="range" min="0" max="0" step="1" value="0">
        <p id="cast-timeline"></p>
        <input id="cast-volume" type="range" min="0" max="100" step="1" value="100">
      </section>
    </main>
  `;
}

describe("watch view", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    setWatchDom();
    window.history.replaceState({}, "", "/watch/");

    Object.defineProperty(globalThis, "cast", {
      configurable: true,
      value: undefined,
      writable: true,
    });
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: undefined,
      writable: true,
    });

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
  });

  it("parses safe watch media query params and rejects unsafe URLs", () => {
    const media = getWatchMedia(
      "?src=javascript:alert(1)&poster=http://poster.test/poster.jpg&title=Yankees%20vs%20Red%20Sox&subtitle=Condensed%20Game",
    );

    expect(media.src).toContain("BigBuckBunny.mp4");
    expect(media.posterUrl).toBeNull();
    expect(media.title).toBe("Yankees vs Red Sox");
    expect(media.subtitle).toBe("Condensed Game");
  });

  it("loads cast media, exposes controls, and restores browser playback after casting stops", async () => {
    const castStateListeners: Array<(event: CastContextEvent) => void> = [];
    const sessionStateListeners: Array<(event: CastContextEvent) => void> = [];
    const remotePlayerListeners: Array<() => void> = [];
    const loadMedia = vi.fn(async () => undefined);
    const endCurrentSession = vi.fn();
    const remoteController = {
      addEventListener: vi.fn((_eventType: string, listener: () => void) => {
        remotePlayerListeners.push(listener);
      }),
      playOrPause: vi.fn(),
      seek: vi.fn(),
      setVolumeLevel: vi.fn(),
    };
    const remotePlayer = {
      currentTime: 0,
      displayName: "Living Room TV",
      duration: 0,
      isConnected: false,
      isPaused: false,
      volumeLevel: 1,
    };
    const session = {
      getCastDevice: () => ({ friendlyName: "Living Room TV" }),
      getMediaSession: () => ({ media: { contentId: "https://media.test/game.mp4" } }),
      loadMedia,
    };
    const castContext = {
      addEventListener: vi.fn((eventType: string, listener: (event: CastContextEvent) => void) => {
        if (eventType === "cast-state-changed") {
          castStateListeners.push(listener);
        } else {
          sessionStateListeners.push(listener);
        }
      }),
      endCurrentSession,
      getCastState: () => "NO_DEVICES_AVAILABLE",
      getCurrentSession: () => session,
      setOptions: vi.fn(),
    };

    Object.defineProperty(globalThis, "cast", {
      configurable: true,
      value: {
        framework: {
          CastContext: {
            getInstance: () => castContext,
          },
          CastContextEventType: {
            CAST_STATE_CHANGED: "cast-state-changed",
            SESSION_STATE_CHANGED: "session-state-changed",
          },
          CastState: {
            NO_DEVICES_AVAILABLE: "NO_DEVICES_AVAILABLE",
          },
          RemotePlayer: function RemotePlayer() {
            return remotePlayer;
          },
          RemotePlayerController: function RemotePlayerController() {
            return remoteController;
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

    window.history.replaceState(
      {},
      "",
      "/watch/?src=https://media.test/game.mp4&title=Yankees%20vs%20Red%20Sox&subtitle=Condensed%20Game",
    );

    initWatchPage();
    expect(window.__onGCastApiAvailable).toBeTypeOf("function");

    window.__onGCastApiAvailable?.(true);

    castStateListeners[0]?.({ castState: "CONNECTED" });
    expect(document.getElementById("cast-button-container")?.hidden).toBe(false);

    const video = document.getElementById("watch-video") as HTMLVideoElement;
    video.currentTime = 42;

    sessionStateListeners[0]?.({ sessionState: "SESSION_STARTED" });
    await Promise.resolve();

    expect(loadMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        autoplay: true,
        currentTime: 42,
      }),
    );
    expect(document.getElementById("watch-status-announcements")?.textContent).toBe(
      "Now casting to Living Room TV.",
    );

    remotePlayer.isConnected = true;
    remotePlayer.currentTime = 84;
    remotePlayer.duration = 120;
    remotePlayer.volumeLevel = 0.4;
    remotePlayer.isPaused = true;
    for (const listener of remotePlayerListeners) {
      listener();
    }

    expect(document.getElementById("casting-controls")?.hidden).toBe(false);
    expect(document.getElementById("cast-device-status")?.textContent).toBe(
      "Connected to Living Room TV.",
    );
    expect(document.getElementById("cast-play-pause")?.textContent).toBe("Play");
    expect(document.getElementById("cast-timeline")?.textContent).toBe("1:24 / 2:00");
    expect((document.getElementById("cast-volume") as HTMLInputElement).value).toBe("40");

    (document.getElementById("cast-play-pause") as HTMLButtonElement).click();
    expect(remoteController.playOrPause).toHaveBeenCalledTimes(1);

    const seek = document.getElementById("cast-seek") as HTMLInputElement;
    seek.value = "90";
    seek.dispatchEvent(new Event("change"));
    expect(remotePlayer.currentTime).toBe(90);
    expect(remoteController.seek).toHaveBeenCalledTimes(1);

    const volume = document.getElementById("cast-volume") as HTMLInputElement;
    volume.value = "25";
    volume.dispatchEvent(new Event("input"));
    expect(remotePlayer.volumeLevel).toBe(0.25);
    expect(remoteController.setVolumeLevel).toHaveBeenCalledTimes(1);

    (document.getElementById("cast-stop") as HTMLButtonElement).click();
    expect(endCurrentSession).toHaveBeenCalledWith(true);

    sessionStateListeners[0]?.({ sessionState: "SESSION_ENDED" });
    expect(video.currentTime).toBe(90);
    expect(document.getElementById("watch-status-announcements")?.textContent).toBe(
      "Casting stopped. Playback returned to the browser.",
    );
  });
});
