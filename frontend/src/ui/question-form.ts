/** Ein Element, an das sich Ereignisse hängen lassen (ein Ausschnitt von `EventTarget`). */
interface Listenable {
  addEventListener(type: string, listener: (event: { preventDefault(): void }) => void): void;
}

export interface QuestionFormOptions {
  /** Nach dem Senden das Feld verlassen (schließt am Handy die Tastatur). */
  readonly blurAfterSending: boolean;
  /** Schiebt die Seite ganz nach oben. */
  readonly scrollToTop: () => void;
  /** Eine Frage wurde abgeschickt. */
  readonly onQuestion: (question: string) => void;
}

/**
 * Das Fragefeld mit seinem Senden-Knopf. Enter oder „Senden“ schickt die Frage ab, leere
 * Eingaben werden übergangen.
 */
export class QuestionForm {
  public constructor(
    form: Listenable,
    private readonly input: Listenable & { value: string; blur(): void },
    private readonly options: QuestionFormOptions,
  ) {
    form.addEventListener("submit", (event) => {
      event.preventDefault(); // sonst lädt der Browser die Seite neu
      this.submit();
    });
    // iOS verschiebt die Seite, um das Fragefeld über die Tastatur zu heben, und schiebt sie
    // nicht immer zurück. Beim Verlassen des Felds deshalb wieder ganz nach oben.
    input.addEventListener("blur", options.scrollToTop);
  }

  private submit(): void {
    const question = this.input.value.trim();
    if (question === "") return;

    this.options.onQuestion(question);
    this.input.value = "";
    if (this.options.blurAfterSending) this.input.blur();
  }
}
