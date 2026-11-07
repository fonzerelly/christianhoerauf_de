// Prototyp 11: Zeitleiste und Stationsmenü (Q10, Q11, Q21, Q23, Q24, Q31, Q34).
//
// Die Stationen kommen zur Laufzeit von /lebenslauf. Der Endpunkt erlaubt nur
// christianhoerauf.de als Herkunft; aus dem Prototyp heraus scheitert der Abruf deshalb meist,
// und es gilt der Schnappschuss aus hole-lebenslauf.sh (nicht eingecheckt, das Repo ist öffentlich).
// Im echten Frontend gibt es keinen Schnappschuss (Q23).

const LEBENSLAUF_ADRESSE = "https://gfg2gma2jjaufhkw3ssslmafsu0wzapj.lambda-url.eu-central-1.on.aws/lebenslauf";
const zeitleisteElement = document.getElementById("zeitleiste");
const fragefeldDerZeitleiste = document.getElementById("question");

// Schalter der Zeitleiste; oberflaeche.js hält sie aktuell.
const ZEITLEISTE = {
  modus: "fest", // "fest": 2004 bis heute | "verschiebbar": seit 1984
  nebenspur: true,
  handyForm: "waagrecht", // "waagrecht" | "senkrecht"
  handyMenue: "schiebt", // "schiebt" | "schwebt"
  laden: "echt", // "echt" | "langsam" | "fehler"
};

// Der Zustand: Daten, sobald sie da sind, und ob gerade geladen wird oder es gescheitert ist.
const zeitleistenStand = { zustand: "laedt", stationen: null };

// So schmal darf eine Station höchstens werden (InsertEffect: unter einem Jahr).
const MINDESTBREITE = { desktop: 120, handy: 110 };
// Abstand zwischen zwei Beschriftungen, bevor die zweite tiefer rutscht.
const BESCHRIFTUNG_LUFT = 6;

function istHandy() {
  return document.body.dataset.profile === "handy";
}

// ---------------------------------------------------------------------------
// Daten: Zeiträume lesen, Stationen auf Haupt- und Nebenspur verteilen
// ---------------------------------------------------------------------------

// Das heutige Datum als Jahr mit Nachkommastellen.
function heuteAlsJahr() {
  const jetzt = new Date();
  const jahresBeginn = new Date(jetzt.getFullYear(), 0, 1);
  return jetzt.getFullYear() + (jetzt - jahresBeginn) / (365.25 * 24 * 3600 * 1000);
}

// Ein Zeitpunkt aus dem Lebenslauf als Jahr mit Nachkommastellen: "10/2020", "2014" oder "heute".
// Ohne Monat ist unklar, wann im Jahr; ein Ende wird dann auf die Jahresmitte gelegt.
function jahrAus(teil, istEnde) {
  if (teil === "heute") return heuteAlsJahr();
  const mitMonat = teil.match(/^(\d{1,2})\/(\d{4})$/);
  if (mitMonat) return Number(mitMonat[2]) + (Number(mitMonat[1]) - 1 + (istEnde ? 1 : 0)) / 12;
  const nurJahr = teil.match(/^(\d{4})$/);
  if (nurJahr) return Number(nurJahr[1]) + (istEnde ? 0.5 : 0);
  return NaN;
}

// "2011 – 2014" -> { von: 2011, bis: 2014.5 }; "2014" -> { von: 2014, bis: 2014.5 }
function zeitraumAus(text) {
  const [anfang, ende = anfang] = text.split(/\s*[–-]\s*/);
  return { von: jahrAus(anfang.trim(), false), bis: jahrAus(ende.trim(), true) };
}

// Eine Organisation, die klein geschrieben ist ("ehrenamtlich"), ist kein Name.
function nameDerOrganisation(eintrag) {
  return /^[A-ZÄÖÜ]/.test(eintrag.organisation || "") ? eintrag.organisation : null;
}

// Kurzer Name für die Jahreszeile: ohne Rechtsform ("TeamBank AG" -> "TeamBank").
function kurzname(station) {
  const name = station.organisation || station.titel;
  return name.replace(/ (Software AG|Automotive GmbH|GmbH|AG)$/, "");
}

