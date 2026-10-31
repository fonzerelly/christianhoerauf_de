// Der Briefkopf-Streifen des Briefpapiers, aber lebendig: Bei jeder Antwort entsteht ein neues
// Labyrinth, und der Lichtpunkt schreibt darin das Schlüsselwort der Antwort.
//
// Vorbild ist corporate-identity/lebenslauf/streifen.js (dort fest „CHRIS“, in Millimetern).
// Hier ist das Wort beliebig, gemessen wird in Bildschirm-Pixeln, und der Weg wird Schritt für
// Schritt gezeichnet. Labyrinth und Schrift kommen aus prototyp/06-frage-antwort.

const BRIEFKOPF = {
  zeilen: 12, // wie der Streifen auf Papier (30 mm hoch, 2,5 mm je Zelle)
  randLinks: 9, // Zellen links vor dem Wort, wie beim Streifen
  groessteZelle: 13, // Pixel je Zelle, wenn genug Platz ist
  anschriftAb: 900, // ab dieser Breite (px) steht rechts das Anschriftfeld
  anschriftBreite: 330, // Breite des Anschriftfelds samt Abstand (px)
  zellenProSekunde: { letter: 40, connector: 120, silent: 120 },
};

// Farben und Strichstärken wie im Streifen. Die Strichstärken dort sind Millimeter bei
// 2,5 mm Zellgröße; hier werden sie als Anteil der Zellgröße gerechnet.
const BRIEFKOPF_FARBEN = {
  hintergrund: "#020d06",
  wandHelligkeit: 0.3,
  wandSchichten: [
    { breite: 4.2, farbe: "#06200f" },
    { breite: 2.4, farbe: "#0d4a22" },
    { breite: 1.0, farbe: "#2bdc5a" },
    { breite: 0.35, farbe: "#c4ffd6" },
  ],
  buchstabenSchichten: [
    { breite: 3.4, farbe: "#3a0808" },
    { breite: 2.0, farbe: "#8f1313" },
    { breite: 1.0, farbe: "#ff2a2a" },
    { breite: 0.3, farbe: "#ffc2c2" },
  ],
  verbindung: "#5e1010",
};
const WANDSTAERKE_JE_ZELLE = 0.3 / 2.5;
const SPURSTAERKE_JE_ZELLE = 0.55 / 2.5;

// Die Buchstaben des Worts, die die Schrift kennt, in Großbuchstaben und ohne Trennstellen.
function briefkopfBuchstaben(wort) {
  return withoutBreakMarks(normalizeText(wort)).split("").filter((zeichen) => GLYPHS[zeichen]);
}

// Wie viele Zellen vom linken Rand bis zum Ende des Worts gebraucht werden.
function briefkopfBreiteInZellen(wort, randLinks) {
  return randLinks + briefkopfBuchstaben(wort).length * CHAR_ADVANCE - 1;
}

// Der Weg des Lichtpunkts: von links außerhalb des Rasters in Windungen zum Wort, dann
// durch die Buchstaben. schritte: [{x, y, kind}], jeder Schritt eine Zelle weiter.
function baueBriefkopfRoute(wort, spalten, zeilen, randLinks, random) {
  const oben = Math.floor((zeilen - (GLYPH_HEIGHT + 1)) / 2);
  const spurZeile = oben + GLYPH_HEIGHT;
  const tor = { x: randLinks - 2, y: spurZeile };
  const eingang = { x: 0, y: randomBetween(2, zeilen - 3, random) };
  const anlauf = findWindingPath(spalten, zeilen, (zelle) => zelle.x <= tor.x, eingang, tor, random, 0.5);

  const schritte = [{ x: -1, y: eingang.y, kind: CONNECTOR }, ...anlauf.map((zelle) => ({ ...zelle, kind: CONNECTOR }))];
  const buchstaben = briefkopfBuchstaben(wort);
  buchstaben.forEach((zeichen, index) => {
    const links = randLinks + index * CHAR_ADVANCE;
    walkTo(schritte, links + GLYPHS[zeichen][0][0], spurZeile, CONNECTOR);
    appendGlyph(schritte, GLYPHS[zeichen], links, oben);
    const istLetzter = index === buchstaben.length - 1;
    if (!istLetzter) walkTo(schritte, schritte[schritte.length - 1].x, spurZeile, CONNECTOR);
  });
  return { schritte, eingang };
}

