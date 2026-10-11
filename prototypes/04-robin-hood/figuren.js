// Die Figuren: Robin Hood und die Wachen, von oben gesehen. Dazu die Goldmünzen,
// die Robin Hood an den Umlaut-Punkten verliert.
//
// Jede Figur wird in ihrem eigenen kleinen Koordinatensystem gezeichnet:
//   - Die Figur steht im Ursprung und schaut nach rechts (+x). Ihre linke Hand
//     ist damit oben (-y), ihre rechte unten (+y).
//   - Die Einheit ist die Zellgröße: 0.5 ist also eine halbe Zelle. Auch
//     Linienbreiten sind in dieser Einheit angegeben.
// drawFigure schiebt, dreht und vergrößert dieses Koordinatensystem an die richtige
// Stelle. Die Zeichenfunktionen müssen deshalb nichts über Position, Richtung oder
// Zellgröße wissen.
//
// Die Haltung einer Figur:
//   pose = {
//     x, y,      // Mitte der Figur auf dem Canvas
//     heading,   // Blickrichtung als Winkel (0 = nach rechts, im Uhrzeigersinn)
//     size,      // so viele Pixel ist eine Einheit groß
//     swing,     // -1 … 1: pendelt beim Laufen hin und her (Schritte, Armschwung)
//   }

const FIGURE_SHADOW = "rgba(20, 14, 8, 0.32)";
const SKIN = "#f0c8a0";
const SWAY_ANGLE = 0.14; // so weit dreht sich der Oberkörper beim Laufen mit (Bogenmaß)
const BOB = 0.06; // so viel größer wird die Figur mitten im Schritt (Wippen)
const STRIDE = 0.2; // so weit setzt sie die Füße vor und zurück

const ROBIN = {
  tunic: "#2f8f3c",
  hat: "#55c355",
  outline: "#123f1b",
  boots: "#5b3a1e",
  feather: "#e8402f",
  sleeve: "#43a84f",
  bow: "#e0a23c",
  bowOutline: "#3b2209",
  bowstring: "#f8f1dc",
  quiver: "#7a4a22",
  arrowFeathers: "#f3ead2",
};

const GUARD = {
  tabard: "#c62a2f",
  tabardTrim: "#f2c230",
  mail: "#8c949d", // Kettenhemd an Schultern und Armen
  outline: "#3a1114",
  boots: "#26262a",
  helmetBrim: "#aeb8c2",
  helmetDome: "#e3e9ef",
  helmetOutline: "#444c55",
  pole: "#3f2a15",
  blade: "#cdd5dc",
  plume: "#f2c230",
};

const COINS = { gold: "#ffd447", shine: "#fff3b8", outline: "#8a6410" };

function fillEllipse(ctx, x, y, radiusX, radiusY, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 2 * Math.PI);
  ctx.fill();
}

// Gefüllte Ellipse mit dunklem Rand.
function outlinedEllipse(ctx, x, y, radiusX, radiusY, color, outlineColor) {
  fillEllipse(ctx, x, y, radiusX, radiusY, color);
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 0.022;
  ctx.stroke();
}

function strokeLine(ctx, x1, y1, x2, y2, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// Eine Linie mit dunklem Rand: erst breit und dunkel, dann schmaler in der Farbe darüber.
function outlinedLine(ctx, x1, y1, x2, y2, width, color, outlineColor) {
  strokeLine(ctx, x1, y1, x2, y2, width + 0.035, outlineColor);
  strokeLine(ctx, x1, y1, x2, y2, width, color);
}

// Stellt das Koordinatensystem der Figur her (siehe Dateikopf), zeichnet ihren
// Schatten und ruft dann drawBody auf. Der Schatten fällt immer nach rechts unten,
// egal wohin die Figur schaut - deshalb wird er VOR dem Drehen gezeichnet.
function drawFigure(ctx, pose, drawBody) {
  const bobbing = 1 + BOB * Math.abs(pose.swing);
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.size, pose.size);
  fillEllipse(ctx, 0.05, 0.07, 0.21, 0.21, FIGURE_SHADOW);
  ctx.rotate(pose.heading + pose.swing * SWAY_ANGLE);
  ctx.scale(bobbing, bobbing);
  drawBody();
  ctx.restore();
}

// Die beiden Füße: einer vorn, einer hinten, im Takt von swing abwechselnd.
function drawFeet(ctx, swing, color) {
  fillEllipse(ctx, STRIDE * swing, -0.1, 0.09, 0.055, color);
  fillEllipse(ctx, -STRIDE * swing, 0.1, 0.09, 0.055, color);
}

