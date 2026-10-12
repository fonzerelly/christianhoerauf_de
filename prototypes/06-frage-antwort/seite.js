// Die Seite: nimmt Fragen entgegen, erzeugt zu jeder Antwort die Labyrinth-Seiten
// und zeichnet die Animation.

const stage = document.getElementById("stage");
const canvas = document.getElementById("maze");
const ctx = canvas.getContext("2d");

// Die Abschnitte der Animation. Sie wiederholen sich für jede Labyrinth-Seite.
const WRITING = "writing"; // der Lichtpunkt läuft und schreibt
const FADING = "fading"; // der Lichtpunkt ist draußen, die Spur verglimmt noch
const SCROLLING = "scrolling"; // das Bild schiebt weiter zur nächsten Seite
const FINISHED = "finished"; // Antwort fertig geschrieben und verglommen: warten auf die nächste Frage

// Kleiner darf das Raster nicht werden: so viel braucht ein einzelnes Zeichen samt freien Rändern.
const MIN_COLS = 10;
const MIN_ROWS = 10;

// So lange muss die Fenstergröße ruhig bleiben, bevor auf eine Änderung reagiert wird.
// Beim Aus- und Einfahren der Bildschirmtastatur ändert sie sich oft mehrmals hintereinander.
const RESIZE_SETTLE_MILLIS = 300;

// Verhindert einen Riesensprung der Animation, wenn der Tab im Hintergrund war.
const LONGEST_PAUSE_SECONDS = 0.1;

// Alles, was sich zwischen zwei Bildern merken muss.
const scene = {
  answer: null, // die zuletzt verlangte Antwort: { text, question, number, pageCount }
  answerCount: 0, // wie viele Antworten schon verlangt wurden (jede bekommt ein anderes Labyrinth)
  pages: [], // die Seiten ab der aktuellen: { maze, route, entrance, exit, lines, answer, numberInAnswer }
  pageIndex: 0, // die Seite, auf der der Lichtpunkt gerade unterwegs ist
  phase: WRITING,
  phaseStartedAt: 0, // Stand der Uhr, als der aktuelle Abschnitt begann
  viewWidth: 0, // Größe der Bühne in Pixeln, für die das Labyrinth gebaut wurde
  viewHeight: 0,
  cols: 0, // Größe des Rasters; gilt für alle Seiten, bis sich die Bühne ändert
  rows: 0,
  cellSize: 24,
  offsetX: 0, // Abstand des Labyrinths vom linken Canvas-Rand (zum Zentrieren)
  offsetY: 0,
  progress: 0, // wie viele Routen-Schritte der Lichtpunkt auf dieser Seite schon gelaufen ist (mit Nachkommastellen)
  clock: 0, // Sekunden, die die Animation insgesamt schon läuft
  walkedAt: [], // walkedAt[schritt]: Stand der Uhr, als dieser Schritt fertig gelaufen war
  wallImages: new Map(), // Seite -> { image, padding, look }: vorab gezeichnete Wände
  screenOverlay: null, // { image, look }: vorab gezeichnetes Zeilenraster samt dunklen Ecken
  glitch: null, // die gerade laufende Bildstörung (siehe startGlitch) oder null
  lastFrameTime: null,
  needsRedraw: true,
};

// Die Reglerwerte, mit denen gerade gearbeitet wird. Sie werden nur neu gelesen, wenn ein
// Regler bewegt wurde - in jedem Bild über dreißig Eingabefelder abzufragen wäre am Handy
// unnötige Arbeit.
let currentSettings = null;

// Regler, die neue Labyrinthe verlangen. Alle anderen ändern nur das Aussehen.
const REGENERATING_CONTROLS = [
  "seed", "cellColumns", "cellSize", "windiness", "detour", "entranceSide", "exitSide",
  "maxLinesPerPage", "returnBandRows", "returnWindiness", "maxWallRun", "maxPixelRatio",
];

// Die Helligkeit der Spur wird in so viele Stufen eingeteilt. Wegstücke gleicher
// Stufe werden in einem Rutsch gezeichnet - jedes Stück einzeln wäre zu langsam.
const BRIGHTNESS_LEVELS = 16;

// ---------------------------------------------------------------------------
// Bühne und Raster
// ---------------------------------------------------------------------------

// Mit wie vielen Geräte-Pixeln pro Pixel gezeichnet wird. Handys haben oft 3; der Regler
// "Höchste Pixeldichte" deckelt das, weil jedes Bild sonst neunmal so viele Pixel hat.
function pixelRatioOf(settings) {
  return Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio);
}