// Die Jahreszahl, mit der eine Station beschriftet ist ("11/2014 – 09/2020" -> "2014").
function jahrDerBeschriftung(station) {
  const jahr = station.zeit.match(/\d{4}/);
  return jahr ? jahr[0] : station.zeit;
}

// Liest alle datierten Einträge aus /lebenslauf und verteilt sie:
//   Hauptspur: der Beruf, dazu alles, was vor dem ersten Beruf endete (Schule, Studium, ...)
//   Nebenspur: was neben dem Beruf lief (Lehre, berufsbegleitendes Studium)
// Projekte und Vorträge haben keine Daten und fehlen deshalb (Q24).
function stationenAus(daten) {
  const alle = [];
  for (const abschnitt of daten.abschnitte) {
    for (const eintrag of abschnitt.eintraege) {
      if (!eintrag.zeit) continue;
      const { von, bis } = zeitraumAus(eintrag.zeit);
      if (Number.isNaN(von) || Number.isNaN(bis)) continue;
      alle.push({
        abschnitt: abschnitt.name,
        zeit: eintrag.zeit,
        titel: eintrag.titel,
        organisation: nameDerOrganisation(eintrag),
        stichpunkte: eintrag.stichpunkte || [],
        von,
        bis,
      });
    }
  }
  alle.sort((a, b) => a.von - b.von);

  const beruf = alle.filter((station) => station.abschnitt === "beruf");
  const berufsbeginn = beruf.length > 0 ? beruf[0].von : alle[0].von;
  return {
    berufsbeginn,
    beruf,
    vorher: alle.filter((station) => station.abschnitt !== "beruf" && station.bis <= berufsbeginn + 0.01),
    neben: alle.filter((station) => station.abschnitt !== "beruf" && station.von >= berufsbeginn),
  };
}

// Die Stationen der Hauptspur, je nach Modus.
function hauptspur() {
  const { beruf, vorher } = zeitleistenStand.stationen;
  return ZEITLEISTE.modus === "verschiebbar" ? [...vorher, ...beruf] : beruf;
}

// ---------------------------------------------------------------------------
// Laden
// ---------------------------------------------------------------------------

async function holeLebenslauf() {
  if (ZEITLEISTE.laden === "langsam") await warte(3000);
  if (ZEITLEISTE.laden === "fehler") {
    await warte(600);
    throw new Error("vorgetäuscht: 503");
  }
  const link = lesePersoenlichenLink(location.hash);
  const adresse = link.art === "gueltig" ? `${LEBENSLAUF_ADRESSE}?variante=${link.nummer}` : LEBENSLAUF_ADRESSE;
  try {
    const antwort = await fetch(adresse);
    if (!antwort.ok) throw new Error(`Status ${antwort.status}`);
    return await antwort.json();
  } catch (fehler) {
    if (typeof LEBENSLAUF_SCHNAPPSCHUSS === "undefined") throw fehler;
    console.info("Lebenslauf aus dem Schnappschuss, weil:", fehler.message);
    return LEBENSLAUF_SCHNAPPSCHUSS;
  }
}

async function ladeZeitleiste() {
  zeitleistenStand.zustand = "laedt";
  zeichneZeitleiste(false);
  try {
    zeitleistenStand.stationen = stationenAus(await holeLebenslauf());
    zeitleistenStand.zustand = "da";
  } catch (fehler) {
    console.info("Lebenslauf nicht erreichbar:", fehler.message);
    zeitleistenStand.zustand = "fehler";
  }
  zeichneZeitleiste(true);
}

// ---------------------------------------------------------------------------
// Maßstab: Abstände nach Zeit, mit Mindestbreite je Station (Q11)
// ---------------------------------------------------------------------------

// Jede Station der Hauptspur reicht bis zum Beginn der nächsten, die letzte bis heute.
function abschnitteDer(stationen) {
  return stationen.map((station, index) => ({
    station,
    von: station.von,
    bis: index + 1 < stationen.length ? stationen[index + 1].von : heuteAlsJahr(),
  }));
}

