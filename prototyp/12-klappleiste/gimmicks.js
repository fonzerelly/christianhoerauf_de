// Prototyp 12: die Gimmicks (Herz, Smiley, Foto) auf der flachen Bühne (Plan Schritt 12.13).
// Wird nach buehne.js geladen. Herz und Smiley kommen aus dem Code der echten App
// (bilder-der-app.js, erzeugt von baue-bilder-der-app.sh); Route, Seite und Foto sind hier aus
// frontend/src/domain/route/route-builder.ts und domain/pages/maze-page-generator.ts übertragen,
// mit den Bausteinen aus Prototyp 6.
//
// Anders als in der App:
//   - Ein Gimmick ist so groß, wie es auf die Bühne passt, statt zwei Drittel (Bild) bzw. zwei
//     Fünftel (Foto) der kürzeren Seite. Auf einer flachen Bühne ist die kürzere Seite immer die
//     Höhe, und mit diesen Anteilen bliebe kaum etwas übrig.
//   - Über und unter einem Gimmick bleibt 1 Reihe frei statt 2 wie beim Text. Der Lichtpunkt
//     kommt ohnehin von der Seite, auf Höhe der untersten Reihe.
//   - Passt ein Gimmick nicht, schreibt der Lichtpunkt das Stichwort (in der App: den Text).

const BILD_NAMEN = { herz: "heart", smiley: "face_with_hand_over_mouth" };
const RAND_REIHEN_UM_GIMMICK = 1;
const REIHEN_UNTER_BILD = 3; // wie ROWS_BELOW_PICTURE in der App: Anlauf von unten, Ablauf darunter
const FOTO_RUNDEN = 3;
const KLEINSTES_FOTO = 6;
// So viele Zellen breit ist ein Pixelblock des Fotos, solange der Lichtpunkt so viele Runden
// gelaufen ist (Index). Nach der letzten Runde ist es scharf. Wie CELLS_PER_BLOCK in der App.
const ZELLEN_JE_BLOCK = [2, 1, 0.5];
// Wird beim Bau der Einzeldatei durch das Bild selbst ersetzt (baue-einzeldatei.sh).
const FOTO_ADRESSE = "../../frontend/src/assets/chris.jpg";

const fotoVonChris = new Image();
fotoVonChris.src = FOTO_ADRESSE;
fotoVonChris.addEventListener("load", () => (scene.needsRedraw = true));

// ---------------------------------------------------------------------------
// Größe und Lage
// ---------------------------------------------------------------------------

// Wie viele Reihen ein Bild dieser Breite samt Anlauf und freien Reihen braucht.
function reihenFuerBild(bild) {
  return bild.height + REIHEN_UNTER_BILD + 2 * RAND_REIHEN_UM_GIMMICK;
}

// Das größte Bild, das auf die Bühne passt (ungerade Breite, damit es eine mittlere Spalte gibt),
// waagrecht mittig, senkrecht samt Anlauf mittig. Liefert null, wenn selbst die kleinste Größe
// aus der App nicht passt.
function platziereBild(name, cols, rows) {
  const kleinste = BILDER_DER_APP.SMALLEST_SIZE[name];
  let breite = cols - 2 * FREE_COLS_BESIDE_TEXT;
  if (breite % 2 === 0) breite--;
  for (; breite >= kleinste; breite -= 2) {
    const bild = BILDER_DER_APP.drawPicture(name, breite);
    if (reihenFuerBild(bild) <= rows) {
      const hoehe = bild.height + REIHEN_UNTER_BILD;
      return { bild, left: Math.floor((cols - bild.width) / 2), top: Math.floor((rows - hoehe) / 2) };
    }
  }
  return null;
}

// Das größte quadratische Foto, das samt Rahmen (1 Zelle) auf die Bühne passt. Die Spalte wird
// gewürfelt, senkrecht liegt es mittig. Liefert null, wenn es kleiner als KLEINSTES_FOTO würde.
function platziereFoto(cols, rows, random) {
  const randSpalten = FREE_COLS_BESIDE_TEXT + 1;
  const randReihen = RAND_REIHEN_UM_GIMMICK + 1;
  const groesse = Math.min(rows - 2 * randReihen, cols - 2 * randSpalten);
  if (groesse < KLEINSTES_FOTO) return null;
  const left = randomBetween(randSpalten, cols - randSpalten - groesse, random);
  return { left, top: Math.floor((rows - groesse) / 2), size: groesse };
}