// Legt die Größe des Canvas fest: so groß wie die Bühne in diesem Augenblick.
//
// Die Größe wird als feste Pixelzahl eingetragen und folgt der Bühne danach NICHT mehr von
// selbst. Geht am Handy die Bildschirmtastatur auf, schrumpft zwar die Bühne, das Bild
// bleibt aber unverzerrt stehen und wird nur unten abgeschnitten.
function fitCanvasToStage(settings) {
  const pixelRatio = pixelRatioOf(settings);
  scene.viewWidth = stage.clientWidth;
  scene.viewHeight = stage.clientHeight;

  canvas.style.width = scene.viewWidth + "px";
  canvas.style.height = scene.viewHeight + "px";
  canvas.width = Math.round(scene.viewWidth * pixelRatio);
  canvas.height = Math.round(scene.viewHeight * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

// Die Zellgröße in Pixeln. Bei fester Spaltenzahl ergibt sie sich aus der Breite der Bühne -
// abgerundet auf ganze Geräte-Pixel, damit alle Wände gleich scharf werden.
function cellSizeFor(settings) {
  if (settings.cellColumns === 0) return settings.cellSize;
  const pixelRatio = pixelRatioOf(settings);
  return Math.floor((scene.viewWidth * pixelRatio) / settings.cellColumns) / pixelRatio;
}

// Teilt die Bühne in das Raster ein: Zellgröße, Spalten, Zeilen und der Rand zum Zentrieren.
function layoutGrid(settings) {
  scene.cellSize = cellSizeFor(settings);
  const fittingCols = settings.cellColumns || Math.floor(scene.viewWidth / scene.cellSize);
  const fittingRows = Math.floor(scene.viewHeight / scene.cellSize);
  scene.cols = Math.max(MIN_COLS, fittingCols);
  scene.rows = Math.max(MIN_ROWS, fittingRows);
  // Auf ganze Pixel gerundet, damit das vorab gezeichnete Wandbild scharf bleibt
  scene.offsetX = Math.floor((scene.viewWidth - scene.cols * scene.cellSize) / 2);
  scene.offsetY = Math.floor((scene.viewHeight - scene.rows * scene.cellSize) / 2);
}

// ---------------------------------------------------------------------------
// Frage und Antwort
// ---------------------------------------------------------------------------

// Legt eine neue Antwort an. Die laufende Nummer sorgt dafür, dass jede Antwort
// ein anderes Labyrinth bekommt, auch wenn der Text derselbe ist.
function createAnswer(text, question) {
  const answer = { text, question, number: scene.answerCount, pageCount: 0 };
  scene.answerCount++;
  return answer;
}

// Erzeugt die Labyrinth-Seiten einer Antwort und merkt an jeder Seite, zu welcher
// Antwort sie gehört. exitBefore: der Ausgang, durch den der Lichtpunkt das vorige
// Labyrinth verlassen hat (fehlt beim allerersten Labyrinth).
function buildAnswerPages(answer, exitBefore, settings) {
  const seed = settings.seed + answer.number;
  const pages = generateMessagePages(answer.text, scene.cols, scene.rows, seed, settings, exitBefore);

  answer.pageCount = pages.length;
  pages.forEach((page, index) => {
    page.answer = answer;
    page.numberInAnswer = index + 1;
  });
  return pages;
}

// Gehört die Seite zu einer Antwort, die inzwischen von einer neueren Frage überholt wurde?
function isSuperseded(page) {
  return page.answer !== scene.answer;
}

// Nimmt eine neue Antwort in die Animation auf.
//
// Der Lichtpunkt hat das aktuelle Labyrinth an einem Rand verlassen (oder tut es gleich).
// Die Seiten der neuen Antwort werden so erzeugt, dass ihr Eingang diesem Ausgang gegenüber
// liegt, und hinten angehängt. Den Rest erledigt der gewohnte Seitenwechsel: das Bild
// schiebt in die Richtung weiter, in die der Punkt verschwunden ist.
//
// Kommt die Frage, während noch geschrieben wird, gilt:
//   - Seiten der alten Antwort, die noch gar nicht zu sehen sind, entfallen.
//   - Die sichtbare Seite läuft der Punkt im Schnelldurchlauf zu Ende (siehe paceOf),
//     dann wird ohne Warten weitergeschoben.
//   - Rollt gerade schon die nächste alte Seite herein, wird auch sie noch durcheilt -
//     sonst müsste das Bild mitten im Schieben springen.
function showAnswer(text, question) {
  const settings = currentSettings;
  const lastVisiblePage = scene.phase === SCROLLING ? scene.pageIndex + 1 : scene.pageIndex;
  const pagesToKeep = scene.pages.slice(scene.pageIndex, lastVisiblePage + 1);
  const exitBefore = pagesToKeep[pagesToKeep.length - 1].exit;

  scene.answer = createAnswer(text, question);
  scene.pages = pagesToKeep.concat(buildAnswerPages(scene.answer, exitBefore, settings));
  scene.pageIndex = 0;

  if (scene.phase === FINISHED) enterPhase(SCROLLING);
  prepareNextWallImage(settings);
  resetFrameMeter();
  speakAnswer(scene.answer);
  showPageStatus();
  showStatus(settings);
}

// Der Knopf "Nochmal" neben dem Fragefeld: schreibt das zuletzt Geschriebene noch einmal -
// die Begrüßung, solange noch keine Frage gestellt wurde, danach die letzte Antwort.
//
// Der Text wird dabei wie eine neue Antwort behandelt: Das Bild schiebt weiter zu einem
// frischen Labyrinth, in dem er von vorn geschrieben wird. Wird noch geschrieben, läuft der
// Punkt den Rest erst im Schnelldurchlauf hinaus (siehe showAnswer). So gibt es nie einen
// harten Schnitt im Bild - anders als bei "Antwort nochmal abspielen" in der Regler-Leiste,
// das dasselbe Labyrinth sofort neu aufbaut.
function replayLastAnswer() {
  showAnswer(scene.answer.text, scene.answer.question);
}

// Das Fragefeld wurde abgeschickt (Enter oder Senden-Knopf).
function onQuestionSubmitted(event) {
  event.preventDefault(); // sonst lädt der Browser die Seite neu
  const field = document.getElementById("question");
  const question = field.value.trim();
  if (question === "") return;

  showAnswer(findAnswer(question, CONFIG), question);
  field.value = "";
  if (currentSettings.blurInputAfterSending) field.blur();
}

// Legt die Antwort als unsichtbaren Text ab, den ein Screenreader vorliest - das Canvas
// selbst ist für ihn leer. Der Text steht dort so, wie er in der Config steht, nur ohne
// Trennstellen-Zeichen.
function speakAnswer(answer) {
  document.getElementById("spokenAnswer").textContent = withoutBreakMarks(answer.text);
}

// Der Text einer Antwort, wie die Schrift ihn schreibt, in einer Zeile:
// Großbuchstaben, ohne unbekannte Zeichen und ohne Trennstellen-Zeichen.
function writtenTextOf(answer) {
  return withoutBreakMarks(normalizeText(answer.text));
}

// Zeigt die Antwort als normalen Text unter dem Labyrinth - aber nur, wenn der Schalter
// dafür an ist und die Animation fertig ist. Sonst ist der Text versteckt.
function showAnswerTextIfWanted(settings) {
  const answerText = document.getElementById("answerText");
  const isWanted = settings.showAnswerAsText && scene.phase === FINISHED;
  answerText.hidden = !isWanted;
  if (isWanted) answerText.textContent = writtenTextOf(scene.answer);
}

// ---------------------------------------------------------------------------
// Ablauf der Animation
// ---------------------------------------------------------------------------

function currentPage() {
  return scene.pages[scene.pageIndex];
}

function hasNextPage() {
  return scene.pageIndex < scene.pages.length - 1;
}

// Beginnt einen neuen Abschnitt der Animation und merkt sich, wann.
function enterPhase(phase) {
  scene.phase = phase;
  scene.phaseStartedAt = scene.clock;
  scene.needsRedraw = true;
  showAnswerTextIfWanted(currentSettings);
}

// Setzt den Lichtpunkt an den Anfang der angegebenen Seite und vergisst die Spur.
function startPage(pageIndex) {
  scene.pageIndex = pageIndex;
  scene.progress = 0;
  scene.walkedAt = [];
  enterPhase(WRITING);
  forgetUnneededWallImages();
  showPageStatus();
}

// Baut die aktuelle Antwort von vorn auf: misst die Bühne, teilt das Raster ein, erzeugt
// die Seiten neu und startet die Animation bei Seite 1. Nötig beim Laden, bei "nochmal
// abspielen", wenn sich die Bühne ändert und wenn ein Regler ein anderes Labyrinth verlangt.
function regenerate() {
  const settings = currentSettings;
  fitCanvasToStage(settings);
  layoutGrid(settings);

  scene.pages = buildAnswerPages(scene.answer, undefined, settings);
  scene.wallImages.clear();
  startPage(0);
  showStatus(settings);
}

// Wie viele Zellen pro Sekunde der Lichtpunkt auf einem Wegstück dieser Art läuft:
// in Buchstaben das eingestellte Tempo, überall sonst ein Vielfaches davon.
// Auf Seiten einer überholten Antwort kommt der Schnelldurchlauf dazu.
function paceOf(kind, page, settings) {
  const normalPace = kind === LETTER ? settings.speed : settings.speed * settings.connectorSpeedFactor;
  return isSuperseded(page) ? normalPace * settings.rushFactor : normalPace;
}

// Wie lange der Lichtpunkt für alle noch anstehenden Seiten zusammen unterwegs ist
// (ohne Verglimmen und Weiterschieben).
function walkingSecondsOfAllPages(settings) {
  let seconds = 0;
  for (const page of scene.pages) {
    for (let step = 1; step < page.route.length; step++) {
      seconds += 1 / paceOf(page.route[step].kind, page, settings);
    }
  }
  return seconds;
}

// Schreibt "Seite x von y" in die Regler-Leiste, bezogen auf die Antwort, zu der die Seite gehört.
function showPageStatus() {
  const page = currentPage();
  const rushNote = isSuperseded(page) ? " (alte Antwort im Schnelldurchlauf)" : "";
  document.getElementById("pageStatus").textContent =
    `Seite ${page.numberInAnswer} von ${page.answer.pageCount}${rushNote}`;
}

// Schreibt in die Regler-Leiste, welche Frage zu welcher Antwort geführt hat und wie
// das Raster gerade aussieht.
function showStatus(settings) {
  const { answer } = scene;
  const asked = answer.question ? `Frage „${answer.question}“ → ` : "Begrüßung: ";
  document.getElementById("exchange").textContent = `${asked}„${writtenTextOf(answer)}“`;

  const capacity = textCapacity(scene.cols, scene.rows, settings.maxLinesPerPage, settings.returnBandRows);
  const cellSize = Math.round(scene.cellSize * 10) / 10;
  document.getElementById("status").textContent =
    `${scene.cols} × ${scene.rows} Zellen zu ${cellSize} px · ` +
    `je Seite ${capacity.linesPerPage} Zeilen zu ${capacity.charsPerLine} Zeichen · ` +
    `ca. ${Math.round(walkingSecondsOfAllPages(settings))} s reine Laufzeit`;
}

// Mittelpunkt einer Zelle in Canvas-Koordinaten. Funktioniert auch für
// "krumme" Zellen wie x = 3.4 (Punkt auf dem Weg zwischen zwei Zellen).
function centerOf(cell) {
  return {
    x: scene.offsetX + (cell.x + 0.5) * scene.cellSize,
    y: scene.offsetY + (cell.y + 0.5) * scene.cellSize,
  };
}

// Wo auf der Route der aktuellen Seite man nach `progress` Schritten steht.
function positionAt(progress) {
  const route = currentPage().route;
  const stepsDone = Math.min(Math.floor(progress), route.length - 1);
  const from = route[stepsDone];
  const to = route[Math.min(stepsDone + 1, route.length - 1)];
  const partOfStep = progress - stepsDone;
  return {
    x: from.x + (to.x - from.x) * partOfStep,
    y: from.y + (to.y - from.y) * partOfStep,
  };
}

// Bewegt den Lichtpunkt um `steps` Schritte weiter und merkt sich für jeden
// dabei fertig gelaufenen Schritt die Uhrzeit (daraus ergibt sich das Verglimmen).
// Wird nur für "Diese Seite überspringen" gebraucht; im Normalbetrieb läuft walkFor.
function advanceDot(steps) {
  const lastStep = currentPage().route.length - 1;
  const stepsDoneBefore = Math.floor(scene.progress);
  scene.progress = Math.min(lastStep, scene.progress + steps);
  rememberWalkedSteps(stepsDoneBefore);
}

// Merkt sich für alle Schritte, die seit `stepsDoneBefore` fertig gelaufen wurden, die Uhrzeit.
function rememberWalkedSteps(stepsDoneBefore) {
  for (let step = stepsDoneBefore + 1; step <= Math.floor(scene.progress); step++) {
    scene.walkedAt[step] = scene.clock;
  }
}

// Lässt den Lichtpunkt `seconds` lang laufen. Weil er auf Verbindungswegen schneller ist
// als in Buchstaben, wird Schritt für Schritt abgerechnet: jeder Schritt verbraucht so
// viel von der Zeit, wie er bei seinem Tempo dauert.
function walkFor(seconds, settings) {
  const page = currentPage();
  const lastStep = page.route.length - 1;
  const stepsDoneBefore = Math.floor(scene.progress);
  let secondsLeft = seconds;

  while (secondsLeft > 0 && scene.progress < lastStep) {
    const nextStep = Math.floor(scene.progress) + 1;
    const pace = paceOf(page.route[nextStep].kind, page, settings);
    const secondsToFinishStep = (nextStep - scene.progress) / pace;

    if (secondsLeft >= secondsToFinishStep) {
      scene.progress = nextStep;
      secondsLeft -= secondsToFinishStep;
    } else {
      scene.progress += secondsLeft * pace;
      secondsLeft = 0;
    }
  }
  rememberWalkedSteps(stepsDoneBefore);
}

// Wie viele Sekunden ein Wegstück nach dem Laufen noch zu sehen ist:
// erst volle Helligkeit, dann Ausblenden.
function trailLifetime(settings) {
  return settings.holdSeconds + settings.fadeSeconds;
}

// Stellt die Uhr um `seconds` weiter und führt die Animation fort:
//   Schreiben -> (Punkt ist draußen) Verglimmen -> Weiterschieben -> nächste Seite schreiben ...
// Nach der letzten Seite wird gewartet, bis showAnswer neue Seiten anhängt.
function stepAnimation(seconds, settings) {
  scene.clock += seconds;
  const secondsInPhase = scene.clock - scene.phaseStartedAt;

  if (scene.phase === WRITING) {
    walkFor(seconds, settings);
    const hasLeftThePage = scene.progress >= currentPage().route.length - 1;
    if (hasLeftThePage) {
      enterPhase(FADING);
      prepareNextWallImage(settings);
    }
  } else if (scene.phase === FADING) {
    // Eine überholte Antwort wartet das Verglimmen nicht ab: ihre Spur verglimmt beim Weiterschieben.
    const trailIsGone = secondsInPhase >= trailLifetime(settings) || isSuperseded(currentPage());
    if (trailIsGone) enterPhase(hasNextPage() ? SCROLLING : FINISHED);
  } else if (scene.phase === SCROLLING) {
    const hasArrived = secondsInPhase >= settings.scrollSeconds;
    if (hasArrived) startPage(scene.pageIndex + 1);
  }
}

// Sanftes Anfahren und Abbremsen: bildet 0..1 auf 0..1 ab.
function easeInOut(part) {
  return part * part * (3 - 2 * part);
}

// Um wie viele Pixel die Seiten gerade verschoben sind.
//
// Das Bild schiebt in die Richtung weiter, in die der Lichtpunkt verschwunden ist:
// die alte Seite (outgoing) wandert entgegengesetzt hinaus, die neue (incoming) rückt
// von dort herein, wohin der Punkt gegangen ist. Beide liegen genau eine Labyrinth-Breite
// bzw. -Höhe auseinander - so treffen Ausgang und Eingang nahtlos aufeinander.
function scrollShifts(settings) {
  const page = currentPage();
  const direction = OUTWARD[page.exit.side];
  const distanceX = direction.x * page.maze.cols * scene.cellSize;
  const distanceY = direction.y * page.maze.rows * scene.cellSize;

  let part = 0;
  if (scene.phase === SCROLLING) {
    const secondsInPhase = scene.clock - scene.phaseStartedAt;
    part = settings.scrollSeconds > 0 ? easeInOut(Math.min(1, secondsInPhase / settings.scrollSeconds)) : 1;
  }

  // Auf ganze Pixel gerundet, damit die Wände beim Schieben nicht flimmern
  const outgoing = { x: Math.round(-distanceX * part), y: Math.round(-distanceY * part) };
  const incoming = { x: outgoing.x + distanceX, y: outgoing.y + distanceY };
  return { outgoing, incoming };
}

// ---------------------------------------------------------------------------
// Wände
// ---------------------------------------------------------------------------

// Legt alle Wände einer Seite als Linien in den Pfad von `context`
// (Ursprung = linke obere Ecke des Labyrinths), mit Lücken an Eingang und Ausgang.
function traceWalls(context, page) {
  const { maze } = page;
  const { cellSize } = scene;

  const isOpening = (x, y, side) =>
    [page.entrance, page.exit].some(
      (opening) => opening.side === side && opening.cell.x === x && opening.cell.y === y
    );
  const wall = (x1, y1, x2, y2) => {
    context.moveTo(x1 * cellSize, y1 * cellSize);
    context.lineTo(x2 * cellSize, y2 * cellSize);
  };

  context.beginPath();
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const isLastCol = x === maze.cols - 1;
      const isLastRow = y === maze.rows - 1;
      const hasRightWall = isLastCol ? !isOpening(x, y, "right") : !maze.openRight[y][x];
      const hasBottomWall = isLastRow ? !isOpening(x, y, "bottom") : !maze.openDown[y][x];

      if (hasRightWall) wall(x + 1, y, x + 1, y + 1);
      if (hasBottomWall) wall(x, y + 1, x + 1, y + 1);
      if (x === 0 && !isOpening(x, y, "left")) wall(0, y, 0, y + 1);
      if (y === 0 && !isOpening(x, y, "top")) wall(x, 0, x + 1, 0);
    }
  }
}

