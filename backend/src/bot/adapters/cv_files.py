"""Liest Stationen und Varianten für den Lebenslauf von der Platte.

Braucht PyYAML. Das steht bisher nur in der Entwicklungsgruppe: Der Bot im Lambda-Paket
importiert dieses Modul nicht. Für den Lebenslauf-Endpunkt (Schritt 13 im Plan der Bewerbung)
muss PyYAML zu den Laufzeitabhängigkeiten.
"""

from collections.abc import Mapping
from pathlib import Path

import yaml

from bot.domain.cv import CvStation, parse_station
from bot.domain.cv_variant import Variant, parse_variants

_RELEASED = "ja"


def read_cv_stations(knowledge_base: Path) -> list[CvStation]:
    """Alle freigegebenen Stationen aus `knowledge_base/stationen/`, sortiert nach Dateiname.

    Der Name einer Station ist ihr Dateiname ohne `.md`. Ein falsches Lebenslauf-Feld bricht mit
    InvalidStationError ab (Station und Feld stehen in der Meldung)."""
    stations = []
    for path in sorted((knowledge_base / "stationen").glob("*.md")):
        header = _header(path.read_text(encoding="utf-8"))
        if header.get("freigegeben") == _RELEASED:
            stations.append(parse_station(path.stem, header))
    return stations


def read_variants(path: Path, station_names: set[str]) -> dict[str, Variant]:
    """Die Varianten aus der YAML-Datei `path`; fehlt sie oder ist sie leer: keine Varianten."""
    if not path.is_file():
        return {}
    return parse_variants(yaml.safe_load(path.read_text(encoding="utf-8")), station_names)


def _header(text: str) -> Mapping[str, object]:
    """Der Kopfteil zwischen den ersten beiden `---`-Zeilen, gelesen als YAML."""
    _, header, _ = text.split("---\n", 2)
    loaded = yaml.safe_load(header)
    return loaded if isinstance(loaded, Mapping) else {}
