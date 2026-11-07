// Prototyp 12: die auf- und zuklappbare Zeitleiste und das Stationsmenü (Plan Schritt 12,
// Q41–Q52; aus Prototyp 11 übernommen: Laden, Maßstab nach Zeit, Ziehen, Einstiegsfragen).
//
// Aufgeklappt: Stationen groß unter der Linie, nebeneinander und nach Zeit gelegt, keine
//   wird versetzt; jede ist mindestens so breit wie ihre Beschriftung (Q45). Die Engagements
//   (Lehre, Ehrenamt, berufsbegleitendes Studium) stehen klein über der Linie (Q47): ein
//   dünner Strich zweigt bei ihrem Beginn nach oben ab, daneben die Beschriftung. Reicht der
//   Platz bis zum nächsten Engagement nicht, wird sie mit „…“ gekürzt.
// Zugeklappt: eine Zeile, alle Stationen samt Engagements nach Beginn sortiert (Q48).
// Beide verschiebbar; beim Laden steht „heute“ am rechten Rand (Q46).
// Rechts sitzt ein Knopf wie ein gespiegeltes L: oben „›“ (später), unten der Fuß zum
// Auf- und Zuklappen.
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
  laden: "echt", // "echt" | "langsam" | "fehler"
};

// Der Zustand: Daten, sobald sie da sind, ob gerade geladen wird oder es gescheitert ist, und
// ob die Zeitleiste aufgeklappt ist. Die Seite beginnt aufgeklappt (Q43).
const zeitleistenStand = { zustand: "laedt", stationen: null, aufgeklappt: true };

// Größte Breite einer Beschriftung unter der Linie; längere Titel brechen um (Q45).
const BESCHRIFTUNG_HOECHSTENS = { desktop: 220, handy: 160 };
// Luft zwischen zwei Beschriftungen nebeneinander.
const BESCHRIFTUNG_LUFT = 12;
// So eng dürfen die Jahre höchstens zusammenrücken, damit die Abstände noch nach Zeit aussehen.
const PIXEL_JE_JAHR_MINDESTENS = { desktop: 34, handy: 22 };
// Platz rechts für das Wort „heute“ hinter dem Ende der Linie.
const PLATZ_FUER_HEUTE = 64;
// Höhe des Strichs, mit dem ein Engagement von der Linie nach oben abzweigt.
const ENGAGEMENT_HOEHE = 24;
// So schmal darf eine gekürzte Beschriftung eines Engagements höchstens werden.
const ENGAGEMENT_MINDESTBREITE = 40;

function istHandy() {
  return document.body.dataset.profile === "handy";
}

function profilDerZeitleiste() {
  return istHandy() ? "handy" : "desktop";
}

// ---------------------------------------------------------------------------
// Daten: Zeiträume lesen, Stationen und Engagements unterscheiden
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
//   hauptspur: der Beruf, davor alles, was vor dem ersten Beruf endete (Schule, Studium, ...)
//   engagements: was neben dem Beruf lief (Lehre, Ehrenamt, berufsbegleitendes Studium)
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
  const istVorher = (station) => station.bis <= berufsbeginn + 0.01;
  const ausserhalbDesBerufs = alle.filter((station) => station.abschnitt !== "beruf");
  return {
    berufsbeginn,
    beruf,
    hauptspur: [...ausserhalbDesBerufs.filter(istVorher), ...beruf],
    engagements: ausserhalbDesBerufs.filter((station) => !istVorher(station)),
  };
}

