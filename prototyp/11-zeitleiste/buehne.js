// Prototyp 11: die Bühne über der Zeitleiste (Grilling vom 06./07.11.2026, Plan Schritt 12).
// Wird NACH seite.js aus Prototyp 6 geladen und ersetzt dort ein paar Funktionen. Wie in
// Prototyp 10 durch Zuweisung, nicht durch eine neue Deklaration: Eine Deklaration würde schon
// beim Laden greifen, und die ursprüngliche Fassung ließe sich nicht mehr aufheben.
//
// Was anders ist als in Prototyp 6:
//   - Jede Labyrinth-Seite ist genau ZEILEN hoch: Platz für zwei Zeilen Stichwort (Q3, Q39).
//     Im Gespräch zeigt #ausschnitt davon nur ZEILEN_IM_GESPRAECH, und dieser Ausschnitt folgt
//     dem Lichtpunkt. Der Wechsel der Ansicht beschneidet nur, das Labyrinth bleibt dasselbe.
//   - Seiten mit einer Zeile halten ihre Route im BAND in der Mitte, also genau im Ausschnitt,
//     solange Ein- und Ausgang links oder rechts liegen.
//   - Laufrichtung, Lage des Worts, Tempo und Wiederholung sind schaltbar (SCHALTER, Q18–Q20).
//   - Ein "\n" im Stichwort erzwingt einen Zeilenumbruch (Begrüßung „HALLO / FRAU MUSTER“).
//   - Den Antworttext sieht der Screenreader als normales HTML, speakAnswer entfällt.

const ausschnitt = document.getElementById("ausschnitt");

// Höhe jeder Labyrinth-Seite in Zellen: zwei Zeilen Stichwort. Nach textCapacity in
// labyrinth.js: 2 × 2 Reihen Rand, zweimal 5 Reihen Schrift und 1 Reihe Verbindungsspur,
// dazwischen das Zeilenwechsel-Band (2 Reihen).
const ZEILEN = 18;
// Der Ausschnitt im Gespräch: eine Zeile Stichwort samt Rand.
const ZEILEN_IM_GESPRAECH = 10;
// Die Reihen, die der Ausschnitt im Gespräch zeigt, wenn er nicht dem Punkt folgen muss.
const BAND = {
  min: Math.floor((ZEILEN - ZEILEN_IM_GESPRAECH) / 2),
  max: Math.floor((ZEILEN - ZEILEN_IM_GESPRAECH) / 2) + ZEILEN_IM_GESPRAECH - 1,
};
// Wie schnell der Ausschnitt dem Punkt nachgleitet: Anteil des Abstands je Sekunde.
const NACHGLEITEN_JE_SEKUNDE = 4;

// Die Schalter aus dem Bedienfeld; oberflaeche.js hält sie aktuell.
const SCHALTER = {
  laufrichtung: "gerade", // "gerade" | "zufall" | "obenunten" | "hoehe"
  lage: "startwert", // "startwert" | "mitte" | "links"
  tempo: 1.5, // Faktor auf das Tempo aus Prototyp 6
  pause: 2, // Sekunden zwischen zwei Durchläufen
  durchlaeufe: 3, // 0 = endlos
  labyrinth: "gleich", // "gleich" | "neu": was beim nächsten Durchlauf zu sehen ist
  stehen: "danach", // "danach" | "immer" | "nie": bleiben die Buchstaben stehen?
};

// Wer weniger Bewegung wünscht, bekommt einen Durchlauf, und das Wort bleibt stehen (Q18).
const bewegungReduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// "werdegang" oder "gespraech"; setzt oberflaeche.js.
let ansicht = "werdegang";

function begrenze(wert, kleinster, groesster) {
  return Math.max(kleinster, Math.min(groesster, wert));
}

// ---------------------------------------------------------------------------
// Erzwungener Zeilenumbruch im Stichwort
// ---------------------------------------------------------------------------

// normalizeText würde "\n" als unbekanntes Zeichen entfernen; jede Zeile wird deshalb einzeln
// normalisiert.
const urspruenglichesNormalizeText = normalizeText;
normalizeText = function (text) {
  return text.split("\n").map(urspruenglichesNormalizeText).join("\n");
};

// Jeder Teil zwischen zwei "\n" wird für sich umgebrochen.
const urspruenglichesWrapText = wrapText;
wrapText = function (text, maxCharsPerLine) {
  return text.split("\n").flatMap((teil) => urspruenglichesWrapText(teil, maxCharsPerLine));
};

