import { describe, expect, it } from "vitest";
import {
  formatGameDate,
  formatLastUpdated,
  formatScheduleGameTime,
  formatSlateGameTime,
  getAccessibleScoreDisplay,
  getCalendarDateKey,
} from "../src/utils/game-formatting";
import type { GoldGameSummary } from "../src/types/generated";

const sampleGame: GoldGameSummary = {
  away_team: {
    abbreviation: "BOS",
    division: "AL East",
    id: 111,
    league: "American League",
    name: "Boston Red Sox",
  },
  boxscore_summary: null,
  condensed_game_url: null,
  date: "2026-07-15T23:05:00Z",
  game_pk: 8101,
  home_team: {
    abbreviation: "NYY",
    division: "AL East",
    id: 147,
    league: "American League",
    name: "New York Yankees",
  },
  score: {
    away: 2,
    home: 6,
  },
  score_display: "2-6",
  status: "Final",
};

describe("game formatting utilities", () => {
  const score = sampleGame.score;

  it("formats dates and local start times using the active locale and timezone", () => {
    expect(formatGameDate(sampleGame.date)).toBe(
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date(sampleGame.date)),
    );
    expect(formatScheduleGameTime(sampleGame.date)).toBe(
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(sampleGame.date)),
    );
    expect(formatSlateGameTime(sampleGame.date)).toBe(
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(sampleGame.date)),
    );
  });

  it("formats last updated timestamps with graceful fallbacks", () => {
    expect(formatLastUpdated("2026-07-15T22:45:00Z")).toBe(
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date("2026-07-15T22:45:00Z")),
    );
    expect(formatLastUpdated(null)).toBe("unavailable");
    expect(formatLastUpdated("not-a-date")).toBe("not-a-date");
  });

  it("creates stable local calendar grouping keys for game dates", () => {
    const value = "2026-07-15T23:05:00Z";
    const date = new Date(value);
    expect(getCalendarDateKey(value)).toBe(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}`,
    );
  });

  it("orders accessible score summaries around the selected team when provided", () => {
    expect(score).toBeTruthy();
    if (!score) {
      return;
    }

    expect(getAccessibleScoreDisplay(sampleGame, score)).toEqual({
      primaryName: "Boston Red Sox",
      primaryScore: 2,
      secondaryName: "New York Yankees",
      secondaryScore: 6,
    });
    expect(getAccessibleScoreDisplay(sampleGame, score, 147)).toEqual({
      primaryName: "New York Yankees",
      primaryScore: 6,
      secondaryName: "Boston Red Sox",
      secondaryScore: 2,
    });
  });
});