// Alles, was das Aussehen der Wände bestimmt, als ein Text. Ändert sich dieser Text,
// muss das Wandbild neu gezeichnet werden.
function wallLookOf(settings) {
  return [
    settings.wallWidth, settings.wallColor, settings.bloomRadius, settings.bloomStrength,
    scene.cellSize, pixelRatioOf(settings),
  ].join("|");
}

// Zeichnet die Wände einer Seite als leuchtende Linien auf ein eigenes, unsichtbares Canvas.
//
// Nachgeahmt wird ein alter Röhrenmonitor: Wo der Elektronenstrahl den Leuchtschirm trifft,
// leuchtet nicht nur der getroffene Punkt, sondern auch seine Umgebung schwach mit
// ("Überstrahlen"). Die Wände entstehen deshalb in drei Schichten, von unten nach oben:
//   1. ein weicher Lichthof um jede Linie          -> das Überstrahlen
//   2. die Linie selbst in der Wandfarbe
//   3. ein schmaler, fast weißer Kern in der Mitte -> die Linie wirkt überhell
//
// Warum der Umweg über ein eigenes Canvas: Der Lichthof über tausende Wandstücke ist die
// mit Abstand teuerste Zeichenoperation. Sie passiert so nur einmal pro Seite (und wenn
// ein Wand-Regler bewegt wird) statt 60-mal pro Sekunde.
//
// Das Bild ist ringsum um `padding` größer als das Labyrinth, damit der Lichthof der
// Außenwand nicht abgeschnitten wird.
function renderWallImage(page, settings) {
  const pixelRatio = pixelRatioOf(settings);
  const padding = Math.ceil(settings.wallWidth + 2 * settings.bloomRadius);

  const image = document.createElement("canvas");
  image.width = Math.ceil((page.maze.cols * scene.cellSize + 2 * padding) * pixelRatio);
  image.height = Math.ceil((page.maze.rows * scene.cellSize + 2 * padding) * pixelRatio);
  const context = image.getContext("2d");
  context.scale(pixelRatio, pixelRatio);
  context.translate(padding, padding);
  context.lineCap = "square";
  traceWalls(context, page);

  // 1. Lichthof: der "Schatten" der Linie in ihrer eigenen Farbe, ohne Versatz.
  //    Zweimal übereinander, sonst ist er zu schwach, um als Leuchten zu wirken.
  context.save();
  context.strokeStyle = settings.wallColor;
  context.lineWidth = settings.wallWidth;
  context.shadowColor = settings.wallColor;
  // Schatten-Angaben rechnet der Browser in Geräte-Pixeln, deshalb von Hand mit pixelRatio malnehmen.
  context.shadowBlur = settings.bloomRadius * pixelRatio;
  context.globalAlpha = settings.bloomStrength;
  context.stroke();
  context.stroke();
  context.restore();

  // 2. die Linie selbst
  context.strokeStyle = settings.wallColor;
  context.lineWidth = settings.wallWidth;
  context.stroke();

  // 3. der überhelle Kern
  context.strokeStyle = "#ffffff";
  context.globalAlpha = 0.55;
  context.lineWidth = settings.wallWidth / 3;
  context.stroke();

  // Breite und Höhe in Pixeln der Seite: genau so groß wird das Bild später gezeichnet
  return {
    image,
    padding,
    width: image.width / pixelRatio,
    height: image.height / pixelRatio,
    look: wallLookOf(settings),
  };
}

