import { itemAt, lastOf } from "../domain/lists";
import type { Position } from "../domain/maze/position";
import type { AnswerContent } from "../domain/pages/answer-content";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { RouteStep } from "../domain/route/route-step";
import type { PageSource } from "./page-source";
import { paceOf } from "./pace";
import { pulseOf } from "./pulse";
import type { PlaybackSettings } from "./playback-settings";
import type { Phase, Playback } from "./playback-view";
import { RouteWalker } from "./route-walker";
import { BRIGHTNESS_LEVELS, Trail } from "./trail";

/** Die Route, auf der der Lichtpunkt steht, solange es noch keine Seite gibt: ein einziges Wegstück. */
const NO_ROUTE: readonly RouteStep[] = [{ x: 0, y: 0, kind: "connector", isDot: false }];

/** Gehört das Wegstück zur Schrift (Schriftweg oder Punkt)? Andere Stellen der Route: nein. */
function isWriting(page: MazePage, step: number): boolean {
  const routeStep = page.route[step];
  return routeStep !== undefined && (routeStep.kind === "letter" || routeStep.isDot);
}

/** Sanftes Anfahren und Abbremsen: bildet 0..1 auf 0..1 ab. */
function easeInOut(part: number): number {
  return part * part * (3 - 2 * part);
}

/**
 * Der Ablauf der Animation über die Zeit, ohne etwas zu zeichnen.
 *
 * Der Lichtpunkt schreibt die Seiten einer Antwort. Nach der letzten Glyphe läuft er zum
 * Haltepunkt und pulsiert, bis die Antwort auf die nächste Frage da ist; dann läuft er hinaus,
 * die Spur verglimmt, das Bild schiebt weiter, und die neue Antwort wird geschrieben.
 *
 * Kommt eine Frage, während noch geschrieben wird, laufen die sichtbaren Seiten im
 * Schnelldurchlauf zu Ende, und Seiten der alten Antwort, die noch nicht zu sehen sind, entfallen.
 * Bei mehreren Fragen hintereinander zählt nur die Antwort auf die neueste.
 *
 * Ein Stichwort schreibt der Lichtpunkt `keywordRuns`-mal (ADR 0007): In jedem Durchlauf außer
 * dem letzten läuft er hinaus, die Spur verglimmt, nach `runPauseSeconds` beginnt er auf denselben
 * Seiten von vorn. Erst im letzten Durchlauf wartet er am Haltepunkt, und die Schrift bleibt stehen,
 * bis die nächste Antwort kommt. Ein Pfad ohne Schrift läuft nur einmal, ebenso eine Antwort, nach
 * der schon eine neue Frage gestellt wurde.
 */
export class AnswerPlayback implements Playback {
  private pages: MazePage[] = [];
  private pageIndex = 0;
  private currentPhase: Phase = "waiting";
  private phaseStartedAt = 0;
  private clock = 0;
  private arrivedAnswers = 0;
  private latestQuestion = 0;
  private walker = new RouteWalker(NO_ROUTE);
  private readonly trail: Trail;
  /** Seiten, die im Schnelldurchlauf laufen, weil inzwischen eine neue Frage gestellt wurde. */
  private readonly rushedPages = new Set<MazePage>();
  /** Die Seiten der Antwort, die gerade geschrieben wird (für die Wiederholung). */
  private answerPages: readonly MazePage[] = [];
  /** Der wievielte Durchlauf dieser Antwort läuft (ab 0), und wie viele es werden. */
  private run = 0;
  private runs = 1;
  /** Hat die Antwort Schrift? Ein Pfad hat keine. */
  private hasWriting = false;
  /** Die Frage, deren Antwort gerade geschrieben wird. */
  private answerQuestion = 0;

  public constructor(
    private readonly pageSource: PageSource,
    private readonly settings: PlaybackSettings,
    /** Wünscht der Besucher weniger Bewegung? Dann nur ein Durchlauf (gilt ab der nächsten Antwort). */
    private readonly motion: { readonly isReduced: boolean } = { isReduced: false },
  ) {
    this.trail = new Trail(settings);
  }

  /** Wie viele Antworten schon angekommen sind (die Begrüßung eingerechnet). */
  public get answersWritten(): number {
    return this.arrivedAnswers;
  }

  public get phase(): Phase {
    return this.currentPhase;
  }

  /** Die Labyrinth-Seite, auf der der Lichtpunkt ist; `undefined`, solange noch nichts geschrieben wird. */
  public get currentPage(): MazePage | undefined {
    return this.pages[this.pageIndex];
  }

  /** Die Seite, die nach der aktuellen kommt. Beim Weiterschieben ist sie schon zu sehen. */
  public get nextPage(): MazePage | undefined {
    return this.pages[this.pageIndex + 1];
  }

  /** Wie viele Wegstücke der Lichtpunkt auf der aktuellen Seite gelaufen ist, mit Nachkommastellen. */
  public get progress(): number {
    return this.walker.progress;
  }