// Wie viele Reihen ein Gimmick mindestens braucht (für ein eigenes Raster und den Hinweis).
function mindestReihen(gimmick) {
  if (gimmick === "foto") return KLEINSTES_FOTO + 2 * (RAND_REIHEN_UM_GIMMICK + 1);
  const name = BILD_NAMEN[gimmick];
  return reihenFuerBild(BILDER_DER_APP.drawPicture(name, BILDER_DER_APP.SMALLEST_SIZE[name]));
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

// Wie buildRoute in labyrinth.js, nur mit beliebiger Mitte: vom Eingang in Windungen zum Tor
// links des Blocks, dann `mitte`, die vom linken zum rechten Tor führen muss, dann in Windungen
// zum Ausgang. Wie assemble in der App.
function setzeRouteZusammen(block, cols, rows, entrance, exit, random, options, torLinks, torRechts, mitte) {
  const reviere = createTerritories(block, cols, entrance, exit);
  const anlauf = findWindingPath(cols, rows, reviere.isApproach, entrance.cell, torLinks, random, options.detour);
  const ablauf = findWindingPath(cols, rows, reviere.isLeave, torRechts, exit.cell, random, options.detour);

  const route = [];
  const verbinde = (zelle) => route.push({ x: zelle.x, y: zelle.y, kind: CONNECTOR });
  for (let abstand = STEPS_OUTSIDE; abstand >= 1; abstand--) verbinde(cellOutside(entrance.cell, entrance.side, abstand));
  anlauf.forEach(verbinde);
  mitte(route);
  ablauf.slice(1).forEach(verbinde); // das Tor selbst ist schon das Routenende
  for (let abstand = 1; abstand <= STEPS_OUTSIDE; abstand++) verbinde(cellOutside(exit.cell, exit.side, abstand));
  return route;
}

// Der Block eines Bilds: das Bild und darunter REIHEN_UNTER_BILD Reihen für An- und Ablauf.
function blockFuerBild({ bild, left, top }) {
  return { left, right: left + bild.width - 1, top, bottom: top + bild.height - 1 + REIHEN_UNTER_BILD };
}

// Wie buildPicture in der App: In der untersten Reihe des Blocks kommt der Lichtpunkt von links,
// steigt senkrecht zum Anfang des Bilds hinauf, zeichnet es, geht eine Reihe unter das Bild und
// darin nach rechts hinaus.
function routeFuerBild(platz, cols, rows, entrance, exit, random, options) {
  const { bild, left, top } = platz;
  const wegpunkte = bild.glyph.map(({ x, y, marker }) => [x, y, marker]); // Format von schrift.js
  const block = blockFuerBild(platz);
  const startSpalte = left + wegpunkte[0][0];
  const ablaufReihe = top + wegpunkte[0][1] + 1;
  const torLinks = { x: block.left - 2, y: block.bottom };
  const torRechts = { x: block.right + 2, y: ablaufReihe };
  return setzeRouteZusammen(block, cols, rows, entrance, exit, random, options, torLinks, torRechts, (route) => {
    walkTo(route, startSpalte, block.bottom, CONNECTOR);
    appendGlyph(route, wegpunkte, left, top); // der erste Wegpunkt: senkrecht hinauf
    walkTo(route, startSpalte, ablaufReihe, CONNECTOR);
    walkTo(route, torRechts.x, torRechts.y, CONNECTOR);
  });
}

// Der Rahmen um ein Foto: die Zellen direkt rundherum.
function rahmenUm({ left, top, size }) {
  return { left: left - 1, right: left + size, top: top - 1, bottom: top + size };
}

// Wie buildPhoto in der App: von links in der untersten Reihe des Rahmens heran, FOTO_RUNDEN-mal
// herum (hinauf, nach rechts, hinunter, zurück), dann unten nach rechts hinaus. Merkt am Foto,
// wo jede Runde endet (rundenEnden), damit es nach jeder Runde schärfer wird.
function routeFuerFoto(foto, cols, rows, entrance, exit, random, options) {
  const rahmen = rahmenUm(foto);
  const torLinks = { x: rahmen.left - 2, y: rahmen.bottom };
  const torRechts = { x: rahmen.right + 2, y: rahmen.bottom };
  foto.rundenEnden = [];
  return setzeRouteZusammen(rahmen, cols, rows, entrance, exit, random, options, torLinks, torRechts, (route) => {
    walkTo(route, rahmen.left, rahmen.bottom, CONNECTOR);
    for (let runde = 0; runde < FOTO_RUNDEN; runde++) {
      walkTo(route, rahmen.left, rahmen.top, LETTER);
      walkTo(route, rahmen.right, rahmen.top, LETTER);
      walkTo(route, rahmen.right, rahmen.bottom, LETTER);
      walkTo(route, rahmen.left, rahmen.bottom, LETTER);
      foto.rundenEnden.push(route.length - 1);
    }
    walkTo(route, torRechts.x, torRechts.y, CONNECTOR);
  });
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

// Öffnet alle Wände zwischen den Zellen unter dem Foto; die Wände nach außen bleiben. Da alle
// Zellen dann schon erschlossen sind, wächst kein Gang hinein.
function oeffneRaum(maze, { left, top, size }) {
  for (let y = top; y < top + size; y++) {
    for (let x = left; x < left + size; x++) {
      if (x + 1 < left + size) carvePassage(maze, { x, y }, { x: x + 1, y });
      if (y + 1 < top + size) carvePassage(maze, { x, y }, { x, y: y + 1 });
    }
  }
}

// Wie generatePage in labyrinth.js, nur mit Bild oder Foto statt Zeilen. Lange Wände werden nicht
// unterbrochen; das gilt nur den Grundlinien eines Texts.
function generiereGimmickSeite(plan, cols, rows, entrance, random, options) {
  const exit = pickExit(options.exitSide, entrance, cols, rows, random);
  const route = plan.foto
    ? routeFuerFoto(plan.foto, cols, rows, entrance, exit, random, options)
    : routeFuerBild(plan.bild, cols, rows, entrance, exit, random, options);

  const maze = createEmptyMaze(cols, rows);
  carveRoute(maze, route);
  if (plan.foto) oeffneRaum(maze, plan.foto);
  growMaze(maze, visitedCells(maze), random, options.windiness);
  return { maze, route, entrance, exit, lines: [], foto: plan.foto || null };
}

// ---------------------------------------------------------------------------
// Ein eigenes Raster für die Gimmick-Seite
// ---------------------------------------------------------------------------

// Das Raster der Bühne, wie layoutGrid es eingeteilt hat.
function rasterDerBuehne() {
  const { cellSize, offsetX, offsetY, cols, rows } = scene;
  return { cellSize, offsetX, offsetY, cols, rows };
}

// Kleiner zeichnet niemand ein Labyrinth: Darunter verschwimmen die Wände.
const KLEINSTE_ZELLE = 4;

// Ein feineres Raster auf derselben Fläche wie das der Bühne, mit mindestens `reihen` Reihen.
// Die Zellgröße ist auf ganze Geräte-Pixel abgerundet wie in cellSizeFor (seite.js), damit alle
// Wände gleich scharf werden. Das Labyrinth bleibt waagrecht und senkrecht mittig auf der Fläche.
// null, wenn die Zellen kleiner als KLEINSTE_ZELLE würden.
function feineresRaster(reihen) {
  const buehne = rasterDerBuehne();
  const breite = buehne.cols * buehne.cellSize;
  const hoehe = buehne.rows * buehne.cellSize;
  const pixelDichte = pixelRatioOf(currentSettings);
  const zelle = Math.floor((hoehe * pixelDichte) / reihen) / pixelDichte;
  if (zelle < KLEINSTE_ZELLE) return null;

  const cols = Math.floor(breite / zelle);
  const rows = Math.floor(hoehe / zelle);
  return {
    cellSize: zelle,
    offsetX: buehne.offsetX + Math.floor((breite - cols * zelle) / 2),
    offsetY: buehne.offsetY + Math.floor((hoehe - rows * zelle) / 2),
    cols,
    rows,
  };
}

// Ein Ausgang, umgerechnet in ein anderes Raster: dieselbe Stelle auf dem Bildschirm, nur in den
// Zellen des neuen Rasters. So läuft der Lichtpunkt beim Seitenwechsel auf derselben Höhe weiter.
function ausgangImRaster(ausgang, raster) {
  const von = ausgang.raster || rasterDerBuehne();
  if (von.cellSize === raster.cellSize && von.offsetX === raster.offsetX && von.offsetY === raster.offsetY) return ausgang;
  const umgerechnet = (zelle, versatzVon, versatzNach, anzahl) =>
    begrenze(Math.floor((versatzVon + (zelle + 0.5) * von.cellSize - versatzNach) / raster.cellSize), 0, anzahl - 1);
  return {
    side: ausgang.side,
    cell: {
      x: umgerechnet(ausgang.cell.x, von.offsetX, raster.offsetX, raster.cols),
      y: umgerechnet(ausgang.cell.y, von.offsetY, raster.offsetY, raster.rows),
    },
  };
}

// Was für das Gimmick der Antwort auf die Seite kommt: { bild } oder { foto } oder null, je nachdem,
// ob es in das Raster passt.
function planeGimmick(gimmick, raster, random) {
  if (gimmick === "foto") {
    const foto = platziereFoto(raster.cols, raster.rows, random);
    return foto && { foto };
  }
  const bild = platziereBild(BILD_NAMEN[gimmick], raster.cols, raster.rows);
  return bild && { bild };
}

// Plan und Raster für das Gimmick: im Raster der Bühne, wenn es dort passt, sonst in einem
// feineren mit genau so vielen Reihen, wie es mindestens braucht. null, wenn auch das nicht geht.
function planeGimmickMitRaster(gimmick, random) {
  const buehne = rasterDerBuehne();
  const plan = planeGimmick(gimmick, buehne, random);
  if (plan) return { plan, raster: buehne, eigenesRaster: false };

  const raster = feineresRaster(mindestReihen(gimmick));
  const feinerPlan = raster && planeGimmick(gimmick, raster, random);
  return feinerPlan ? { plan: feinerPlan, raster, eigenesRaster: true } : null;
}

// Die unterste Reihe des Gimmicks: Dort kommt der Lichtpunkt bei Laufrichtung „gerade“ herein.
function anlaufReiheVon(plan) {
  return plan.foto ? rahmenUm(plan.foto).bottom : blockFuerBild(plan.bild).bottom;
}

// showAnswer aus seite.js baut die Seiten gleich beim Anlegen der Antwort. Damit das Gimmick dann
// schon an der Antwort steht, merkt sich zeigeAntwortMitGimmick es für createAnswer vor.
let gimmickDerNaechstenAntwort = null;
const createAnswerOhneGimmick = createAnswer;
createAnswer = function (text, question) {
  const antwort = createAnswerOhneGimmick(text, question);
  antwort.gimmick = gimmickDerNaechstenAntwort;
  gimmickDerNaechstenAntwort = null;
  return antwort;
};

// Wie showAnswer, mit Gimmick ("herz" | "smiley" | "foto") oder ohne (null).
function zeigeAntwortMitGimmick(stichwort, frage, gimmick) {
  gimmickDerNaechstenAntwort = gimmick || null;
  showAnswer(stichwort, frage);
}

// Hat die Antwort ein Gimmick (answer.gimmick: "herz" | "smiley" | "foto"), gibt es genau eine
// Seite damit, nötigenfalls in einem feineren Raster. Sonst wie bisher (buehne.js): Der
// Lichtpunkt schreibt das Stichwort. Kam der Lichtpunkt von einer Seite mit eigenem Raster, wird
// deren Ausgang erst ins Raster der neuen Seite umgerechnet.
const buildAnswerPagesOhneGimmick = buildAnswerPages;
buildAnswerPages = function (answer, exitBefore, settings) {
  const ohneGimmick = () =>
    buildAnswerPagesOhneGimmick(answer, exitBefore && ausgangImRaster(exitBefore, rasterDerBuehne()), settings);
  if (!answer.gimmick) return ohneGimmick();
  if (answer.lauf === undefined) answer.lauf = 0;

  const random = createRandom(settings.seed + answer.number + answer.lauf * 7919);
  const geplant = planeGimmickMitRaster(answer.gimmick, random);
  zeigeGimmickHinweis(answer.gimmick, geplant);
  if (!geplant) return ohneGimmick();

  const { plan, raster } = geplant;
  const optionen = { ...settings, ...optionenDerLaufrichtung(settings) };
  const anlaufReihe = anlaufReiheVon(plan);
  const gerade = SCHALTER.laufrichtung === "gerade";
  seitenPlan = { lage: "mitte", randZeile: gerade ? anlaufReihe : null };
  let entrance;
  if (exitBefore) entrance = entranceOppositeOf(ausgangImRaster(exitBefore, raster), raster.cols, raster.rows);
  else if (gerade) entrance = { side: "left", cell: { x: 0, y: anlaufReihe } };
  else entrance = { side: "left", cell: { x: 0, y: randomBetween(1, raster.rows - 2, random) } };
  const seite = generiereGimmickSeite(plan, raster.cols, raster.rows, entrance, random, optionen);
  seitenPlan = null;

  if (geplant.eigenesRaster) {
    seite.raster = raster;
    seite.exit.raster = raster;
  }
  seite.answer = answer;
  seite.numberInAnswer = 1;
  answer.pageCount = 1;
  answer.seiten = [seite];
  return [seite];
};

// Schreibt ins Bedienfeld, ob das Gimmick passt, in welchem Raster, bzw. was fehlt.
function zeigeGimmickHinweis(gimmick, geplant) {
  const hinweis = document.getElementById("p12GimmickHinweis");
  const name = { herz: "Herz", smiley: "Smiley", foto: "Foto" }[gimmick];
  const pixel = (wert) => String(Math.round(wert * 10) / 10).replace(".", ",") + " px";
  if (!geplant) {
    hinweis.textContent =
      `${name} passt nicht: braucht ${mindestReihen(gimmick)} Reihen, dafür würden die Zellen kleiner als ` +
      `${KLEINSTE_ZELLE} px. Der Lichtpunkt schreibt stattdessen das Stichwort.`;
  } else if (geplant.eigenesRaster) {
    const { cols, rows, cellSize } = geplant.raster;
    hinweis.textContent =
      `${name}: passt nicht in die ${scene.rows} Reihen der Bühne, bekommt deshalb ein eigenes Raster: ` +
      `${cols} × ${rows} Zellen à ${pixel(cellSize)} statt ${pixel(scene.cellSize)}.`;
  } else {
    hinweis.textContent = `${name}: passt ins Raster der Bühne (${scene.cols} × ${scene.rows} Zellen).`;
  }
}


// ---------------------------------------------------------------------------
// Foto zeichnen
// ---------------------------------------------------------------------------

// Das Foto, auf so viele Pixel verkleinert, wie es Blöcke hat; je Stufe nur einmal gezeichnet.
const verkleinerteFotos = new Map();
function verkleinertesFoto(bloecke) {
  if (!verkleinerteFotos.has(bloecke)) {
    const flaeche = document.createElement("canvas");
    flaeche.width = bloecke;
    flaeche.height = bloecke;
    const zeichner = flaeche.getContext("2d");
    zeichner.imageSmoothingQuality = "high";
    zeichner.drawImage(fotoVonChris, 0, 0, bloecke, bloecke);
    verkleinerteFotos.set(bloecke, flaeche);
  }
  return verkleinerteFotos.get(bloecke);
}

// Wie PhotoPainter in der App: das Foto in das Feld im Rahmen, vor der ersten Runde grob
// verpixelt, nach jeder Runde feiner, nach der letzten scharf. Verpixelt wird, indem das
// verkleinerte Foto ohne Glätten auf die volle Größe gezogen wird.
function zeichneFoto(seite, settings) {
  const foto = seite.foto;
  if (!fotoVonChris.complete || fotoVonChris.naturalWidth === 0) return;

  // Um die halbe Wandbreite eingerückt, damit der Rahmen ganz zu sehen bleibt.
  const einzug = settings.wallWidth / 2;
  const x = scene.offsetX + foto.left * scene.cellSize + einzug;
  const y = scene.offsetY + foto.top * scene.cellSize + einzug;
  const groesse = foto.size * scene.cellSize - 2 * einzug;

  const fortschritt = seite === currentPage() ? scene.progress : 0;
  const rundenFertig = foto.rundenEnden.filter((ende) => fortschritt >= ende).length;
  const zellenJeBlock = ZELLEN_JE_BLOCK[rundenFertig];
  if (zellenJeBlock === undefined) {
    ctx.drawImage(fotoVonChris, x, y, groesse, groesse);
    return;
  }
  const bloecke = Math.max(1, Math.round(foto.size / zellenJeBlock));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(verkleinertesFoto(bloecke), 0, 0, bloecke, bloecke, x, y, groesse, groesse);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Seiten mit eigenem Raster zeichnen
// ---------------------------------------------------------------------------

// Die Einstellungen für ein feineres Raster: Wände, Spur und Leuchten im selben Verhältnis
// dünner wie die Zellen kleiner. Je Einstellungen und Faktor nur einmal angelegt, weil das in
// jedem Bild gebraucht wird (und buehne.js seine Fassungen an diesem Objekt festmacht).
const verkleinerteEinstellungen = { fuer: null, faktor: null, wert: null };
function einstellungenFuerRaster(settings, raster) {
  const faktor = raster.cellSize / scene.cellSize;
  if (faktor === 1) return settings;
  if (verkleinerteEinstellungen.fuer !== settings || verkleinerteEinstellungen.faktor !== faktor) {
    verkleinerteEinstellungen.fuer = settings;
    verkleinerteEinstellungen.faktor = faktor;
    verkleinerteEinstellungen.wert = {
      ...settings,
      wallWidth: settings.wallWidth * faktor,
      trailWidth: settings.trailWidth * faktor,
      glow: settings.glow * faktor,
      bloomRadius: settings.bloomRadius * faktor,
    };
  }
  return verkleinerteEinstellungen.wert;
}

// Führt `zeichne` im Raster der Seite aus: seite.js rechnet überall mit scene.cellSize,
// scene.offsetX und scene.offsetY. Für eine Seite mit eigenem Raster stehen dort so lange deren
// Werte; danach wieder die der Bühne.
function imRasterDer(seite, settings, zeichne) {
  if (!seite || !seite.raster) return zeichne(settings);
  const buehne = rasterDerBuehne();
  const eigene = einstellungenFuerRaster(settings, seite.raster);
  Object.assign(scene, { cellSize: seite.raster.cellSize, offsetX: seite.raster.offsetX, offsetY: seite.raster.offsetY });
  try {
    return zeichne(eigene);
  } finally {
    Object.assign(scene, { cellSize: buehne.cellSize, offsetX: buehne.offsetX, offsetY: buehne.offsetY });
  }
}

// Wie drawPage in seite.js, im Raster der Seite. Auf einer Seite mit Foto liegt das Foto über
// den Wänden und unter der Spur.
const drawPageUrspruenglich = drawPage;
drawPage = function (page, shift, settings) {
  imRasterDer(page, settings, (eigene) => {
    if (!page.foto) return drawPageUrspruenglich(page, shift, eigene);
    ctx.save();
    ctx.translate(shift.x, shift.y);
    drawWalls(page, eigene);
    zeichneFoto(page, eigene);
    if (page === currentPage()) drawTrailAndDot(eigene);
    ctx.restore();
  });
};

// Das Wandbild der nächsten Seite vorab, in deren Raster (sonst wäre es beim ersten Bild falsch
// und müsste neu gezeichnet werden).
const prepareNextWallImageUrspruenglich = prepareNextWallImage;
prepareNextWallImage = function (settings) {
  if (!hasNextPage()) return;
  const naechste = scene.pages[scene.pageIndex + 1];
  imRasterDer(naechste, settings, (eigene) => prepareNextWallImageUrspruenglich(eigene));
};

// Wie weit beim Seitenwechsel geschoben wird, ergibt sich aus der Breite der aktuellen Seite in
// ihrem Raster.
const scrollShiftsUrspruenglich = scrollShifts;
scrollShifts = function (settings) {
  return imRasterDer(currentPage(), settings, (eigene) => scrollShiftsUrspruenglich(eigene));
};

// Das Tempo zählt in Zellen je Sekunde. In feineren Zellen läuft der Lichtpunkt entsprechend mehr
// davon, damit er auf dem Bildschirm so schnell bleibt wie sonst.
const paceOfImRasterDerBuehne = paceOf;
paceOf = function (kind, page, settings) {
  const faktor = page.raster ? page.raster.cellSize / scene.cellSize : 1;
  return paceOfImRasterDerBuehne(kind, page, settings) / faktor;
};
