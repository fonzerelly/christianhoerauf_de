"""Varianten des Lebenslaufs: Auswahlen, die nur durch Weglassen entstehen.

In der Variantendatei stehen nur Schalter, etwa `ehrenamt: [informatik-kurse-grundschule]`.
Daraus entstehen alle Kombinationen als Varianten mit festem Namen (`ohne_` und die Schalter in
Dateireihenfolge, verbunden mit `_und_`) und einer Nummer, die aus dem Namen errechnet wird.
So gibt es jede Variante überall, ohne dass für eine neue Bewerbung das Backend neu ausgerollt
werden muss. Dieselbe Auswahl gilt im PDF und auf der Webseite (siehe docs/bewerbung/).
"""

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from itertools import combinations

from bot.domain.cv import SECTIONS, CvStation
from bot.domain.personal_link import fnv1a

PREFIX = "ohne_"
JOINER = "_und_"
_SWITCH_NAME = re.compile(r"[a-z][a-z0-9_]*")


class InvalidVariantError(ValueError):
    """Die Variantendatei passt nicht."""


@dataclass(frozen=True)
class Switch:
    name: str
    omissions: tuple[str, ...]


@dataclass(frozen=True)
class Variant:
    name: str
    number: int
    omissions: tuple[str, ...]


def parse_switches(data: object, known_names: set[str]) -> tuple[Switch, ...]:
    """Die Schalter aus der schon als YAML geladenen Variantendatei, in Dateireihenfolge.

    Erwartet `schalter:` mit Name → Liste von Abschnitten, Stationen oder Projekten
    (`known_names`). Eine leere Datei (None) heißt: keine Schalter, nur der ganze Lebenslauf."""
    if data is None:
        return ()
    entries = data.get("schalter") if isinstance(data, Mapping) else None
    if not isinstance(entries, Mapping):
        raise InvalidVariantError("Die Variantendatei braucht `schalter:` mit Name → Liste")
    return tuple(_parse_switch(str(name), names, known_names) for name, names in entries.items())


def _parse_switch(name: str, names: object, known_names: set[str]) -> Switch:
    if not _SWITCH_NAME.fullmatch(name):
        raise InvalidVariantError(f"{name}: nur Kleinbuchstaben, Ziffern und _ erlaubt")
    if JOINER.strip("_") in name.split("_"):
        raise InvalidVariantError(f"{name}: darf {JOINER} nicht enthalten, das trennt Schalter")
    if not isinstance(names, list) or not names or not all(isinstance(n, str) for n in names):
        raise InvalidVariantError(f"{name}: erwartet eine nicht leere Liste von Namen")
    unknown = [n for n in names if n not in SECTIONS and n not in known_names]
    if unknown:
        raise InvalidVariantError(f"{name}: unbekannt: {', '.join(unknown)}")
    return Switch(name, tuple(names))


def parse_project_list(data: object, known_projects: set[str]) -> tuple[str, ...]:
    """Die Projekte unter `projekte:` der Variantendatei: Sie stehen im ganzen Lebenslauf.

    Fehlt die Liste, stehen keine Projekte darin. Ein unbekanntes Projekt (nicht in
    `known_projects`) oder etwas anderes als eine Liste von Namen → InvalidVariantError."""
    projects = data.get("projekte") if isinstance(data, Mapping) else None
    if projects is None:
        return ()
    if not isinstance(projects, list) or not all(isinstance(name, str) for name in projects):
        raise InvalidVariantError("projekte: erwartet eine Liste von Projektnamen")
    unknown = [name for name in projects if name not in known_projects]
    if unknown:
        raise InvalidVariantError(f"projekte: unbekannt: {', '.join(unknown)}")
    return tuple(projects)


def variant_number(name: str) -> int:
    """Die vierstellige Nummer einer Variante, errechnet aus ihrem Namen (FNV-1a).

    Sie steht nirgends und bleibt für denselben Namen immer gleich; so bleiben verschickte Links
    gültig, auch wenn neue Schalter dazukommen."""
    return 1000 + fnv1a(name) % 9000


def all_variants(switches: tuple[Switch, ...]) -> dict[str, Variant]:
    """Jede Kombination der Schalter als Variante: erst die einzelnen, dann Paare, dann mehr.

    Zwei Varianten mit derselben Nummer → InvalidVariantError (dann einen Schalter umbenennen)."""
    variants: dict[str, Variant] = {}
    owners: dict[int, str] = {}
    for size in range(1, len(switches) + 1):
        for chosen in combinations(switches, size):
            name = PREFIX + JOINER.join(switch.name for switch in chosen)
            number = variant_number(name)
            if number in owners:
                raise InvalidVariantError(f"Nummer {number} doppelt: {owners[number]} und {name}")
            owners[number] = name
            omissions = tuple(item for switch in chosen for item in switch.omissions)
            variants[name] = Variant(name, number, omissions)
    return variants


def omit(stations: Iterable[CvStation], names: Iterable[str]) -> list[CvStation]:
    """Lässt jede Station weg, deren Name oder Abschnitt unter `names` steht."""
    left_out = set(names)
    return [
        station
        for station in stations
        if station.name not in left_out and station.section not in left_out
    ]


def variant_by_number(variants: Mapping[str, Variant], number: int) -> Variant | None:
    """Die Variante mit dieser Nummer; None bei unbekannter Nummer (dann ganzer Lebenslauf)."""
    return next((variant for variant in variants.values() if variant.number == number), None)
