const DEFAULT_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

interface WatchMedia {
  posterUrl: string | null;
  src: string;
  subtitle: string;
  title: string;
}

interface WatchElements {
  castButtonContainer: HTMLElement;
  castDeviceStatus: HTMLElement;
  castPlayPauseButton: HTMLButtonElement;
  castSeek: HTMLInputElement;
  castTimeline: HTMLElement;
  castVolume: HTMLInputElement;
  castStopButton: HTMLButtonElement;
  castingControls: HTMLElement;
  statusAnnouncements: HTMLElement;
  subtitle: HTMLElement;
  title: HTMLElement;
  video: HTMLVideoElement;
}

export interface WatchPageController {
  handleCastApiAvailable(isAvailable: boolean): void;
}

export function initWatchPage(doc: Document = document): WatchPageController | null {
  const elements = getWatchElements(doc);
  if (!elements) {
    return null;
  }

  const media = getWatchMedia(window.location.search);
  applyMedia(elements, media);
  updateCastingControls(elements, null);

  const state = {
    castContext: null as CastContext | null,
    remotePlayer: null as CastRemotePlayer | null,
    remotePlayerController: null as CastRemotePlayerController | null,
    lastLocalTime: 0,
    lastRemoteTime: 0,
    media,
    pendingSeekPreviewFrame: 0,
  };

  const syncRemoteUi = (): void => {
    if (!state.remotePlayer?.isConnected) {
      updateCastingControls(elements, null);
      return;
    }

    const duration = state.remotePlayer.duration > 0 ? state.remotePlayer.duration : 0;
    const currentTime = clampTime(state.remotePlayer.currentTime, duration);
    state.lastRemoteTime = currentTime;

    updateCastingControls(elements, {
      currentTime,
      deviceName: getDeviceName(state.castContext?.getCurrentSession(), state.remotePlayer),
      duration,
      isPaused: state.remotePlayer.isPaused,
      volumeLevel: state.remotePlayer.volumeLevel,
    });
  };

  const restoreLocalPlayback = (): void => {
    const resumeTime = state.lastRemoteTime > 0 ? state.lastRemoteTime : state.lastLocalTime;
    elements.video.currentTime = resumeTime;
    void elements.video
      .play()
      .then(() => {
        announce(
          elements.statusAnnouncements,
          "Casting stopped. Playback returned to the browser.",
        );
      })
      .catch(() => {
        announce(
          elements.statusAnnouncements,
          "Casting stopped. Press play in the browser player to resume playback.",
        );
      });
  };

  const loadRemoteMedia = async (): Promise<void> => {
    const session = state.castContext?.getCurrentSession();
    if (!session) {
      return;
    }

    state.lastLocalTime = elements.video.currentTime;
    state.lastRemoteTime = elements.video.currentTime;
    elements.video.pause();

    const mediaInfo = new chrome.cast.media.MediaInfo(state.media.src, "video/mp4");
    const metadata = new chrome.cast.media.GenericMediaMetadata();
    metadata.title = state.media.title;
    metadata.subtitle = state.media.subtitle;
    if (state.media.posterUrl) {
      metadata.images = [{ url: state.media.posterUrl }];
    }
    mediaInfo.metadata = metadata;
    mediaInfo.streamType = chrome.cast.media.StreamType.BUFFERED;

    const request = new chrome.cast.media.LoadRequest(mediaInfo);
    request.autoplay = true;
    request.currentTime = elements.video.currentTime;

    await session.loadMedia(request);

    const deviceName = getDeviceName(session, state.remotePlayer);
    announce(elements.statusAnnouncements, `Now casting to ${deviceName}.`);
    syncRemoteUi();
  };

  const handleSessionStateChange = (sessionState?: string): void => {
    if (!sessionState) {
      return;
    }

    if (
      sessionState === cast.framework.SessionState.SESSION_STARTED ||
      sessionState === cast.framework.SessionState.SESSION_RESUMED
    ) {
      void loadRemoteMedia().catch(() => {
        announce(
          elements.statusAnnouncements,
          "Unable to start Chromecast playback. Continuing in the browser player.",
        );
        void elements.video.play().catch(() => {
          // Playback may still require user interaction after a failed cast attempt.
        });
      });
      return;
    }

    if (sessionState === cast.framework.SessionState.SESSION_ENDED) {
      updateCastingControls(elements, null);
      restoreLocalPlayback();
    }
  };

  const handleCastApiAvailable = (isAvailable: boolean): void => {
    if (!isAvailable || state.castContext || !isCastSdkReady()) {
      return;
    }

    state.castContext = cast.framework.CastContext.getInstance();
    state.castContext.setOptions({
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
    });

    state.remotePlayer = new cast.framework.RemotePlayer();
    state.remotePlayerController = new cast.framework.RemotePlayerController(state.remotePlayer);

    for (const eventType of [
      cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
      cast.framework.RemotePlayerEventType.DURATION_CHANGED,
      cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
      cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
      cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED,
    ]) {
      state.remotePlayerController.addEventListener(eventType, syncRemoteUi);
    }

    state.castContext.addEventListener(
      cast.framework.CastContextEventType.CAST_STATE_CHANGED,
      (event: CastContextEvent) => {
        elements.castButtonContainer.hidden =
          event.castState === cast.framework.CastState.NO_DEVICES_AVAILABLE;
      },
    );
    state.castContext.addEventListener(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      (event: CastContextEvent) => {
        handleSessionStateChange(event.sessionState);
      },
    );

    elements.castButtonContainer.hidden =
      state.castContext.getCastState() === cast.framework.CastState.NO_DEVICES_AVAILABLE;
    syncRemoteUi();
  };

  elements.castPlayPauseButton.addEventListener("click", () => {
    state.remotePlayerController?.playOrPause();
  });
  elements.castStopButton.addEventListener("click", () => {
    state.lastRemoteTime = state.remotePlayer?.currentTime ?? elements.video.currentTime;
    state.castContext?.endCurrentSession(true);
  });
  elements.castSeek.addEventListener("input", () => {
    const duration = Number(elements.castSeek.max);
    const currentTime = clampTime(Number(elements.castSeek.value), duration);
    if (state.pendingSeekPreviewFrame) {
      cancelAnimationFrame(state.pendingSeekPreviewFrame);
    }

    state.pendingSeekPreviewFrame = requestAnimationFrame(() => {
      elements.castTimeline.textContent = formatTimeline(currentTime, duration);
      state.pendingSeekPreviewFrame = 0;
    });
  });
  elements.castSeek.addEventListener("change", () => {
    if (!state.remotePlayer || !state.remotePlayerController) {
      return;
    }

    state.remotePlayer.currentTime = Number(elements.castSeek.value);
    state.remotePlayerController.seek();
    syncRemoteUi();
  });
  elements.castVolume.addEventListener("input", () => {
    if (!state.remotePlayer || !state.remotePlayerController) {
      return;
    }

    state.remotePlayer.volumeLevel = Number(elements.castVolume.value) / 100;
    state.remotePlayerController.setVolumeLevel();
    syncRemoteUi();
  });

  window.__onGCastApiAvailable = handleCastApiAvailable;
  if (isCastSdkReady()) {
    handleCastApiAvailable(true);
  }

  return {
    handleCastApiAvailable,
  };
}

