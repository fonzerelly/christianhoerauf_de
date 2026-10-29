import pytest

from bot.domain.cv import CvStation, YearMonth
from bot.domain.cv_variant import (
    InvalidVariantError,
    Variant,
    check_omissions,
    omit,
    parse_variants,
    variant_by_number,
)


def station(name: str, section: str) -> CvStation:
    return CvStation(name, section, YearMonth(2000), None, name, "", ())


STATIONS = [
    station("firma-a", "beruf"),
    station("firma-b", "beruf"),
    station("kurse", "lehre"),
    station("schule", "schule"),
]
KNOWN = {item.name for item in STATIONS}

DATA = {
    "nur_berufsweg": {
        "nummer": 4711,
        "beschreibung": "Nur die Berufserfahrung",
        "ohne": ["lehre", "schule"],
    },
    "ohne_firma_b": {"nummer": 815, "beschreibung": "Ohne Firma B", "ohne": ["firma-b"]},
}


def test_parse_variants_reads_name_number_description_and_omissions() -> None:
    variants = parse_variants(DATA, KNOWN)
    assert variants["nur_berufsweg"] == Variant(
        name="nur_berufsweg",
        number=4711,
        description="Nur die Berufserfahrung",
        omissions=("lehre", "schule"),
    )
    assert list(variants) == ["nur_berufsweg", "ohne_firma_b"]


def test_an_empty_variants_file_means_no_variants() -> None:
    assert parse_variants(None, KNOWN) == {}


@pytest.mark.parametrize(
    ("entry", "message"),
    [
        ({"beschreibung": "x", "ohne": []}, "nummer"),
        ({"nummer": "4711", "beschreibung": "x", "ohne": []}, "nummer"),
        ({"nummer": 1, "beschreibung": 5, "ohne": []}, "beschreibung"),
        ({"nummer": 1, "beschreibung": "x", "ohne": "lehre"}, "ohne"),
        ({"nummer": 1, "beschreibung": "x", "ohne": ["gibts-nicht"]}, "gibts-nicht"),
        ("4711", "nummer"),
    ],
)
def test_parse_variants_names_the_variant_and_the_problem(entry: object, message: str) -> None:
    with pytest.raises(InvalidVariantError, match=f"kaputt.*{message}"):
        parse_variants({"kaputt": entry}, KNOWN)


def test_two_variants_must_not_share_a_number() -> None:
    data = {**DATA, "doppelt": {"nummer": 4711, "beschreibung": "x", "ohne": []}}
    with pytest.raises(InvalidVariantError, match="4711.*nur_berufsweg.*doppelt"):
        parse_variants(data, KNOWN)


def test_a_variants_file_that_is_no_mapping_is_rejected() -> None:
    with pytest.raises(InvalidVariantError, match="Zuordnung"):
        parse_variants(["nur_berufsweg"], KNOWN)


def test_omit_drops_whole_sections_and_single_stations() -> None:
    kept = omit(STATIONS, ["lehre", "firma-b"])
    assert [item.name for item in kept] == ["firma-a", "schule"]


def test_check_omissions_accepts_sections_and_stations() -> None:
    check_omissions(["beruf", "kurse"], KNOWN, origin="lebenslauf_ohne")


def test_check_omissions_names_the_origin_and_the_unknown_name() -> None:
    with pytest.raises(InvalidVariantError, match="lebenslauf_ohne.*tippfehler"):
        check_omissions(["beruf", "tippfehler"], KNOWN, origin="lebenslauf_ohne")


def test_variant_by_number_finds_the_variant_or_none() -> None:
    variants = parse_variants(DATA, KNOWN)
    assert variant_by_number(variants, 815) == variants["ohne_firma_b"]
    assert variant_by_number(variants, 1) is None
