// Prototyp 11: die Seite um Bühne und Zeitleiste herum. Reiter, Antwortbereich, Folgefragen,
// Fragefeld, Schalter im Bedienfeld und der Start mit der Begrüßung.

const fragefeld = document.getElementById("question");
const antwortBereich = document.getElementById("antwortBereich");
const folgefragenElement = document.getElementById("folgefragen");
const reiterWerdegang = document.getElementById("reiterWerdegang");
const reiterGespraech = document.getElementById("reiterGespraech");

function profilName() {
  return document.body.dataset.profile === "handy" ? "handy" : "desktop";
}

// ---------------------------------------------------------------------------
// Ansichten (Q14, Q15)
// ---------------------------------------------------------------------------

function setzeAnsicht(name) {
  document.body.dataset.ansicht = name;
  reiterWerdegang.setAttribute("aria-selected", String(name === "werdegang"));
  reiterGespraech.setAttribute("aria-selected", String(name === "gespraech"));
  reiterWerdegang.tabIndex = name === "werdegang" ? 0 : -1;
  reiterGespraech.tabIndex = name === "gespraech" ? 0 : -1;
  const hatGewechselt = ansicht !== name;
  setzeAnsichtDerBuehne(name);
  if (hatGewechselt) zeichneZeitleiste(false);
}

reiterWerdegang.addEventListener("click", () => setzeAnsicht("werdegang"));
reiterGespraech.addEventListener("click", () => setzeAnsicht("gespraech"));
// Reiter mit den Pfeiltasten wechseln, wie es Screenreader-Nutzer von Reitern erwarten.
document.getElementById("reiter").addEventListener("keydown", (ereignis) => {
  if (ereignis.key !== "ArrowLeft" && ereignis.key !== "ArrowRight") return;
  const ziel = ansicht === "werdegang" ? "gespraech" : "werdegang";
  setzeAnsicht(ziel);
  (ziel === "werdegang" ? reiterWerdegang : reiterGespraech).focus();
});

// ---------------------------------------------------------------------------
// Antwortbereich und Folgefragen
// ---------------------------------------------------------------------------

function absatz(text, klasse) {
  const neu = document.createElement("p");
  neu.className = klasse;
  neu.textContent = text;
  return neu;
}

// Zeigt eine Antwort: oben klein die Frage (bei der Begrüßung keine), darunter die Absätze.
function zeigeAntwort(frage, absaetze) {
  antwortBereich.classList.remove("wartet");
  const teile = frage ? [absatz("Ihre Frage: " + frage, "frage")] : [];
  for (const text of absaetze) teile.push(absatz(text, "antwort"));
  antwortBereich.replaceChildren(...teile);
}

// Während der Bot nachdenkt: die neue Frage steht schon da, die alte Antwort wird blass.
function zeigeWarten(frage) {
  const alteAntwort = [...antwortBereich.querySelectorAll(".antwort")];
  antwortBereich.classList.add("wartet");
  antwortBereich.replaceChildren(absatz("Ihre Frage: " + frage, "frage"), absatz("Der Bot denkt nach", "denkt"), ...alteAntwort);
}

// Folgefragen als Knöpfe über dem Fragefeld. Ein Klick trägt sie nur ein (Q22).
function setzeFolgefragen(fragen) {
  folgefragenElement.replaceChildren(
    ...fragen.map((frage) => {
      const knopf = document.createElement("button");
      knopf.type = "button";
      knopf.textContent = frage;
      knopf.addEventListener("click", () => {
        fragefeld.value = frage;
        fragefeld.focus();
      });
      return knopf;
    })
  );
}

// Holt die Antwort ins Bild, falls sie nicht schon gut zu sehen ist (Q32).
function zeigeAntwortImBild() {
  const lage = antwortBereich.getBoundingClientRect();
  if (lage.top >= 0 && lage.top <= window.innerHeight * 0.6) return;
  antwortBereich.scrollIntoView({ behavior: bewegungReduziert ? "auto" : "smooth", block: "start" });
}

// ---------------------------------------------------------------------------
// Fragen
// ---------------------------------------------------------------------------

let letzteFrageNummer = 0;

async function stelleFrage(frage) {
  const nummer = ++letzteFrageNummer;
  setzeAnsicht("gespraech");
  setzeFolgefragen([]);
  zeigeWarten(frage);

  const antwort = await frageVorgetaeuschtenBot(document.getElementById("p11Bot").value);
  if (nummer !== letzteFrageNummer) return; // von einer neueren Frage überholt

  zeigeAntwort(frage, [antwort.text]);
  setzeFolgefragen(antwort.suggestions || []);
  // Ohne Stichwort schreibt der Lichtpunkt nichts, er zieht nur einen Pfad (Leerzeichen).
  showAnswer(antwort.keyword || " ", frage);
  zeigeAntwortImBild();
}

