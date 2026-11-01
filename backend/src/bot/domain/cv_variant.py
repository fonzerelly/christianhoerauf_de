"""Varianten des Lebenslaufs: Auswahlen aus Weglassen und Dazunehmen.

In der Variantendatei stehen Schalter, die etwas weglassen (`schalter:`, etwa
`ehrenamt: [informatik-kurse-grundschule]`), und Schalter, die Projekte dazunehmen (`mit:`, etwa
`lehre: [isbn-kata]`). Daraus entstehen alle Kombinationen als Varianten mit festem Namen
(`ohne_` und die weglassenden Schalter, dann `_mit_` und die dazunehmenden, jeweils in
Dateireihenfolge und verbunden mit `_und_`) und einer Nummer, die aus dem Namen errechnet wird.
So gibt es jede Variante überall, ohne dass für eine neue Bewerbung das Backend neu ausgerollt
werden muss. Dieselbe Auswahl gilt im PDF und auf der Webseite (siehe docs/bewerbung/).
"""

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from itertools import combinations

from bot.domain.cv import SECTIONS, CvProject, CvStation
from bot.domain.personal_link import fnv1a

PREFIX = "ohne_"
WITH_PREFIX = "mit_"
JOINER = "_und_"
# Diese Wörter trennen im Namen einer Variante die Schalter; kein Schalter darf sie enthalten.
_RESERVED_WORDS = ("und", "mit")
_SWITCH_NAME = re.compile(r"[a-z][a-z0-9_]*")


class InvalidVariantError(ValueError):
    """Die Variantendatei passt nicht."""


@dataclass(frozen=True)
class Switch:
    name: str
    names: tuple[str, ...]  # was der Schalter weglässt oder dazunimmt


@dataclass(frozen=True)
class Variant:
    name: str
    number: int
    omissions: tuple[str, ...]
    additions: tuple[str, ...] = ()


def parse_switches(data: object, known_names: set[str]) -> tuple[Switch, ...]:
    """Die Schalter aus der schon als YAML geladenen Variantendatei, in Dateireihenfolge.

    Erwartet `schalter:` mit Name → Liste von Abschnitten, Stationen oder Projekten
    (`known_names`). Eine leere Datei (None) heißt: keine Schalter, nur der ganze Lebenslauf."""
    if data is None:
        return ()
    entries = data.get("schalter") if isinstance(data, Mapping) else None
    if not isinstance(entries, Mapping):
        raise InvalidVariantError("Die Variantendatei braucht `schalter:` mit Name → Liste")
    allowed = set(SECTIONS) | known_names
    return tuple(_parse_switch(str(name), names, allowed) for name, names in entries.items())


def _parse_switch(name: str, names: object, allowed: set[str]) -> Switch:
    if not _SWITCH_NAME.fullmatch(name):
        raise InvalidVariantError(f"{name}: nur Kleinbuchstaben, Ziffern und _ erlaubt")
    for word in _RESERVED_WORDS:
        if word in name.split("_"):
            raise InvalidVariantError(
                f"{name}: darf _{word}_ nicht enthalten, das trennt im Variantennamen die Schalter"
            )
    if not isinstance(names, list) or not names or not all(isinstance(n, str) for n in names):
        raise InvalidVariantError(f"{name}: erwartet eine nicht leere Liste von Namen")
    unknown = [n for n in names if n not in allowed]
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


def parse_additions(data: object, known_projects: set[str]) -> tuple[Switch, ...]:
    """Die Schalter unter `mit:`, die Projekte dazunehmen, in Dateireihenfolge.

    Fehlt `mit:`, gibt es keine. Ein Schalter nennt nur Projekte (`known_projects`), keine
    Stationen und keine Abschnitte; sonst InvalidVariantError wie bei `parse_switches`."""
    entries = data.get("mit") if isinstance(data, Mapping) else None
    if entries is None:
        return ()
    if not isinstance(entries, Mapping):
        raise InvalidVariantError("`mit:` erwartet Name → Liste von Projekten")
    return tuple(_parse_switch(str(name), names, known_projects) for name, names in entries.items())


def projects_for(
    projects: Iterable[CvProject], listed: tuple[str, ...], variant: Variant | None
) -> list[CvProject]:
    """Die Projekte, die im Lebenslauf der Variante stehen, in der Reihenfolge von `projects`.

    Das sind die aus `listed` (`projekte:` der Variantendatei) und die, die die Variante
    dazunimmt, ohne die, die sie weglässt. Ohne Variante: nur `listed`."""
    chosen = set(listed) | set(variant.additions if variant else ())
    left_out = set(variant.omissions if variant else ())
    return [item for item in projects if item.name in chosen and item.name not in left_out]


def variant_number(name: str) -> int:
    """Die vierstellige Nummer einer Variante, errechnet aus ihrem Namen (FNV-1a).

    Sie steht nirgends und bleibt für denselben Namen immer gleich; so bleiben verschickte Links
    gültig, auch wenn neue Schalter dazukommen."""
    return 1000 + fnv1a(name) % 9000


def _name(omitting: tuple[Switch, ...], adding: tuple[Switch, ...]) -> str:
    """`ohne_a_und_b`, `mit_c`, `ohne_a_mit_c_und_d`."""
    parts = []
    if omitting:
        parts.append(PREFIX + JOINER.join(switch.name for switch in omitting))
    if adding:
        parts.append(WITH_PREFIX + JOINER.join(switch.name for switch in adding))
    return "_".join(parts)


def _combinations(switches: tuple[Switch, ...]) -> list[tuple[Switch, ...]]:
    """Alle Auswahlen aus den Schaltern: erst einzelne, dann Paare, dann mehr."""
    return [
        chosen for size in range(1, len(switches) + 1) for chosen in combinations(switches, size)
    ]


def all_variants(
    switches: tuple[Switch, ...], additions: tuple[Switch, ...] = ()
) -> dict[str, Variant]:
    """Jede Kombination der Schalter als Variante.

    Zuerst die nur weglassenden, in der Reihenfolge von früher, damit Namen und Nummern alter
    Varianten gleich bleiben; dann je dazunehmender Auswahl: allein und mit jeder weglassenden.
    Zwei Varianten mit derselben Nummer → InvalidVariantError (dann einen Schalter umbenennen)."""
    nothing: tuple[Switch, ...] = ()
    pairs = [(omitting, nothing) for omitting in _combinations(switches)]
    for adding in _combinations(additions):
        pairs.append((nothing, adding))
        pairs.extend((omitting, adding) for omitting in _combinations(switches))
    variants: dict[str, Variant] = {}
    owners: dict[int, str] = {}
    for omitting, adding in pairs:
        name = _name(omitting, adding)
        number = variant_number(name)
        if number in owners:
            raise InvalidVariantError(f"Nummer {number} doppelt: {owners[number]} und {name}")
        owners[number] = name
        variants[name] = Variant(
            name,
            number,
            tuple(item for switch in omitting for item in switch.names),
            tuple(item for switch in adding for item in switch.names),
        )
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