// Die Beschriftung eines Engagements über der Linie:
// "Betriebswirtschaftslehre, berufsbegleitend" + "FernUniversität in Hagen"
// -> "Betriebswirtschaftslehre · FernUniversität in Hagen"
function beschriftungDesEngagements(station) {
  return [station.titel.split(",")[0], station.organisation].filter(Boolean).join(" · ");
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
// Maßstab: Abstände nach Zeit, jede Station mindestens so breit wie ihre Beschriftung (Q45)
// ---------------------------------------------------------------------------

// Jede Station der Hauptspur reicht bis zum Beginn der nächsten, die letzte bis heute.
// mindestens: die Breite ihrer Beschriftung samt Luft.
function abschnitteDer(stationen, mindestBreiten) {
  return stationen.map((station, index) => ({
    station,
    von: station.von,
    bis: index + 1 < stationen.length ? stationen[index + 1].von : heuteAlsJahr(),
    mindestens: mindestBreiten[index],
  }));
}

// Pixel je Jahr, so dass die Abschnitte zusammen `breite` füllen und keiner schmaler als seine
// Mindestbreite wird. Abschnitte, die auf die Mindestbreite geklemmt werden, nehmen den übrigen
// Platz weg; deshalb wird ein paar Mal nachgerechnet. Passen nicht einmal die Mindestbreiten,
// bleibt es beim letzten Wert: Dann ist die Zeitleiste breiter als der Platz und wird verschoben.
function pixelJeJahr(abschnitte, breite) {
  const dauer = (abschnitt) => Math.max(0.01, abschnitt.bis - abschnitt.von);
  let jeJahr = breite / abschnitte.reduce((summe, abschnitt) => summe + dauer(abschnitt), 0);
  for (let runde = 0; runde < 6; runde++) {
    const geklemmt = abschnitte.filter((abschnitt) => dauer(abschnitt) * jeJahr < abschnitt.mindestens);
    const frei = abschnitte.filter((abschnitt) => !geklemmt.includes(abschnitt));
    const freieBreite = breite - geklemmt.reduce((summe, abschnitt) => summe + abschnitt.mindestens, 0);
    const freieDauer = frei.reduce((summe, abschnitt) => summe + dauer(abschnitt), 0);
    if (freieDauer <= 0 || freieBreite <= 0) break;
    jeJahr = freieBreite / freieDauer;
  }
  return jeJahr;
}

// Legt die Abschnitte nebeneinander: { station, von, bis, x, breite }.
function legeAbschnitte(abschnitte, jeJahr) {
  let x = 0;
  return abschnitte.map((abschnitt) => {
    const breite = Math.max(abschnitt.mindestens, (abschnitt.bis - abschnitt.von) * jeJahr);
    const gelegt = { ...abschnitt, x, breite };
    x += breite;
    return gelegt;
  });
}

// Wo ein Zeitpunkt auf der Zeitleiste liegt: innerhalb seines Abschnitts anteilig. So stehen
// die Engagements über der richtigen Stelle, auch wenn eine Station verbreitert ist.
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

// Ein Knopf, der das Stationsmenü öffnet.
function menueKnopfFuer(station, klasse, text) {
  const knopf = element("button", klasse, text);
  knopf.type = "button";
  knopf.setAttribute("aria-expanded", "false");
  knopf.addEventListener("click", () => oeffneStationsMenue(station, knopf));
  return knopf;
}

// Ein Knopf mit Jahr, Organisation und Titel unter der Linie.
function stationsKnopf(station) {
  const knopf = menueKnopfFuer(station, "");
  knopf.append(element("span", "zlJahr", jahrDerBeschriftung(station)));
  if (station.organisation) knopf.append(element("span", "zlOrg", station.organisation));
  knopf.append(element("span", "zlTitel", station.titel));
  return knopf;
}

// Zeichnet die Zeitleiste neu. mitAufbau: Linie und Stationen erscheinen nacheinander.
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

  // Rahmen (Raster im CSS):  [‹] [verschiebbarer Inhalt] [›]
  //                                           [Klappknopf  ]  <- Fuß des gespiegelten L
  const scroll = element("div", "zlScroll");
  const frueher = pfeilKnopf("‹", "Früher", -1, scroll, "frueher");
  const spaeter = pfeilKnopf("›", "Später", 1, scroll, "spaeter");
  const klappknopf = klappknopfFuer(zeitleistenStand.aufgeklappt);
  // Erst ohne Pfeile messen, ob der Inhalt überhaupt breiter ist als der Platz.
  frueher.hidden = spaeter.hidden = true;
  const rahmen = element("div", "zlRahmen " + (zeitleistenStand.aufgeklappt ? "auf" : "zu"));
  rahmen.append(frueher, scroll, spaeter, klappknopf);
  zeitleisteElement.replaceChildren(rahmen);

  if (zeitleistenStand.aufgeklappt) zeichneAufgeklappt(scroll, mitAufbau);
  else zeichneZugeklappt(scroll);

  const laeuftUeber = scroll.scrollWidth > scroll.clientWidth + 1;
  frueher.hidden = spaeter.hidden = !laeuftUeber;
  if (!laeuftUeber) return;
  scroll.classList.add("ziehbar");
  macheZiehbar(scroll);
  // Beim Laden steht „heute“ am rechten Rand (Q46).
  scroll.scrollLeft = scroll.scrollWidth;
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

// Aufgeklappt, von oben nach unten: Engagements, Linie mit „heute“, Stationen.
// Die Elemente kommen zuerst ins Dokument, weil sich ihre Breite erst dort messen lässt;
// danach werden sie an ihren Platz gestellt.
function zeichneAufgeklappt(scroll, mitAufbau) {
  const profil = profilDerZeitleiste();
  const { hauptspur, beruf, engagements } = zeitleistenStand.stationen;

  const inhalt = element("div", "zlInhalt");
  const achse = element("div", "zlAchse");
  const heute = element("span", "zlHeute", "heute");
  const stationen = hauptspur.map((station) => {
    const teil = element("div", "zlStation");
    const knopf = stationsKnopf(station);
    knopf.style.maxWidth = BESCHRIFTUNG_HOECHSTENS[profil] + "px";
    teil.append(knopf);
    return teil;
  });
  const marker = engagements.map((station) => {
    const teil = element("div", "zlEngagement");
    const beschriftung = beschriftungDesEngagements(station);
    const knopf = menueKnopfFuer(station, "", beschriftung);
    // Die Beschriftung kann gekürzt sein; im Tooltip und für Screenreader steht sie ganz.
    knopf.title = `${station.zeit} · ${beschriftung}`;
    knopf.setAttribute("aria-label", `${beschriftung}, ${station.zeit}`);
    teil.append(knopf);
    return teil;
  });
  inhalt.append(achse, ...stationen, ...marker, heute);
  scroll.append(inhalt);

  // Maßstab: Der Beruf füllt die Breite (ohne den Platz für „heute“); was davor war, kommt im
  // selben Maßstab links dazu.
  const mindestBreiten = stationen.map((teil) => teil.firstElementChild.offsetWidth + BESCHRIFTUNG_LUFT);
  const verfuegbar = scroll.clientWidth - PLATZ_FUER_HEUTE;
  const abschnitte = abschnitteDer(hauptspur, mindestBreiten);
  const berufsAbschnitte = abschnitte.slice(hauptspur.length - beruf.length);
  const jeJahr = Math.max(PIXEL_JE_JAHR_MINDESTENS[profil], pixelJeJahr(berufsAbschnitte, verfuegbar));
  const gelegt = legeAbschnitte(abschnitte, jeJahr);
  const endeDerLinie = gelegt[gelegt.length - 1].x + gelegt[gelegt.length - 1].breite;

  // Engagements: alle in einer Reihe über der Linie, jedes beim Jahr seines Beginns. Die
  // Beschriftung darf bis kurz vor das nächste Engagement reichen, das letzte bis zum Ende der
  // Zeitleiste; was nicht passt, kürzt das CSS mit „…“.
  const linieOben = engagements.length > 0 ? ENGAGEMENT_HOEHE + 2 : 0;
  const endeDesInhalts = endeDerLinie + PLATZ_FUER_HEUTE;
  const anfaenge = engagements.map((station) => xFuerJahr(station.von, gelegt));
  marker.forEach((teil, index) => {
    const platzBis = index + 1 < anfaenge.length ? anfaenge[index + 1] : endeDesInhalts;
    teil.style.left = anfaenge[index] + "px";
    teil.style.top = linieOben - ENGAGEMENT_HOEHE + "px";
    teil.style.height = ENGAGEMENT_HOEHE + "px";
    teil.firstElementChild.style.maxWidth =
      Math.max(ENGAGEMENT_MINDESTBREITE, platzBis - anfaenge[index] - BESCHRIFTUNG_LUFT) + "px";
    teil.style.transitionDelay = mitAufbau ? 0.6 + index * 0.06 + "s" : "0s";
  });

  achse.style.top = linieOben + "px";
  achse.style.width = endeDerLinie + "px";
  heute.style.left = endeDerLinie + 10 + "px";
  heute.style.top = linieOben - 8 + "px";
  gelegt.forEach((abschnitt, index) => {
    const teil = stationen[index];
    teil.style.left = abschnitt.x + "px";
    teil.style.width = abschnitt.breite + "px";
    teil.style.top = linieOben + 2 + "px";
    teil.style.transitionDelay = mitAufbau ? 0.3 + index * 0.06 + "s" : "0s";
  });
  const unterkante = Math.max(...stationen.map((teil) => teil.offsetTop + teil.offsetHeight));
  inhalt.style.width = endeDesInhalts + "px";
  inhalt.style.height = unterkante + 8 + "px";
  zeigeAufbau(inhalt, mitAufbau);
}

// Zugeklappt: eine Zeile „Jahr Name“, nach Beginn sortiert; Engagements blasser (Q48).
// Bei gleichem Beginn steht der Beruf vorn.
function zeichneZugeklappt(scroll) {
  const { hauptspur, engagements } = zeitleistenStand.stationen;
  const alle = [...hauptspur, ...engagements].sort((a, b) => a.von - b.von || engagements.includes(a) - engagements.includes(b));
  const zeile = element("div", "zlZeile");
  alle.forEach((station, index) => {
    if (index > 0) zeile.append(element("span", "trenner", "·"));
    const klasse = engagements.includes(station) ? "engagement" : "";
    zeile.append(menueKnopfFuer(station, klasse, `${jahrDerBeschriftung(station)} ${kurzname(station)}`));
  });
  zeile.append(element("span", "trenner", "·"), element("span", "heute", "heute"));
  scroll.append(zeile);
}

// ---------------------------------------------------------------------------
// Auf- und Zuklappen (Q42, Q43)
// ---------------------------------------------------------------------------

// Der Fuß des gespiegelten L unter „›“: nur ein Pfeil, ▴ klappt zu, ▾ klappt auf.
function klappknopfFuer(aufgeklappt) {
  const knopf = element("button", "zlKlapp", aufgeklappt ? "▴" : "▾");
  knopf.type = "button";
  knopf.setAttribute("aria-expanded", String(aufgeklappt));
  knopf.setAttribute("aria-label", aufgeklappt ? "Zeitleiste zuklappen" : "Zeitleiste aufklappen");
  knopf.addEventListener("click", () => {
    setzeZeitleisteAufgeklappt(!aufgeklappt);
    zeitleisteElement.querySelector(".zlKlapp").focus();
  });
  return knopf;
}

// Klappt die Zeitleiste auf oder zu. Was darunter steht, rutscht mit; die Bühne bleibt.
function setzeZeitleisteAufgeklappt(aufgeklappt) {
  if (zeitleistenStand.aufgeklappt === aufgeklappt) return;
  zeitleistenStand.aufgeklappt = aufgeklappt;
  document.body.dataset.zeitleiste = aufgeklappt ? "auf" : "zu";
  zeichneZeitleiste(false);
  if (!bewegungReduziert && zeitleisteElement.firstElementChild) {
    zeitleisteElement.firstElementChild.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: "ease-out" });
  }
}

