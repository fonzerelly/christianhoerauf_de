import { defineConfig } from "vitest/config";

// Unit-Tests mit Abdeckung. Property-based Tests laufen getrennt (vitest.properties.config.ts)
// und zählen nicht zur Abdeckung.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/*.property.test.ts", "**/node_modules/**"],
    environment: "node",
    passWithNoTests: true, // nur bis zu den ersten Tests in Schritt 2
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.property.test.ts"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text", "html"],
    },
  },
});
