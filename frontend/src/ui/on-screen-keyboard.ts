/**
 * Ob das Fragefeld nach dem Senden verlassen wird. Das schließt die Bildschirmtastatur, damit
 * das Labyrinth zu sehen ist. Das gilt nur, wenn das Profil es will (Handy) und das Gerät einen
 * Touchscreen hat: Am Rechner im schmalen Fenster gilt zwar das Handy-Profil, aber es gibt keine
 * Bildschirmtastatur, und das Feld behält den Fokus für die nächste Frage.
 */
export function closesKeyboardAfterSending(
  profileWants: boolean,
  hasTouchScreen: boolean,
): boolean {
  return profileWants && hasTouchScreen;
}
