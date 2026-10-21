import { resolve } from "node:path";
import { defineConfig } from "vite";

// Drei Seiten: die Startseite und die beiden Pflichtseiten.
// Relative Pfade (base "./"): Dieselbe gebaute Seite läuft unter christianhoerauf.de und unter
// der Vorschau-Adresse fonzerelly.github.io/christianhoerauf_de/.
export default defineConfig({
  base: "./",
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