// Das fertige Wandbild einer Seite. Wird beim ersten Mal gezeichnet und dann aufgehoben,
// bis sich das Aussehen der Wände ändert.
function wallImageOf(page, settings) {
  const cached = scene.wallImages.get(page);
  if (cached && cached.look === wallLookOf(settings)) return cached;

  const fresh = renderWallImage(page, settings);
  scene.wallImages.set(page, fresh);
  return fresh;
}

// Zeichnet das Wandbild der nächsten Seite schon vorab. Das dauert einige Hundertstel-
// sekunden; erst beim Seitenwechsel erledigt, würde dessen erstes Bild ruckeln.
function prepareNextWallImage(settings) {
  if (hasNextPage()) wallImageOf(scene.pages[scene.pageIndex + 1], settings);
}

// Wirft die Wandbilder von Seiten weg, die nicht mehr zu sehen sind (spart Speicher:
// jedes Bild ist so groß wie der Bildschirm). Gebraucht werden die aktuelle und die nächste Seite.
function forgetUnneededWallImages() {
  const neededPages = [currentPage(), scene.pages[scene.pageIndex + 1]];
  for (const page of scene.wallImages.keys()) {
    if (!neededPages.includes(page)) scene.wallImages.delete(page);
  }
}

function drawWalls(page, settings) {
  const { image, padding, width, height } = wallImageOf(page, settings);
  ctx.drawImage(image, scene.offsetX - padding, scene.offsetY - padding, width, height);
}

