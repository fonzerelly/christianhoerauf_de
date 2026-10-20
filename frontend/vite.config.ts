import { resolve } from "node:path";
import { defineConfig } from "vite";

// Drei Seiten: die Startseite und die beiden Pflichtseiten.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        impressum: resolve(import.meta.dirname, "impressum.html"),
        datenschutz: resolve(import.meta.dirname, "datenschutz.html"),
      },
    },
  },
});
