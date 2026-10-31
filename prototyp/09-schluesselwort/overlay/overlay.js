// Prototyp 9a: Das Labyrinth bleibt wie in Prototyp 6, aber der Lichtpunkt schreibt nur noch
// das Schlüsselwort der Antwort. Die ganze Antwort steht sofort als Text im Overlay darüber.
//
// Diese Datei wird nach den Skripten von Prototyp 6 und vor dessen seite.js geladen und ändert
// nur drei Dinge:
//   1. ein paar Config-Werte (wie in der Besucherfassung: keine Regler, keine Testhilfe)
//   2. die Lage des Textblocks im Labyrinth: oberes Viertel statt Mitte, damit das Overlay
//      in der unteren Hälfte das Wort nicht verdeckt
//   3. was beim Absenden einer Frage passiert: erst fragen, dann Overlay und Schlüsselwort

Object.assign(CONFIG, {
  showControls: false,
  showReplayButton: false,
  allowLiteralAnswers: false,
  greeting: SCHLUESSEL_ANTWORTEN.begruessung.schluesselwort,
});
// Das Schlüsselwort bleibt stehen, bis die nächste Antwort kommt (in Prototyp 6 verglimmt die Spur).
CONFIG.base.restBrightness = 100;
// Am Handy 46 statt 34 Spalten: Dann passen 10 Zeichen in eine Zeile, also auch "TYPESCRIPT".
CONFIG.profiles.handy.cellColumns = 46;

// Ersetzt layoutTextBlock aus labyrinth.js (eine spätere Funktionsdeklaration gewinnt).
// Waagrecht bleibt der Block mittig, senkrecht liegt seine Mitte bei 24 % der Höhe, aber nie
// näher am Rand, als labyrinth.js es verlangt.
function layoutTextBlock(lines, cols, rows, returnBandRows) {
  const longestLine = Math.max(...lines.map((line) => line.length));
  const width = longestLine * CHAR_ADVANCE - 1;
  const height = lines.length * lineAdvanceOf(returnBandRows) - returnBandRows;
  const left = Math.floor((cols - width) / 2);
  const highestTop = FREE_ROWS_AROUND_TEXT;
  const lowestTop = rows - FREE_ROWS_AROUND_TEXT - height;
  const wishedTop = Math.floor(rows * 0.24 - height / 2);
  const top = Math.max(highestTop, Math.min(lowestTop, wishedTop));
  return { left, right: left + width - 1, top, bottom: top + height - 1 };
}

// Füllt das Overlay: Frage (klein, darüber), Antworttext mit rot markiertem Schlüsselwort.
function zeigeImOverlay(frage, antwort) {
  document.getElementById("overlayFrage").textContent = frage ? "Ihre Frage: " + frage : "";
  const textFeld = document.getElementById("overlayText");
  textFeld.replaceChildren(
    ...teileAmSchluesselwort(antwort.text, antwort.schluesselwort).map((teil) => {
      if (!teil.hervorgehoben) return document.createTextNode(teil.text);
      const markiert = document.createElement("span");
      markiert.className = "schluesselwort";
      markiert.textContent = teil.text;
      return markiert;
    })
  );
}

// Zählt die Fragen mit. Kommt die Antwort auf eine ältere Frage erst nach einer neueren an,
// wird sie verworfen.
let letzteFrageNummer = 0;

// Stellt die Frage an den (vorgetäuschten) Bot. Solange er nachdenkt, steht die Frage schon
// im Overlay, der alte Text wird blasser. Sobald die Antwort da ist, erscheint sie im Overlay,
// und im selben Moment schreibt der Lichtpunkt das Schlüsselwort (showAnswer aus seite.js).
async function stelleFrage(frage) {
  const nummer = ++letzteFrageNummer;
  const overlay = document.getElementById("overlay");
  overlay.classList.add("wartet");
  document.getElementById("overlayFrage").textContent = "Ihre Frage: " + frage;

  const antwort = await frageChrisBot(frage);
  if (nummer !== letzteFrageNummer) return;
  overlay.classList.remove("wartet");
  zeigeImOverlay(frage, antwort);
  showAnswer(antwort.schluesselwort, frage);
}

// Fängt das Absenden ab, bevor es seite.js erreicht (Lauscher am document in der
// Capture-Phase kommt vor dem Lauscher am Formular). seite.js würde sonst sofort den
// Platzhalter-Text aus Prototyp 6 schreiben.
document.addEventListener("submit", (event) => {
  if (event.target.id !== "askForm") return;
  event.preventDefault();
  event.stopPropagation();
  const feld = document.getElementById("question");
  const frage = feld.value.trim();
  if (frage === "") return;
  feld.value = "";
  if (currentSettings.blurInputAfterSending) feld.blur();
  stelleFrage(frage);
}, true);

// Beim Laden: Begrüßung im Overlay und die drei Vorschläge als Knöpfe.
zeigeImOverlay("", SCHLUESSEL_ANTWORTEN.begruessung);
for (const vorschlag of SCHLUESSEL_VORSCHLAEGE) {
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.textContent = vorschlag;
  knopf.addEventListener("click", () => stelleFrage(vorschlag));
  document.getElementById("overlayVorschlaege").appendChild(knopf);
}