// ---------------------------------------------------------------------------
// Leuchtspur und Lichtpunkt
// ---------------------------------------------------------------------------

// Wie hell ein gelaufener Schritt gerade noch leuchtet, als Stufe von 0 bis BRIGHTNESS_LEVELS.
// Frisch gelaufen leuchtet er `holdSeconds` lang voll, danach fällt die Helligkeit
// über `fadeSeconds` auf die Rest-Helligkeit.
function brightnessLevelOf(step, settings) {
  const walkedAt = scene.walkedAt[step];
  const isStillBeingWalked = walkedAt === undefined;
  if (isStillBeingWalked) return BRIGHTNESS_LEVELS;

  const secondsFading = scene.clock - walkedAt - settings.holdSeconds;
  let brightness = 1;
  if (secondsFading > 0) {
    const fadedPart = settings.fadeSeconds > 0 ? secondsFading / settings.fadeSeconds : 1;
    brightness = Math.max(settings.restBrightness, 1 - fadedPart);
  }
  return Math.ceil(brightness * BRIGHTNESS_LEVELS);
}

// Der erste Schritt der Route, der noch leuchtet. Alle Schritte davor sind schon ganz
// verglommen und müssen beim Zeichnen gar nicht erst angesehen werden - das spart am Handy
// den größten Teil der Arbeit an der Spur. Bleibt eine Rest-Helligkeit stehen, leuchtet alles.
function firstGlowingStep(settings) {
  if (settings.restBrightness > 0) return 1;

  const lifetime = trailLifetime(settings);
  const stepsDone = Math.floor(scene.progress);
  let step = 1;
  while (step <= stepsDone && scene.clock - scene.walkedAt[step] > lifetime) step++;
  return step;
}

// Zeichnet von der schon gelaufenen Route die Wegstücke einer Art und einer Helligkeitsstufe.
// steps: { first, last } - nur dieser Abschnitt der Route leuchtet noch.
//
// Jedes Wegstück wird um eine halbe Spurbreite gegen die Laufrichtung versetzt gezeichnet
// (mit stumpfen Enden). So schließen aufeinanderfolgende Stücke lückenlos und ohne
// Überlappung aneinander an, auch um die Ecke. Würden sie sich überlappen, entstünden
// beim Ausblenden an jedem Stufenwechsel dunklere Knoten (halbdurchsichtig auf halbdurchsichtig).
function strokeWalkedSegments(kind, level, levelOfStep, steps, settings) {
  const route = currentPage().route;
  const halfWidthInCells = settings.trailWidth / 2 / scene.cellSize;
  let hasSegments = false;

  ctx.beginPath();
  for (let step = steps.first; step <= steps.last; step++) {
    if (route[step].kind !== kind || levelOfStep[step] !== level) continue;
    const start = route[step - 1];
    const isStillWalking = step > scene.progress;
    const end = isStillWalking ? positionAt(scene.progress) : route[step];
    const backX = (route[step].x - start.x) * halfWidthInCells;
    const backY = (route[step].y - start.y) * halfWidthInCells;

    const from = centerOf({ x: start.x - backX, y: start.y - backY });
    const to = centerOf({ x: end.x - backX, y: end.y - backY });
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    hasSegments = true;
  }
  // Ein leerer Pfad mit Leuchten kostet den Browser trotzdem Zeit, deshalb nur zeichnen, wenn etwas da ist
  if (hasSegments) ctx.stroke();
}

// Zeichnet die Umlaut-Punkte einer Helligkeitsstufe, bei denen der Lichtpunkt schon war.
function fillUmlautDots(level, levelOfStep, steps, settings) {
  const route = currentPage().route;
  const lastFinishedStep = Math.min(steps.last, Math.floor(scene.progress));
  let hasDots = false;

  ctx.beginPath();
  for (let step = steps.first; step <= lastFinishedStep; step++) {
    if (!route[step].isDot || levelOfStep[step] !== level) continue;
    const center = centerOf(route[step]);
    ctx.moveTo(center.x, center.y);
    ctx.arc(center.x, center.y, settings.trailWidth * 0.8, 0, 2 * Math.PI);
    hasDots = true;
  }
  if (hasDots) ctx.fill();
}

