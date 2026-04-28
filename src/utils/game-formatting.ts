import type { GoldGameSummary, GoldScore } from "../types/generated";

const GAME_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const SCHEDULE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const SLATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});
const LAST_UPDATED_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export interface AccessibleScoreDisplay {
  primaryName: string;
  primaryScore: number;
  secondaryName: string;
  secondaryScore: number;
}

export function formatGameDate(value: string): string {
  return GAME_DATE_FORMATTER.format(new Date(value));
}

export function formatScheduleGameTime(value: string): string {
  return SCHEDULE_TIME_FORMATTER.format(new Date(value));
}

export function formatSlateGameTime(value: string): string {
  return SLATE_TIME_FORMATTER.format(new Date(value));
}

export function formatLastUpdated(value: string | null): string {
  if (!value) {
    return "unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return LAST_UPDATED_FORMATTER.format(parsed);
}

export function getAccessibleScoreDisplay(
  game: GoldGameSummary,
  score: GoldScore,
  teamId?: number,
): AccessibleScoreDisplay {
  if (typeof teamId !== "number") {
    return {
      primaryName: game.away_team.name,
      primaryScore: score.away,
      secondaryName: game.home_team.name,
      secondaryScore: score.home,
    };
  }

  const isHome = game.home_team.id === teamId;
  return isHome
    ? {
        primaryName: game.home_team.name,
        primaryScore: score.home,
        secondaryName: game.away_team.name,
        secondaryScore: score.away,
      }
    : {
        primaryName: game.away_team.name,
        primaryScore: score.away,
        secondaryName: game.home_team.name,
        secondaryScore: score.home,
      };
}

export function getCalendarDateKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}
