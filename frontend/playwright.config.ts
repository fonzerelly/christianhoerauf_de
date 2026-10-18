import { defineConfig } from "@playwright/test";

// Bildtests. Laufen nur im Docker-Image von Playwright (npm run test:visual), damit die
// Referenzbilder auf jedem Rechner gleich entstehen.
const PORT = 4173;

export default defineConfig({
  testDir: "visual",
  outputDir: "test-results",
  snapshotPathTemplate: "{testDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://127.0.0.1:${String(PORT)}`,
    browserName: "chromium",
  },
  projects: [
    {
      name: "handy",
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: {
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: `npx vite build && npx vite preview --host 127.0.0.1 --port ${String(PORT)} --strictPort`,
    url: `http://127.0.0.1:${String(PORT)}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
