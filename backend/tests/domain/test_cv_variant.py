import pytest

from bot.domain.cv import CvStation, YearMonth
from bot.domain.cv_variant import (
    InvalidVariantError,
    Switch,
    Variant,
    all_variants,
    omit,
    parse_switches,
    variant_by_number,
    variant_number,
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

DATA = {"schalter": {"firma_b": ["firma-b"], "lehre": ["lehre"]}}
SWITCHES = (Switch("firma_b", ("firma-b",)), Switch("lehre", ("lehre",)))


def test_parse_switches_keeps_the_order_of_the_file() -> None:
    assert parse_switches(DATA, KNOWN) == SWITCHES


def test_an_empty_variants_file_means_no_switches() -> None:
    assert parse_switches(None, KNOWN) == ()


@pytest.mark.parametrize(
    ("data", "message"),
    [
        (["firma_b"], "schalter"),
        ({"anderes": {}}, "schalter"),
        ({"schalter": ["firma_b"]}, "schalter"),
        ({"schalter": {"firma_b": "firma-b"}}, "firma_b.*Liste"),
        ({"schalter": {"firma_b": []}}, "firma_b.*Liste"),
        ({"schalter": {"firma_b": ["gibts-nicht"]}}, "firma_b.*gibts-nicht"),
        ({"schalter": {"Firma B": ["firma-b"]}}, "Firma B.*Kleinbuchstaben"),
        ({"schalter": {"a_und_b": ["firma-b"]}}, "a_und_b.*_und_"),
    ],
)
def test_parse_switches_names_the_problem(data: object, message: str) -> None:
    with pytest.raises(InvalidVariantError, match=message):
        parse_switches(data, KNOWN)


def test_all_variants_combines_every_switch_in_file_order() -> None:
    variants = all_variants(SWITCHES)
    assert list(variants) == ["ohne_firma_b", "ohne_lehre", "ohne_firma_b_und_lehre"]
    assert variants["ohne_firma_b_und_lehre"] == Variant(
        "ohne_firma_b_und_lehre",
        variant_number("ohne_firma_b_und_lehre"),
        ("firma-b", "lehre"),
    )


def test_three_switches_give_seven_variants() -> None:
    switches = (Switch("a", ("x",)), Switch("b", ("y",)), Switch("c", ("z",)))
    assert len(all_variants(switches)) == 7


def test_a_new_switch_keeps_names_and_numbers_of_the_old_variants() -> None:
    before = all_variants(SWITCHES)
    after = all_variants((*SWITCHES, Switch("schule", ("schule",))))
    assert {name: after[name] for name in before} == before


def test_variant_number_is_four_digits_and_always_the_same() -> None:
    number = variant_number("ohne_ehrenamt")
    assert 1000 <= number <= 9999
    assert variant_number("ohne_ehrenamt") == number
    assert variant_number("ohne_lehre") != number


def test_two_variants_with_the_same_number_stop(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("bot.domain.cv_variant.variant_number", lambda name: 4711)
    with pytest.raises(InvalidVariantError, match="4711.*ohne_firma_b.*ohne_lehre"):
        all_variants(SWITCHES)


def test_omit_drops_whole_sections_and_single_stations() -> None:
    kept = omit(STATIONS, ["lehre", "firma-b"])
    assert [item.name for item in kept] == ["firma-a", "schule"]


def test_variant_by_number_finds_the_variant_or_none() -> None:
    variants = all_variants(SWITCHES)
    assert "ohne_lehre" in variants
    wanted = variants["ohne_lehre"]
    assert variant_by_number(variants, wanted.number) == wanted
    assert variant_by_number(variants, 1) is None