// ---------------------------------------------------------------------------
// Feste Höhe der Bühne
// ---------------------------------------------------------------------------

// Die Bühne wird genau ZEILEN Zellen hoch. Die Zellgröße hängt an der Breite (Handy: feste
// Spaltenzahl), deshalb erst die Breite messen, dann die Höhe setzen, dann wie bisher.
const urspruenglichesFitCanvasToStage = fitCanvasToStage;
fitCanvasToStage = function (settings) {
  scene.viewWidth = stage.clientWidth;
  stage.style.height = Math.ceil(ZEILEN * cellSizeFor(settings)) + "px";
  urspruenglichesFitCanvasToStage(settings);
};

// Genau ZEILEN Reihen, oben bündig. Gerundete Pixel könnten sonst eine Reihe kosten.
const urspruenglichesLayoutGrid = layoutGrid;
layoutGrid = function (settings) {
  urspruenglichesLayoutGrid(settings);
  scene.rows = ZEILEN;
  scene.offsetY = 0;
};

// ---------------------------------------------------------------------------
// Labyrinth-Seiten einer Antwort (ersetzt buildAnswerPages aus seite.js)
// ---------------------------------------------------------------------------

// Was beim Bau der aktuellen Seite gilt. Die ersetzten Funktionen aus labyrinth.js lesen es,
// weil generatePage sie ohne diese Angaben aufruft.
//   lage: "links" | "mitte" | "rechts"   einzeilig: ob die Seite nur eine Zeile Schrift hat
//   randZeile: feste Reihe für einen Ausgang links/rechts (Laufrichtung „gerade“) oder null
//   imBand: wird beim Bau eingetragen: ob die Route im Band bleibt
let seitenPlan = null;

// Eingang der allerersten Seite einer Antwort, je nach Laufrichtung.
function ersterEingang(block, random) {
  if (SCHALTER.laufrichtung === "gerade") return { side: "left", cell: { x: 0, y: block.top + GLYPH_HEIGHT } };
  if (SCHALTER.laufrichtung === "hoehe") return { side: "left", cell: { x: 0, y: randomBetween(BAND.min, BAND.max, random) } };
  if (SCHALTER.laufrichtung === "obenunten") {
    return pickFirstEntrance(pickRandom(["top", "bottom"], random), scene.cols, scene.rows, random);
  }
  return pickFirstEntrance("random", scene.cols, scene.rows, random);
}

// Ausgang und Umwege je nach Laufrichtung. "obenunten" versteht nur das ersetzte pickExit.
function optionenDerLaufrichtung(settings) {
  if (SCHALTER.laufrichtung === "gerade") return { exitSide: "right", detour: 0.05 };
  if (SCHALTER.laufrichtung === "hoehe") return { exitSide: "right", detour: Math.max(settings.detour, 0.7) };
  if (SCHALTER.laufrichtung === "obenunten") return { exitSide: "obenunten" };
  return { exitSide: "random" };
}

// Wie generateMessagePages in labyrinth.js, dazu:
//   - Zeilen je Seite nach Ansicht beim ersten Bau: Werdegang 2, Gespräch 1 (Q3). Die Zahl
//     bleibt an der Antwort hängen, auch wenn später die Ansicht wechselt.
//   - jeder Durchlauf (answer.lauf) hat einen eigenen Startwert, falls er ein neues Labyrinth will.
//   - Lage des Worts, erster Eingang und Ausgang nach den Schaltern.
buildAnswerPages = function (answer, exitBefore, settings) {
  if (answer.zeilenJeSeite === undefined) answer.zeilenJeSeite = ansicht === "gespraech" ? 1 : 2;
  if (answer.lauf === undefined) answer.lauf = 0;

  const random = createRandom(settings.seed + answer.number + answer.lauf * 7919);
  const optionen = { ...settings, ...optionenDerLaufrichtung(settings) };
  const kapazitaet = textCapacity(scene.cols, scene.rows, answer.zeilenJeSeite, settings.returnBandRows);
  const alleZeilen = wrapText(normalizeText(answer.text), kapazitaet.charsPerLine);
  const lage = SCHALTER.lage === "startwert" ? pickRandom(["links", "mitte", "rechts"], random) : SCHALTER.lage;

  const seiten = [];
  let vorigerAusgang = exitBefore;
  for (const lines of splitIntoPages(alleZeilen, kapazitaet.linesPerPage)) {
    seitenPlan = { lage, einzeilig: lines.length === 1, randZeile: null, imBand: false };
    const block = layoutTextBlock(lines, scene.cols, scene.rows, settings.returnBandRows);
    if (SCHALTER.laufrichtung === "gerade") seitenPlan.randZeile = begrenze(block.bottom, BAND.min, BAND.max);

    const entrance = vorigerAusgang
      ? entranceOppositeOf(vorigerAusgang, scene.cols, scene.rows)
      : ersterEingang(block, random);
    const seite = generatePage(lines, scene.cols, scene.rows, entrance, random, optionen);
    seite.imBand = seitenPlan.imBand;
    seite.answer = answer;
    seite.numberInAnswer = seiten.length + 1;
    seiten.push(seite);
    vorigerAusgang = seite.exit;
  }
  seitenPlan = null;

  answer.pageCount = seiten.length;
  answer.seiten = seiten;
  return seiten;
};

