// Prüft die Seiten und Dateien, die nur aus Text bestehen: Hinweis am Fragefeld, Impressum,
// Datenschutzerklärung, CNAME und den Workflow zum Ausrollen. Ihr Inhalt ist rechtlich oder für den
// Betrieb wichtig; ein Test merkt, wenn etwas davon unbemerkt verschwindet.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

const index = read("index.html");
const imprint = read("impressum.html");
const privacy = read("datenschutz.html");

describe("Hinweis unter dem Fragefeld", () => {
  it("sagt, wer die Fragen beantwortet und dass keine persönlichen Daten eingegeben werden sollen", () => {
    expect(index.replace(/\s+/g, " ")).toContain(
      "Fragen werden von einem Sprachmodell bei AWS in Frankfurt beantwortet. Bitte keine persönlichen Daten eingeben.",
    );
  });

  it("verlinkt Datenschutz und Impressum", () => {
    expect(index).toMatch(/<a href="\/datenschutz\.html"[^>]*>Datenschutz<\/a>/);
    expect(index).toMatch(/<a href="\/impressum\.html"[^>]*>Impressum<\/a>/);
  });

  it("steht hinter dem Fragefeld, nicht davor", () => {
    expect(index.indexOf('id="notice"')).toBeGreaterThan(index.indexOf('id="ask-form"'));
  });
});

describe.each([
  ["impressum.html", imprint],
  ["datenschutz.html", privacy],
])("%s", (_name, page) => {
  it("beginnt mit dem Hinweis, dass der Text ein ungeprüfter Entwurf ist, als unsichtbarer Kommentar", () => {
    expect(page).toMatch(/^<!doctype html>\s*<!--[^>]*Entwurf, nicht anwaltlich geprüft[^>]*-->/i);
  });

  it("ist deutsch und mobil lesbar", () => {
    expect(page).toContain('<html lang="de">');
    expect(page).toContain('name="viewport"');
  });

  it("nennt Christian als Verantwortlichen mit E-Mail-Adresse", () => {
    expect(page).toContain("Christian Hörauf");
    expect(page).toContain("christianhoerauf.gpt@gmail.com");
  });

  it("enthält keinen Platzhalter mehr", () => {
    expect(page).not.toMatch(/\[(NAME|ANSCHRIFT|E-MAIL)\]/);
  });

  it("führt zurück zur Startseite", () => {
    expect(page).toMatch(/<a [^>]*href="\/"/);
  });
});

describe("datenschutz.html", () => {
  it.each([
    "Verantwortlicher",
    "GitHub Pages",
    "IP-Adresse",
    "Amazon Web Services",
    "Frankfurt",
    "Auftragsverarbeiter",
    "Art. 6 Abs. 1 lit. f DSGVO",
    "täglich wechselndes",
    "30 Tage",
    "Cookies",
    "Auskunft",
    "Berichtigung",
    "Löschung",
    "Einschränkung",
    "Widerspruch",
    "Aufsichtsbehörde",
  ])("nennt %s", (term) => {
    expect(privacy).toContain(term);
  });
});

describe("public/CNAME", () => {
  it("nennt die Domain, unter der GitHub Pages die Seite ausliefert", () => {
    expect(read("public/CNAME")).toBe("christianhoerauf.de\n");
  });
});

describe("Workflow frontend-pages.yml", () => {
  const workflow = read("../.github/workflows/frontend-pages.yml");

  it("läuft bei Push auf master für Änderungen am Frontend und am Workflow, und per Hand", () => {
    expect(workflow).toContain("branches: [master]");
    expect(workflow).toContain('- "frontend/**"');
    expect(workflow).toContain('- ".github/workflows/frontend-pages.yml"');
    expect(workflow).toContain("workflow_dispatch:");
  });

  it("prüft und baut mit der Adresse des Backends aus der Repository-Variable ANSWER_URL", () => {
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run check");
    expect(workflow).toContain("npm run build");
    expect(workflow).toContain("VITE_ANSWER_URL: ${{ vars.ANSWER_URL }}");
  });

  it("liefert frontend/dist über GitHub Pages aus", () => {
    expect(workflow).toContain("path: frontend/dist");
    expect(workflow).toContain("actions/upload-pages-artifact@");
    expect(workflow).toContain("actions/deploy-pages@");
  });

  it("nennt für jede Action eine feste Version", () => {
    const uses = [...workflow.matchAll(/uses: (\S+)/g)].map((match) => match[1]);
    expect(uses.length).toBeGreaterThan(0);
    for (const action of uses) expect(action).toMatch(/@v\d+\.\d+\.\d+$/);
  });

  it("nimmt die Node-Version aus package.json", () => {
    expect(workflow).toContain("node-version-file: frontend/package.json");
  });
});
