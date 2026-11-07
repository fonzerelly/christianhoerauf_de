import { describe, expect, it } from "vitest";
import type { Answer } from "../answering/answer";
import type { AnswerSource } from "../answering/answer-source";
import type { AnswerContent } from "../domain/pages/answer-content";
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
  const shown: Promise<AnswerContent>[] = [];
  /** Was der Antwortbereich zeigt, als Kurzschrift: „warten: Frage“ oder „Frage → Text“. */
  const area: string[] = [];
  const conversation = new Conversation(
    source,
    {
      show: (reply) => {
        shown.push(reply);
      },
    },
    {
      showWaiting: (question) => {
        area.push(`warten: ${question}`);
      },
      showAnswer: (question, answer) => {
        area.push(`${question ?? "(keine Frage)"} → ${answer.text}`);
      },
    },
  );
  return { source, shown, area, conversation };
}

describe("Conversation", () => {
  describe("start", () => {
    it("schreibt das Stichwort der Begrüßung mit bis zu zwei Zeilen je Seite, ohne die Quelle zu fragen", async () => {
      const { conversation, source, shown, area } = setup();

      conversation.start({ text: "Hallo Frau Muster, schön …", keyword: "Hallo\nFrau Muster" });
      await settle();

      expect(source.questions).toEqual([]);
      await expect(shown[0]).resolves.toEqual({
        keyword: "Hallo\nFrau Muster",
        maxLinesPerPage: 2,
      });
      expect(area).toEqual(["(keine Frage) → Hallo Frau Muster, schön …"]);
    });
  });

  describe("ask", () => {
    it("schickt die Frage an die Quelle, schreibt das Stichwort und zeigt erst das Warten, dann die Antwort", async () => {
      const { conversation, source, shown, area } = setup();

      conversation.ask("Wer bist du?");
      source.respond(0, { text: "Christian Hörauf.", keyword: "CHRIS" });
      await settle();

      expect(source.questions).toEqual(["Wer bist du?"]);
      await expect(shown[0]).resolves.toEqual({ keyword: "CHRIS", maxLinesPerPage: 1 });
      expect(area).toEqual(["warten: Wer bist du?", "Wer bist du? → Christian Hörauf."]);
    });

    it("ignoriert ein Gimmick, das das Frontend noch nicht darstellt", async () => {
      const { conversation, source, shown } = setup();

      conversation.ask("Wetter?");
      source.respond(0, { text: "14 Grad", gimmick: { type: "weather", temperature: 14 } });
      await settle();

      await expect(shown[0]).resolves.toEqual({ maxLinesPerPage: 1 });
    });

    it("zeichnet zum Herz-Gimmick ein Herz und zeigt den Text", async () => {
      const { conversation, source, shown, area } = setup();

      conversation.ask("Ich liebe dich, Bot");
      source.respond(0, { text: "<3", keyword: "HERZ", gimmick: { type: "heart" } });
      await settle();

      await expect(shown[0]).resolves.toEqual({ picture: "heart", keyword: "HERZ" });
      expect(area).toEqual(["warten: Ich liebe dich, Bot", "Ich liebe dich, Bot → <3"]);
    });

    it("zeigt nur die Antwort auf die neueste Frage, auch wenn eine ältere später eintrifft", async () => {
      const { conversation, source, area } = setup();

      conversation.ask("erste");
      conversation.ask("zweite");
      source.respond(1, { text: "zweite Antwort" });
      await settle();
      source.respond(0, { text: "erste Antwort" });
      await settle();

      expect(area).toEqual(["warten: erste", "warten: zweite", "zweite → zweite Antwort"]);
    });
  });
});
