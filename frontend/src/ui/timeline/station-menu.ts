import type { Station } from "../../domain/cv/stations";
import { entryQuestions } from "../../domain/cv/stations";
import type { ElementFactory, ElementLike } from "../dom-like";

/** So weit unter dem Knopf liegt das Menü. */
const GAP_BELOW_BUTTON = 4;

export interface StationMenuParts<Element extends ElementLike<Element>> {
  /** Legt die Einträge an (im Browser `document`). */
  readonly document: ElementFactory<Element>;
  /** Das Menü (`#station-menu`, absolut auf der Seite). */
  readonly menu: Element;
  /** Das Fragefeld: Die gewählte Frage kommt dort hinein. */
  readonly questionInput: { value: string; focus(): void };
  /** Eine Einstiegsfrage wurde gewählt (die Zeitleiste klappt zu). */
  readonly onChosen: () => void;
  /** Lage des Knopfs im Fenster und Breite des Menüs (`getBoundingClientRect`, `offsetWidth`). */
  readonly buttonRect: (button: Element) => { left: number; bottom: number };
  readonly menuWidth: (menu: Element) => number;
  readonly viewportWidth: () => number;
  /** Wie weit die Seite gescrollt ist (`scrollX`, `scrollY`). */
  readonly pageScroll: () => { x: number; y: number };
  /** So viel Abstand hält das Menü zum Rand des Fensters (der Rand der Seite). */
  readonly edge: number;
  /** Liegt `target` in `element` (`Node.contains`)? */
  readonly contains: (element: Element, target: unknown) => boolean;
}

/**
 * Das Stationsmenü (Q8, Q21, Q22, Q44): Ein Klick auf eine Station oder ein Engagement öffnet unter
 * ihrem Knopf ein Menü mit Kopfzeile (Zeitraum · Titel · Organisation) und den Einstiegsfragen; es
 * liegt über Antwort und Fragefeld und nie über den Rand des Fensters hinaus. Eine gewählte Frage
 * kommt ins Fragefeld (sie wird nicht abgeschickt), die Zeitleiste klappt zu, der Fokus geht ins
 * Feld. Es ist höchstens eins offen; ein zweiter Klick auf denselben Knopf, Esc oder ein Klick
 * daneben schließt es; nach Esc hat der Knopf wieder den Fokus. Der Knopf zeigt den Zustand in
 * `aria-expanded`.
 */
export class StationMenu<Element extends ElementLike<Element>> {
  /** Der Knopf, zu dem das offene Menü gehört; `undefined`, wenn keins offen ist. */
  private openFor: Element | undefined;

  public constructor(private readonly parts: StationMenuParts<Element>) {}

  /** Öffnet das Menü einer Station unter ihrem Knopf, oder schließt es, wenn es schon ihres ist. */
  public toggle(station: Station, button: Element): void {
    if (this.openFor === button) {
      this.close();
      return;
    }
    this.close();

    const { document, menu } = this.parts;
    const header = document.createElement("div");
    header.className = "station-menu-header";
    header.textContent = [station.time, station.title, station.organization]
      .filter((part) => part !== undefined)
      .join(" · ");
    const list = document.createElement("ul");
    const questions = entryQuestions(station).map(({ label, question }) => {
      const choice = document.createElement("button");
      choice.className = "station-menu-question";
      choice.setAttribute("type", "button");
      choice.setAttribute("title", question);
      choice.textContent = label;
      choice.addEventListener("click", () => {
        this.choose(question);
      });
      const item = document.createElement("li");
      item.append(choice);
      list.append(item);
      return choice;
    });
    menu.replaceChildren(header, list);
    menu.hidden = false;
    this.placeBelow(button);

    button.setAttribute("aria-expanded", "true");
    this.openFor = button;
    questions[0]?.focus();
  }

  /** Schließt das offene Menü (auch beim Neuzeichnen und Verschieben der Zeitleiste). */
  public close(): void {
    if (this.openFor === undefined) return;
    this.openFor.setAttribute("aria-expanded", "false");
    this.openFor = undefined;
    this.parts.menu.hidden = true;
  }

  /** Esc: schließt und gibt den Fokus an den Knopf zurück. */
  public escape(): void {
    const button = this.openFor;
    if (button === undefined) return;
    this.close();
    button.focus();
  }

  /** Ein Klick irgendwo auf der Seite: Liegt er weder im Menü noch auf dem Knopf, schließt es. */
  public documentClicked(target: unknown): void {
    const button = this.openFor;
    if (button === undefined) return;
    const { contains, menu } = this.parts;
    if (contains(menu, target) || contains(button, target)) return;
    this.close();
  }

  private choose(question: string): void {
    const { questionInput, onChosen } = this.parts;
    questionInput.value = question;
    this.close();
    onChosen();
    questionInput.focus();
  }

  /** Unter den Knopf, aber nicht über den Rand des Fensters hinaus (Seitenkoordinaten). */
  private placeBelow(button: Element): void {
    const { menu, buttonRect, menuWidth, viewportWidth, pageScroll, edge } = this.parts;
    const at = buttonRect(button);
    const rightmost = viewportWidth() - menuWidth(menu) - edge;
    const left = Math.max(edge, Math.min(at.left, rightmost));
    const scroll = pageScroll();
    menu.style.setProperty("left", `${String(left + scroll.x)}px`);
    menu.style.setProperty("top", `${String(at.bottom + scroll.y + GAP_BELOW_BUTTON)}px`);
  }
}
