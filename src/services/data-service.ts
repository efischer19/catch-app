import type { GoldTeamSchedule, GoldUpcomingGames } from "../types/generated";

type GoldPayload = GoldTeamSchedule | GoldUpcomingGames;

export type DataServiceErrorType = "http" | "network" | "parse" | "timeout";

export interface DataServiceError {
  kind: DataServiceErrorType;
  message: string;
  status?: number;
  url: string;
}

export interface DataServiceSuccess<T extends GoldPayload> {
  ok: true;
  status: "success";
  data: T;
  lastUpdated: string | null;
  fromCache: boolean;
}

export interface DataServiceFailure {
  ok: false;
  status: "error";
  error: DataServiceError;
}

export type DataServiceResult<T extends GoldPayload> =
  | DataServiceSuccess<T>
  | DataServiceFailure;

export interface DataServiceClient {
  getTeamSchedule(teamId: number): Promise<DataServiceResult<GoldTeamSchedule>>;
  getUpcomingGames(): Promise<DataServiceResult<GoldUpcomingGames>>;
  clearCache(): void;
}

interface DataServiceConfig {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_GOLD_BASE_URL = "/gold";
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const TEAM_SCHEDULE_FILE_PREFIX = "team_";
const TEAM_SCHEDULE_FILE_SUFFIX = ".json";
const UPCOMING_GAMES_FILE_NAME = "upcoming_games.json";

const getConfiguredBaseUrl = (): string =>
  import.meta.env.VITE_GOLD_CDN_BASE_URL?.trim() || DEFAULT_GOLD_BASE_URL;

const getConfiguredTimeoutMs = (): number =>
  parseTimeoutMs(import.meta.env.VITE_GOLD_FETCH_TIMEOUT_MS) ??
  DEFAULT_FETCH_TIMEOUT_MS;

export function createDataService(config: DataServiceConfig = {}): DataServiceClient {
  const baseUrl = normalizeBaseUrl(config.baseUrl ?? getConfiguredBaseUrl());
  const timeoutMs = config.timeoutMs ?? getConfiguredTimeoutMs();
  const fetchImpl = config.fetchImpl ?? fetch;
  const cache = new Map<string, DataServiceSuccess<GoldPayload>>();
  const pendingRequests = new Map<string, Promise<DataServiceResult<GoldPayload>>>();

  const fetchGoldJson = async <T extends GoldPayload>(
    fileName: string,
  ): Promise<DataServiceResult<T>> => {
    const url = `${baseUrl}/${fileName}`;
    const cached = cache.get(url) as DataServiceSuccess<T> | undefined;
    if (cached) {
      return {
        ...cached,
        fromCache: true,
      };
    }

    const pendingRequest = pendingRequests.get(url) as
      | Promise<DataServiceResult<T>>
      | undefined;
    if (pendingRequest) {
      return pendingRequest;
    }

    const request = loadGoldJson<T>(fetchImpl, url, timeoutMs).then((result) => {
      if (result.ok) {
        cache.set(url, result as DataServiceSuccess<GoldPayload>);
      }
      return result;
    });

    pendingRequests.set(url, request as Promise<DataServiceResult<GoldPayload>>);

    try {
      return await request;
    } finally {
      pendingRequests.delete(url);
    }
  };

  return {
    getTeamSchedule: (teamId: number) =>
      fetchGoldJson<GoldTeamSchedule>(
        `${TEAM_SCHEDULE_FILE_PREFIX}${teamId}${TEAM_SCHEDULE_FILE_SUFFIX}`,
      ),
    getUpcomingGames: () => fetchGoldJson<GoldUpcomingGames>(UPCOMING_GAMES_FILE_NAME),
    clearCache: () => {
      cache.clear();
      pendingRequests.clear();
    },
  };
}

async function loadGoldJson<T extends GoldPayload>(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<DataServiceResult<T>> {
  const abortController = new AbortController();
  const timeoutId = globalThis.setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
      },
      signal: abortController.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: "error",
        error: {
          kind: "http",
          message:
            response.status === 404
              ? "Data not yet available."
              : "Unable to load data right now.",
          status: response.status,
          url,
        },
      };
    }

    const data = await parseGoldPayload<T>(response, url);
    if (isDataServiceFailure(data)) {
      return data;
    }

    return {
      ok: true,
      status: "success",
      data,
      lastUpdated: data.last_updated ?? null,
      fromCache: false,
    };
  } catch (error) {
    if (isAbortError(error)) {
      return {
        ok: false,
        status: "error",
        error: {
          kind: "timeout",
          message: "The request timed out. Please try again.",
          url,
        },
      };
    }

    return {
      ok: false,
      status: "error",
      error: {
        kind: "network",
        message: "Unable to reach the data service right now.",
        url,
      },
    };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function parseGoldPayload<T extends GoldPayload>(
  response: Response,
  url: string,
): Promise<T | DataServiceFailure> {
  try {
    const json = (await response.json()) as unknown;
    if (!isObject(json)) {
      return {
        ok: false,
        status: "error",
        error: {
          kind: "parse",
          message: "Received invalid data from the server.",
          url,
        },
      };
    }

    return json as T;
  } catch {
    return {
      ok: false,
      status: "error",
      error: {
        kind: "parse",
        message: "Received invalid data from the server.",
        url,
      },
    };
  }
}

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

const isDataServiceFailure = (
  result: GoldPayload | DataServiceFailure,
): result is DataServiceFailure => "ok" in result && result.ok === false;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.replace(/\/+$/, "");

function parseTimeoutMs(timeoutMs: string | undefined): number | undefined {
  if (!timeoutMs) {
    return undefined;
  }

  const parsed = Number.parseInt(timeoutMs, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const dataService = createDataService();

export const DataService = {
  getTeamSchedule: (teamId: number) => dataService.getTeamSchedule(teamId),
  getUpcomingGames: () => dataService.getUpcomingGames(),
  clearCache: () => dataService.clearCache(),
};

export const getTeamSchedule = DataService.getTeamSchedule;
export const getUpcomingGames = DataService.getUpcomingGames;