// Der Köcher schräg auf Robin Hoods Rücken, mit drei hellen Pfeil-Federn am oberen Ende.
function drawQuiver(ctx) {
  strokeLine(ctx, -0.17, -0.1, -0.08, 0.13, 0.085, ROBIN.quiver);
  for (const [x, y] of [[-0.2, 0.14], [-0.14, 0.18], [-0.08, 0.2]]) {
    strokeLine(ctx, -0.1, 0.11, x, y, 0.028, ROBIN.arrowFeathers);
  }
}

// Robin Hoods Arme und der Bogen: Er hält den gespannten Bogen quer vor sich,
// der Pfeil zeigt in Laufrichtung. Die Arme pendeln beim Laufen leicht.
function drawBowAndArms(ctx, swing) {
  const bowHandX = 0.37 + 0.015 * swing;
  const stringHandX = 0.23 - 0.015 * swing;
  const bowTipX = 0.2;
  const bowTipY = 0.29;

  // Arme: von den Schultern nach vorn zur Bogenmitte bzw. zur Sehne
  outlinedLine(ctx, 0.03, -0.2, bowHandX, -0.03, 0.065, ROBIN.sleeve, ROBIN.outline);
  outlinedLine(ctx, 0.03, 0.2, stringHandX, 0.04, 0.065, ROBIN.sleeve, ROBIN.outline);

  // Bogen: nach vorn gewölbt, erst der dunkle Rand, dann das helle Holz darüber
  const strokeBow = (width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bowTipX, -bowTipY);
    ctx.quadraticCurveTo(2 * bowHandX - bowTipX, 0, bowTipX, bowTipY);
    ctx.stroke();
  };
  strokeBow(0.075, ROBIN.bowOutline);
  strokeBow(0.042, ROBIN.bow);

  // Sehne: von beiden Bogenenden zur hinteren Hand gespannt
  ctx.strokeStyle = ROBIN.bowstring;
  ctx.lineWidth = 0.018;
  ctx.beginPath();
  ctx.moveTo(bowTipX, -bowTipY);
  ctx.lineTo(stringHandX, 0);
  ctx.lineTo(bowTipX, bowTipY);
  ctx.stroke();

  // Pfeil mit Spitze
  strokeLine(ctx, stringHandX, 0, 0.47, 0, 0.024, ROBIN.bowstring);
  ctx.fillStyle = ROBIN.bowOutline;
  ctx.beginPath();
  ctx.moveTo(0.54, 0);
  ctx.lineTo(0.45, -0.04);
  ctx.lineTo(0.45, 0.04);
  ctx.fill();

  fillEllipse(ctx, bowHandX, -0.015, 0.036, 0.036, SKIN);
  fillEllipse(ctx, stringHandX, 0.02, 0.036, 0.036, SKIN);
}

// Robin Hoods Hut von oben: hinten rund, vorn spitz zulaufend, mit roter Feder,
// die schräg nach hinten absteht.
function drawRobinHat(ctx) {
  ctx.fillStyle = ROBIN.hat;
  ctx.strokeStyle = ROBIN.outline;
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  ctx.moveTo(0.2, 0);
  ctx.quadraticCurveTo(0.02, 0.17, -0.12, 0.115);
  ctx.quadraticCurveTo(-0.18, 0, -0.12, -0.115);
  ctx.quadraticCurveTo(0.02, -0.17, 0.2, 0);
  ctx.fill();
  ctx.stroke();

  // Die Mulde in der Hutmitte
  fillEllipse(ctx, -0.03, 0, 0.075, 0.05, ROBIN.tunic);

  // Feder: ein schmales Blatt, das seitlich am Hut beginnt und nach hinten ausschwingt
  ctx.fillStyle = ROBIN.feather;
  ctx.beginPath();
  ctx.moveTo(0.04, 0.07);
  ctx.quadraticCurveTo(-0.1, 0.07, -0.3, 0.22);
  ctx.quadraticCurveTo(-0.08, 0.2, 0.04, 0.07);
  ctx.fill();
}

