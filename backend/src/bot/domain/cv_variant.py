"""Varianten des Lebenslaufs: benannte Auswahlen, die nur durch Weglassen entstehen.

Jede Variante hat einen sprechenden Namen (etwa `nur_berufsweg`), eine nichtssagende Nummer für
den persönlichen Link und eine Liste `ohne` aus Abschnitten oder Stationen. Dieselbe Auswahl
gilt im PDF und auf der Webseite (siehe docs/bewerbung/).
"""

from collections.abc import Iterable, Mapping
from dataclasses import dataclass

from bot.domain.cv import SECTIONS, CvStation


class InvalidVariantError(ValueError):
    """Eine Variante oder ein `lebenslauf_ohne` passt nicht."""


@dataclass(frozen=True)
class Variant:
    name: str
    number: int
    description: str
    omissions: tuple[str, ...]


def parse_variants(data: object, station_names: set[str]) -> dict[str, Variant]:
    """Die Varianten aus der Variantendatei, schon gelesen als YAML.

    Eine leere Datei (None) heißt: keine Varianten. Jeder Name in `ohne` muss ein Abschnitt oder
    eine Station sein, jede Nummer darf nur einmal vorkommen. Sonst InvalidVariantError mit dem
    Namen der Variante."""
    if data is None:
        return {}
    if not isinstance(data, Mapping):
        raise InvalidVariantError("Die Variantendatei muss eine Zuordnung Name → Variante sein")
    variants = {
        str(name): _parse_variant(str(name), entry, station_names) for name, entry in data.items()
    }
    owners: dict[int, str] = {}
    for variant in variants.values():
        if variant.number in owners:
            raise InvalidVariantError(
                f"Nummer {variant.number} doppelt: {owners[variant.number]} und {variant.name}"
            )
        owners[variant.number] = variant.name
    return variants


def _parse_variant(name: str, entry: object, station_names: set[str]) -> Variant:
    if not isinstance(entry, Mapping):
        raise InvalidVariantError(f"{name}: erwartet nummer, beschreibung und ohne")
    number = entry.get("nummer")
    if not isinstance(number, int) or isinstance(number, bool):
        raise InvalidVariantError(f"{name}: nummer muss eine Zahl sein, gefunden: {number!r}")
    description = entry.get("beschreibung")
    if not isinstance(description, str):
        raise InvalidVariantError(f"{name}: beschreibung muss ein Text sein")
    omissions = entry.get("ohne")
    if not isinstance(omissions, list) or not all(isinstance(item, str) for item in omissions):
        raise InvalidVariantError(f"{name}: ohne muss eine Liste von Namen sein")
    check_omissions(omissions, station_names, origin=name)
    return Variant(name, number, description, tuple(omissions))


def check_omissions(names: Iterable[str], station_names: set[str], *, origin: str) -> None:
    """Jeder Name muss ein Abschnitt (beruf, lehre, …) oder eine Station sein.

    `origin` sagt in der Fehlermeldung, woher die Namen kommen (Variante oder lebenslauf_ohne)."""
    unknown = [name for name in names if name not in SECTIONS and name not in station_names]
    if unknown:
        raise InvalidVariantError(f"{origin}: weder Abschnitt noch Station: {', '.join(unknown)}")


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
