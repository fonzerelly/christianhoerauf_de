# christianhoerauf.de – Frontend

Die Startseite von christianhoerauf.de: Ein Lichtpunkt beantwortet Fragen, indem er seinen Weg
durch ein Labyrinth nimmt. Die Buchstaben sind als Gänge im Labyrinth versteckt und werden erst
durch seine Leuchtspur lesbar.

TypeScript ohne App-Framework, gebaut mit Vite.

## Voraussetzungen

- Node 26 und npm
- uv (für das lokale Backend hinter `npm run dev`, siehe unten)
- Docker (nur für Bildtests und Lighthouse)

## Installieren und starten

```bash
npm ci
npm run dev        # Entwicklungsserver mit lokalem Backend (Gemma auf dem Mac mini)
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
npm run dev                                  # Entwicklungsserver mit lokalem Backend, Gemma auf dem Mac mini
npm run dev -- --ziel dgx                    # dasselbe mit Gemma auf der DGX Spark
npm run dev:live                             # nur Vite, gegen das Lambda aus .env.local
npm run build && npm run preview             # der Produktionsbuild, wie er ausgeliefert wird
```

`npm run dev` (`scripts/dev.sh`) startet zuerst das lokale Backend aus
`backend/testsammlung/local_backend.py` auf `http://127.0.0.1:8787/` und danach Vite mit dieser
Adresse als `VITE_ANSWER_URL`. Das Backend ist derselbe Bot wie im Lambda, mit Gemma in LM Studio
statt Bedrock, Speicher im Arbeitsspeicher statt DynamoDB und ohne Besuchergrenze. Es stellt beim
Start eine Aufwärmfrage; Vite startet erst danach. Das Protokoll jeder Frage steht im Terminal.
Strg+C beendet beides.

Adress-Parameter: `?seed=123` (Startwert der Begrüßung; dasselbe Labyrinth bei gleicher Fenstergröße),
`?profil=handy` oder `?profil=desktop` (erzwingt das Geräteprofil, etwa zum Ausprobieren am Rechner),
`?lebenslauf=test` (nur im Entwicklungsserver: Zeitleiste mit dem ausgedachten Lebenslauf aus
`tests/fixtures/lebenslauf.json`, auch ohne Backend).
Für `npm run dev:live` gegen das ausgerollte Lambda `cp .env.example .env.local` und dort die
Adresse eintragen; `.env.local` ist nicht eingecheckt. Ohne `VITE_ANSWER_URL` stehen die Antworten
in `public/content.json`, und es gibt keine Zeitleiste.

Ton: Das Brummen der Bildröhre (`src/sound/`) ist seit Schritt 12.3 nicht eingebunden; der Ton-Knopf
entfiel mit der flachen Bühne.

Abhängigkeiten zeigen nur nach innen zur Domäne; `npm run test:architecture` prüft das.
Jeder Ordner unter `src/` hat eine `doc.md`, die seine Klassen und Methoden beschreibt.
