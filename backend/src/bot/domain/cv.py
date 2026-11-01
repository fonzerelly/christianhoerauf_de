"""Die Stationen der Wissensbasis als Einträge des Lebenslaufs (siehe docs/bewerbung/).

Liest die Lebenslauf-Felder aus dem Kopfteil einer Station, prüft sie und wendet die Datumsregel
an: Nur die zwei neuesten Stationen der Berufserfahrung zeigen Monate, alle anderen nur Jahre.
"""

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass

# Die Abschnitte in der Reihenfolge, in der der Lebenslauf sie zeigt.
SECTIONS = ("beruf", "lehre", "studium", "praktikum", "zivildienst", "schule")
ONGOING = "heute"
# So viele der neuesten Stationen der Berufserfahrung zeigen Monate.
JOBS_WITH_MONTHS = 2

_YEAR_MONTH = re.compile(r"(\d{4})(?:-(0[1-9]|1[0-2]))?")


class InvalidStationError(ValueError):
    """Ein Lebenslauf-Feld im Kopfteil einer Station oder eines Projekts fehlt oder passt nicht."""


@dataclass(frozen=True)
class YearMonth:
    """Ein Zeitpunkt aus `von` oder `bis`: Jahr, wenn bekannt auch Monat."""

    year: int
    month: int | None = None

    @staticmethod
    def parse(value: object) -> YearMonth:
        """Liest "2014-11" oder "2014".

        Ein Jahr darf auch eine Zahl sein: So speichert Obsidian es ohne Anführungszeichen."""
        text = str(value) if isinstance(value, int) and not isinstance(value, bool) else value
        match = _YEAR_MONTH.fullmatch(text) if isinstance(text, str) else None
        if match is None:
            raise ValueError(f"erwartet JJJJ-MM oder JJJJ, gefunden: {value!r}")
        month = match.group(2)
        return YearMonth(int(match.group(1)), int(month) if month else None)

    def _sort_key(self) -> tuple[int, int]:
        # Ein bloßes Jahr zählt wie Monat 0, liegt also vor allen Monaten desselben Jahres.
        return (self.year, self.month or 0)

    def __lt__(self, other: YearMonth) -> bool:
        return self._sort_key() < other._sort_key()


@dataclass(frozen=True)
class CvStation:
    name: str
    section: str
    start: YearMonth
    end: YearMonth | None  # None: läuft noch („heute“)
    title: str
    organisation: str
    points: tuple[str, ...]


@dataclass(frozen=True)
class CvEntry:
    station: CvStation
    period: str


class _Header:
    """Liest und prüft die Felder aus dem Kopfteil der Datei `name`.

    Jeder Fehler wird zu InvalidStationError mit Dateiname und Feld."""

    def __init__(self, name: str, header: Mapping[str, object]) -> None:
        self.name = name
        self.header = header

    def field(self, key: str) -> object:
        if key not in self.header:
            raise InvalidStationError(f"{self.name}: Feld {key} fehlt")
        return self.header[key]

    def fail(self, key: str, expected: str) -> InvalidStationError:
        found = self.header.get(key)
        return InvalidStationError(f"{self.name}: Feld {key} {expected}, gefunden: {found!r}")

    def text(self, key: str, *, may_be_empty: bool = False) -> str:
        value = self.field(key)
        if not isinstance(value, str) or not (value or may_be_empty):
            expected = (
                "muss ein Text sein (darf leer sein)" if may_be_empty else "muss ein Text sein"
            )
            raise self.fail(key, expected)
        return value

    def year_month(self, key: str) -> YearMonth:
        try:
            return YearMonth.parse(self.field(key))
        except ValueError as error:
            raise self.fail(key, "erwartet JJJJ-MM oder JJJJ") from error

    def end(self) -> YearMonth | None:
        """`bis`: ein Zeitpunkt oder „heute“ (dann None)."""
        return None if self.field("bis") == ONGOING else self.year_month("bis")


