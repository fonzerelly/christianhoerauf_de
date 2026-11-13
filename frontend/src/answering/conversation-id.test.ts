import { describe, expect, it } from "vitest";
import { newConversationId } from "./conversation-id";

/** So prüft das Backend die Gesprächs-ID (`backend/schema/request.schema.json`). */
const BACKEND_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

describe("newConversationId", () => {
  it("nimmt randomUUID, wenn der Browser es hat", () => {
    const id = newConversationId({
      randomUUID: () => "4f1c2a9e-0b7d-4c55-9d3e-2a6b8f0c1d2e",
      getRandomValues: <T extends Exclude<BufferSource, ArrayBuffer>>(array: T) => array,
    });

    expect(id).toBe("4f1c2a9e-0b7d-4c55-9d3e-2a6b8f0c1d2e");
  });

  it("baut ohne randomUUID (Seite ohne https) 32 Hexziffern aus Zufallsbytes", () => {
    const id = newConversationId({
      getRandomValues: <T extends Exclude<BufferSource, ArrayBuffer>>(array: T) => {
        new Uint8Array(array.buffer).forEach((_, index, bytes) => {
          bytes[index] = index * 17;
        });
        return array;
      },
    });

    expect(id).toBe("00112233445566778899aabbccddeeff");
    expect(id).toMatch(BACKEND_PATTERN);
  });

  it("passt im Browser zum Muster des Backends", () => {
    expect(newConversationId(crypto)).toMatch(BACKEND_PATTERN);
  });
});