export function getWatchMedia(search: string): WatchMedia {
  const params = new URLSearchParams(search);
  const src = sanitizeHttpsUrl(params.get("src")) ?? DEFAULT_VIDEO_URL;
  const title = getTextParam(params, "title") ?? "Condensed Game";
  const subtitle =
    getTextParam(params, "subtitle") ??
    "Basic full-screen player with Chromecast support via the Default Media Receiver.";
  const posterUrl = sanitizeHttpsUrl(params.get("poster"));

  return {
    posterUrl,
    src,
    subtitle,
    title,
  };
}

function getWatchElements(doc: Document): WatchElements | null {
  const video = doc.getElementById("watch-video");
  const title = doc.getElementById("watch-title");
  const subtitle = doc.getElementById("watch-subtitle");
  const statusAnnouncements = doc.getElementById("watch-status-announcements");
  const castButtonContainer = doc.getElementById("cast-button-container");
  const castingControls = doc.getElementById("casting-controls");
  const castDeviceStatus = doc.getElementById("cast-device-status");
  const castPlayPauseButton = doc.getElementById("cast-play-pause");
  const castStopButton = doc.getElementById("cast-stop");
  const castSeek = doc.getElementById("cast-seek");
  const castTimeline = doc.getElementById("cast-timeline");
  const castVolume = doc.getElementById("cast-volume");

  if (
    !(video instanceof HTMLVideoElement) ||
    !(title instanceof HTMLElement) ||
    !(subtitle instanceof HTMLElement) ||
    !(statusAnnouncements instanceof HTMLElement) ||
    !(castButtonContainer instanceof HTMLElement) ||
    !(castingControls instanceof HTMLElement) ||
    !(castDeviceStatus instanceof HTMLElement) ||
    !(castPlayPauseButton instanceof HTMLButtonElement) ||
    !(castStopButton instanceof HTMLButtonElement) ||
    !(castSeek instanceof HTMLInputElement) ||
    !(castTimeline instanceof HTMLElement) ||
    !(castVolume instanceof HTMLInputElement)
  ) {
    return null;
  }

  return {
    castButtonContainer,
    castDeviceStatus,
    castPlayPauseButton,
    castSeek,
    castTimeline,
    castVolume,
    castStopButton,
    castingControls,
    statusAnnouncements,
    subtitle,
    title,
    video,
  };
}

