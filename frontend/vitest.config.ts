import { defineConfig } from "vitest/config";

// Unit-Tests mit Abdeckung. Property-based Tests laufen getrennt (vitest.properties.config.ts)
// und zählen nicht zur Abdeckung.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/*.property.test.ts", "**/node_modules/**"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.property.test.ts",
        "src/test-support/**",
        // Composition Root: nur Zusammenstecken, keine Logik. Die Bildtests laufen durch sie hindurch.
        "src/main.ts",
        // Nur DOM-Aufrufe für den Übergang beim Klappen (messen, klonen, Web Animations); ohne
        // Browser nicht zu prüfen. Die Logik dazu ist fold-transition.ts, voll getestet.
        "src/ui/timeline/dom-transition-port.ts",
      ],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text", "html"],
    },
  },
});
