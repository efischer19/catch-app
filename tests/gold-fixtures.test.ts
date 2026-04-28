import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "../src/schema/schema.json";
import { readGoldFixture } from "./helpers/gold-fixtures";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateGoldFixture = ajv.compile(schema);

describe("gold test fixtures", () => {
  it.each([
    "team_147.json",
    "upcoming-games.json",
    "upcoming-games-empty.json",
  ])("keeps %s aligned with the committed Gold JSON schema", (fileName) => {
    const fixture = readGoldFixture(fileName);

    const isValid = validateGoldFixture(fixture);

    expect(isValid, JSON.stringify(validateGoldFixture.errors, null, 2)).toBe(true);
  });
});