// Pixel je Jahr, so dass die Abschnitte zusammen `breite` füllen und keiner schmaler als
// `mindestens` wird. Abschnitte, die auf die Mindestbreite geklemmt werden, nehmen den übrigen
// Platz weg; deshalb wird ein paar Mal nachgerechnet.
function pixelJeJahr(abschnitte, breite, mindestens) {
  const dauern = abschnitte.map((abschnitt) => Math.max(0.01, abschnitt.bis - abschnitt.von));
  let jeJahr = breite / dauern.reduce((summe, dauer) => summe + dauer, 0);
  for (let runde = 0; runde < 6; runde++) {
    const geklemmt = dauern.filter((dauer) => dauer * jeJahr < mindestens);
    const freieBreite = breite - geklemmt.length * mindestens;
    const freieDauer = dauern.filter((dauer) => dauer * jeJahr >= mindestens).reduce((summe, dauer) => summe + dauer, 0);
    if (freieDauer <= 0 || freieBreite <= 0) break;
    jeJahr = freieBreite / freieDauer;
  }
  return jeJahr;
}

// Legt die Abschnitte nebeneinander: { station, von, bis, x, breite }.
function legeAbschnitte(abschnitte, jeJahr, mindestens) {
  let x = 0;
  return abschnitte.map((abschnitt) => {
    const breite = Math.max(mindestens, (abschnitt.bis - abschnitt.von) * jeJahr);
    const gelegt = { ...abschnitt, x, breite };
    x += breite;
    return gelegt;
  });
}

// Wo ein Zeitpunkt auf der Zeitleiste liegt: innerhalb seines Abschnitts anteilig. So stimmen
// die Balken der Nebenspur mit den Stationen überein, auch wenn eine Station verbreitert ist.
function xFuerJahr(jahr, gelegt) {
  if (jahr <= gelegt[0].von) return gelegt[0].x;
  for (const abschnitt of gelegt) {
    if (jahr <= abschnitt.bis) return abschnitt.x + ((jahr - abschnitt.von) / (abschnitt.bis - abschnitt.von)) * abschnitt.breite;
  }
  const letzter = gelegt[gelegt.length - 1];
  return letzter.x + letzter.breite;
}

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------

function element(tag, klasse, text) {
  const neu = document.createElement(tag);
  if (klasse) neu.className = klasse;
  if (text !== undefined) neu.textContent = text;
  return neu;
}

// Ein Knopf mit Jahr, Organisation und Titel, der das Stationsmenü öffnet.
function stationsKnopf(station) {
  const knopf = element("button");
  knopf.type = "button";
  knopf.setAttribute("aria-expanded", "false");
  knopf.append(element("span", "zlJahr", jahrDerBeschriftung(station)));
  if (station.organisation) knopf.append(element("span", "zlOrg", station.organisation));
  knopf.append(element("span", "zlTitel", station.titel));
  knopf.addEventListener("click", () => oeffneStationsMenue(station, knopf));
  return knopf;
}

// Zeichnet die Zeitleiste neu. mitAufbau: Achse und Stationen erscheinen nacheinander.
function zeichneZeitleiste(mitAufbau) {
  schliesseStationsMenue();
  if (zeitleistenStand.zustand === "laedt") {
    zeitleisteElement.replaceChildren(element("p", "zlStatus", "Stationen werden geladen …"));
    return;
  }
  if (zeitleistenStand.zustand === "fehler") {
    const status = element("p", "zlStatus", "Die Stationen sind gerade nicht erreichbar.");
    const knopf = element("button", "", "Nochmal versuchen");
    knopf.type = "button";
    knopf.addEventListener("click", ladeZeitleiste);
    status.append(knopf);
    zeitleisteElement.replaceChildren(status);
    return;
  }
  if (ansicht === "gespraech") zeichneJahreszeile();
  else if (istHandy() && ZEITLEISTE.handyForm === "senkrecht") zeichneListe(mitAufbau);
  else zeichneWaagrecht(mitAufbau);
}

