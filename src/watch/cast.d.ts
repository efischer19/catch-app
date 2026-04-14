declare global {
  interface CastDevice {
    friendlyName?: string;
  }

  interface CastMediaSession {
    media?: {
      contentId?: string;
      duration?: number;
    };
  }

  interface CastSession {
    getCastDevice?(): CastDevice;
    getMediaSession?(): CastMediaSession | null;
    loadMedia(request: CastLoadRequest): Promise<void>;
  }

  interface CastLoadRequest {
    autoplay?: boolean;
    currentTime?: number;
  }

  interface CastContextEvent {
    castState?: string;
    sessionState?: string;
  }

  interface CastContextOptions {
    autoJoinPolicy: string;
    receiverApplicationId: string;
  }

  interface CastContext {
    addEventListener(eventType: string, listener: (event: CastContextEvent) => void): void;
    endCurrentSession(stopCasting: boolean): void;
    getCastState(): string;
    getCurrentSession(): CastSession | null;
    setOptions(options: CastContextOptions): void;
  }

  interface CastRemotePlayer {
    currentTime: number;
    displayName?: string;
    duration: number;
    isConnected: boolean;
    isMediaLoaded?: boolean;
    isPaused: boolean;
    mediaInfo?: {
      contentId?: string;
    };
    volumeLevel: number;
  }

  interface CastRemotePlayerController {
    addEventListener(eventType: string, listener: () => void): void;
    playOrPause(): void;
    seek(): void;
    setVolumeLevel(): void;
  }

  interface CastFrameworkApi {
    framework: {
      CastContext: {
        getInstance(): CastContext;
      };
      CastContextEventType: {
        CAST_STATE_CHANGED: string;
        SESSION_STATE_CHANGED: string;
      };
      CastState: {
        NO_DEVICES_AVAILABLE: string;
      };
      RemotePlayer: new () => CastRemotePlayer;
      RemotePlayerController: new (
        player: CastRemotePlayer,
      ) => CastRemotePlayerController;
      RemotePlayerEventType: {
        CURRENT_TIME_CHANGED: string;
        DURATION_CHANGED: string;
        IS_CONNECTED_CHANGED: string;
        IS_PAUSED_CHANGED: string;
        VOLUME_LEVEL_CHANGED: string;
      };
      SessionState: {
        SESSION_ENDED: string;
        SESSION_RESUMED: string;
        SESSION_STARTED: string;
      };
    };
  }

  interface ChromeCastMediaInfo {
    metadata?: ChromeCastMetadata;
    streamType?: string;
  }

  interface ChromeCastMetadata {
    images?: Array<{ url: string }>;
    subtitle?: string;
    title?: string;
  }

  interface ChromeCastApi {
    cast: {
      AutoJoinPolicy: {
        ORIGIN_SCOPED: string;
      };
      media: {
        DEFAULT_MEDIA_RECEIVER_APP_ID: string;
        GenericMediaMetadata: new () => ChromeCastMetadata;
        LoadRequest: new (mediaInfo: ChromeCastMediaInfo) => CastLoadRequest;
        MediaInfo: new (contentId: string, contentType: string) => ChromeCastMediaInfo;
        StreamType: {
          BUFFERED: string;
        };
      };
    };
  }

  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
  }

  const cast: CastFrameworkApi;
  const chrome: ChromeCastApi;
}

export {};