// ---------------------------------------------------------------------------
// Ersetzte Teile von labyrinth.js
// ---------------------------------------------------------------------------

// Wo der Textblock waagrecht steht: mittig (wie bisher), links oder rechts mit etwas Abstand
// zum Rand. Senkrecht bleibt er mittig.
const urspruenglichesLayoutTextBlock = layoutTextBlock;
layoutTextBlock = function (lines, cols, rows, returnBandRows) {
  const mittig = urspruenglichesLayoutTextBlock(lines, cols, rows, returnBandRows);
  if (!seitenPlan || seitenPlan.lage === "mitte") return mittig;

  const breite = mittig.right - mittig.left + 1;
  const abstand = Math.max(FREE_COLS_BESIDE_TEXT + 1, Math.round(cols * 0.08));
  const wunsch = seitenPlan.lage === "links" ? abstand : cols - abstand - breite;
  const left = begrenze(wunsch, FREE_COLS_BESIDE_TEXT, cols - FREE_COLS_BESIDE_TEXT - breite);
  return { ...mittig, left, right: left + breite - 1 };
};

// Wie appendTextRoute in labyrinth.js, nur stehen die Zeilen im Block statt mittig auf der
// ganzen Seite: links- oder rechtsbündig bzw. mittig, je nach Lage. Geändert ist nur lineLeft.
appendTextRoute = function (route, lines, grid, block, random, options) {
  const lineAdvance = lineAdvanceOf(options.returnBandRows);
  const laneRowOf = (lineIndex) => block.top + lineIndex * lineAdvance + GLYPH_HEIGHT;
  const currentX = () => route[route.length - 1].x;
  const blockWidth = block.right - block.left + 1;
  const lage = seitenPlan ? seitenPlan.lage : "mitte";

  lines.forEach((line, lineIndex) => {
    const lineWidth = line.length * CHAR_ADVANCE - 1;
    let lineLeft = block.left + Math.floor((blockWidth - lineWidth) / 2);
    if (lage === "links") lineLeft = block.left;
    if (lage === "rechts") lineLeft = block.right - lineWidth + 1;
    const glyphTop = block.top + lineIndex * lineAdvance;
    const laneRow = laneRowOf(lineIndex);

    if (lineIndex > 0) {
      const laneRowAbove = laneRowOf(lineIndex - 1);
      const band = {
        left: block.left - 1,
        right: block.right + 1,
        top: laneRowAbove + 1,
        bottom: laneRowAbove + options.returnBandRows,
      };
      appendLineChange(route, band, lineLeft - 1, laneRow, grid, random, options.returnWindiness);
    }

    line.split("").forEach((char, charIndex) => {
      const waypoints = GLYPHS[char];
      if (!waypoints) return; // Leerzeichen: die Spur läuft einfach weiter
      const glyphLeft = lineLeft + charIndex * CHAR_ADVANCE;
      walkTo(route, glyphLeft + waypoints[0][0], laneRow, CONNECTOR);
      appendGlyph(route, waypoints, glyphLeft, glyphTop);
      walkTo(route, currentX(), laneRow, CONNECTOR);
    });
  });

  walkTo(route, block.right + 2, laneRowOf(lines.length - 1), CONNECTOR);
};

// Ein- und Ausgänge links oder rechts liegen immer im Band (Laufrichtung „gerade“: auf Höhe der
// Schrift). So beginnt auch die Seite nach einer zweizeiligen Begrüßung im Ausschnitt.
const urspruenglichesPickBorderCell = pickBorderCell;
pickBorderCell = function (side, cols, rows, columnRange, random) {
  const zelle = urspruenglichesPickBorderCell(side, cols, rows, columnRange, random);
  if (side === "left" || side === "right") {
    const festeZeile = seitenPlan ? seitenPlan.randZeile : null;
    zelle.y = festeZeile !== null ? festeZeile : randomBetween(BAND.min, BAND.max, random);
  }
  return zelle;
};

