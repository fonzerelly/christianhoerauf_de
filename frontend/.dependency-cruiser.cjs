// Architekturtest: Die Abhängigkeiten in src/ zeigen nur nach innen (Ports & Adapters).
//
//   domain     importiert nur aus domain
//   animation  darf domain
//   rendering  darf domain, animation
//   answering  darf domain
//   ui         darf alles außer main
//   config     darf von allen gelesen werden und importiert selbst nichts
//   main.ts    kennt alles, wird von niemandem importiert
//
// Dazu: keine Zyklen, nichts von außerhalb von src/ (z. B. der Prototyp), keine Node-Module.
//
// Zusätzlich gelten Regeln aus der empfohlenen Sammlung von dependency-cruiser, alle als Fehler:
//   no-orphans              Datei, die niemand importiert (toter Code); main.ts ist ausgenommen
//   not-to-deprecated       veraltetes npm-Paket
//   no-deprecated-core      veraltetes Node-Modul
//   no-non-package-json     Paket, das nicht in package.json steht
//   no-duplicate-dep-types  Paket in package.json doppelt eingetragen (z. B. dependencies und devDependencies)

/** Eine Regel aus der empfohlenen Sammlung, als Fehler statt als Warnung. */
function recommended(fileName, changes = {}) {
  // Über den Dateipfad, denn das Paket gibt seine Regeldateien nicht als Export frei.
  const rule = require(
    `${__dirname}/node_modules/dependency-cruiser/configs/rules/${fileName}.cjs`,
  );
  return { ...rule, severity: "error", ...changes };
}

const noOrphans = recommended("no-orphans");

/** Alle Schichten außer den genannten, als regulärer Ausdruck für "path". */
function layersExcept(...allowed) {
  const layers = ["domain", "animation", "rendering", "answering", "ui", "config"];
  const forbidden = layers.filter((layer) => !allowed.includes(layer));
  return `^src/(${forbidden.join("|")})/`;
}

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-is-pure",
      comment: "domain importiert nur aus domain (und liest config).",
      severity: "error",
      from: { path: "^src/domain/" },
      to: { path: layersExcept("domain", "config") },
    },
    {
      name: "animation-uses-domain-only",
      severity: "error",
      from: { path: "^src/animation/" },
      to: { path: layersExcept("animation", "domain", "config") },
    },
    {
      name: "rendering-uses-domain-and-animation",
      severity: "error",
      from: { path: "^src/rendering/" },
      to: { path: layersExcept("rendering", "domain", "animation", "config") },
    },
    {
      name: "answering-uses-domain-only",
      severity: "error",
      from: { path: "^src/answering/" },
      to: { path: layersExcept("answering", "domain", "config") },
    },
    {
      name: "config-imports-nothing",
      severity: "error",
      from: { path: "^src/config/" },
      to: { path: "^src/(?!config/)" },
    },
    {
      name: "nobody-imports-main",
      comment: "main.ts ist die Composition Root und steht ganz außen.",
      severity: "error",
      from: {},
      to: { path: "^src/main\\.ts$" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "src-stays-inside-src",
      comment: "Kein Import von außerhalb von src/, insbesondere nicht aus dem Prototyp.",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "^(?!src/)", dependencyTypesNot: ["npm", "npm-dev", "type-only", "core"] },
    },
    {
      name: "src-uses-no-node-modules",
      comment: "Der Seitencode läuft im Browser.",
      severity: "error",
      from: { path: "^src/", pathNot: "\\.test\\.ts$" },
      to: { dependencyTypes: ["core"] },
    },
    {
      ...noOrphans,
      comment:
        "Toter Code. main.ts ist der Einstiegspunkt und darf von niemandem importiert werden.",
      from: { ...noOrphans.from, pathNot: [noOrphans.from.pathNot, "^src/main\\.ts$"] },
    },
    recommended("not-to-deprecated"),
    recommended("no-deprecated-core"),
    recommended("no-non-package-json"),
    recommended("no-duplicate-dependency-types"),
    {
      name: "no-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.ts$" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".js"],
    },
  },
};
