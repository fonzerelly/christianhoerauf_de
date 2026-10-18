// Lädt Skripte des Prototyps so, wie der Browser sie lädt: alle nacheinander in einen
// gemeinsamen Bereich, in dem jede Datei die Funktionen der vorigen sieht.
//
// Die Skripte sind keine Node-Module (kein export), sondern schlichte <script>-Dateien.
// Deshalb werden sie hier mit vm in einen eigenen Kontext geladen. Funktionen, die mit
// "function" deklariert sind, stehen danach als Eigenschaften dieses Kontexts bereit.
// Konstanten (const, let) dagegen nicht - an die kommt man über evaluate("NAME").

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const PROTOTYPE_DIR = path.join(__dirname, "..");

// fileNames: z. B. ["config.js", "schrift.js", "labyrinth.js"], relativ zum Prototyp-Ordner.
// Liefert den Kontext; zusätzlich evaluate(code), um z. B. Konstanten auszulesen.
function loadBrowserScripts(fileNames) {
  // Ein frischer vm-Kontext kennt nur reines JavaScript. Was der Browser darüber hinaus
  // bietet und Node ebenfalls hat, wird hier hineingereicht.
  const context = vm.createContext({ URLSearchParams });
  for (const fileName of fileNames) {
    const code = fs.readFileSync(path.join(PROTOTYPE_DIR, fileName), "utf8");
    vm.runInContext(code, context, { filename: fileName });
  }
  context.evaluate = (code) => vm.runInContext(code, context);
  return context;
}

module.exports = { loadBrowserScripts };