// Laufrichtung 3: hinaus oben oder unten. Ist dort kein Platz, nimmt pickExit rechts.
const urspruenglichesPickExit = pickExit;
pickExit = function (sideWish, entrance, cols, rows, random) {
  const wunsch = sideWish === "obenunten" ? pickRandom(["top", "bottom"], random) : sideWish;
  return urspruenglichesPickExit(wunsch, entrance, cols, rows, random);
};

function liegtSeitlichImBand(oeffnung) {
  const seitlich = oeffnung.side === "left" || oeffnung.side === "right";
  return seitlich && oeffnung.cell.y >= BAND.min && oeffnung.cell.y <= BAND.max;
}

// Bei einer einzeiligen Seite mit Ein- und Ausgang seitlich im Band dürfen Anlauf und Ablauf
// das Band nicht verlassen: Dann liegt im Gespräch die ganze Route im Ausschnitt (Q39).
// Das Text-Revier liegt ohnehin darin, weil der Block senkrecht mittig steht.
const urspruenglichesCreateTerritories = createTerritories;
createTerritories = function (block, cols, entrance, exit) {
  const reviere = urspruenglichesCreateTerritories(block, cols, entrance, exit);
  const imBand = Boolean(seitenPlan && seitenPlan.einzeilig) && liegtSeitlichImBand(entrance) && liegtSeitlichImBand(exit);
  if (seitenPlan) seitenPlan.imBand = imBand;
  if (!imBand) return reviere;

  const imBandZeile = (zelle) => zelle.y >= BAND.min && zelle.y <= BAND.max;
  return {
    isText: reviere.isText,
    isApproach: (zelle) => imBandZeile(zelle) && reviere.isApproach(zelle),
    isLeave: (zelle) => imBandZeile(zelle) && reviere.isLeave(zelle),
  };
};

// ---------------------------------------------------------------------------
// Tempo, stehende Buchstaben, Screenreader
// ---------------------------------------------------------------------------

const urspruenglichesPaceOf = paceOf;
paceOf = function (kind, page, settings) {
  return urspruenglichesPaceOf(kind, page, settings) * SCHALTER.tempo;
};

// Wie oft eine Antwort geschrieben wird. Ein Pfad ohne Stichwort nur einmal.
function durchlaeufeFuer(antwort) {
  if (bewegungReduziert || antwort.text.trim() === "") return 1;
  return SCHALTER.durchlaeufe; // 0 = endlos
}

function istLetzterLauf(antwort) {
  const anzahl = durchlaeufeFuer(antwort);
  return anzahl !== 0 && (antwort.lauf || 0) + 1 >= anzahl;
}

// Bleiben die Buchstaben dieser Seite stehen, statt zu verglimmen?
function wortBleibtStehen(seite) {
  if (bewegungReduziert || SCHALTER.stehen === "immer") return true;
  if (SCHALTER.stehen === "nie") return false;
  return istLetzterLauf(seite.answer);
}

// Zwei Fassungen der Einstellungen, mit und ohne Rest-Helligkeit. Neu angelegt nur, wenn sich
// die Einstellungen ändern - je Wegstück und Bild ein neues Objekt wäre unnötig viel Arbeit.
const restFassungen = { fuer: null, mitRest: null, ohneRest: null };
function einstellungenMitRest(settings, mitRest) {
  if (restFassungen.fuer !== settings) {
    restFassungen.fuer = settings;
    restFassungen.mitRest = { ...settings, restBrightness: 1 };
    restFassungen.ohneRest = { ...settings, restBrightness: 0 };
  }
  return mitRest ? restFassungen.mitRest : restFassungen.ohneRest;
}

// Buchstaben (samt Umlaut-Punkten) bleiben bei Bedarf voll stehen, Verbindungswege verglimmen immer.
const urspruenglichesBrightnessLevelOf = brightnessLevelOf;
brightnessLevelOf = function (step, settings) {
  const seite = currentPage();
  const schritt = seite.route[step];
  const istSchrift = schritt.kind === LETTER || Boolean(schritt.isDot);
  return urspruenglichesBrightnessLevelOf(step, einstellungenMitRest(settings, istSchrift && wortBleibtStehen(seite)));
};

