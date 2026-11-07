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

// Wie viele Reihen ein Gimmick mindestens braucht (für den Hinweis im Bedienfeld).
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

// Was für das Gimmick der Antwort auf die Bühne kommt: { bild } oder { foto } oder null.
function planeGimmick(gimmick, random) {
  if (gimmick === "foto") {
    const foto = platziereFoto(scene.cols, scene.rows, random);
    return foto && { foto };
  }
  const bild = platziereBild(BILD_NAMEN[gimmick], scene.cols, scene.rows);
  return bild && { bild };
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

// Hat die Antwort ein Gimmick (answer.gimmick: "herz" | "smiley" | "foto") und passt es, gibt es
// genau eine Seite damit. Sonst wie bisher (buehne.js): Der Lichtpunkt schreibt das Stichwort.
const buildAnswerPagesOhneGimmick = buildAnswerPages;
buildAnswerPages = function (answer, exitBefore, settings) {
  if (!answer.gimmick) return buildAnswerPagesOhneGimmick(answer, exitBefore, settings);
  if (answer.lauf === undefined) answer.lauf = 0;

  const random = createRandom(settings.seed + answer.number + answer.lauf * 7919);
  const plan = planeGimmick(answer.gimmick, random);
  zeigeGimmickHinweis(answer.gimmick, plan !== null);
  if (!plan) return buildAnswerPagesOhneGimmick(answer, exitBefore, settings);

  const optionen = { ...settings, ...optionenDerLaufrichtung(settings) };
  const anlaufReihe = anlaufReiheVon(plan);
  const gerade = SCHALTER.laufrichtung === "gerade";
  seitenPlan = { lage: "mitte", randZeile: gerade ? anlaufReihe : null };
  let entrance;
  if (exitBefore) entrance = entranceOppositeOf(exitBefore, scene.cols, scene.rows);
  else if (gerade) entrance = { side: "left", cell: { x: 0, y: anlaufReihe } };
  else entrance = ersterEingang(null, random); // die anderen Laufrichtungen brauchen den Block nicht
  const seite = generiereGimmickSeite(plan, scene.cols, scene.rows, entrance, random, optionen);
  seitenPlan = null;

  seite.answer = answer;
  seite.numberInAnswer = 1;
  answer.pageCount = 1;
  answer.seiten = [seite];
  return [seite];
};

// Schreibt ins Bedienfeld, ob das Gimmick passt und wie viele Reihen es braucht.
function zeigeGimmickHinweis(gimmick, passt) {
  const hinweis = document.getElementById("p12GimmickHinweis");
  const name = { herz: "Herz", smiley: "Smiley", foto: "Foto" }[gimmick];
  hinweis.textContent = passt
    ? `${name}: passt (Bühne ${scene.cols} × ${scene.rows} Zellen).`
    : `${name} passt nicht: braucht mindestens ${mindestReihen(gimmick)} Reihen, die Bühne hat ${scene.rows}. ` +
      "Der Lichtpunkt schreibt stattdessen das Stichwort.";
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

// Wie drawPage in seite.js, nur liegt auf einer Seite mit Foto das Foto über den Wänden und
// unter der Spur.
const drawPageOhneFoto = drawPage;
drawPage = function (page, shift, settings) {
  if (!page.foto) return drawPageOhneFoto(page, shift, settings);
  ctx.save();
  ctx.translate(shift.x, shift.y);
  drawWalls(page, settings);
  zeichneFoto(page, settings);
  if (page === currentPage()) drawTrailAndDot(settings);
  ctx.restore();
};