// Werdegang, waagrecht: Achse, Stationen nach Zeit, darunter die Nebenspur.
function zeichneWaagrecht(mitAufbau) {
  const mindestens = istHandy() ? MINDESTBREITE.handy : MINDESTBREITE.desktop;
  const verfuegbar = zeitleisteElement.clientWidth;
  const { beruf, neben, berufsbeginn } = zeitleistenStand.stationen;

  // Der Maßstab kommt immer vom Beruf: Fest füllt er die Breite genau, verschiebbar kommt die
  // Zeit davor im selben Maßstab links dazu.
  const jeJahr = pixelJeJahr(abschnitteDer(beruf), verfuegbar, mindestens);
  const gelegt = legeAbschnitte(abschnitteDer(hauptspur()), jeJahr, mindestens);
  const gesamtBreite = gelegt[gelegt.length - 1].x + gelegt[gelegt.length - 1].breite;

  const inhalt = element("div", "zlInhalt");
  inhalt.style.width = gesamtBreite + "px";
  inhalt.append(element("div", "zlAchse"));
  gelegt.forEach((abschnitt, index) => {
    const station = element("div", "zlStation");
    station.style.left = abschnitt.x + "px";
    station.style.width = abschnitt.breite + "px";
    station.style.transitionDelay = mitAufbau ? 0.3 + index * 0.08 + "s" : "0s";
    station.append(stationsKnopf(abschnitt.station));
    inhalt.append(station);
  });
  inhalt.append(element("span", "zlHeute", "heute"));

  const scroll = element("div", "zlScroll");
  scroll.append(inhalt);
  const rahmen = element("div", "zlRahmen");
  const frueher = pfeilKnopf("‹", "Früher", -1, scroll);
  const spaeter = pfeilKnopf("›", "Später", 1, scroll);
  // Erst ohne Pfeile messen, ob die Zeitleiste überhaupt breiter ist als der Platz.
  frueher.hidden = spaeter.hidden = true;
  rahmen.append(frueher, scroll, spaeter);

  const teile = [rahmen];
  const vorher = zeitleistenStand.stationen.vorher;
  if (ZEITLEISTE.modus === "fest" && vorher.length > 0) teile.push(vorherKnopf(vorher[vorher.length - 1]));
  zeitleisteElement.replaceChildren(...teile);

  // Ab hier sind die Elemente im Dokument und lassen sich messen.
  versetzeEngeBeschriftungen(inhalt);
  const unterkante = Math.max(...[...inhalt.querySelectorAll(".zlStation")].map((s) => s.offsetTop + s.offsetHeight));
  let hoehe = unterkante + 8;
  if (ZEITLEISTE.nebenspur && neben.length > 0) hoehe = zeichneNebenspur(inhalt, neben, gelegt, unterkante + 14);
  inhalt.style.height = hoehe + "px";

  const laeuftUeber = gesamtBreite > scroll.clientWidth + 1;
  frueher.hidden = spaeter.hidden = !laeuftUeber;
  if (laeuftUeber) {
    scroll.classList.add("ziehbar");
    macheZiehbar(scroll);
    // Beim Laden steht die Zeitleiste auf dem Beginn des Berufs (verschiebbar) bzw. am Anfang.
    scroll.scrollLeft = ZEITLEISTE.modus === "verschiebbar" ? xFuerJahr(berufsbeginn, gelegt) - 8 : 0;
    const pfeileAnpassen = () => {
      frueher.disabled = scroll.scrollLeft <= 1;
      spaeter.disabled = scroll.scrollLeft >= scroll.scrollWidth - scroll.clientWidth - 1;
    };
    scroll.addEventListener("scroll", () => {
      pfeileAnpassen();
      schliesseStationsMenue();
    });
    pfeileAnpassen();
  }
  zeigeAufbau(inhalt, mitAufbau);
}

