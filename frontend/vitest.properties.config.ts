import { defineConfig } from "vitest/config";

// Property-based Tests (fast-check) mit vielen Durchläufen. Nicht Teil der Abdeckung.
export default defineConfig({
  test: {
    include: ["src/**/*.property.test.ts", "tests/**/*.property.test.ts"],
    environment: "node",
    testTimeout: 120_000,
  },
});
