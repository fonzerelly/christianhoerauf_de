// Prototyp 10: das Redesign aus dem Grilling vom 03.11.2026 (docs/frontend/IMPLEMENTATION_PLAN.md,
// Schritt 12; ADR 0006). Wird NACH seite.js aus Prototyp 6 geladen. seite.js hat dann schon eine
// Begrüßung gestartet; diese Datei ersetzt ein paar seiner Funktionen und baut die Begrüßung neu.
//
// Was anders ist als in Prototyp 6:
//   - Der Lichtpunkt schreibt nur das Stichwort; der Text steht in der Überblendung (HTML).
//   - Wo beides liegt, plant aufteilung.js (Katalog nach dem goldenen Schnitt).
//   - Lebenslauf-Leiste rechts, Folgefragen-Liste über dem Fragefeld, persönlicher Link.
//
// Funktionen aus seite.js und labyrinth.js werden durch Zuweisung ersetzt (nicht durch eine neue
// Deklaration): Eine Deklaration würde schon beim Laden dieser Datei greifen, und dann könnte man
// die ursprüngliche Fassung nicht mehr aufheben.

const buehne = document.getElementById("stage");
const fragefeld = document.getElementById("question");
const leiste = document.getElementById("lebenslauf");
const reiter = document.getElementById("lebenslaufReiter");
const folgefragenListe = document.getElementById("folgefragen");
const folgefragenPfeil = document.getElementById("folgefragenPfeil");

const LEBENSLAUF_ADRESSE = "https://gfg2gma2jjaufhkw3ssslmafsu0wzapj.lambda-url.eu-central-1.on.aws/lebenslauf";
const SCANLINE_ABSTAND = 3; // wie SCANLINE_SPACING in seite.js
const AUFTEILUNG_BEGRUESSUNG = { lage: "unten", breite: "voll", ausrichtung: "links" }; // Q17

function profil() {
  return document.body.dataset.profile === "handy" ? "handy" : "desktop";
}

// ---------------------------------------------------------------------------
// Lebenslauf-Leiste (Q10, Q16, Q18, Q20)
// ---------------------------------------------------------------------------

let lebenslaufOffen = false;
let lebenslaufGeladen = false;
let ersteFrageGestellt = false;

function breiteDerLeiste() {
  return Math.max(360, scene.viewWidth * 0.3);
}

// Wie viele Spalten des Rasters die Überblendung nutzen darf: Ist die Leiste auf dem Desktop
// offen, bleibt sie links von ihr.
function nutzbareSpalten() {
  if (!lebenslaufOffen || profil() === "handy") return scene.cols;
  const verdeckt = Math.ceil((breiteDerLeiste() - scene.offsetX) / scene.cellSize);
  return Math.max(12, scene.cols - verdeckt);
}

function setzeLebenslaufOffen(offen) {
  lebenslaufOffen = offen;
  leiste.classList.toggle("offen", offen);
  document.body.classList.toggle("lebenslauf-offen", offen);
  reiter.setAttribute("aria-expanded", String(offen));
  if (offen && !lebenslaufGeladen) ladeLebenslauf();
}

// Holt den Lebenslauf beim ersten Aufklappen. Aus einer lokal geöffneten Datei verbietet der
// Browser den Abruf (CORS); dann nimmt der Prototyp den Schnappschuss aus hole-lebenslauf.sh.
async function ladeLebenslauf() {
  const inhalt = document.getElementById("lebenslaufInhalt");
  inhalt.replaceChildren(absatz("Lebenslauf wird geladen …", "hinweis"));
  const link = lesePersoenlichenLink(location.hash);
  const adresse = link.art === "gueltig" ? `${LEBENSLAUF_ADRESSE}?variante=${link.nummer}` : LEBENSLAUF_ADRESSE;
  try {
    const antwort = await fetch(adresse);
    if (!antwort.ok) throw new Error(`Status ${antwort.status}`);
    zeigeLebenslauf(await antwort.json());
  } catch (fehler) {
    if (typeof LEBENSLAUF_SCHNAPPSCHUSS !== "undefined") {
      console.info("Lebenslauf aus dem Schnappschuss, weil:", fehler.message);
      zeigeLebenslauf(LEBENSLAUF_SCHNAPPSCHUSS);
      return;
    }
    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.textContent = "Nochmal versuchen";
    knopf.addEventListener("click", ladeLebenslauf);
    inhalt.replaceChildren(absatz("Gerade nicht erreichbar.", "hinweis"), knopf);
  }
}

