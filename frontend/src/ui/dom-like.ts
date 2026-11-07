/**
 * Der Ausschnitt des DOM, den die Klassen in `ui/` zum Bauen von Inhalten brauchen. Echte Elemente
 * und `document` erfüllen ihn; im Test steht eine Attrappe (`test-support/fake-dom.ts`). `Child`
 * ist die Art der Kinder (im Browser `HTMLElement`), damit `replaceChildren` zum DOM passt.
 */
export interface ElementLike<Child> {
  textContent: string | null;
  className: string;
  /** Im DOM auch "until-found"; gesetzt wird hier nur wahr oder falsch. */
  hidden: boolean | string;
  scrollLeft: number;
  readonly classList: { toggle(name: string, force: boolean): boolean };
  readonly style: { setProperty(name: string, value: string): void };
  setAttribute(name: string, value: string): void;
  append(...children: Child[]): void;
  replaceChildren(...children: Child[]): void;
  addEventListener(type: "click", listener: () => void): void;
}

/** Legt neue Elemente an (im Browser `document`). */
export interface ElementFactory<Element> {
  createElement(tag: "p" | "button" | "div" | "span"): Element;
}