// Stehen zwei Beschriftungen zu eng, rutscht die zweite tiefer (abwechselnd, Q11).
function versetzeEngeBeschriftungen(inhalt) {
  let vorige = null;
  for (const station of inhalt.querySelectorAll(".zlStation")) {
    const ragtHinein = vorige && vorige.offsetLeft + vorige.firstElementChild.offsetWidth + BESCHRIFTUNG_LUFT > station.offsetLeft;
    if (ragtHinein && !vorige.classList.contains("tief")) station.classList.add("tief");
    vorige = station;
  }
}

// Die Nebenspur: je Eintrag ein dünner Balken über seine Dauer. Überschneiden sich
// Beschriftungen, kommt der Eintrag eine Bahn tiefer. Liefert die neue Höhe der Zeitleiste.
function zeichneNebenspur(inhalt, neben, gelegt, oben) {
  const spur = element("div", "zlNeben");
  spur.style.top = oben + "px";
  spur.append(element("span", "zlNebenTitel", "NEBENHER"));
  inhalt.append(spur);

  const BAHN_HOEHE = 30;
  const OBEN_IN_SPUR = 18;
  const bahnenEnde = []; // je Bahn: bis wohin sie belegt ist (Pixel)
  for (const station of neben) {
    const links = xFuerJahr(station.von, gelegt);
    const rechts = Math.max(links + 6, xFuerJahr(station.bis, gelegt));
    const balken = element("div", "zlBalken");
    balken.style.left = links + "px";
    balken.style.width = rechts - links + "px";
    // "Betriebswirtschaftslehre, berufsbegleitend" + "FernUniversität in Hagen"
    // -> "Betriebswirtschaftslehre · FernUniversität in Hagen"
    const beschriftung = [station.titel.split(",")[0], station.organisation].filter(Boolean).join(" · ");
    const knopf = element("button", "", beschriftung);
    knopf.type = "button";
    knopf.title = station.zeit;
    knopf.setAttribute("aria-expanded", "false");
    knopf.addEventListener("click", () => oeffneStationsMenue(station, knopf));
    balken.append(knopf);
    spur.append(balken);

    const ende = Math.max(rechts, links + knopf.offsetWidth) + 10;
    let bahn = bahnenEnde.findIndex((belegtBis) => belegtBis <= links);
    if (bahn === -1) bahn = bahnenEnde.length;
    bahnenEnde[bahn] = ende;
    balken.style.top = OBEN_IN_SPUR + bahn * BAHN_HOEHE + "px";
  }
  return oben + OBEN_IN_SPUR + bahnenEnde.length * BAHN_HOEHE + 6;
}

function pfeilKnopf(zeichen, beschriftung, richtung, scroll) {
  const knopf = element("button", "zlPfeil", zeichen);
  knopf.type = "button";
  knopf.setAttribute("aria-label", beschriftung);
  knopf.addEventListener("click", () => {
    scroll.scrollBy({ left: richtung * scroll.clientWidth * 0.6, behavior: bewegungReduziert ? "auto" : "smooth" });
  });
  return knopf;
}

// Mit der Maus ziehen (am Handy wischt man ohnehin). Wer gezogen hat, öffnet dabei kein Menü.
function macheZiehbar(scroll) {
  let start = null;
  let gezogen = false;
  scroll.addEventListener("pointerdown", (ereignis) => {
    if (ereignis.pointerType !== "mouse" || ereignis.button !== 0) return;
    start = { x: ereignis.clientX, scrollLeft: scroll.scrollLeft };
    gezogen = false;
  });
  scroll.addEventListener("pointermove", (ereignis) => {
    if (!start) return;
    const weg = ereignis.clientX - start.x;
    if (!gezogen && Math.abs(weg) > 4) {
      gezogen = true;
      scroll.classList.add("zieht");
    }
    if (gezogen) scroll.scrollLeft = start.scrollLeft - weg;
  });
  const loslassen = () => {
    start = null;
    scroll.classList.remove("zieht");
  };
  scroll.addEventListener("pointerup", loslassen);
  scroll.addEventListener("pointerleave", loslassen);
  scroll.addEventListener(
    "click",
    (ereignis) => {
      if (!gezogen) return;
      ereignis.stopPropagation();
      ereignis.preventDefault();
      gezogen = false;
    },
    true
  );
}

