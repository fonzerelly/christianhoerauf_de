/** Die Teile eines Knopfes, die der Ton-Knopf braucht. */
interface ToggleButton {
  addEventListener(type: string, listener: () => void): void;
  setAttribute(name: string, value: string): void;
}

/**
 * Verbindet den Ton-Knopf mit dem Brummen: Jeder Klick schaltet es um, und `aria-pressed` zeigt
 * (auch Screenreadern), ob es jetzt an ist. `toggle` sagt, ob das Brummen danach an ist.
 */
export function connectSoundToggle(button: ToggleButton, toggle: () => boolean): void {
  button.addEventListener("click", () => {
    button.setAttribute("aria-pressed", String(toggle()));
  });
}
