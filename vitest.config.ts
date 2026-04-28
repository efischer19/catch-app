import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "src/types/generated-smoke.ts",
        "src/types/generated.ts",
        "src/vite-env.d.ts",
        "src/watch/cast.d.ts",
      ],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
    },
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