// "vorher: Medientechnologie, Technische Universität Ilmenau" - öffnet ebenfalls ein Menü.
function vorherKnopf(station) {
  const text = `vorher: ${station.titel}${station.organisation ? ", " + station.organisation : ""} (${station.zeit})`;
  const knopf = element("button", "zlVorher", text);
  knopf.type = "button";
  knopf.setAttribute("aria-expanded", "false");
  knopf.addEventListener("click", () => oeffneStationsMenue(station, knopf));
  return knopf;
}

// Achse ziehen, Stationen einblenden: Die Klasse "da" startet die Übergänge aus dem CSS.
function zeigeAufbau(inhalt, mitAufbau) {
  if (!mitAufbau || bewegungReduziert) {
    inhalt.querySelectorAll(".zlAchse, .zlStation, .zlBalken").forEach((teil) => (teil.style.transition = "none"));
    inhalt.classList.add("da");
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => inhalt.classList.add("da")));
}

// Gespräch: eine Zeile Jahreszahlen, jede öffnet das Stationsmenü (Q21).
function zeichneJahreszeile() {
  const zeile = element("div", "zlZeile");
  hauptspur().forEach((station, index) => {
    if (index > 0) zeile.append(element("span", "trenner", "·"));
    const knopf = element("button", "", `${jahrDerBeschriftung(station)} ${kurzname(station)}`);
    knopf.type = "button";
    knopf.setAttribute("aria-expanded", "false");
    knopf.addEventListener("click", () => oeffneStationsMenue(station, knopf));
    zeile.append(knopf);
  });
  zeile.append(element("span", "trenner", "·"), element("span", "heute", "heute"));
  zeile.addEventListener("scroll", schliesseStationsMenue);
  zeitleisteElement.replaceChildren(zeile);

  // Verschiebbar: der Beginn des Berufs links im Bild, wie im Werdegang.
  const berufsbeginn = zeitleistenStand.stationen.berufsbeginn;
  const ersterBeruf = hauptspur().findIndex((station) => station.von >= berufsbeginn);
  const knoepfe = zeile.querySelectorAll("button");
  if (ersterBeruf > 0) zeile.scrollLeft = knoepfe[ersterBeruf].offsetLeft - zeile.offsetLeft;
}

