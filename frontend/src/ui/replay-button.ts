/** Verbindet den Knopf „Nochmal“ neben dem Fragefeld mit seiner Aktion: Er schreibt die letzte Antwort noch einmal. */
export function connectReplayButton(
  button: { addEventListener(type: string, listener: () => void): void },
  onReplay: () => void,
): void {
  button.addEventListener("click", onReplay);
}
