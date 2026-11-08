import type { ElementFactory, ElementLike } from "../ui/dom-like";

/**
 * Ein Element als einfaches Objekt: merkt sich Text, Klassen, Kinder, Attribute, Stil und
 * Klick-Hörer. Maße gibt es keine; wer misst, bekommt im Test eine eigene Funktion.
 */
export class FakeElement implements ElementLike<FakeElement> {
  public textContent: string | null = "";
  public className = "";
  public hidden: boolean | string = false;
  public scrollLeft = 0;
  /** Wie oft das Element den Fokus bekam. */
  public focused = 0;
  public children: FakeElement[] = [];
  public readonly attributes = new Map<string, string>();
  private readonly styles = new Map<string, string>();
  private readonly classes = new Set<string>();
  private readonly clickListeners: (() => void)[] = [];

  public constructor(public readonly tag: string) {}

  public readonly classList = {
    toggle: (name: string, force: boolean): boolean => {
      if (force) this.classes.add(name);
      else this.classes.delete(name);
      return force;
    },
  };

  public readonly style = {
    setProperty: (name: string, value: string): void => {
      this.styles.set(name, value);
    },
  };

  /** Hat das Element die Klasse (über `classList`)? */
  public hasClass(name: string): boolean {
    return this.classes.has(name);
  }

  /** Der gesetzte Stil, etwa `styleOf("left")` → "12px". */
  public styleOf(name: string): string | undefined {
    return this.styles.get(name);
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  public replaceChildren(...children: FakeElement[]): void {
    this.children = children;
  }

  public addEventListener(_type: "click", listener: () => void): void {
    this.clickListeners.push(listener);
  }

  public focus(): void {
    this.focused++;
  }

  /** Löst einen Klick aus. */
  public click(): void {
    this.clickListeners.forEach((listener) => {
      listener();
    });
  }

  /** Die Kinder als Kurzschrift `Klasse: Text`, zum Vergleichen im Test. */
  public childTexts(): string[] {
    return this.children.map((child) => `${child.className}: ${child.textContent ?? ""}`);
  }

  /** Alle Nachfahren mit dieser Klasse (unter `className` als ganzes Wort), in Dokumentreihenfolge. */
  public findAll(className: string): FakeElement[] {
    return this.children.flatMap((child) => [
      ...(child.className.split(" ").includes(className) ? [child] : []),
      ...child.findAll(className),
    ]);
  }

  /** Der Text samt aller Nachfahren, wie `textContent` im DOM. */
  public allText(): string {
    return (this.textContent ?? "") + this.children.map((child) => child.allText()).join("");
  }
}

/** Legt `FakeElement`s an. */
export const fakeDocument: ElementFactory<FakeElement> = {
  createElement: (tag) => new FakeElement(tag),
};
