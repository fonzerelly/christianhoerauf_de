// Prototyp 10: der Katalog der Aufteilungen und die Rechnung, wo Überblendung und Stichwort
// auf einer Labyrinth-Seite liegen. Alles in Zellen des Rasters, ohne DOM - bis auf die Höhe
// des Texts, die der Aufrufer über misseHoehe (Breite in Zellen -> Höhe in Zellen) liefert.
//
// Eine Aufteilung setzt sich aus drei Merkmalen zusammen (Grilling 03.11., Q8 und Nachtrag):
//   lage        wo die Überblendung liegt: links, rechts (senkrecht), unten, oben, band (Mitte)
//   breite      bei unten/oben/band: voll, links (eingerückt, rechts bleibt Labyrinth), rechts
//   ausrichtung wie das Stichwort zur Textkante steht: links, mitte, rechts
//               (bei senkrechten Lagen: oben, mitte, unten bündig zur Überblendung)

// Goldener Schnitt: die kleinere Teilstrecke, als Anteil am Ganzen
const GOLDEN_KLEIN = 0.382;
const GOLDEN_GROSS = 0.618;

// Abstand der Überblendung zum Rand der Bühne und zum Stichwort, in Zellen
const RAND = 2;
const ABSTAND = 2;

// Höchstens so viele Zeilen darf ein Stichwort haben (Q9)
const STICHWORT_ZEILEN_MAX = 3;

// Wie viel der Höhe eine waagrechte Überblendung höchstens einnimmt (Q22)
const HOEHE_MAX = { desktop: 0.5, handy: 0.6 };
// Wie breit eine eingerückte Überblendung ist (Anteil der verfügbaren Breite)
const BREITE_EINGERUECKT = { desktop: GOLDEN_GROSS, handy: 0.85 };
// Mindesthöhe der Überblendung in Zellen, damit auch ein Satz nicht verloren aussieht
const HOEHE_MIN = 4;

// Alle Aufteilungen, die es auf diesem Gerät gibt.
function katalog(profil) {
  const waagrecht = ["unten", "oben", "band"];
  const senkrecht = profil === "desktop" ? ["links", "rechts"] : [];
  const ausrichtungen = ["links", "mitte", "rechts"];
  const liste = [];
  for (const lage of waagrecht) {
    for (const breite of ["voll", "links", "rechts"]) {
      for (const ausrichtung of ausrichtungen) liste.push({ lage, breite, ausrichtung });
    }
  }
  for (const lage of senkrecht) {
    for (const ausrichtung of ausrichtungen) liste.push({ lage, breite: "voll", ausrichtung });
  }
  return liste;
}

function gleicheAufteilung(a, b) {
  return Boolean(a && b) && a.lage === b.lage && a.breite === b.breite && a.ausrichtung === b.ausrichtung;
}

function istSenkrecht(aufteilung) {
  return aufteilung.lage === "links" || aufteilung.lage === "rechts";
}

// Wo die Überblendung liegt: { left, top, right, bottom } (äußerste Zellen, einschließlich).
// raster: { cols, rows, nutzbareCols, profil }. nutzbareCols ist kleiner als cols, solange die
// Lebenslauf-Leiste rechts offen ist: Dann bleibt die Überblendung links von ihr.
function rechteckDerUeberblendung(aufteilung, raster, misseHoehe) {
  const { rows, nutzbareCols, profil } = raster;
  const links = RAND;
  const rechts = nutzbareCols - 1 - RAND;
  const verfuegbareBreite = rechts - links + 1;

  if (istSenkrecht(aufteilung)) {
    const breite = Math.round(nutzbareCols * GOLDEN_KLEIN);
    const hoehe = begrenze(misseHoehe(breite), HOEHE_MIN, rows - 2 * RAND);
    const top = Math.round((rows - hoehe) / 2);
    const left = aufteilung.lage === "links" ? links : rechts - breite + 1;
    return { left, right: left + breite - 1, top, bottom: top + hoehe - 1 };
  }

  const breite =
    aufteilung.breite === "voll" ? verfuegbareBreite : Math.round(verfuegbareBreite * BREITE_EINGERUECKT[profil]);
  const left = aufteilung.breite === "rechts" ? rechts - breite + 1 : links;
  const hoehe = begrenze(misseHoehe(breite), HOEHE_MIN, Math.floor(rows * HOEHE_MAX[profil]));

  let top;
  if (aufteilung.lage === "unten") top = rows - RAND - hoehe;
  else if (aufteilung.lage === "oben") top = RAND;
  else top = Math.round(rows * GOLDEN_GROSS - hoehe / 2); // Band: Mitte auf dem goldenen Schnitt
  top = begrenze(top, RAND, rows - RAND - hoehe);
  return { left, right: left + breite - 1, top, bottom: top + hoehe - 1 };
}