// Fängt das Absenden ab, bevor es seite.js erreicht (Capture-Phase am document).
document.addEventListener(
  "submit",
  (ereignis) => {
    if (ereignis.target.id !== "askForm") return;
    ereignis.preventDefault();
    ereignis.stopPropagation();
    const frage = fragefeld.value.trim();
    if (frage === "") return;
    fragefeld.value = "";
    if (currentSettings.blurInputAfterSending) fragefeld.blur();
    stelleFrage(frage);
  },
  true
);

document.querySelectorAll(".pdfLink").forEach((link) => link.addEventListener("click", (e) => e.preventDefault()));

// ---------------------------------------------------------------------------
// Schalter im Bedienfeld
// ---------------------------------------------------------------------------

function wertVon(id) {
  const feld = document.getElementById(id);
  if (feld.type === "checkbox") return feld.checked;
  if (feld.type === "range") return Number(feld.value);
  return feld.value;
}

// Liest alle Schalter in SCHALTER (buehne.js) und ZEITLEISTE (zeitleiste.js).
function leseSchalter() {
  SCHALTER.laufrichtung = wertVon("p11Laufrichtung");
  SCHALTER.lage = wertVon("p11Lage");
  SCHALTER.tempo = wertVon("p11Tempo");
  SCHALTER.pause = wertVon("p11Pause");
  SCHALTER.durchlaeufe = wertVon("p11Durchlaeufe");
  SCHALTER.labyrinth = wertVon("p11Labyrinth");
  SCHALTER.stehen = wertVon("p11Stehen");
  ZEITLEISTE.modus = wertVon("p11Zeitleiste");
  ZEITLEISTE.nebenspur = wertVon("p11Nebenspur");
  ZEITLEISTE.handyForm = wertVon("p11HandyZeitleiste");
  ZEITLEISTE.handyMenue = wertVon("p11HandyMenue");
  ZEITLEISTE.laden = wertVon("p11Lebenslauf");
}

// Schalter, nach denen die Zeitleiste neu gezeichnet wird.
const ZEITLEISTEN_SCHALTER = ["p11Zeitleiste", "p11Nebenspur", "p11HandyZeitleiste", "p11HandyMenue"];

for (const id of [
  "p11Laufrichtung", "p11Lage", "p11Tempo", "p11Pause", "p11Durchlaeufe", "p11Labyrinth", "p11Stehen",
  ...ZEITLEISTEN_SCHALTER, "p11Lebenslauf",
]) {
  document.getElementById(id).addEventListener("input", () => {
    leseSchalter();
    scene.needsRedraw = true;
    if (ZEITLEISTEN_SCHALTER.includes(id)) zeichneZeitleiste(true);
  });
}

// „Dunkle Ecken“ stellt den Regler aus Prototyp 6 und meldet ihm die Änderung.
document.getElementById("p11Ecken").addEventListener("input", (ereignis) => {
  const regler = document.getElementById("vignetteStrength");
  regler.value = ereignis.target.value;
  regler.dispatchEvent(new Event("input"));
});

document.getElementById("p11NeuAufbauen").addEventListener("click", buehneNeuAufbauen);
document.getElementById("p11LebenslaufNeu").addEventListener("click", ladeZeitleiste);
// Ein anderes Geräteprofil von Hand (Regler-Leiste): Zeitleiste passend neu zeichnen.
document.getElementById("profile").addEventListener("change", () => zeichneZeitleiste(false));

// Knöpfe für die Beispiel-Links: Adresse ändern und neu laden.
document.getElementById("p11Links").replaceChildren(
  ...BEISPIEL_LINKS.map(({ beschriftung, fragment }) => {
    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.textContent = beschriftung;
    knopf.addEventListener("click", () => {
      location.href = location.pathname + location.search + (fragment ? "#" + fragment : "");
      location.reload();
    });
    return knopf;
  })
);

if (bewegungReduziert) {
  document.getElementById("p11Bewegung").textContent =
    "Ihr System wünscht weniger Bewegung: Jedes Wort wird nur einmal geschrieben und bleibt stehen.";
}

// ---------------------------------------------------------------------------
// Start: Begrüßung als erste Antwort (Q9), Zeitleiste laden
// ---------------------------------------------------------------------------

function starteSeite() {
  leseSchalter();
  setzeAnsicht("werdegang");

  const link = lesePersoenlichenLink(location.hash);
  scene.answer.text = stichwortDerBegruessung(link, profilName());
  scene.answer.zeilenJeSeite = 2;
  scene.answer.lauf = 0;
  regenerate();
  zeigeAntwort("", textDerBegruessung(link));
  ladeZeitleiste();
}

starteSeite();