function pfeilKnopf(zeichen, beschriftung, richtung, scroll, klasse) {
  const knopf = element("button", "zlPfeil " + klasse, zeichen);
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

// Achse ziehen, Stationen einblenden: Die Klasse "da" startet die Übergänge aus dem CSS.
function zeigeAufbau(inhalt, mitAufbau) {
  if (!mitAufbau || bewegungReduziert) {
    inhalt.querySelectorAll(".zlAchse, .zlStation, .zlEngagement").forEach((teil) => (teil.style.transition = "none"));
    inhalt.classList.add("da");
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => inhalt.classList.add("da")));
}

// ---------------------------------------------------------------------------
// Stationsmenü (Q21, Q44)
// ---------------------------------------------------------------------------

// Das Menü liegt über Antwort und Fragefeld, statt sie zu verschieben, auch auf dem Handy.
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
    fragenKnopf.addEventListener("click", () => waehleEinstiegsfrage(frage));
    eintrag.append(fragenKnopf);
    liste.append(eintrag);
  }
  stationsMenue.replaceChildren(element("div", "kopfzeile", kopfzeile), liste);
  stationsMenue.hidden = false;
  document.body.append(stationsMenue);

  // Unter den Knopf, aber nicht über den Rand des Fensters hinaus.
  const rand = istHandy() ? 14 : 38;
  const knopfLage = knopf.getBoundingClientRect();
  const breite = stationsMenue.offsetWidth;
  const links = begrenze(knopfLage.left, rand, document.documentElement.clientWidth - breite - rand);
  stationsMenue.style.left = links + window.scrollX + "px";
  stationsMenue.style.top = knopfLage.bottom + window.scrollY + 4 + "px";

  knopf.setAttribute("aria-expanded", "true");
  menueKnopf = knopf;
  stationsMenue.querySelector("button").focus({ preventScroll: true });
}

// Eine Einstiegsfrage nur eintragen, nicht abschicken (Q22). Die Zeitleiste klappt zu, das
// Fragefeld rückt hoch und bekommt den Fokus (Q44).
function waehleEinstiegsfrage(frage) {
  fragefeldDerZeitleiste.value = frage;
  schliesseStationsMenue();
  setzeZeitleisteAufgeklappt(false);
  fragefeldDerZeitleiste.focus();
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
