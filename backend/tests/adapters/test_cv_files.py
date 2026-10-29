from pathlib import Path

import pytest

from bot.adapters.cv_files import read_cv_stations, read_variants
from bot.domain.cv import CvStation, InvalidStationError, YearMonth
from bot.domain.cv_variant import InvalidVariantError, Variant

# Erfundene Testperson; die echte Wissensbasis kommt nie in Tests.
SONNENSCHEIN = """---
art: station
titel: Bäckerei Sonnenschein
zeitraum: 2001 – 2005
abschnitt: beruf
von: "2001-04"
bis: "2005"
lebenslauf_titel: "Bäckerin"
lebenslauf_organisation: "Bäckerei Sonnenschein GmbH"
stichpunkte:
  - "Brezeln: täglich 500 Stück"
freigegeben: ja
---
Erika war vier Jahre Bäckerin bei der Bäckerei Sonnenschein.
"""

MOND = SONNENSCHEIN.replace("freigegeben: ja", "freigegeben: nein")
OHNE_VON = SONNENSCHEIN.replace('von: "2001-04"\n', "")


def write(folder: Path, name: str, text: str) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    path.write_text(text, encoding="utf-8")
    return path


def test_reads_released_stations_as_cv_stations(tmp_path: Path) -> None:
    write(tmp_path / "stationen", "sonnenschein.md", SONNENSCHEIN)
    write(tmp_path / "stationen", "mond.md", MOND)

    assert read_cv_stations(tmp_path) == [
        CvStation(
            name="sonnenschein",
            section="beruf",
            start=YearMonth(2001, 4),
            end=YearMonth(2005),
            title="Bäckerin",
            organisation="Bäckerei Sonnenschein GmbH",
            points=("Brezeln: täglich 500 Stück",),
        )
    ]


def test_a_bad_station_stops_with_its_name(tmp_path: Path) -> None:
    write(tmp_path / "stationen", "sonnenschein.md", OHNE_VON)
    with pytest.raises(InvalidStationError, match="sonnenschein.*von"):
        read_cv_stations(tmp_path)


def test_stations_are_sorted_by_name(tmp_path: Path) -> None:
    write(tmp_path / "stationen", "b.md", SONNENSCHEIN)
    write(tmp_path / "stationen", "a.md", SONNENSCHEIN)
    assert [station.name for station in read_cv_stations(tmp_path)] == ["a", "b"]


def test_reads_variants_and_checks_them_against_the_stations(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "varianten.yaml",
        "nur_berufsweg:\n  nummer: 4711\n  beschreibung: Nur Beruf\n  ohne: [schule]\n",
    )
    assert read_variants(path, {"sonnenschein"}) == {
        "nur_berufsweg": Variant("nur_berufsweg", 4711, "Nur Beruf", ("schule",))
    }


def test_a_missing_or_empty_variants_file_means_no_variants(tmp_path: Path) -> None:
    assert read_variants(tmp_path / "fehlt.yaml", set()) == {}
    empty = write(tmp_path, "leer.yaml", "# noch keine Varianten\n")
    assert read_variants(empty, set()) == {}


def test_an_unknown_station_in_a_variant_stops(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "varianten.yaml",
        "x:\n  nummer: 1\n  beschreibung: x\n  ohne: [mond]\n",
    )
    with pytest.raises(InvalidVariantError, match="mond"):
        read_variants(path, {"sonnenschein"})
