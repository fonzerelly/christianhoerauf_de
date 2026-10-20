// Die Abstimmungswerte der Seite, an einer Stelle: je Geräteprofil ein vollständiger Satz.
//
// Die Werte stammen aus `prototyp/06-frage-antwort/config.js` (Grundwerte, überschrieben vom
// Profil `handy`; ein Test vergleicht beide). Prozentwerte stehen hier als Anteile von 0 bis 1.
// Die Datei importiert nichts: Die Teile der Seite lesen diese Werte, nicht umgekehrt. Ihre
// Einstellungs-Schnittstellen (`PlaybackSettings`, `RenderSettings`, `MazeSettings`) sind
// Ausschnitte von `Tuning`.

/** Die Geräteklassen. Gewählt wird nach der Fensterbreite (siehe `DESKTOP_FROM_WIDTH`). */
export type ProfileName = "desktop" | "handy";

/** Ab dieser Fensterbreite in Pixeln gilt das Profil `desktop`, darunter `handy`. */
export const DESKTOP_FROM_WIDTH = 700;

/** Alle Abstimmungswerte eines Geräteprofils. Zeiten in Sekunden, Tempo in Zellen pro Sekunde. */
export interface Tuning {
  // Tempo
  /** Tempo in Schriftwegen. */
  readonly speed: number;
  /** Auf Verbindungswegen und Sprüngen so viel mal schneller. */
  readonly connectorSpeedFactor: number;
  /** Kommt eine Frage mitten im Schreiben: Der Rest läuft so viel mal schneller. */
  readonly rushFactor: number;
  /** Dauer des Weiterschiebens. */
  readonly scrollSeconds: number;

  // Leuchtspur
  /** Leuchtet voll für so lange. */
  readonly holdSeconds: number;
  /** Blendet danach innerhalb dieser Zeit aus. */
  readonly fadeSeconds: number;
  /** Spurstärke in Pixeln. */
  readonly trailWidth: number;
  /** Leuchten der Spur. */
  readonly glow: number;
  /** Sichtbarkeit der Verbindungswege (Anteil 0 bis 1). */
  readonly connectorOpacity: number;

  // Monitor
  /** Überstrahlen der Wände: Reichweite in Pixeln. */
  readonly bloomRadius: number;
  /** Überstrahlen der Wände: Stärke (Anteil). */
  readonly bloomStrength: number;
  readonly scanlineStrength: number;
  readonly vignetteStrength: number;
  readonly flickerStrength: number;
  readonly glitchesPerMinute: number;
  /** Wie weit die Zeilen einer Bildstörung verrutschen, in Pixeln. */
  readonly glitchStrength: number;

  // Farben
  readonly backgroundColor: string;
  readonly wallColor: string;
  readonly trailColor: string;
  readonly dotColor: string;

  // Labyrinth
  /** Startwert der Begrüßung; die Adresse (`?seed=`) kann ihn ersetzen. */
  readonly seed: number;
  /** Gewundenheit der Füll-Gänge (Anteil). */
  readonly windiness: number;
  /** Umwege bei An- und Ablauf (Anteil). */
  readonly detour: number;
  /** Höhe des Zeilenwechsel-Bands. */
  readonly returnBandRows: number;
  /** Wie stark sich der Rückweg im Band windet (Anteil). */
  readonly returnWindiness: number;
  /** Längstes gerades Wandstück unter Verbindungsspur und Rückweg, in Zellen. */
  readonly maxWallRun: number;
  /** Wandstärke in Pixeln. */
  readonly wallWidth: number;
  /** Wie das Raster auf der Bühne eingeteilt wird: feste Spaltenzahl (Handy) oder feste Zellgröße in Pixeln (Desktop). */
  readonly stageSizing: { readonly columns: number } | { readonly cellSize: number };

  // Gerät
  /** Höchste Pixeldichte des Bildes; kleiner ist unschärfer, aber schneller. */
  readonly maxPixelRatio: number;
  /** Nach dem Senden das Fragefeld verlassen (schließt am Handy die Tastatur). */
  readonly blurInputAfterSending: boolean;

  // Neu im Neubau
  /** Der Haltepunkt liegt so viele Wegstücke hinter der letzten Glyphe der Antwort. */
  readonly restingDistance: number;
  /** Eine Schwingung des pulsierenden, wartenden Lichtpunkts dauert so lange. */
  readonly pulseSeconds: number;
}

/** Die Grundwerte; das Profil `handy` überschreibt einige davon. */
const BASE: Tuning = {
  speed: 60,
  connectorSpeedFactor: 3,
  rushFactor: 6,
  scrollSeconds: 1.2,
  holdSeconds: 0.6,
  fadeSeconds: 0.8,
  trailWidth: 5,
  glow: 16,
  connectorOpacity: 0.25,
  bloomRadius: 7,
  bloomStrength: 0.8,
  scanlineStrength: 0.35,
  vignetteStrength: 0.55,
  flickerStrength: 0.25,
  glitchesPerMinute: 8,
  glitchStrength: 14,
  backgroundColor: "#03140a",
  wallColor: "#2bdc5a",
  trailColor: "#ff2a2a",
  dotColor: "#ff2a2a",
  seed: 1,
  windiness: 0.7,
  detour: 0.3,
  returnBandRows: 2,
  returnWindiness: 0.5,
  maxWallRun: 4,
  wallWidth: 3,
  stageSizing: { cellSize: 24 },
  maxPixelRatio: 3,
  blurInputAfterSending: false,
  restingDistance: 2,
  pulseSeconds: 1.6,
};

/**
 * Die Werte je Geräteprofil. Das Handy hat kleine Zellen (34 Spalten ergeben 7 Zeichen je Zeile);
 * Wände, Spur und Leuchten sind auf diese Zellgröße heruntergerechnet.
 */
export const TUNING: Readonly<Record<ProfileName, Tuning>> = {
  desktop: BASE,
  handy: {
    ...BASE,
    blurInputAfterSending: true,
    stageSizing: { columns: 34 },
    wallWidth: 1.5,
    bloomRadius: 3,
    bloomStrength: 0.7,
    trailWidth: 3,
    glow: 7,
    glitchStrength: 8,
    scrollSeconds: 1,
    maxPixelRatio: 2,
  },
};
