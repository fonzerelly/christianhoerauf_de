# christianhoerauf.de – Frontend

Die Startseite von christianhoerauf.de: Ein Lichtpunkt beantwortet Fragen, indem er seinen Weg
durch ein Labyrinth nimmt. Die Buchstaben sind als Gänge im Labyrinth versteckt und werden erst
durch seine Leuchtspur lesbar.

TypeScript ohne App-Framework, gebaut mit Vite.

## Voraussetzungen

- Node 26 und npm
- Docker (nur für Bildtests und Lighthouse)

## Installieren und starten

```bash
npm ci
npm run dev        # Entwicklungsserver
npm run build      # Produktionsbuild nach dist/
npm run preview    # Produktionsbuild lokal ausliefern
```

## Testen

| Befehl                       | Was es prüft                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run check`              | Typen, ESLint, Prettier, Unit-Tests mit 100 % Abdeckung, Architekturtest. Vor jedem Commit. |
| `npm run test:unit`          | Unit-Tests (Vitest) mit Abdeckung; bricht unter 100 % ab.                                   |
| `npm run test:properties`    | Property-based Tests (fast-check) mit vielen Durchläufen.                                   |
| `npm run test:architecture`  | Abhängigkeitsrichtung der Schichten (dependency-cruiser).                                   |
| `npm run graph:architecture` | Zeichnet die Abhängigkeiten als Graph nach `reports/architektur/index.html`.                |
| `npm run test:visual`        | Bildtests mit Playwright im Docker-Image.                                                   |
| `npm run test:visual:update` | Referenzbilder im Docker-Image neu erzeugen.                                                |
| `npm run test:lighthouse`    | Lighthouse im Docker-Image gegen den Produktionsbuild; Bericht in `reports/lighthouse/`.    |
| `npm run check:all`          | Alles zusammen.                                                                             |

Bildtests und Lighthouse laufen immer im Docker-Image `mcr.microsoft.com/playwright` in der
Version, die zu `@playwright/test` in `package.json` passt (`scripts/in-playwright-docker.sh`).
So entstehen die Bilder auf jedem Rechner gleich.

## Aufbau

```
src/
  main.ts       steckt alles zusammen
  config/       Abstimmungswerte je Geräteprofil
  domain/       Schrift, Text, Labyrinth, Route – ohne Browser, Zeit und Zufall von außen
  animation/    Ablauf über die Zeit
  rendering/    Zeichnen
  answering/    woher die Antworten kommen
  sound/        das Brummen der Bildröhre (Web Audio)
  ui/           Fragefeld, Knöpfe (auch Ton-Knopf), Fenstergröße
tests/          Tests über mehrere Teile hinweg (siehe tests/doc.md)
visual/         Bildtests (Playwright), siehe visual/doc.md
```

## Seite lokal ansehen

```bash
npm run dev                                  # Entwicklungsserver, Adresse steht in der Ausgabe
npm run build && npm run preview             # der Produktionsbuild, wie er ausgeliefert wird
```

Adress-Parameter: `?seed=123` (Startwert der Begrüßung; dasselbe Labyrinth bei gleicher Fenstergröße),
`?profil=handy` oder `?profil=desktop` (erzwingt das Geräteprofil, etwa zum Ausprobieren am Rechner).
Die Antworten stehen in `public/content.json`.

Ton: Der runde Knopf oben rechts auf der Bühne schaltet das Brummen der Bildröhre an und aus. Beim
Laden ist es aus, die Wahl wird nicht gespeichert. Die Lautstärke (`humVolume`) steht in
`src/config/tuning.ts`.

Abhängigkeiten zeigen nur nach innen zur Domäne; `npm run test:architecture` prüft das.
Jeder Ordner unter `src/` hat eine `doc.md`, die seine Klassen und Methoden beschreibt.