function zeigeLebenslauf(daten) {
  lebenslaufGeladen = true;
  const teile = [];
  for (const abschnitt of daten.abschnitte) {
    const ueberschrift = document.createElement("h3");
    ueberschrift.textContent = abschnitt.titel;
    teile.push(ueberschrift);
    for (const eintrag of abschnitt.eintraege) {
      teile.push(abschnitt.name === "projekte" ? projektEintrag(eintrag) : stationsEintrag(eintrag));
    }
  }
  document.getElementById("lebenslaufInhalt").replaceChildren(...teile);
}

function stationsEintrag(eintrag) {
  const block = document.createElement("div");
  block.className = "eintrag";
  block.append(absatz(eintrag.zeit, "zeit"), absatz(eintrag.titel, "titel"));
  if (eintrag.organisation) block.append(absatz(eintrag.organisation, "organisation"));
  const liste = document.createElement("ul");
  for (const stichpunkt of eintrag.stichpunkte) {
    const frage = `Erzähl mir mehr über „${stichpunkt}“` + (eintrag.organisation ? ` bei ${eintrag.organisation}.` : ".");
    const punkt = document.createElement("li");
    punkt.append(einstiegsKnopf(stichpunkt, frage));
    liste.append(punkt);
  }
  block.append(liste);
  return block;
}

function projektEintrag(eintrag) {
  const block = document.createElement("div");
  block.className = "eintrag projekt";
  block.append(einstiegsKnopf(eintrag.titel, `Erzähl mir mehr über das Projekt „${eintrag.titel}“.`));
  block.append(absatz(eintrag.text, "projekttext"));
  return block;
}

// Ein Klick schreibt die Einstiegsfrage ins Fragefeld (abgeschickt wird sie nicht).
function einstiegsKnopf(beschriftung, frage) {
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = "einstieg";
  knopf.textContent = beschriftung;
  knopf.title = frage;
  knopf.addEventListener("click", () => {
    fragefeld.value = frage;
    schliesseFolgefragen();
    fragefeld.focus();
  });
  return knopf;
}

function absatz(text, klasse) {
  const element = document.createElement("p");
  element.className = klasse;
  element.textContent = text;
  return element;
}

reiter.addEventListener("click", () => setzeLebenslaufOffen(!lebenslaufOffen));
document.getElementById("lebenslaufSchliessen").addEventListener("click", () => setzeLebenslaufOffen(false));

// ---------------------------------------------------------------------------
// Folgefragen-Liste (Q11, Q15)
// ---------------------------------------------------------------------------

let folgefragen = [];

function setzeFolgefragen(fragen) {
  folgefragen = fragen;
  folgefragenListe.replaceChildren(
    ...fragen.map((frage) => {
      const knopf = document.createElement("button");
      knopf.type = "button";
      knopf.textContent = frage;
      knopf.addEventListener("click", () => {
        fragefeld.value = frage;
        schliesseFolgefragen();
        fragefeld.focus();
      });
      const eintrag = document.createElement("li");
      eintrag.append(knopf);
      return eintrag;
    })
  );
  folgefragenPfeil.hidden = fragen.length === 0;
  if (fragen.length > 0) oeffneFolgefragen();
  else schliesseFolgefragen();
}

function oeffneFolgefragen() {
  if (folgefragen.length === 0) return;
  folgefragenListe.hidden = false;
  folgefragenPfeil.setAttribute("aria-expanded", "true");
}

function schliesseFolgefragen() {
  folgefragenListe.hidden = true;
  folgefragenPfeil.setAttribute("aria-expanded", "false");
}

fragefeld.addEventListener("input", () => (fragefeld.value === "" ? oeffneFolgefragen() : schliesseFolgefragen()));
fragefeld.addEventListener("focus", () => {
  if (fragefeld.value === "") oeffneFolgefragen();
});
folgefragenPfeil.addEventListener("click", () => {
  if (folgefragenListe.hidden) oeffneFolgefragen();
  else schliesseFolgefragen();
});

// ---------------------------------------------------------------------------
// Überblendung: Inhalt, Messen, Lage
// ---------------------------------------------------------------------------