function drawTrail(settings) {
  const route = currentPage().route;
  const steps = {
    first: firstGlowingStep(settings),
    last: Math.min(Math.ceil(scene.progress), route.length - 1),
  };
  const levelOfStep = [];
  for (let step = steps.first; step <= steps.last; step++) {
    levelOfStep[step] = brightnessLevelOf(step, settings);
  }

  ctx.save();
  ctx.strokeStyle = settings.trailColor;
  ctx.fillStyle = settings.trailColor;
  ctx.lineWidth = settings.trailWidth;
  ctx.lineCap = "butt";

  // Verbindungen zuerst, damit die Buchstaben darüber liegen
  for (let level = 1; level <= BRIGHTNESS_LEVELS; level++) {
    ctx.globalAlpha = (level / BRIGHTNESS_LEVELS) * settings.connectorOpacity;
    strokeWalkedSegments(CONNECTOR, level, levelOfStep, steps, settings);
  }

  ctx.shadowColor = settings.trailColor;
  ctx.shadowBlur = settings.glow * pixelRatioOf(settings);
  for (let level = 1; level <= BRIGHTNESS_LEVELS; level++) {
    ctx.globalAlpha = level / BRIGHTNESS_LEVELS;
    strokeWalkedSegments(LETTER, level, levelOfStep, steps, settings);
    fillUmlautDots(level, levelOfStep, steps, settings);
  }
  ctx.restore();
}

// Der Weg, der noch vor dem Lichtpunkt liegt (wie die gestrichelte Linie in der Skizze).
function drawPlannedPath(settings) {
  const route = currentPage().route;
  const here = centerOf(positionAt(scene.progress));

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(here.x, here.y);
  for (let step = Math.floor(scene.progress) + 1; step < route.length; step++) {
    const point = centerOf(route[step]);
    ctx.lineTo(point.x, point.y);
  }
  ctx.strokeStyle = settings.trailColor;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = Math.max(1, settings.trailWidth / 3);
  ctx.setLineDash([4, 5]);
  ctx.stroke();
  ctx.restore();
}

// Der Lichtpunkt: ein leuchtender Punkt, innen fast weiß, zum Rand hin in seiner Farbe.
function drawDot(settings) {
  const position = centerOf(positionAt(scene.progress));
  const radius = scene.cellSize * 0.3;

  const glowingBall = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, radius);
  glowingBall.addColorStop(0, "#ffffff");
  glowingBall.addColorStop(0.25, "#ffffff");
  glowingBall.addColorStop(1, settings.dotColor);

  ctx.save();
  ctx.fillStyle = glowingBall;
  ctx.shadowColor = settings.dotColor;
  ctx.shadowBlur = scene.cellSize * pixelRatioOf(settings);
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

// Zeichnet Spur und Lichtpunkt der aktuellen Seite, beschnitten auf die Labyrinth-Fläche:
// so taucht der Punkt am Eingang auf und verschwindet am Ausgang.
function drawTrailAndDot(settings) {
  const { maze } = currentPage();

  ctx.save();
  ctx.beginPath();
  ctx.rect(scene.offsetX, scene.offsetY, maze.cols * scene.cellSize, maze.rows * scene.cellSize);
  ctx.clip();
  if (settings.showPlannedPath) drawPlannedPath(settings);
  drawTrail(settings);
  if (scene.phase === WRITING) drawDot(settings);
  ctx.restore();
}

// Zeichnet eine Labyrinth-Seite, um `shift` Pixel verschoben (für den Seitenwechsel).
// Spur und Lichtpunkt gibt es nur auf der aktuellen Seite.
function drawPage(page, shift, settings) {
  ctx.save();
  ctx.translate(shift.x, shift.y);
  drawWalls(page, settings);
  if (page === currentPage()) drawTrailAndDot(settings);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Der Monitor: alles, was das Bild nach alter Bildröhre aussehen lässt
// ---------------------------------------------------------------------------

// Jede so-vielte Bildschirmzeile ist abgedunkelt (das Zeilenraster der Röhre).
const SCANLINE_SPACING = 3;

function screenOverlayLookOf(settings) {
  return [canvas.width, canvas.height, settings.scanlineStrength, settings.vignetteStrength].join("|");
}

// Zeichnet vorab, was wie eine Glasscheibe über dem ganzen Bild liegt:
// das Zeilenraster und die dunklen Ecken (eine Röhre leuchtet in der Mitte am hellsten).
function renderScreenOverlay(settings) {
  const pixelRatio = pixelRatioOf(settings);
  const width = scene.viewWidth;
  const height = scene.viewHeight;

  const image = document.createElement("canvas");
  image.width = canvas.width;
  image.height = canvas.height;
  const context = image.getContext("2d");
  context.scale(pixelRatio, pixelRatio);

  context.fillStyle = `rgba(0, 0, 0, ${settings.scanlineStrength})`;
  for (let y = 0; y < height; y += SCANLINE_SPACING) {
    context.fillRect(0, y, width, 1);
  }

  const darkCorners = context.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.35,
    width / 2, height / 2, Math.hypot(width, height) / 2
  );
  darkCorners.addColorStop(0, "rgba(0, 0, 0, 0)");
  darkCorners.addColorStop(1, `rgba(0, 0, 0, ${settings.vignetteStrength})`);
  context.fillStyle = darkCorners;
  context.fillRect(0, 0, width, height);

  return { image, look: screenOverlayLookOf(settings) };
}

function drawScreenOverlay(settings) {
  const isUpToDate = scene.screenOverlay && scene.screenOverlay.look === screenOverlayLookOf(settings);
  if (!isUpToDate) scene.screenOverlay = renderScreenOverlay(settings);
  ctx.drawImage(scene.screenOverlay.image, 0, 0, scene.viewWidth, scene.viewHeight);
}

