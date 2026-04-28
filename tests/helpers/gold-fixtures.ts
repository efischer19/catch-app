import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { GoldTeamSchedule, GoldUpcomingGames } from "../../src/types/generated";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturesDirectory = path.resolve(currentDirectory, "../fixtures/gold");

export function readGoldFixture<T extends GoldTeamSchedule | GoldUpcomingGames>(
  fileName: string,
): T {
  return JSON.parse(fs.readFileSync(path.join(fixturesDirectory, fileName), "utf8")) as T;
}