// Handy, senkrecht: alle Stationen als Liste, die Nebenspur eingerückt dazwischen.
function zeichneListe(mitAufbau) {
  const nebenher = ZEITLEISTE.nebenspur ? zeitleistenStand.stationen.neben : [];
  const stationen = [...hauptspur(), ...nebenher].sort((a, b) => a.von - b.von);
  const liste = element("ul", "zlListe");
  for (const station of stationen) {
    const eintrag = element("li", nebenher.includes(station) ? "neben" : "");
    eintrag.append(stationsKnopf(station));
    liste.append(eintrag);
  }
  const teile = [liste];
  const vorher = zeitleistenStand.stationen.vorher;
  if (ZEITLEISTE.modus === "fest" && vorher.length > 0) teile.push(vorherKnopf(vorher[vorher.length - 1]));
  zeitleisteElement.replaceChildren(...teile);
  if (mitAufbau && !bewegungReduziert) {
    liste.animate([{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 500, easing: "ease-out" });
  }
}

// ---------------------------------------------------------------------------
// Stationsmenü (Q21, Q34)
// ---------------------------------------------------------------------------

const stationsMenue = element("div");
stationsMenue.id = "stationsMenue";
stationsMenue.hidden = true;
let menueKnopf = null; // der Knopf, zu dem das offene Menü gehört

// Die Einstiegsfragen einer Station: eine allgemeine, dann je Stichpunkt eine.
function einstiegsfragen(station) {
  const ort = station.organisation ? `bei ${station.organisation}` : `in der Zeit „${station.titel}“`;
  const allgemein = `Was hat Chris ${ort} gemacht?`;
  const nachStichpunkt = (stichpunkt) =>
    station.organisation
      ? `Erzähl mir mehr über „${stichpunkt}“ bei ${station.organisation}.`
      : `Erzähl mir mehr über „${stichpunkt}“ (${station.titel}).`;
  return [
    { beschriftung: allgemein, frage: allgemein },
    ...station.stichpunkte.map((stichpunkt) => ({ beschriftung: stichpunkt, frage: nachStichpunkt(stichpunkt) })),
  ];
}

function oeffneStationsMenue(station, knopf) {
  if (menueKnopf === knopf) {
    schliesseStationsMenue();
    return;
  }
  schliesseStationsMenue();

  const kopfzeile = [station.zeit, station.titel, station.organisation].filter(Boolean).join(" · ");
  const liste = element("ul");
  for (const { beschriftung, frage } of einstiegsfragen(station)) {
    const eintrag = element("li");
    const fragenKnopf = element("button", "", beschriftung);
    fragenKnopf.type = "button";
    fragenKnopf.title = frage;
    fragenKnopf.addEventListener("click", () => {
      fragefeldDerZeitleiste.value = frage; // nur eintragen, nicht abschicken
      schliesseStationsMenue();
      fragefeldDerZeitleiste.focus();
    });
    eintrag.append(fragenKnopf);
    liste.append(eintrag);
  }
  stationsMenue.replaceChildren(element("div", "kopfzeile", kopfzeile), liste);
  stationsMenue.hidden = false;

  const schiebt = istHandy() && ZEITLEISTE.handyMenue === "schiebt";
  stationsMenue.className = schiebt ? "schiebt" : "schwebt";
  if (schiebt) {
    // In der Liste direkt unter dem Eintrag, sonst unter der ganzen Zeitleiste.
    const nachbar = knopf.closest(".zlListe li") || zeitleisteElement.lastElementChild;
    nachbar.after(stationsMenue);
  } else {
    document.body.append(stationsMenue);
    const rand = istHandy() ? 14 : 38;
    const knopfLage = knopf.getBoundingClientRect();
    const breite = stationsMenue.offsetWidth;
    const links = begrenze(knopfLage.left, rand, document.documentElement.clientWidth - breite - rand);
    stationsMenue.style.left = links + window.scrollX + "px";
    stationsMenue.style.top = knopfLage.bottom + window.scrollY + 4 + "px";
  }
  knopf.setAttribute("aria-expanded", "true");
  menueKnopf = knopf;
  stationsMenue.querySelector("button").focus({ preventScroll: true });
}

function schliesseStationsMenue() {
  if (!menueKnopf) return;
  menueKnopf.setAttribute("aria-expanded", "false");
  menueKnopf = null;
  stationsMenue.hidden = true;
  stationsMenue.remove();
  stationsMenue.style.left = stationsMenue.style.top = "";
}

// Esc oder ein Klick daneben schließen das Menü.
document.addEventListener("keydown", (ereignis) => {
  if (ereignis.key !== "Escape" || !menueKnopf) return;
  const knopf = menueKnopf;
  schliesseStationsMenue();
  knopf.focus();
});
document.addEventListener("click", (ereignis) => {
  if (!menueKnopf) return;
  if (stationsMenue.contains(ereignis.target) || menueKnopf.contains(ereignis.target)) return;
  schliesseStationsMenue();
});

// Andere Fensterbreite: neu zeichnen, wenn sie eine Weile ruhig war. Nur die Breite zählt: Am
// Handy ändert sich die Höhe schon, wenn beim Scrollen die Adressleiste ein- und ausfährt, und
// das würde jedes Mal das offene Menü schließen.
let zeitleistenTimer = null;
let gezeichneteBreite = window.innerWidth;
window.addEventListener("resize", () => {
  clearTimeout(zeitleistenTimer);
  zeitleistenTimer = setTimeout(() => {
    if (window.innerWidth === gezeichneteBreite) return;
    gezeichneteBreite = window.innerWidth;
    zeichneZeitleiste(false);
  }, 250);
});
