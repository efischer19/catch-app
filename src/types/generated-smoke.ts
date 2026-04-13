import type {
  GoldBoxscoreSummary,
  GoldGameSummary,
  GoldTeamInfo,
  GoldTeamSchedule,
  GoldUpcomingGames,
} from "./generated";

type OptionalKeys<T> = {
  [K in keyof T]-?: Omit<T, K> extends T ? K : never;
}[keyof T];

type NullableOptionalKeys<T, Keys extends keyof T> = Extract<OptionalKeys<T>, Keys>;

type NullableFieldsMustBeRequired<T, Keys extends keyof T> =
  NullableOptionalKeys<T, Keys> extends never ? true : false;

const gameSummaryNullableFieldsAreRequired: NullableFieldsMustBeRequired<
  GoldGameSummary,
  "boxscore_summary" | "condensed_game_url" | "score" | "score_display"
> = true;
const boxscoreNullableFieldsAreRequired: NullableFieldsMustBeRequired<
  GoldBoxscoreSummary,
  "losing_pitcher" | "save_pitcher" | "winning_pitcher"
> = true;

void gameSummaryNullableFieldsAreRequired;
void boxscoreNullableFieldsAreRequired;

const sampleTeam: GoldTeamInfo = {
  abbreviation: "NYY",
  division: "AL East",
  id: 147,
  league: "American League",
  name: "New York Yankees",
};

const sampleGame: GoldGameSummary = {
  away_team: sampleTeam,
  boxscore_summary: null,
  condensed_game_url: null,
  date: "2026-04-13T19:05:00Z",
  game_number: 1,
  game_pk: 123456,
  home_team: sampleTeam,
  score: null,
  score_display: null,
  status: "Scheduled",
};

export const sampleSchedule: GoldTeamSchedule = {
  games: [sampleGame],
  last_updated: "2026-04-13T19:05:00Z",
  season_year: 2026,
  team_abbreviation: sampleTeam.abbreviation,
  team_id: sampleTeam.id,
  team_name: sampleTeam.name,
};

export const sampleUpcomingGames: GoldUpcomingGames = {
  games: [sampleGame],
  last_updated: "2026-04-13T19:05:00Z",
};