  /** Gibt es etwas zu zeichnen oder zu bewegen? Nur im Stillstand (`waiting`) nicht. */
  public get isAnimating(): boolean {
    return this.currentPhase !== "waiting";
  }

  public get isScrolling(): boolean {
    return this.currentPhase === "scrolling";
  }

  public get isResting(): boolean {
    return this.currentPhase === "resting";
  }

  /** Ist der Lichtpunkt zu sehen? Er läuft oder wartet am Haltepunkt. */
  public get isDotVisible(): boolean {
    return this.currentPhase === "writing" || this.currentPhase === "resting";
  }

  /** Läuft die aktuelle Seite im Schnelldurchlauf, weil eine neue Frage gestellt wurde? */
  public get isRushing(): boolean {
    const page = this.currentPage;
    return page !== undefined && this.rushedPages.has(page);
  }

  /** Wie weit das Weiterschieben ist, von 0 (alte Seite steht) bis 1 (neue Seite steht), sanft angefahren. */
  public get scrollPart(): number {
    if (!this.isScrolling) return 0;
    if (this.settings.scrollSeconds <= 0) return 1;
    return easeInOut(Math.min(1, this.secondsInPhase() / this.settings.scrollSeconds));
  }

  /** Wie lange der Lichtpunkt schon am Haltepunkt wartet; 0, solange er nicht dort steht. */
  public get restingSeconds(): number {
    return this.isResting ? this.secondsInPhase() : 0;
  }

  /**
   * Wie hell der Lichtpunkt am Haltepunkt gerade pulsiert (0 bis 1); außerhalb des Wartens 0.
   */
  public get restingPulse(): number {
    return this.isResting ? pulseOf(this.secondsInPhase(), this.settings.pulseSeconds) : 0;
  }

  /** Wo der Lichtpunkt steht, auch zwischen zwei Zellen; `undefined`, solange es keine Seite gibt. */
  public dotPosition(): Position | undefined {
    return this.currentPage === undefined ? undefined : this.walker.position();
  }

  /**
   * Die Helligkeitsstufe der Leuchtspur auf dem Wegstück (0 bis 16). Im letzten Durchlauf bleibt
   * die Schrift (Schriftwege und Punkte) voll hell; die Verbindungswege verglimmen.
   */
  public trailLevelOf(step: number): number {
    const page = this.currentPage;
    if (page !== undefined && this.keepsWriting() && isWriting(page, step))
      return BRIGHTNESS_LEVELS;
    return this.trail.levelOf(step, this.clock);
  }

  /** Das erste Wegstück der aktuellen Seite, das noch leuchtet (bleibt die Schrift stehen: das erste). */
  public firstGlowingStep(): number {
    if (this.keepsWriting()) return 1;
    return this.trail.firstGlowingStep(this.walker.stepsDone, this.clock);
  }

  /**
   * Eine Frage wurde gestellt, und `reply` liefert den Text der Antwort. Sobald er da ist, wird
   * er geschrieben - es sei denn, inzwischen kam eine neuere Frage. Das Versprechen darf nicht
   * scheitern.
   */
  public request(reply: Promise<AnswerContent>): void {
    this.latestQuestion++;
    const question = this.latestQuestion;
    this.dropPagesNotYetVisible();
    if (this.isMoving()) this.rushVisiblePages();

    void reply.then((content) => {
      if (question === this.latestQuestion) this.acceptAnswer(content, question);
    });
  }

  /** Lässt `seconds` Sekunden vergehen und führt die Animation fort. */
  public advance(seconds: number): void {
    this.clock += seconds;
    switch (this.currentPhase) {
      case "writing":
        this.walk(seconds);
        break;
      case "fading":
        this.fade();
        break;
      case "scrolling":
        if (this.secondsInPhase() >= this.settings.scrollSeconds)
          this.startPage(this.pageIndex + 1);
        break;
      case "resting":
      case "waiting":
        break;
    }
  }

  private secondsInPhase(): number {
    return this.clock - this.phaseStartedAt;
  }

  private enterPhase(phase: Phase): void {
    this.currentPhase = phase;
    this.phaseStartedAt = this.clock;
  }

  /** Bewegt sich gerade etwas im Bild, das eine neue Frage eilig machen soll? */
  private isMoving(): boolean {
    return this.currentPhase !== "resting" && this.currentPhase !== "waiting";
  }

  /** Behält die Seiten, die zu sehen sind, und wirft die übrigen weg. */
  private dropPagesNotYetVisible(): void {
    const lastVisible = this.currentPhase === "scrolling" ? this.pageIndex + 1 : this.pageIndex;
    this.pages = this.pages.slice(this.pageIndex, lastVisible + 1);
    this.pageIndex = 0;
  }

  private rushVisiblePages(): void {
    this.pages.forEach((page) => this.rushedPages.add(page));
  }

