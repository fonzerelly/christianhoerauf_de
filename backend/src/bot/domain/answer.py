from collections.abc import Mapping
from dataclasses import dataclass


@dataclass(frozen=True)
class Answer:
    """Antwort des Bots (Vertrag laut ADR system/0003): `text` immer, `gimmick` optional;
    Antworten aus der Wissensbasis dazu womöglich ein Stichwort (`keyword`) und Folgefragen
    (`suggestions`)."""

    text: str
    gimmick: dict[str, object] | None = None
    keyword: str | None = None
    suggestions: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, object]:
        """Die Antwort als JSON-fähiges Dict. Was fehlt (kein Gimmick, kein Stichwort, keine
        Folgefragen), steht gar nicht darin."""
        result: dict[str, object] = {"text": self.text}
        if self.gimmick is not None:
            result["gimmick"] = self.gimmick
        if self.keyword is not None:
            result["keyword"] = self.keyword
        if self.suggestions:
            result["suggestions"] = list(self.suggestions)
        return result

    @classmethod
    def from_dict(cls, data: Mapping[str, object]) -> Answer:
        """Der Rückweg von `to_dict`, etwa für den Zwischenspeicher. Was fehlt oder nicht den
        passenden Typ hat, gilt als nicht vorhanden."""
        gimmick = data.get("gimmick")
        keyword = data.get("keyword")
        suggestions = data.get("suggestions")
        return cls(
            text=str(data["text"]),
            gimmick=gimmick if isinstance(gimmick, dict) else None,
            keyword=keyword if isinstance(keyword, str) else None,
            suggestions=tuple(str(s) for s in suggestions) if isinstance(suggestions, list) else (),
        )