// Wo das Stichwort steht und wie es umbricht. Liefert { lines, block } oder null, wenn es
// in dieser Aufteilung nicht in höchstens drei Zeilen passt.
// block: { left, top, right, bottom, ausrichtung } - ausrichtung sagt, wie die Zeilen
// innerhalb des Blocks stehen (siehe appendTextRoute in redesign.js).
function platzDesStichworts(stichwort, aufteilung, ueberblendung, raster, returnBandRows) {
  const { rows, nutzbareCols } = raster;
  const ersteSpalte = FREE_COLS_BESIDE_TEXT;
  const letzteSpalte = nutzbareCols - 1 - FREE_COLS_BESIDE_TEXT;
  const ersteZeile = FREE_ROWS_AROUND_TEXT;
  const letzteZeile = rows - 1 - FREE_ROWS_AROUND_TEXT;

  // Waagrecht: An welcher Spalte hängt das Stichwort, und wie breit darf es werden?
  let anker;
  let zeilenAusrichtung;
  let hoechsteBreite;
  if (istSenkrecht(aufteilung)) {
    // Das Stichwort steht neben der Überblendung, zur Überblendung hin bündig.
    if (aufteilung.lage === "links") {
      anker = ueberblendung.right + ABSTAND + 1;
      zeilenAusrichtung = "links";
      hoechsteBreite = letzteSpalte - anker + 1;
    } else {
      anker = ueberblendung.left - ABSTAND - 1;
      zeilenAusrichtung = "rechts";
      hoechsteBreite = anker - ersteSpalte + 1;
    }
  } else {
    // Das Stichwort steht über oder unter der Überblendung, bündig zu ihrer Textkante.
    zeilenAusrichtung = aufteilung.ausrichtung;
    if (zeilenAusrichtung === "links") {
      anker = Math.max(ersteSpalte, ueberblendung.left + 1);
      hoechsteBreite = letzteSpalte - anker + 1;
    } else if (zeilenAusrichtung === "rechts") {
      anker = Math.min(letzteSpalte, ueberblendung.right - 1);
      hoechsteBreite = anker - ersteSpalte + 1;
    } else {
      anker = Math.floor((ueberblendung.left + ueberblendung.right) / 2);
      hoechsteBreite = 2 * Math.min(anker - ersteSpalte, letzteSpalte - anker) + 1;
    }
  }

  const zeichenJeZeile = Math.floor((hoechsteBreite + 1) / CHAR_ADVANCE);
  if (zeichenJeZeile < 1) return null;
  const lines = stichwort ? wrapText(normalizeText(stichwort), zeichenJeZeile) : [" "];
  if (lines.length === 0 || lines.length > STICHWORT_ZEILEN_MAX) return null;

  const breite = Math.max(...lines.map((line) => line.length)) * CHAR_ADVANCE - 1;
  const hoehe = lines.length * lineAdvanceOf(returnBandRows) - returnBandRows;

  // Senkrecht: über, unter oder neben der Überblendung
  let top;
  if (istSenkrecht(aufteilung)) {
    if (aufteilung.ausrichtung === "links") top = ueberblendung.top; // oben bündig
    else if (aufteilung.ausrichtung === "rechts") top = ueberblendung.bottom - hoehe + 1; // unten bündig
    else top = Math.round((ueberblendung.top + ueberblendung.bottom - hoehe) / 2);
  } else if (aufteilung.lage === "oben") {
    top = ueberblendung.bottom + ABSTAND + 1;
  } else {
    top = ueberblendung.top - ABSTAND - hoehe; // unten und Band: das Stichwort steht darüber
  }
  if (top < ersteZeile || top + hoehe - 1 > letzteZeile) return null;

  let left;
  if (zeilenAusrichtung === "links") left = anker;
  else if (zeilenAusrichtung === "rechts") left = anker - breite + 1;
  else left = anker - Math.floor(breite / 2);

  return {
    lines,
    block: { left, right: left + breite - 1, top, bottom: top + hoehe - 1, ausrichtung: zeilenAusrichtung },
  };
}

// Plant eine Labyrinth-Seite: wählt die Aufteilung und rechnet Überblendung und Stichwort aus.
//
// wunsch: eine Aufteilung, die zuerst versucht wird (feste Aufteilung der Begrüßung oder die
//         schon einmal gewählte, wenn die Seite nach einer Größenänderung neu gebaut wird)
// vorige: die Aufteilung der vorigen Antwort - genau dieselbe kommt nicht zweimal hintereinander
// random: der Zufall der Seite (aus dem Startwert)
function planeSeite(stichwort, raster, misseHoehe, returnBandRows, random, wunsch, vorige) {
  const kandidaten = shuffle(
    katalog(raster.profil).filter((aufteilung) => !gleicheAufteilung(aufteilung, vorige)),
    random
  );
  if (wunsch) kandidaten.unshift(wunsch);

  for (const aufteilung of kandidaten) {
    const ueberblendung = rechteckDerUeberblendung(aufteilung, raster, misseHoehe);
    const platz = platzDesStichworts(stichwort, aufteilung, ueberblendung, raster, returnBandRows);
    if (platz) return { aufteilung, ueberblendung, ...platz };
  }

  // Passt nirgends (sehr langes Stichwort, winzige Bühne): ohne Stichwort, nur ein Pfad.
  // Findet auch der keinen Platz, läuft der Pfad durch die Mitte der Bühne.
  const aufteilung = kandidaten[0];
  const ueberblendung = rechteckDerUeberblendung(aufteilung, raster, misseHoehe);
  const pfad = platzDesStichworts("", aufteilung, ueberblendung, raster, returnBandRows);
  if (pfad) return { aufteilung, ueberblendung, ...pfad };
  const mitte = { x: Math.floor(raster.nutzbareCols / 2) - 1, y: Math.floor(raster.rows / 2) - 3 };
  const block = { left: mitte.x, right: mitte.x + 2, top: mitte.y, bottom: mitte.y + GLYPH_HEIGHT + LANE_HEIGHT - 1, ausrichtung: "links" };
  return { aufteilung, ueberblendung, lines: [" "], block };
}

function begrenze(wert, kleinster, groesster) {
  return Math.max(kleinster, Math.min(groesster, wert));
}