  /**
   * Die Antwort auf die neueste Frage ist da: Die Seiten dazu entstehen (das dauert und läuft in
   * Stücken, siehe `PageSource`), und sobald sie bereit sind, werden sie geschrieben - es sei
   * denn, inzwischen kam eine neuere Frage. Bis dahin geht die Animation unverändert weiter
   * (der Lichtpunkt pulsiert am Haltepunkt, oder es steht still).
   */
  private acceptAnswer(content: AnswerContent, question: number): void {
    const exitBefore = this.pages.length > 0 ? lastOf(this.pages).exit : undefined;
    const seed = this.settings.seed + this.arrivedAnswers;

    void this.pageSource.paginate(content, seed, exitBefore).then(({ pages }) => {
      if (question === this.latestQuestion) this.startAnswer(pages, question);
    });
  }

  private startAnswer(newPages: readonly MazePage[], question: number): void {
    this.arrivedAnswers++;
    this.answerPages = newPages;
    this.answerQuestion = question;
    this.run = 0;
    this.hasWriting = newPages.some((page) => page.route.some(({ kind }) => kind === "letter"));
    const wantsRepeats = this.hasWriting && !this.motion.isReduced;
    this.runs = wantsRepeats ? Math.max(1, this.settings.keywordRuns) : 1;
    const hadPages = this.pages.length > 0;
    this.pages.push(...newPages);

    if (this.currentPhase === "resting") this.enterPhase("writing");
    if (this.currentPhase === "waiting") {
      if (hadPages) this.enterPhase("scrolling");
      else this.startPage(0);
    }
  }

  /** Setzt den Lichtpunkt an den Anfang der Seite und vergisst die Spur. */
  private startPage(pageIndex: number): void {
    // Seiten, die schon zu sehen waren, werden nicht mehr gebraucht
    this.pages = this.pages.slice(pageIndex);
    this.pageIndex = 0;
    this.walker = new RouteWalker(itemAt(this.pages, 0).route);
    this.trail.reset();
    this.enterPhase("writing");
  }

  private isRushingPage(page: MazePage): boolean {
    return this.rushedPages.has(page);
  }

  /**
   * Wohin der Lichtpunkt läuft: zum Haltepunkt, wenn dies die letzte Seite ist und er ihn noch
   * nicht hinter sich hat, sonst zum Ausgang.
   */
  private targetStep(walker: RouteWalker, page: MazePage): number {
    const lastStep = page.route.length - 1;
    const isLastPage = this.pageIndex === this.pages.length - 1 && !this.repeatsAfter(page);
    const restingStep = Math.min(this.pageSource.restingStepOf(page), lastStep);
    return isLastPage && !walker.hasReached(restingStep) ? restingStep : lastStep;
  }

  private walk(seconds: number): void {
    const page = itemAt(this.pages, this.pageIndex);
    const walker = this.walker;
    const target = this.targetStep(walker, page);
    const isRushing = this.isRushingPage(page);

    const { stepsDoneBefore, stepsDoneNow } = walker.walk(seconds, target, (kind) =>
      paceOf(kind, isRushing, this.settings),
    );
    this.trail.markWalked(stepsDoneBefore, stepsDoneNow, this.clock);

    if (walker.hasReached(page.route.length - 1)) this.enterPhase("fading");
    else if (walker.hasReached(target)) this.enterPhase("resting");
  }

  private fade(): void {
    const page = itemAt(this.pages, this.pageIndex);
    const lifetime = this.settings.holdSeconds + this.settings.fadeSeconds;
    if (this.repeatsAfter(page)) {
      if (this.secondsInPhase() >= lifetime + this.settings.runPauseSeconds) this.startNextRun();
      return;
    }
    // Im Schnelldurchlauf wird das Verglimmen nicht abgewartet: Die Spur verglimmt beim Weiterschieben.
    const trailIsGone = this.secondsInPhase() >= lifetime || this.isRushingPage(page);
    if (trailIsGone) this.enterPhase(this.nextPage === undefined ? "waiting" : "scrolling");
  }

  /**
   * Folgt nach dieser Seite ein weiterer Durchlauf? Ja, wenn sie die letzte Seite der Antwort ist,
   * noch Durchläufe fehlen und inzwischen keine neue Frage gestellt wurde.
   */
  private repeatsAfter(page: MazePage): boolean {
    return (
      page === this.answerPages.at(-1) &&
      this.run < this.runs - 1 &&
      this.latestQuestion === this.answerQuestion
    );
  }

  /** Beginnt den nächsten Durchlauf auf der ersten Seite der Antwort, im selben Labyrinth. */
  private startNextRun(): void {
    this.run++;
    this.pages = [...this.answerPages];
    this.startPage(0);
  }

  /** Bleibt die Schrift stehen? Im letzten Durchlauf einer Antwort mit Schrift, auf ihren Seiten. */
  private keepsWriting(): boolean {
    const page = this.currentPage;
    return (
      this.hasWriting &&
      page !== undefined &&
      this.run === this.runs - 1 &&
      this.answerPages.includes(page)
    );
  }
}
