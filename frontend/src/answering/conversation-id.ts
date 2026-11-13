/** Der Teil von `crypto`, den `newConversationId` braucht. */
export type ConversationCrypto = Pick<Crypto, "getRandomValues"> & {
  readonly randomUUID?: () => string;
};

const ID_BYTES = 16;

/**
 * Eine zufällige Gesprächs-ID (Backend-ADR 0005), einmal je Seitenaufruf. Im Browser
 * `crypto.randomUUID()`; das gibt es nur auf https oder localhost. Sonst (etwa das Handy am
 * Dev-Server über die LAN-Adresse) 32 Hexziffern aus `getRandomValues`, das es überall gibt.
 */
export function newConversationId(cryptoSource: ConversationCrypto): string {
  if (cryptoSource.randomUUID !== undefined) return cryptoSource.randomUUID();
  const bytes = cryptoSource.getRandomValues(new Uint8Array(ID_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
