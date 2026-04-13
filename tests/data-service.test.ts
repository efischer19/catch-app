import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GoldTeamSchedule, GoldUpcomingGames } from "../src/types/generated";
import { createDataService } from "../src/services/data-service";

type FetchMockFunction = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const sampleTeamSchedule: GoldTeamSchedule = {
  games: [],
  last_updated: "2026-04-13T00:00:00Z",
  season_year: 2026,
  team_abbreviation: "NYY",
  team_id: 147,
  team_name: "New York Yankees",
};

const sampleUpcomingGames: GoldUpcomingGames = {
  games: [],
  last_updated: "2026-04-13T00:00:00Z",
};

describe("data service", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches a typed team schedule and exposes last_updated", async () => {
    const fetchMock = vi.fn<FetchMockFunction>().mockResolvedValue(
      new Response(JSON.stringify(sampleTeamSchedule), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    const service = createDataService({
      baseUrl: "https://cdn.catch.test/gold/",
      fetchImpl: fetchMock,
    });

    const result = await service.getTeamSchedule(147);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://cdn.catch.test/gold/team_147.json",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
    expect(result).toEqual({
      ok: true,
      status: "success",
      data: sampleTeamSchedule,
      lastUpdated: sampleTeamSchedule.last_updated ?? null,
      fromCache: false,
    });
  });

  it("returns a friendly typed error for missing files", async () => {
    const fetchMock = vi.fn<FetchMockFunction>().mockResolvedValue(
      new Response("not found", { status: 404, statusText: "Not Found" }),
    );
    const service = createDataService({
      baseUrl: "https://cdn.catch.test/gold",
      fetchImpl: fetchMock,
    });

    const result = await service.getUpcomingGames();

    expect(result).toEqual({
      ok: false,
      status: "error",
      error: {
        kind: "http",
        message: "Data not yet available.",
        status: 404,
        url: "https://cdn.catch.test/gold/upcoming_games.json",
      },
    });
  });

  it("caches successful responses for the rest of the session", async () => {
    const fetchMock = vi.fn<FetchMockFunction>().mockResolvedValue(
      new Response(JSON.stringify(sampleUpcomingGames), { status: 200 }),
    );
    const service = createDataService({
      baseUrl: "https://cdn.catch.test/gold",
      fetchImpl: fetchMock,
    });

    const firstResult = await service.getUpcomingGames();
    const secondResult = await service.getUpcomingGames();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual({
      ok: true,
      status: "success",
      data: sampleUpcomingGames,
      lastUpdated: sampleUpcomingGames.last_updated ?? null,
      fromCache: false,
    });
    expect(secondResult).toEqual({
      ok: true,
      status: "success",
      data: sampleUpcomingGames,
      lastUpdated: sampleUpcomingGames.last_updated ?? null,
      fromCache: true,
    });
  });

  it("returns a timeout error when the request takes too long", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn<FetchMockFunction>(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );
    const service = createDataService({
      baseUrl: "https://cdn.catch.test/gold",
      timeoutMs: 25,
      fetchImpl: fetchMock,
    });

    const resultPromise = service.getUpcomingGames();
    await vi.advanceTimersByTimeAsync(25);

    await expect(resultPromise).resolves.toEqual({
      ok: false,
      status: "error",
      error: {
        kind: "timeout",
        message: "The request timed out. Please try again.",
        url: "https://cdn.catch.test/gold/upcoming_games.json",
      },
    });
  });
});