// Robin Hood: grün, mit spitzem Hut und roter Feder, Köcher auf dem Rücken
// und gespanntem Bogen in den Händen.
function drawRobinHood(ctx, pose) {
  drawFigure(ctx, pose, () => {
    drawFeet(ctx, pose.swing, ROBIN.boots);
    outlinedEllipse(ctx, 0, 0, 0.13, 0.25, ROBIN.tunic, ROBIN.outline); // Schultern
    drawQuiver(ctx);
    drawBowAndArms(ctx, pose.swing);
    drawRobinHat(ctx);
  });
}

// Die Hellebarde der Wache: eine lange Stange an ihrer rechten Seite, die nach
// vorn zeigt, mit Stoßspitze und Beilklinge.
function drawHalberd(ctx) {
  strokeLine(ctx, -0.26, 0.22, 0.4, 0.22, 0.042, GUARD.pole);

  ctx.fillStyle = GUARD.blade;
  ctx.strokeStyle = GUARD.helmetOutline;
  ctx.lineWidth = 0.018;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(0.52, 0.22); // Stoßspitze
  ctx.lineTo(0.4, 0.25);
  ctx.lineTo(0.3, 0.25);
  ctx.lineTo(0.27, 0.12); // Beilklinge, zur Körpermitte hin
  ctx.lineTo(0.4, 0.12);
  ctx.lineTo(0.4, 0.19);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Der Oberkörper der Wache: Kettenhemd an den Schultern, darüber der rote
// Wappenrock mit gelbem Mittelstreifen.
function drawGuardTorso(ctx) {
  outlinedEllipse(ctx, 0, 0, 0.13, 0.26, GUARD.mail, GUARD.outline);
  outlinedEllipse(ctx, 0, 0, 0.17, 0.2, GUARD.tabard, GUARD.outline);
  strokeLine(ctx, -0.15, 0, 0.15, 0, 0.06, GUARD.tabardTrim);
}

// Die Arme der Wache: die rechte Hand hält die Hellebarde, der linke Arm pendelt.
function drawGuardArms(ctx, swing) {
  const freeHandX = 0.06 - 0.1 * swing;
  strokeLine(ctx, 0.01, 0.21, 0.13, 0.215, 0.07, GUARD.mail);
  strokeLine(ctx, 0.01, -0.21, freeHandX, -0.24, 0.07, GUARD.mail);
  fillEllipse(ctx, 0.15, 0.215, 0.034, 0.034, SKIN);
  fillEllipse(ctx, freeHandX + 0.02, -0.24, 0.034, 0.034, SKIN);
}

// Der Eisenhut von oben: breite Krempe, helle Kuppel, ein Grat von vorn nach hinten.
// Der Hauptmann trägt zusätzlich einen gelben Federbusch.
function drawGuardHelmet(ctx, isCaptain) {
  if (isCaptain) strokeLine(ctx, -0.05, 0, -0.24, 0, 0.08, GUARD.plume);
  outlinedEllipse(ctx, 0.01, 0, 0.115, 0.115, GUARD.helmetBrim, GUARD.helmetOutline);
  fillEllipse(ctx, 0.01, 0, 0.07, 0.07, GUARD.helmetDome);
  strokeLine(ctx, -0.05, 0, 0.07, 0, 0.016, GUARD.helmetOutline);
}

// Eine Wache: Eisenhut, roter Wappenrock, Hellebarde nach vorn gerichtet.
function drawGuard(ctx, pose, isCaptain) {
  drawFigure(ctx, pose, () => {
    drawFeet(ctx, pose.swing, GUARD.boots);
    drawHalberd(ctx);
    drawGuardTorso(ctx);
    drawGuardArms(ctx, pose.swing);
    drawGuardHelmet(ctx, isCaptain);
  });
}

// Ein Häufchen Goldmünzen auf dem Boden (der Umlaut-Punkt). Die Lage der Münzen
// ist fest vorgegeben, damit das Häufchen nicht bei jedem Bild anders aussieht.
// x, y: Mitte auf dem Canvas, size: Zellgröße in Pixeln.
function drawCoinPile(ctx, x, y, size) {
  const coins = [[0, 0], [0.13, -0.05], [-0.12, -0.07], [-0.07, 0.11], [0.09, 0.1], [0.02, -0.15], [-0.17, 0.05]];
  const radius = 0.07;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  for (const [coinX, coinY] of coins) {
    outlinedEllipse(ctx, coinX, coinY, radius, radius, COINS.gold, COINS.outline);
    fillEllipse(ctx, coinX - 0.015, coinY - 0.02, radius * 0.4, radius * 0.4, COINS.shine);
  }
  ctx.restore();
}