// Bleiben Buchstaben stehen, muss die ganze Route angesehen werden (wie bei Rest-Helligkeit).
const urspruenglichesFirstGlowingStep = firstGlowingStep;
firstGlowingStep = function (settings) {
  return wortBleibtStehen(currentPage()) ? 1 : urspruenglichesFirstGlowingStep(settings);
};

// Der Antworttext steht als HTML im Antwortbereich; den liest der Screenreader.
speakAnswer = function () {};

// ---------------------------------------------------------------------------
// Wiederholen (Q18)
// ---------------------------------------------------------------------------

let fertigSeit = null; // Stand der Uhr, seit die Antwort fertig geschrieben ist

// Schreibt die aktuelle Antwort noch einmal: im selben Labyrinth von vorn (harter Schnitt) oder
// in einem neuen, zu dem das Bild weiterschiebt.
function starteNaechstenLauf(antwort) {
  antwort.lauf++;
  if (SCHALTER.labyrinth === "gleich" && antwort.seiten) {
    scene.pages = antwort.seiten;
    startPage(0);
  } else {
    const ausgang = currentPage().exit;
    scene.pages = [currentPage(), ...buildAnswerPages(antwort, ausgang, currentSettings)];
    scene.pageIndex = 0;
    enterPhase(SCROLLING);
    prepareNextWallImage(currentSettings);
  }
  showPageStatus();
  showStatus(currentSettings);
}

function pruefeWiederholung() {
  if (scene.phase !== FINISHED) {
    fertigSeit = null;
    return;
  }
  if (fertigSeit === null) fertigSeit = scene.clock;

  const antwort = scene.answer;
  const anzahl = durchlaeufeFuer(antwort);
  const nochEinmal = anzahl === 0 || antwort.lauf + 1 < anzahl;
  if (nochEinmal && scene.clock - fertigSeit >= SCHALTER.pause) {
    fertigSeit = null;
    starteNaechstenLauf(antwort);
  }
}

// ---------------------------------------------------------------------------
// Ausschnitt (Q30, Q39)
// ---------------------------------------------------------------------------

let fensterOben = 0; // oberste sichtbare Reihe, mit Nachkommastellen (gleitet)

// Wohin der Ausschnitt will: Werdegang alles; Gespräch das Band, wenn die Route darin bleibt,
// sonst die Reihe des Lichtpunkts in die Mitte. Steht der Punkt nicht, bleibt er, wo er ist.
function zielDesAusschnitts(sichtbareZeilen) {
  const spielraum = ZEILEN - sichtbareZeilen;
  if (spielraum <= 0) return 0;
  const seite = currentPage();
  if (seite.imBand) return BAND.min;
  if (scene.phase !== WRITING) return fensterOben;
  const reihe = positionAt(scene.progress).y;
  return begrenze(reihe + 0.5 - sichtbareZeilen / 2, 0, spielraum);
}

function folgeDemPunkt(sekunden) {
  const sichtbareZeilen = ansicht === "gespraech" ? ZEILEN_IM_GESPRAECH : ZEILEN;
  const ziel = zielDesAusschnitts(sichtbareZeilen);
  fensterOben += (ziel - fensterOben) * Math.min(1, sekunden * NACHGLEITEN_JE_SEKUNDE);
  if (Math.abs(ziel - fensterOben) < 0.01) fensterOben = ziel;

  stage.style.transform = `translateY(${-Math.round(fensterOben * scene.cellSize)}px)`;
  const hoehe = Math.round(sichtbareZeilen * scene.cellSize) + "px";
  if (ausschnitt.style.height !== hoehe) ausschnitt.style.height = hoehe;
}

// ---------------------------------------------------------------------------
// Schnittstelle für oberflaeche.js
// ---------------------------------------------------------------------------

function setzeAnsichtDerBuehne(name) {
  ansicht = name;
}

// Baut die aktuelle Antwort mit den jetzigen Schaltern neu auf und schreibt sie von vorn.
function buehneNeuAufbauen() {
  scene.answer.lauf = 0;
  regenerate();
}

let letzteBildzeit = null;
function jedesBildDerBuehne(jetzt) {
  const sekunden = letzteBildzeit === null ? 0 : Math.min(0.1, (jetzt - letzteBildzeit) / 1000);
  letzteBildzeit = jetzt;
  if (scene.pages.length > 0 && currentSettings) {
    pruefeWiederholung();
    folgeDemPunkt(sekunden);
  }
  requestAnimationFrame(jedesBildDerBuehne);
}
requestAnimationFrame(jedesBildDerBuehne);
