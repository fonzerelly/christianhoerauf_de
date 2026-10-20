import { describe, expect, it } from "vitest";
import type { Answer } from "../answering/answer";
import type { AnswerSource } from "../answering/answer-source";
import { Conversation } from "./conversation";

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

/** Eine Antwortquelle, deren Antworten der Test von Hand einlöst. */
class ManualSource implements AnswerSource {
  public readonly questions: string[] = [];
  private readonly resolvers: ((answer: Answer) => void)[] = [];

  public answer(question: string): Promise<Answer> {
    this.questions.push(question);
    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  /** Löst die Antwort der n-ten Frage ein. */
  public respond(index: number, answer: Answer): void {
    this.resolvers[index]?.(answer);
  }
}

function setup() {
  const source = new ManualSource();
  const shown: Promise<string>[] = [];
  const spoken: string[] = [];
  const conversation = new Conversation(
    source,
    {
      show: (reply) => {
        shown.push(reply);
      },
    },
    {
      show: (text) => {
        spoken.push(text);
      },
    },
  );
  return { source, shown, spoken, conversation };
}

describe("Conversation", () => {
  describe("start", () => {
    it("holt die Begrüßung mit einer leeren Frage und zeigt ihren Text", async () => {
      const { conversation, source, shown, spoken } = setup();

      conversation.start();
      source.respond(0, { text: "Willkommen" });
      await settle();

      expect(source.questions).toEqual([""]);
      await expect(shown[0]).resolves.toBe("Willkommen");
      expect(spoken).toEqual(["Willkommen"]);
    });
  });

  describe("ask", () => {
    it("schickt die Frage an die Quelle und zeigt den Text der Antwort", async () => {
      const { conversation, source, shown, spoken } = setup();

      conversation.ask("Wer bist du?");
      source.respond(0, { text: "Christian" });
      await settle();

      expect(source.questions).toEqual(["Wer bist du?"]);
      await expect(shown[0]).resolves.toBe("Christian");
      expect(spoken).toEqual(["Christian"]);
    });

    it("zeigt nur den Text und ignoriert ein Gimmick, das das Frontend noch nicht darstellt", async () => {
      const { conversation, source, shown } = setup();

      conversation.ask("Wetter?");
      source.respond(0, { text: "14 Grad", gimmick: { type: "weather", temperature: 14 } });
      await settle();

      await expect(shown[0]).resolves.toBe("14 Grad");
    });

    it("liest nur die Antwort auf die neueste Frage vor, auch wenn eine ältere später eintrifft", async () => {
      const { conversation, source, spoken } = setup();

      conversation.ask("erste");
      conversation.ask("zweite");
      source.respond(1, { text: "zweite Antwort" });
      await settle();
      source.respond(0, { text: "erste Antwort" });
      await settle();

      expect(spoken).toEqual(["zweite Antwort"]);
    });
  });

  describe("replay", () => {
    it("schreibt die letzte Antwort noch einmal, wie eine neue", async () => {
      const { conversation, source, shown, spoken } = setup();
      conversation.ask("Wer bist du?");
      source.respond(0, { text: "Christian" });
      await settle();

      conversation.replay();
      await settle();

      expect(source.questions).toEqual(["Wer bist du?"]);
      expect(shown).toHaveLength(2);
      await expect(shown[1]).resolves.toBe("Christian");
      expect(spoken).toEqual(["Christian", "Christian"]);
    });

    it("schreibt nichts, solange noch keine Antwort da ist", async () => {
      const { conversation, shown } = setup();

      conversation.replay();
      await settle();

      expect(shown).toEqual([]);
    });

    it("wiederholt die zuletzt eingetroffene Antwort, nicht eine, auf die noch gewartet wird", async () => {
      const { conversation, source, shown } = setup();
      conversation.ask("erste");
      source.respond(0, { text: "Erste Antwort" });
      await settle();
      conversation.ask("zweite"); // noch keine Antwort

      conversation.replay();
      await settle();

      await expect(shown[2]).resolves.toBe("Erste Antwort");
    });
  });
});