function applyMedia(elements: WatchElements, media: WatchMedia): void {
  elements.title.textContent = media.title;
  elements.subtitle.textContent = media.subtitle;
  elements.video.src = media.src;
  if (media.posterUrl) {
    elements.video.poster = media.posterUrl;
  }
}

function updateCastingControls(
  elements: WatchElements,
  state: {
    currentTime: number;
    deviceName: string;
    duration: number;
    isPaused: boolean;
    volumeLevel: number;
  } | null,
): void {
  const isCasting = state !== null;
  elements.castingControls.hidden = !isCasting;
  elements.castPlayPauseButton.disabled = !isCasting;
  elements.castSeek.disabled = !isCasting;
  elements.castVolume.disabled = !isCasting;
  elements.castStopButton.disabled = !isCasting;

  if (!state) {
    elements.castDeviceStatus.textContent = "Not currently casting.";
    elements.castPlayPauseButton.textContent = "Pause";
    elements.castSeek.max = "0";
    elements.castSeek.value = "0";
    elements.castTimeline.textContent = "0:00 / 0:00";
    elements.castVolume.value = "100";
    return;
  }

  const duration = state.duration > 0 ? state.duration : 0;
  const currentTime = clampTime(state.currentTime, duration);
  elements.castDeviceStatus.textContent = `Connected to ${state.deviceName}.`;
  elements.castPlayPauseButton.textContent = state.isPaused ? "Play" : "Pause";
  elements.castSeek.max = String(duration);
  elements.castSeek.value = String(currentTime);
  elements.castTimeline.textContent = formatTimeline(currentTime, duration);
  elements.castVolume.value = String(Math.round(state.volumeLevel * 100));
}

function getDeviceName(
  session: CastSession | null | undefined,
  remotePlayer: CastRemotePlayer | null,
): string {
  return (
    session?.getCastDevice?.()?.friendlyName ??
    remotePlayer?.displayName ??
    "your Cast device"
  );
}

function sanitizeHttpsUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function getTextParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim();
  return value || null;
}

function announce(element: HTMLElement, message: string): void {
  element.textContent = "";
  requestAnimationFrame(() => {
    element.textContent = message;
  });
}

function clampTime(value: number, duration: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    return value;
  }

  return Math.min(value, duration);
}

function formatTimeline(currentTime: number, duration: number): string {
  return `${formatTime(currentTime)} / ${formatTime(duration)}`;
}

function formatTime(value: number): string {
  const safeValue = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  const hours = Math.floor(safeValue / 3600);
  const minutes = Math.floor((safeValue % 3600) / 60);
  const seconds = safeValue % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function isCastSdkReady(): boolean {
  return typeof cast !== "undefined" && typeof chrome !== "undefined";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initWatchPage();
  });
} else {
  initWatchPage();
}