// Macht aus einem Text eine Zahl, immer dieselbe für denselben Text (wie seedFromText im Streifen).
function zahlAusText(text) {
  let hash = 2166136261;
  for (const zeichen of text) {
    hash ^= zeichen.codePointAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

// Mischt eine Farbe mit dem Hintergrund: 1 = unverändert, 0 = Hintergrundfarbe.
function briefkopfGedimmt(farbe, helligkeit) {
  const kanaele = (hex) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const [von, nach] = [kanaele(BRIEFKOPF_FARBEN.hintergrund), kanaele(farbe)];
  return "#" + von.map((wert, i) => Math.round(wert + (nach[i] - wert) * helligkeit).toString(16).padStart(2, "0")).join("");
}

function svgElement(name, attribute) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [schluessel, wert] of Object.entries(attribute)) element.setAttribute(schluessel, wert);
  return element;
}

// Alle Wände als ein einziger Pfad. Links bleibt der Eingang offen.
function briefkopfWandPfad(labyrinth, eingang, zelle) {
  const teile = [];
  const px = (zellen) => (zellen * zelle).toFixed(1);
  const wand = (x1, y1, x2, y2) => teile.push(`M${px(x1)} ${px(y1)}L${px(x2)} ${px(y2)}`);
  for (let y = 0; y < labyrinth.rows; y++) {
    for (let x = 0; x < labyrinth.cols; x++) {
      if (x === labyrinth.cols - 1 || !labyrinth.openRight[y][x]) wand(x + 1, y, x + 1, y + 1);
      if (y === labyrinth.rows - 1 || !labyrinth.openDown[y][x]) wand(x, y + 1, x + 1, y + 1);
      if (x === 0 && eingang.y !== y) wand(0, y, 0, y + 1);
      if (y === 0) wand(x, 0, x + 1, 0);
    }
  }
  return teile.join("");
}

// Der Pfad aller Schritte einer Art (LETTER oder CONNECTOR) bis zum Schritt bis (ausschließlich).
function briefkopfSpurPfad(schritte, art, bis, zelle) {
  const mitte = (s) => `${((s.x + 0.5) * zelle).toFixed(1)} ${((s.y + 0.5) * zelle).toFixed(1)}`;
  const teile = [];
  for (let i = 1; i < Math.min(bis, schritte.length); i++) {
    if (schritte[i].kind === art) teile.push(`M${mitte(schritte[i - 1])}L${mitte(schritte[i])}`);
  }
  return teile.join("");
}