// inhalt: { frage, absaetze, keyword, suggestions, aufteilung? }
function fuelleUeberblendung(element, inhalt) {
  const teile = [];
  if (inhalt.frage) teile.push(absatz("Ihre Frage: " + inhalt.frage, "frage"));
  for (const text of inhalt.absaetze) teile.push(absatz(text, "antwort"));
  element.replaceChildren(...teile);
}

// Ein unsichtbarer Zwilling der Überblendung: Darin wird gemessen, wie hoch der Text bei einer
// bestimmten Breite wird.
const messUeberblendung = document.createElement("section");
messUeberblendung.className = "ueberblendung messen";
messUeberblendung.setAttribute("aria-hidden", "true");
buehne.append(messUeberblendung);

function misseHoeheInPixeln(inhalt, breiteInZellen) {
  messUeberblendung.style.width = breiteInZellen * scene.cellSize + "px";
  fuelleUeberblendung(messUeberblendung, inhalt);
  return messUeberblendung.offsetHeight;
}

function misseHoeheFuer(inhalt) {
  return (breiteInZellen) => Math.ceil(misseHoeheInPixeln(inhalt, breiteInZellen) / scene.cellSize);
}

// Zu jeder Labyrinth-Seite gehört eine Überblendung. Sie schiebt mit der Seite weiter.
const ueberblendungen = new Map(); // Seite -> Element

function ueberblendungDer(seite) {
  if (!ueberblendungen.has(seite)) {
    const element = document.createElement("section");
    element.className = "ueberblendung";
    fuelleUeberblendung(element, seite.answer.inhalt);
    buehne.insertBefore(element, leiste);
    ueberblendungen.set(seite, element);
  }
  return ueberblendungen.get(seite);
}

// Setzt Lage und Größe in Pixeln. Scanlines und dunkle Ecken der Überblendung werden so
// verschoben, dass sie nahtlos an die im Canvas anschließen (renderScreenOverlay in seite.js).
function legeUeberblendung(element, seite, verschiebung) {
  const zelle = scene.cellSize;
  const { ueberblendung: rechteck, aufteilung, textHoehe } = seite.plan;
  // Das Rechteck ist in ganzen Zellen gerechnet; die Fläche wird nur so hoch wie ihr Text und
  // hängt unten, oben oder in der Mitte des Rechtecks, je nach Lage.
  const rechteckHoehe = (rechteck.bottom - rechteck.top + 1) * zelle;
  const hoehe = Math.min(textHoehe, rechteckHoehe);
  let versatz = Math.round((rechteckHoehe - hoehe) / 2);
  if (aufteilung.lage === "unten") versatz = rechteckHoehe - hoehe;
  if (aufteilung.lage === "oben") versatz = 0;
  const links = scene.offsetX + rechteck.left * zelle + verschiebung.x;
  const oben = scene.offsetY + rechteck.top * zelle + versatz + verschiebung.y;
  element.style.transform = `translate(${links}px, ${oben}px)`;
  element.style.width = (rechteck.right - rechteck.left + 1) * zelle + "px";
  element.style.height = hoehe + "px";

  const buehnenBreite = scene.viewWidth;
  const buehnenHoehe = scene.viewHeight;
  const innen = (0.35 * Math.min(buehnenBreite, buehnenHoehe)) / (Math.hypot(buehnenBreite, buehnenHoehe) / 2);
  element.style.setProperty("--scan-y", -(((oben % SCANLINE_ABSTAND) + SCANLINE_ABSTAND) % SCANLINE_ABSTAND) + "px");
  element.style.setProperty("--buehne-b", buehnenBreite + "px");
  element.style.setProperty("--buehne-h", buehnenHoehe + "px");
  element.style.setProperty("--ecken-x", -links + "px");
  element.style.setProperty("--ecken-y", -oben + "px");
  element.style.setProperty("--ecken-innen", (innen * 100).toFixed(1) + "%");
}

