"""Liest Stationen und Varianten für den Lebenslauf von der Platte.

Braucht PyYAML. Das steht bisher nur in der Entwicklungsgruppe: Der Bot im Lambda-Paket
importiert dieses Modul nicht. Für den Lebenslauf-Endpunkt (Schritt 13 im Plan der Bewerbung)
muss PyYAML zu den Laufzeitabhängigkeiten.
"""

from collections.abc import Mapping
from pathlib import Path

import yaml

from bot.domain.cv import CvProject, CvStation, InvalidStationError, parse_project, parse_station
from bot.domain.cv_variant import (
    Variant,
    all_variants,
    parse_additions,
    parse_project_list,
    parse_switches,
)


def read_cv_stations(knowledge_base: Path) -> list[CvStation]:
    """Alle Stationen aus `knowledge_base/stationen/`, sortiert nach Dateiname.

    Der Name einer Station ist ihr Dateiname ohne `.md`. Ein falsches Lebenslauf-Feld bricht mit
    InvalidStationError ab (Station und Feld stehen in der Meldung)."""
    paths = sorted((knowledge_base / "stationen").glob("*.md"))
    return [parse_station(path.stem, _header(path)) for path in paths]


def read_cv_projects(knowledge_base: Path) -> list[CvProject]:
    """Alle Projekte aus `knowledge_base/projekte/`, sortiert nach Dateiname.

    Welche davon im Lebenslauf stehen, sagt `varianten.yaml` (read_cv_project_list). Jedes
    Projekt muss trotzdem gültige Felder haben, damit eine Variante es jederzeit nennen kann."""
    paths = sorted((knowledge_base / "projekte").glob("*.md"))
    return [parse_project(path.stem, _header(path)) for path in paths]


def read_cv_project_list(path: Path, known_projects: set[str]) -> tuple[str, ...]:
    """Die Projekte des ganzen Lebenslaufs aus `projekte:` der Variantendatei `path`.

    Fehlt die Datei: keine Projekte."""
    if not path.is_file():
        return ()
    return parse_project_list(yaml.safe_load(path.read_text(encoding="utf-8")), known_projects)


def read_variants(
    path: Path, station_names: set[str], project_names: set[str]
) -> dict[str, Variant]:
    """Alle Varianten aus den Schaltern der YAML-Datei `path`.

    Weglassen (`schalter:`) lassen sich Abschnitte, Stationen und Projekte, dazunehmen (`mit:`)
    nur Projekte. Fehlt die Datei oder ist sie leer: keine Varianten, nur der ganze Lebenslauf."""
    if not path.is_file():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    switches = parse_switches(data, station_names | project_names)
    return all_variants(switches, parse_additions(data, project_names))


def _header(path: Path) -> Mapping[str, object]:
    """Der Kopfteil zwischen den ersten beiden `---`-Zeilen, gelesen als YAML.

    Ist er kein gültiges YAML, nennt InvalidStationError Ordner und Datei."""
    _, header, _ = path.read_text(encoding="utf-8").split("---\n", 2)
    try:
        loaded = yaml.safe_load(header)
    except yaml.YAMLError as error:
        place = f"{path.parent.name}/{path.name}"
        raise InvalidStationError(f"{place}: Kopfteil ist kein gültiges YAML ({error})") from error
    return loaded if isinstance(loaded, Mapping) else {}
