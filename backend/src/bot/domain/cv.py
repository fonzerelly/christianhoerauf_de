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
    """Ein Lebenslauf-Feld im Kopfteil einer Station fehlt oder hat ein falsches Format."""


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


def parse_station(name: str, header: Mapping[str, object]) -> CvStation:
    """Die Lebenslauf-Felder aus dem Kopfteil der Station `name`.

    Wirft InvalidStationError mit Station und Feld, wenn ein Feld fehlt oder nicht passt."""

    def field(key: str) -> object:
        if key not in header:
            raise InvalidStationError(f"{name}: Feld {key} fehlt")
        return header[key]

    def fail(key: str, expected: str) -> InvalidStationError:
        return InvalidStationError(f"{name}: Feld {key} {expected}, gefunden: {header[key]!r}")

    section = field("abschnitt")
    if section not in SECTIONS:
        raise fail("abschnitt", f"muss einer von {', '.join(SECTIONS)} sein")

    def year_month(key: str) -> YearMonth:
        value = field(key)
        try:
            return YearMonth.parse(value)
        except ValueError as error:
            raise fail(key, "erwartet JJJJ-MM oder JJJJ") from error

    start = year_month("von")
    end = None if field("bis") == ONGOING else year_month("bis")

    title = field("lebenslauf_titel")
    if not isinstance(title, str) or not title:
        raise fail("lebenslauf_titel", "muss ein Text sein")
    organisation = field("lebenslauf_organisation")
    if not isinstance(organisation, str):
        raise fail("lebenslauf_organisation", "muss ein Text sein (darf leer sein)")
    points = field("stichpunkte")
    if not isinstance(points, list) or not all(isinstance(point, str) for point in points):
        raise fail("stichpunkte", "muss eine Liste von Texten sein")

    return CvStation(name, str(section), start, end, title, organisation, tuple(points))


def period_label(station: CvStation, *, with_months: bool) -> str:
    """Der Zeitraum, wie er links im Lebenslauf steht."""

    def show(point: YearMonth) -> str:
        if with_months and point.month is not None:
            return f"{point.month:02d}/{point.year}"
        return str(point.year)

    if station.end is None:
        return f"{show(station.start)} – {ONGOING}"
    start, end = show(station.start), show(station.end)
    return start if start == end else f"{start} – {end}"


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
