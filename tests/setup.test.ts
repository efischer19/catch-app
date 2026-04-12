import { describe, it, expect } from "vitest";

describe("setup", () => {
  it("vitest is configured and running", () => {
    expect(true).toBe(true);
  });

  it("TypeScript compilation works", () => {
    const greeting: string = "Catch";
    expect(greeting).toBe("Catch");
  });
});