// Läuft in jedem Bild: legt die Überblendungen der sichtbaren Seiten an ihren Platz und
// entfernt die der Seiten, die nicht mehr zu sehen sind.
function folgeDenSeiten() {
  const sichtbar = new Map();
  const seite = scene.pages[scene.pageIndex];
  if (seite && currentSettings) {
    const verschiebung = scrollShifts(currentSettings);
    sichtbar.set(seite, verschiebung.outgoing);
    const naechste = scene.pages[scene.pageIndex + 1];
    if (scene.phase === SCROLLING && naechste) sichtbar.set(naechste, verschiebung.incoming);
  }
  for (const [s, verschiebung] of sichtbar) {
    if (s.plan) legeUeberblendung(ueberblendungDer(s), s, verschiebung);
  }
  for (const [s, element] of ueberblendungen) {
    if (!sichtbar.has(s)) {
      element.remove();
      ueberblendungen.delete(s);
    }
  }
  requestAnimationFrame(folgeDenSeiten);
}

// ---------------------------------------------------------------------------
// Labyrinth-Seiten bauen (ersetzt Teile von seite.js und labyrinth.js)
// ---------------------------------------------------------------------------

let naechsterInhalt = null;
let letzteAufteilung = null;
let vorgegebenerBlock = null;

// Jede neue Antwort bekommt den Inhalt für die Überblendung mit.
const urspruenglichesCreateAnswer = createAnswer;
createAnswer = function (text, question) {
  const antwort = urspruenglichesCreateAnswer(text, question);
  antwort.inhalt = naechsterInhalt;
  naechsterInhalt = null;
  return antwort;
};

// Eine Antwort ist immer genau eine Labyrinth-Seite: das Stichwort passt auf eine.
const urspruenglichesBuildAnswerPages = buildAnswerPages;
buildAnswerPages = function (answer, exitBefore, settings) {
  const inhalt = answer.inhalt;
  if (!inhalt) return urspruenglichesBuildAnswerPages(answer, exitBefore, settings);

  const random = createRandom(settings.seed + answer.number);
  const raster = { cols: scene.cols, rows: scene.rows, nutzbareCols: nutzbareSpalten(), profil: profil() };
  // Schon einmal gewählt (die Seite wird nach einer Größenänderung neu gebaut)? Dann dieselbe.
  const wunsch = inhalt.aufteilung || null;
  const vorige = inhalt.aufteilung ? null : letzteAufteilung;
  let plan = planeSeite(inhalt.keyword, raster, misseHoeheFuer(inhalt), settings.returnBandRows, random, wunsch, vorige);
  // Begrüßung: Passt der Name nirgends hin, schreibt das Labyrinth wenigstens HALLO.
  const ohneStichwort = plan.lines.length === 1 && plan.lines[0].trim() === "";
  if (inhalt.keyword && ohneStichwort && inhalt.ersatzStichwort) {
    plan = planeSeite(inhalt.ersatzStichwort, raster, misseHoeheFuer(inhalt), settings.returnBandRows, random, wunsch, vorige);
  }
  const breite = plan.ueberblendung.right - plan.ueberblendung.left + 1;
  plan.textHoehe = misseHoeheInPixeln(inhalt, breite);
  inhalt.aufteilung = plan.aufteilung;
  letzteAufteilung = plan.aufteilung;

  const entrance = exitBefore
    ? entranceOppositeOf(exitBefore, scene.cols, scene.rows)
    : pickFirstEntrance(settings.entranceSide, scene.cols, scene.rows, random);
  vorgegebenerBlock = plan.block;
  const seite = generatePage(plan.lines, scene.cols, scene.rows, entrance, random, settings);
  vorgegebenerBlock = null;

  seite.answer = answer;
  seite.numberInAnswer = 1;
  seite.plan = plan;
  answer.pageCount = 1;
  return [seite];
};

// Der Block des Stichworts steht schon fest (aufteilung.js).
const urspruenglichesLayoutTextBlock = layoutTextBlock;
layoutTextBlock = function (lines, cols, rows, returnBandRows) {
  return vorgegebenerBlock || urspruenglichesLayoutTextBlock(lines, cols, rows, returnBandRows);
};

