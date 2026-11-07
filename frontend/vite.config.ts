import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";

// Drei Seiten: die Startseite und die beiden Pflichtseiten.
// Relative Pfade (base "./"): Dieselbe gebaute Seite läuft unter christianhoerauf.de und unter
// der Vorschau-Adresse fonzerelly.github.io/christianhoerauf_de/.
//
// Im Dev-Server holt die Seite /lebenslauf von der eigenen Herkunft (src/cv/http-cv-source.ts,
// `cvUrlOf`), und Vite leitet es an das Backend aus VITE_ANSWER_URL weiter: Das Backend erlaubt
// nur christianhoerauf.de als Herkunft, über die Weiterleitung greift diese Sperre nicht.
export default defineConfig(({ mode }) => {
  const answerUrl = loadEnv(mode, import.meta.dirname, "VITE_").VITE_ANSWER_URL;
  return {
    base: "./",
    server:
      answerUrl === undefined || answerUrl === ""
        ? {}
        : {
            proxy: {
              "/lebenslauf": { target: new URL(answerUrl).origin, changeOrigin: true },
            },
          },
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
  };
});
