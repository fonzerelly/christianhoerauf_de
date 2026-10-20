from dataclasses import dataclass


@dataclass(frozen=True)
class Answer:
    """Antwort des Bots (Vertrag laut ADR system/0003): `text` immer, `gimmick` optional."""

    text: str
    gimmick: dict[str, object] | None = None

    def to_dict(self) -> dict[str, object]:
        """Die Antwort als JSON-fähiges Dict; ohne Gimmick fehlt der Schlüssel `gimmick`."""
        result: dict[str, object] = {"text": self.text}
        if self.gimmick is not None:
            result["gimmick"] = self.gimmick
        return result