// Leichtes Flimmern: jedes Bild ist zufällig eine Spur dunkler.
function drawFlicker(settings) {
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * settings.flickerStrength * 0.25})`;
  ctx.fillRect(0, 0, scene.viewWidth, scene.viewHeight);
}

// Beginnt eine Bildstörung: ein Störbalken läuft einmal von oben nach unten durchs Bild.
function startGlitch() {
  scene.glitch = {
    startedAt: scene.clock,
    seconds: 0.35 + Math.random() * 0.5,
    bandHeight: (0.08 + Math.random() * 0.17) * scene.viewHeight,
  };
}

// Würfelt, ob jetzt eine Störung beginnt. Nur solange die Animation läuft.
function maybeStartGlitch(seconds, settings) {
  const isAnimationRunning = scene.phase !== FINISHED;
  const chanceInThisFrame = (settings.glitchesPerMinute / 60) * seconds;
  if (isAnimationRunning && !scene.glitch && Math.random() < chanceInThisFrame) startGlitch();
}

// Zeichnet die laufende Störung über das fertige Bild: Im Störbalken verrutschen die
// Bildzeilen seitlich, dazu ein heller Schleier und ein paar Rausch-Striche.
function drawGlitch(settings) {
  if (!scene.glitch) return;

  const { startedAt, seconds, bandHeight } = scene.glitch;
  const part = (scene.clock - startedAt) / seconds;
  if (part >= 1) {
    scene.glitch = null;
    return;
  }

  const pixelRatio = pixelRatioOf(settings);
  const width = scene.viewWidth;
  const height = scene.viewHeight;
  // Der Balken startet knapp über dem Bild und endet knapp darunter
  const bandTop = Math.max(0, part * (height + bandHeight) - bandHeight);
  const bandBottom = Math.min(height, part * (height + bandHeight));

  // Verrutschte Zeilen: schmale Streifen des fertigen Bildes werden seitlich versetzt
  // über sich selbst kopiert.
  let y = bandTop;
  while (y < bandBottom) {
    const stripHeight = 2 + Math.floor(Math.random() * 6);
    const shift = (Math.random() - 0.5) * 2 * settings.glitchStrength;
    ctx.drawImage(
      canvas,
      0, y * pixelRatio, canvas.width, stripHeight * pixelRatio, // Ausschnitt in Geräte-Pixeln
      shift, y, width, stripHeight
    );
    y += stripHeight;
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter"; // Farben addieren sich: es wird nur heller
  ctx.fillStyle = settings.wallColor;
  ctx.globalAlpha = 0.07;
  ctx.fillRect(0, bandTop, width, bandBottom - bandTop);
  ctx.globalAlpha = 0.5;
  for (let dash = 0; dash < 12; dash++) {
    const dashY = bandTop + Math.random() * (bandBottom - bandTop);
    ctx.fillRect(Math.random() * width, dashY, 10 + Math.random() * 60, 1);
  }
  ctx.restore();
}

// Ein komplettes Bild: die aktuelle Seite und - während des Seitenwechsels - die nächste,
// darüber die Eigenheiten des Monitors.
function drawScene(settings) {
  ctx.fillStyle = settings.backgroundColor;
  ctx.fillRect(0, 0, scene.viewWidth, scene.viewHeight);

  const shifts = scrollShifts(settings);
  drawPage(currentPage(), shifts.outgoing, settings);
  if (scene.phase === SCROLLING) drawPage(scene.pages[scene.pageIndex + 1], shifts.incoming, settings);

  drawGlitch(settings);
  if (scene.phase !== FINISHED) drawFlicker(settings);
  drawScreenOverlay(settings);
}

// ---------------------------------------------------------------------------
// Bilder pro Sekunde
// ---------------------------------------------------------------------------

// Die Messung, ob die Animation flüssig läuft.
const frameMeter = {
  windowStartedAt: null, // Beginn der laufenden Mess-Sekunde
  framesInWindow: 0,
  lowestRate: null, // niedrigster Sekundenwert seit der letzten Frage
  longestFrameMillis: 0, // längster Abstand zwischen zwei Bildern seit der letzten Frage
};

// Beginnt die Messung neu: bei jeder Frage, damit "niedrigster Wert" und "längstes Bild"
// zu genau dieser Antwort gehören - und wenn der Tab aus dem Hintergrund zurückkommt.
function resetFrameMeter() {
  frameMeter.windowStartedAt = null;
  frameMeter.framesInWindow = 0;
  frameMeter.lowestRate = null;
  frameMeter.longestFrameMillis = 0;
}

// Zählt ein Bild mit und schreibt einmal pro Sekunde das Ergebnis in die Regler-Leiste.
// Gezählt werden die Aufrufe von onAnimationFrame - auch wenn sich gerade nichts bewegt.
function countFrame(now, millisSinceLastFrame) {
  if (frameMeter.windowStartedAt === null) frameMeter.windowStartedAt = now;
  frameMeter.framesInWindow++;
  frameMeter.longestFrameMillis = Math.max(frameMeter.longestFrameMillis, millisSinceLastFrame);

  const windowMillis = now - frameMeter.windowStartedAt;
  if (windowMillis < 1000) return;

  const rate = Math.round((frameMeter.framesInWindow * 1000) / windowMillis);
  frameMeter.lowestRate = frameMeter.lowestRate === null ? rate : Math.min(frameMeter.lowestRate, rate);
  frameMeter.windowStartedAt = now;
  frameMeter.framesInWindow = 0;
  showFrameRate(rate);
}

function showFrameRate(rate) {
  document.getElementById("frameRate").textContent = `${rate} Bilder pro Sekunde`;
  document.getElementById("frameRateDetail").textContent =
    `seit der letzten Frage: mindestens ${frameMeter.lowestRate}, ` +
    `längstes Bild ${Math.round(frameMeter.longestFrameMillis)} ms`;
}

// Läuft einmal pro Bildschirm-Bild: führt die Animation fort und zeichnet neu.
// Gezeichnet wird nur, wenn sich etwas bewegt, eine Störung läuft oder ein Regler etwas geändert hat.
function onAnimationFrame(now) {
  const settings = currentSettings;
  const millisSinceLastFrame = scene.lastFrameTime === null ? 0 : now - scene.lastFrameTime;
  const secondsSinceLastFrame = Math.min(LONGEST_PAUSE_SECONDS, millisSinceLastFrame / 1000);
  scene.lastFrameTime = now;

  stepAnimation(secondsSinceLastFrame, settings);
  maybeStartGlitch(secondsSinceLastFrame, settings);

  if (scene.phase !== FINISHED || scene.glitch || scene.needsRedraw) {
    drawScene(settings);
    scene.needsRedraw = false;
  }
  countFrame(now, millisSinceLastFrame);
  requestAnimationFrame(onAnimationFrame);
}

// ---------------------------------------------------------------------------
// Fenstergröße und Bildschirmtastatur
// ---------------------------------------------------------------------------

// Hat gerade ein Feld den Fokus, in das man tippt? Dann ist am Handy vermutlich die
// Bildschirmtastatur offen.
function isTypingInTextField() {
  const focused = document.activeElement;
  return Boolean(focused) && focused.matches("input[type=text], input[type=number], textarea");
}

// Baut das Labyrinth neu, wenn die Bühne wirklich eine andere Größe bekommen hat.
//
// Die Falle am Handy: Die Bildschirmtastatur macht das Fenster niedriger. Würde darauf
// neu gebaut, begänne die Animation bei jedem Antippen des Fragefelds von vorn.
// Deshalb gilt:
//   - andere Breite (Handy gedreht, Fenster gezogen, Regler-Leiste auf/zu) -> neu bauen
//   - nur andere Höhe, während getippt wird -> nichts tun (das Bild bleibt stehen
//     und wird unten abgeschnitten, siehe fitCanvasToStage)
//   - nur andere Höhe, ohne dass getippt wird -> neu bauen
function rebuildIfStageChanged() {
  const widthChanged = stage.clientWidth !== scene.viewWidth;
  const heightChanged = stage.clientHeight !== scene.viewHeight;
  if (widthChanged || (heightChanged && !isTypingInTextField())) regenerate();
}

// Beobachtet die Größe der Bühne. Reagiert wird erst, wenn sie eine Weile ruhig war.
function watchStageSize() {
  let settleTimer = null;
  const waitUntilSettled = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(rebuildIfStageChanged, RESIZE_SETTLE_MILLIS);
  };

  window.addEventListener("resize", waitUntilSettled);
  // Das Auf- und Zuklappen der Regler-Leiste ändert die Bühne, ohne dass das Fenster sich ändert.
  if (window.ResizeObserver) new ResizeObserver(waitUntilSettled).observe(stage);
}

// Kommt der Tab aus dem Hintergrund zurück, beginnen Zeitmessung und Bildzählung neu -
// sonst zählte die Pause als ein einziges, sehr langes Bild.
function onVisibilityChanged() {
  scene.lastFrameTime = null;
  resetFrameMeter();
}

// ---------------------------------------------------------------------------
// Regler-Leiste
// ---------------------------------------------------------------------------

// Schreibt neben jeden Schieberegler seinen aktuellen Wert.
function showSliderValues() {
  document.querySelectorAll("span[data-for]").forEach((label) => {
    label.textContent = document.getElementById(label.dataset.for).value;
  });
}

// Klappt die Regler-Leiste auf oder zu.
function setControlsOpen(isOpen) {
  document.getElementById("controls").hidden = !isOpen;
  document.getElementById("toggleControls").setAttribute("aria-expanded", String(isOpen));
}

// Schreibt in die Regler-Leiste, welches Profil gilt und warum.
function showProfileInfo() {
  document.getElementById("profileInfo").textContent =
    `Aktiv: „${activeProfileName}“ · Fensterbreite ${window.innerWidth} px · ` +
    `„desktop“ ab ${CONFIG.desktopFromWidth} px`;
  document.getElementById("profile").value = activeProfileName;
}

// Füllt die Profil-Auswahl mit den Profilen aus der Config.
function fillProfileChoice() {
  const choice = document.getElementById("profile");
  for (const profileName of Object.keys(CONFIG.profiles)) {
    choice.add(new Option(profileName, profileName));
  }
}

// Wechselt von Hand auf ein anderes Profil: Regler neu füllen, Labyrinth neu bauen.
function switchProfile(profileName) {
  applyProfile(CONFIG, profileName);
  currentSettings = readSettings();
  showSliderValues();
  showProfileInfo();
  regenerate();
}

// Ein Regler wurde bewegt: Werte neu lesen und - falls nötig - das Labyrinth neu bauen.
function onControlChanged(control) {
  currentSettings = readSettings();
  showSliderValues();
  if (REGENERATING_CONTROLS.includes(control.id)) regenerate();
  showAnswerTextIfWanted(currentSettings);
  scene.needsRedraw = true;
}

// Zeigt die aktuellen Reglerwerte als Profil-Block für config.js und kopiert ihn
// in die Zwischenablage.
function showConfigText() {
  const textarea = document.getElementById("configText");
  const status = document.getElementById("configStatus");
  const note =
    `Reglerwerte vom ${new Date().toLocaleDateString("de-DE")}, ` +
    `Fenster ${window.innerWidth} × ${window.innerHeight} px, ${scene.cols} × ${scene.rows} Zellen`;

  textarea.value = configTextOf(CONFIG, activeProfileName, currentValues(CONFIG), note);
  textarea.hidden = false;
  copyToClipboard(textarea).then((wasCopied) => {
    status.textContent = wasCopied
      ? `Kopiert. In config.js den Block „${activeProfileName}“ unter „profiles“ damit ersetzen.`
      : "Kopieren hat nicht geklappt – bitte den Text unten von Hand markieren und kopieren.";
  });
}

// Verbindet Fragefeld, Regler und Knöpfe mit ihren Aktionen.
function connectControls() {
  document.getElementById("askForm").addEventListener("submit", onQuestionSubmitted);
  document.getElementById("replayAnswer").addEventListener("click", replayLastAnswer);
  // iOS verschiebt die Seite, um das Fragefeld über die Tastatur zu heben, und schiebt
  // sie nicht immer zurück. Beim Verlassen des Felds deshalb wieder ganz nach oben.
  document.getElementById("question").addEventListener("blur", () => window.scrollTo(0, 0));

  document.getElementById("toggleControls").addEventListener("click", () => {
    setControlsOpen(document.getElementById("controls").hidden);
  });
  document.getElementById("closeControls").addEventListener("click", () => setControlsOpen(false));

  document.querySelectorAll("#controlsBody input, #controlsBody select").forEach((control) => {
    if (control.id === "profile") return; // hat unten seine eigene Aktion
    control.addEventListener("input", () => onControlChanged(control));
  });
  document.getElementById("profile").addEventListener("change", (event) => switchProfile(event.target.value));
  document.getElementById("showConfig").addEventListener("click", showConfigText);

  document.getElementById("replay").addEventListener("click", regenerate);
  document.getElementById("skipPage").addEventListener("click", () => {
    if (scene.phase === WRITING) advanceDot(Infinity);
  });
  document.getElementById("newSeed").addEventListener("click", () => {
    document.getElementById("seed").value = Math.floor(Math.random() * 1000000);
    onControlChanged(document.getElementById("seed"));
  });
  document.getElementById("glitchNow").addEventListener("click", startGlitch);

  document.addEventListener("visibilitychange", onVisibilityChanged);
}

// Der Start: Profil wählen, Regler füllen, Begrüßung schreiben.
//
// Die Regler gibt es auch dann, wenn die Config sie versteckt (Besucherfassung): aus ihnen
// werden die Werte gelesen. Es fehlt dann nur der Knopf, der die Leiste aufklappt.
// Welche Knöpfe neben dem Fragefeld stehen, bestimmt ebenfalls die Config.
function start() {
  const profileName = profileNameFromUrl(CONFIG) || profileNameForWidth(CONFIG, window.innerWidth);
  fillProfileChoice();
  applyProfile(CONFIG, profileName);
  document.getElementById("toggleControls").hidden = !CONFIG.showControls;
  document.getElementById("replayAnswer").hidden = !CONFIG.showReplayButton;
  setControlsOpen(CONFIG.showControls && valuesOfProfile(CONFIG, profileName).controlsOpen);
  currentSettings = readSettings();

  connectControls();
  showSliderValues();
  showProfileInfo();

  scene.answer = createAnswer(CONFIG.greeting, "");
  regenerate();
  watchStageSize();
  requestAnimationFrame(onAnimationFrame);
}

start();