// Baut den Streifen für ein Wort und lässt den Lichtpunkt es schreiben.
// behaelter: das Element, in das der Streifen kommt. sofort: ohne Animation, gleich fertig
// (nach einer Größenänderung des Fensters). Liefert eine Funktion, die die Animation abbricht.
function zeigeBriefkopf(behaelter, wort, startText, sofort) {
  const breite = behaelter.clientWidth;
  const mitAnschrift = breite >= BRIEFKOPF.anschriftAb;
  const platzFuersWort = breite - (mitAnschrift ? BRIEFKOPF.anschriftBreite : 0);
  const zelle = Math.min(BRIEFKOPF.groessteZelle, platzFuersWort / (briefkopfBreiteInZellen(wort, BRIEFKOPF.randLinks) + 3));
  const spalten = Math.ceil(breite / zelle);
  const zeilen = BRIEFKOPF.zeilen;
  behaelter.style.height = `${zeilen * zelle}px`;
  behaelter.classList.toggle("mitAnschrift", mitAnschrift);

  const random = createRandom(zahlAusText(startText));
  const labyrinth = createEmptyMaze(spalten, zeilen);
  const route = baueBriefkopfRoute(wort, spalten, zeilen, BRIEFKOPF.randLinks, random);
  carveRoute(labyrinth, route.schritte);
  growMaze(labyrinth, visitedCells(labyrinth), random, 0.7);

  const svg = svgElement("svg", { width: breite, height: zeilen * zelle, "aria-hidden": "true", class: "labyrinth" });
  svg.appendChild(svgElement("rect", { width: breite, height: zeilen * zelle, fill: BRIEFKOPF_FARBEN.hintergrund }));
  const wandPfad = briefkopfWandPfad(labyrinth, route.eingang, zelle);
  for (const schicht of BRIEFKOPF_FARBEN.wandSchichten) {
    svg.appendChild(svgElement("path", {
      d: wandPfad, fill: "none", stroke: briefkopfGedimmt(schicht.farbe, BRIEFKOPF_FARBEN.wandHelligkeit),
      "stroke-width": schicht.breite * WANDSTAERKE_JE_ZELLE * zelle, "stroke-linecap": "square",
    }));
  }
  const spurStaerke = SPURSTAERKE_JE_ZELLE * zelle;
  const verbindung = svgElement("path", { fill: "none", stroke: BRIEFKOPF_FARBEN.verbindung, "stroke-width": spurStaerke, "stroke-linecap": "round" });
  svg.appendChild(verbindung);
  const buchstaben = BRIEFKOPF_FARBEN.buchstabenSchichten.map((schicht) => {
    const pfad = svgElement("path", {
      fill: "none", stroke: schicht.farbe, "stroke-width": schicht.breite * spurStaerke,
      "stroke-linecap": "round", "stroke-linejoin": "round",
    });
    svg.appendChild(pfad);
    return pfad;
  });
  const punkt = [
    svgElement("circle", { r: zelle * 0.5, fill: "#8f1313" }),
    svgElement("circle", { r: zelle * 0.34, fill: "#ff2a2a" }),
    svgElement("circle", { r: zelle * 0.16, fill: "#ffffff" }),
  ];
  punkt.forEach((kreis) => svg.appendChild(kreis));
  behaelter.querySelector(".labyrinth")?.remove();
  behaelter.prepend(svg);

  // Zeichnet den Stand nach "fortschritt" Schritten (Kommazahl: der Punkt steht zwischen zwei Zellen).
  function zeichneBis(fortschritt) {
    const ganz = Math.floor(fortschritt) + 1;
    verbindung.setAttribute("d", briefkopfSpurPfad(route.schritte, CONNECTOR, ganz, zelle));
    const buchstabenPfad = briefkopfSpurPfad(route.schritte, LETTER, ganz, zelle);
    buchstaben.forEach((pfad) => pfad.setAttribute("d", buchstabenPfad));
    const von = route.schritte[Math.min(ganz - 1, route.schritte.length - 1)];
    const nach = route.schritte[Math.min(ganz, route.schritte.length - 1)];
    const anteil = fortschritt - Math.floor(fortschritt);
    const x = (von.x + (nach.x - von.x) * anteil + 0.5) * zelle;
    const y = (von.y + (nach.y - von.y) * anteil + 0.5) * zelle;
    punkt.forEach((kreis) => { kreis.setAttribute("cx", x); kreis.setAttribute("cy", y); });
  }

  const letzterSchritt = route.schritte.length - 1;
  if (sofort) {
    zeichneBis(letzterSchritt);
    return () => {};
  }
  // Jeder Schritt dauert so lange, wie seine Art es vorgibt: Buchstaben langsam, Verbindungen schnell.
  let fortschritt = 0;
  let letzteZeit = null;
  let abgebrochen = false;
  function bild(zeit) {
    if (abgebrochen) return;
    const sekunden = letzteZeit === null ? 0 : Math.min(0.1, (zeit - letzteZeit) / 1000);
    letzteZeit = zeit;
    const art = route.schritte[Math.min(Math.floor(fortschritt) + 1, letzterSchritt)].kind;
    fortschritt = Math.min(letzterSchritt, fortschritt + sekunden * BRIEFKOPF.zellenProSekunde[art]);
    zeichneBis(fortschritt);
    if (fortschritt < letzterSchritt) requestAnimationFrame(bild);
  }
  requestAnimationFrame(bild);
  return () => { abgebrochen = true; };
}