def parse_station(name: str, header: Mapping[str, object]) -> CvStation:
    """Die Lebenslauf-Felder aus dem Kopfteil der Station `name`.

    Wirft InvalidStationError mit Station und Feld, wenn ein Feld fehlt oder nicht passt."""
    fields = _Header(name, header)
    section = fields.field("abschnitt")
    if section not in SECTIONS:
        raise fields.fail("abschnitt", f"muss einer von {', '.join(SECTIONS)} sein")
    start = fields.year_month("von")
    end = fields.end()
    title = fields.text("titel")
    organisation = fields.text("organisation", may_be_empty=True)
    points = fields.field("stichpunkte")
    if not isinstance(points, list) or not all(isinstance(point, str) for point in points):
        raise fields.fail("stichpunkte", "muss eine Liste von Texten sein")
    return CvStation(name, str(section), start, end, title, organisation, tuple(points))


def _period(start: YearMonth, end: YearMonth | None, *, with_months: bool) -> str:
    def show(point: YearMonth) -> str:
        if with_months and point.month is not None:
            return f"{point.month:02d}/{point.year}"
        return str(point.year)

    if end is None:
        return f"{show(start)} – {ONGOING}"
    first, last = show(start), show(end)
    return first if first == last else f"{first} – {last}"


def period_label(station: CvStation, *, with_months: bool) -> str:
    """Der Zeitraum, wie er links im Lebenslauf steht."""
    return _period(station.start, station.end, with_months=with_months)


def cv_sections(stations: Iterable[CvStation]) -> dict[str, list[CvEntry]]:
    """Die Abschnitte in fester Reihenfolge (nur die mit Stationen), darin die neueste zuerst.

    Die zwei neuesten Stationen der Berufserfahrung zeigen Monate, alle anderen nur Jahre."""
    newest_first = sorted(stations, key=lambda station: station.start, reverse=True)
    sections: dict[str, list[CvEntry]] = {}
    for section in SECTIONS:
        members = [station for station in newest_first if station.section == section]
        if members:
            sections[section] = [
                CvEntry(
                    station,
                    period_label(
                        station, with_months=section == "beruf" and index < JOBS_WITH_MONTHS
                    ),
                )
                for index, station in enumerate(members)
            ]
    return sections


@dataclass(frozen=True)
class CvProject:
    name: str
    title: str
    start: YearMonth
    end: YearMonth | None  # None: läuft noch („heute“)
    text: str
    link: str | None


def parse_project(name: str, header: Mapping[str, object]) -> CvProject:
    """Das Projekt `name` als möglicher Eintrag unter „Projekte und Vorträge“.

    Ob es im Lebenslauf steht, entscheidet `varianten.yaml`. Pflicht sind `titel`,
    `zusammenfassung`, `von` und `bis`; `link` darf fehlen. Sonst InvalidStationError."""
    fields = _Header(name, header)
    link = header.get("link")
    if link is not None and not isinstance(link, str):
        raise fields.fail("link", "muss ein Text sein oder fehlen")
    return CvProject(
        name,
        fields.text("titel"),
        fields.year_month("von"),
        fields.end(),
        fields.text("zusammenfassung"),
        link or None,
    )


def project_period(project: CvProject) -> str:
    """Der Zeitraum eines Projekts, wie er links im Lebenslauf steht: nur Jahre."""
    return _period(project.start, project.end, with_months=False)


def cv_projects(projects: Iterable[CvProject]) -> list[CvProject]:
    """Das Projekt mit dem spätesten Jahr zuerst (laufende ganz vorn), bei Gleichstand nach Name."""

    def latest_year(project: CvProject) -> float:
        return float("inf") if project.end is None else project.end.year

    by_name = sorted(projects, key=lambda project: project.name)
    # sorted ist stabil, auch rückwärts: Bei gleichem Jahr bleibt die Reihenfolge nach Name.
    return sorted(by_name, key=latest_year, reverse=True)
