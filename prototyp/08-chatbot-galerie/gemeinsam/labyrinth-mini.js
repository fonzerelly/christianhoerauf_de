// Kleines Labyrinth für die Galerie-Prototypen, die das Labyrinth nur andeuten
// (Hintergrund, Ladeanzeige, Zierrahmen). Mit der echten Labyrinth-Schrift aus
// prototyp/06 und dem Frontend hat das nichts zu tun – es ist ein einfaches
// Zufallslabyrinth nach dem Verfahren "Rekursives Zurückgehen" (recursive backtracker).

// Erzeugt ein Labyrinth mit spalten × zeilen Zellen. Jede Zelle merkt sich, welche ihrer
// vier Wände noch stehen: { oben, rechts, unten, links } (true = Wand steht).
// Zusätzlich wird der Rundgang zurückgegeben: alle Zellen in der Reihenfolge, in der der
// Erzeuger sie abläuft, einschließlich des Rückwegs aus Sackgassen. Je zwei aufeinander
// folgende Zellen sind Nachbarn, ein Lichtpunkt kann den Rundgang also ohne Sprung nachfahren.
function erzeugeLabyrinth(spalten, zeilen) {
  const zellen = [];
  for (let y = 0; y < zeilen; y++) {
    for (let x = 0; x < spalten; x++) {
      zellen.push({ x, y, oben: true, rechts: true, unten: true, links: true, besucht: false });
    }
  }
  const zelle = (x, y) => (x < 0 || y < 0 || x >= spalten || y >= zeilen ? null : zellen[y * spalten + x]);
  const rundgang = [];
  const stapel = [zelle(0, 0)];
  stapel[0].besucht = true;
  rundgang.push(stapel[0]);

  while (stapel.length > 0) {
    const aktuell = stapel[stapel.length - 1];
    const nachbarn = [
      [zelle(aktuell.x, aktuell.y - 1), "oben", "unten"],
      [zelle(aktuell.x + 1, aktuell.y), "rechts", "links"],
      [zelle(aktuell.x, aktuell.y + 1), "unten", "oben"],
      [zelle(aktuell.x - 1, aktuell.y), "links", "rechts"],
    ].filter(([n]) => n && !n.besucht);

    if (nachbarn.length === 0) {
      stapel.pop();
      if (stapel.length > 0) rundgang.push(stapel[stapel.length - 1]);
      continue;
    }
    const [naechste, wandHier, wandDort] = nachbarn[Math.floor(Math.random() * nachbarn.length)];
    aktuell[wandHier] = false;
    naechste[wandDort] = false;
    naechste.besucht = true;
    stapel.push(naechste);
    rundgang.push(naechste);
  }
  return { spalten, zeilen, zellen, rundgang };
}

// Zeichnet die stehenden Wände eines Labyrinths auf ein Canvas.
// groesse = Kantenlänge einer Zelle in Pixeln, versatz = linke obere Ecke.
function zeichneLabyrinth(ctx, labyrinth, groesse, farbe, linienbreite = 2, versatzX = 0, versatzY = 0) {
  ctx.strokeStyle = farbe;
  ctx.lineWidth = linienbreite;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const z of labyrinth.zellen) {
    const x = versatzX + z.x * groesse;
    const y = versatzY + z.y * groesse;
    if (z.oben) { ctx.moveTo(x, y); ctx.lineTo(x + groesse, y); }
    if (z.rechts) { ctx.moveTo(x + groesse, y); ctx.lineTo(x + groesse, y + groesse); }
    if (z.unten) { ctx.moveTo(x, y + groesse); ctx.lineTo(x + groesse, y + groesse); }
    if (z.links) { ctx.moveTo(x, y); ctx.lineTo(x, y + groesse); }
  }
  ctx.stroke();
}

if (typeof module !== "undefined") module.exports = { erzeugeLabyrinth, zeichneLabyrinth };