// Wie appendTextRoute in labyrinth.js, nur stehen die Zeilen links-, rechtsbündig oder mittig
// im Block statt mittig auf der ganzen Seite. Geändert ist nur die Zeile mit lineLeft.
appendTextRoute = function (route, lines, grid, block, random, options) {
  const lineAdvance = lineAdvanceOf(options.returnBandRows);
  const laneRowOf = (lineIndex) => block.top + lineIndex * lineAdvance + GLYPH_HEIGHT;
  const currentX = () => route[route.length - 1].x;
  const blockWidth = block.right - block.left + 1;

  lines.forEach((line, lineIndex) => {
    const lineWidth = line.length * CHAR_ADVANCE - 1;
    let lineLeft = Math.floor((grid.cols - lineWidth) / 2);
    if (block.ausrichtung === "links") lineLeft = block.left;
    if (block.ausrichtung === "rechts") lineLeft = block.right - lineWidth + 1;
    if (block.ausrichtung === "mitte") lineLeft = block.left + Math.floor((blockWidth - lineWidth) / 2);
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
      if (!waypoints) return;
      const glyphLeft = lineLeft + charIndex * CHAR_ADVANCE;
      walkTo(route, glyphLeft + waypoints[0][0], laneRow, CONNECTOR);
      appendGlyph(route, waypoints, glyphLeft, glyphTop);
      walkTo(route, currentX(), laneRow, CONNECTOR);
    });
  });

  walkTo(route, block.right + 2, laneRowOf(lines.length - 1), CONNECTOR);
};

// ---------------------------------------------------------------------------
// Fragen
// ---------------------------------------------------------------------------

let letzteFrageNummer = 0;

// Während der Bot nachdenkt: Frage in die Überblendung, alter Text blasser (Q12).
function zeigeWarten(frage) {
  const seite = scene.pages[scene.pageIndex];
  if (!seite || !ueberblendungen.has(seite)) return;
  const element = ueberblendungen.get(seite);
  element.classList.add("wartet");
  const alteFrage = element.querySelector(".frage");
  const neueFrage = absatz("Ihre Frage: " + frage, "frage");
  if (alteFrage) alteFrage.replaceWith(neueFrage);
  else element.prepend(neueFrage);
}

async function stelleFrage(frage) {
  const nummer = ++letzteFrageNummer;
  zeigeWarten(frage);
  const antwort = await frageVorgetaeuschtenBot(frage);
  if (nummer !== letzteFrageNummer) return; // von einer neueren Frage überholt

  naechsterInhalt = {
    frage,
    absaetze: [antwort.text],
    keyword: antwort.keyword,
    suggestions: antwort.suggestions || [],
  };
  // Ohne Stichwort schreibt der Lichtpunkt nichts, er zieht nur einen Pfad (Leerzeichen).
  showAnswer(antwort.keyword || " ", frage);
  document.getElementById("spokenAnswer").textContent = antwort.text;
  setzeFolgefragen(antwort.suggestions || []);
}

// Fängt das Absenden ab, bevor es seite.js erreicht (Capture-Phase am document).
document.addEventListener(
  "submit",
  (event) => {
    if (event.target.id !== "askForm") return;
    event.preventDefault();
    event.stopPropagation();
    const frage = fragefeld.value.trim();
    if (frage === "") return;
    fragefeld.value = "";
    if (currentSettings.blurInputAfterSending) fragefeld.blur();
    setzeFolgefragen([]);
    // Nach der ersten Frage klappt der Lebenslauf zu (Q16). Auf dem Handy füllt er den ganzen
    // Bildschirm und würde die Antwort verdecken, dort klappt er bei jeder Frage zu.
    if (!ersteFrageGestellt || profil() === "handy") setzeLebenslaufOffen(false);
    ersteFrageGestellt = true;
    stelleFrage(frage);
  },
  true
);

// ---------------------------------------------------------------------------
// Start: Begrüßung neu bauen
// ---------------------------------------------------------------------------

function starteRedesign() {
  const link = lesePersoenlichenLink(location.hash);
  // Desktop: Lebenslauf offen. Handy: zu, sonst verdeckt er den Erklärtext (Q10).
  setzeLebenslaufOffen(profil() === "desktop");

  const stichwort = stichwortDerBegruessung(link);
  scene.answer.text = stichwort;
  scene.answer.inhalt = {
    frage: "",
    absaetze: textDerBegruessung(link),
    keyword: stichwort,
    suggestions: [],
    aufteilung: AUFTEILUNG_BEGRUESSUNG,
    ersatzStichwort: "HALLO",
  };
  regenerate();
  document.getElementById("spokenAnswer").textContent = textDerBegruessung(link).join(" ");
  requestAnimationFrame(folgeDenSeiten);
}

starteRedesign();
