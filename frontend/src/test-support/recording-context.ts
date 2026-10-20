import type { DrawingContext } from "../rendering/drawing-context";

/** Schreibt einen Wert für die Aufzeichnung auf; Bilder erscheinen mit ihrem Namen. */
function describeValue(value: unknown): string {
  if (typeof value === "object" && value !== null && "addColorStop" in value) return "<gradient>";
  if (typeof value === "object" && value !== null && "name" in value) {
    return `<${String(value.name)}>`;
  }
  return String(value);
}

/**
 * Eine Attrappe für das Zeichenwerkzeug: zeichnet jeden Aufruf (`moveTo(1, 2)`) und jede gesetzte
 * Eigenschaft (`fillStyle = #fff`) in der Reihenfolge auf, in der sie geschehen. Liest man eine
 * Eigenschaft, kommt `undefined`.
 */
export function recordingContext(): { context: DrawingContext; calls: string[] } {
  const calls: string[] = [];
  const gradient = {
    addColorStop: (offset: number, color: string) => {
      calls.push(`gradient.addColorStop(${String(offset)}, ${color})`);
    },
  };

  const context = new Proxy(
    {},
    {
      get: (_target, name: string) =>
        name === "createRadialGradient"
          ? (...args: unknown[]) => {
              calls.push(`${name}(${args.map(describeValue).join(", ")})`);
              return gradient;
            }
          : (...args: unknown[]) => {
              calls.push(`${name}(${args.map(describeValue).join(", ")})`);
            },
      set: (_target, name: string, value: unknown) => {
        calls.push(`${name} = ${describeValue(value)}`);
        return true;
      },
    },
  ) as DrawingContext;
  return { context, calls };
}
