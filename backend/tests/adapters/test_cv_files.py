from pathlib import Path

import pytest

from bot.adapters.cv_files import (
    read_cv_data,
    read_cv_project_list,
    read_cv_projects,
    read_cv_stations,
    read_variants,
)
from bot.domain.cv import CvProject, CvStation, InvalidStationError, YearMonth
from bot.domain.cv_variant import InvalidVariantError, Variant, variant_number
from bot.domain.public_cv import CvData

# Erfundene Testperson; die echte Wissensbasis kommt nie in Tests.
SONNENSCHEIN = """---
titel: "Bäckerin"
organisation: "Bäckerei Sonnenschein GmbH"
abschnitt: beruf
von: "2001-04"
bis: "2005"
stichpunkte:
  - "Brezeln: täglich 500 Stück"
---
Erika war vier Jahre Bäckerin bei der Bäckerei Sonnenschein.
"""

OHNE_VON = SONNENSCHEIN.replace('von: "2001-04"\n', "")


def write(folder: Path, name: str, text: str) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    path.write_text(text, encoding="utf-8")
    return path


def test_reads_every_station_as_cv_station(tmp_path: Path) -> None:
    write(tmp_path / "stationen", "sonnenschein.md", SONNENSCHEIN)

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


def test_reads_switches_and_returns_all_variants(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "varianten.yaml",
        "schalter:\n  schule: [schule]\n  baeckerei: [sonnenschein]\n",
    )
    variants = read_variants(path, {"sonnenschein"}, set())
    assert list(variants) == ["ohne_schule", "ohne_baeckerei", "ohne_schule_und_baeckerei"]
    assert variants["ohne_schule"] == Variant(
        "ohne_schule", variant_number("ohne_schule"), ("schule",)
    )


def test_a_missing_or_empty_variants_file_means_no_variants(tmp_path: Path) -> None:
    assert read_variants(tmp_path / "fehlt.yaml", set(), set()) == {}
    empty = write(tmp_path, "leer.yaml", "# noch keine Varianten\n")
    assert read_variants(empty, set(), set()) == {}


def test_an_unknown_station_in_a_variant_stops(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "varianten.yaml",
        "schalter:\n  mond: [mond]\n",
    )
    with pytest.raises(InvalidVariantError, match="mond"):
        read_variants(path, {"sonnenschein"}, set())


def test_reads_the_switches_that_add_projects(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "varianten.yaml",
        "schalter:\n  schule: [schule]\nmit:\n  backen: [kuchen]\n",
    )
    variants = read_variants(path, {"sonnenschein"}, {"kuchen"})
    assert variants["ohne_schule_mit_backen"] == Variant(
        "ohne_schule_mit_backen",
        variant_number("ohne_schule_mit_backen"),
        ("schule",),
        ("kuchen",),
    )


def test_a_switch_that_adds_a_station_stops(tmp_path: Path) -> None:
    path = write(tmp_path, "varianten.yaml", "schalter: {}\nmit:\n  backen: [sonnenschein]\n")
    with pytest.raises(InvalidVariantError, match="backen.*sonnenschein"):
        read_variants(path, {"sonnenschein"}, {"kuchen"})


KUCHEN = """---
titel: Kuchenrechner
link: https://example.org/kuchen
von: "2019"
bis: "2025"
station: "[[sonnenschein]]"
zusammenfassung: "Vortrag über das Rechnen mit Kuchen."
---
Erika rechnet Kuchen.
"""

BROT = KUCHEN.replace("Kuchenrechner", "Brotrechner").replace(
    "link: https://example.org/kuchen\n", ""
)


def test_reads_every_project(tmp_path: Path) -> None:
    write(tmp_path / "projekte", "kuchen.md", KUCHEN)
    write(tmp_path / "projekte", "brot.md", BROT)
    assert read_cv_projects(tmp_path) == [
        CvProject(
            "brot",
            "Brotrechner",
            YearMonth(2019),
            YearMonth(2025),
            "Vortrag über das Rechnen mit Kuchen.",
            None,
        ),
        CvProject(
            "kuchen",
            "Kuchenrechner",
            YearMonth(2019),
            YearMonth(2025),
            "Vortrag über das Rechnen mit Kuchen.",
            "https://example.org/kuchen",
        ),
    ]


def test_reads_the_projects_of_the_whole_cv_from_the_variants_file(tmp_path: Path) -> None:
    path = write(tmp_path, "varianten.yaml", "projekte: [kuchen]\nschalter: {}\n")
    assert read_cv_project_list(path, {"kuchen", "brot"}) == ("kuchen",)


def test_without_a_variants_file_the_cv_has_no_projects(tmp_path: Path) -> None:
    assert read_cv_project_list(tmp_path / "fehlt.yaml", {"kuchen"}) == ()


def test_a_header_that_is_no_valid_yaml_stops_with_the_file_name(tmp_path: Path) -> None:
    write(tmp_path / "projekte", "kaputt.md", "---\nlink: (offen: a: b)\n---\nText\n")
    with pytest.raises(InvalidStationError, match=r"projekte/kaputt\.md.*YAML"):
        read_cv_projects(tmp_path)


def test_read_cv_data_collects_stations_projects_list_and_variants(tmp_path: Path) -> None:
    write(tmp_path / "wb" / "stationen", "sonnenschein.md", SONNENSCHEIN)
    write(tmp_path / "wb" / "projekte", "kuchen.md", KUCHEN)
    path = write(
        tmp_path,
        "varianten.yaml",
        "projekte: [kuchen]\nschalter:\n  baeckerei: [sonnenschein]\n",
    )
    data = read_cv_data(tmp_path / "wb", path)
    assert data == CvData(
        stations=read_cv_stations(tmp_path / "wb"),
        projects=read_cv_projects(tmp_path / "wb"),
        listed=("kuchen",),
        variants=read_variants(path, {"sonnenschein"}, {"kuchen"}),
    )
    assert list(data.variants) == ["ohne_baeckerei"]
