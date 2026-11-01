import pytest

from bot.domain.cv import CvProject, CvStation, YearMonth
from bot.domain.cv_variant import (
    InvalidVariantError,
    Switch,
    Variant,
    all_variants,
    omit,
    parse_additions,
    parse_project_list,
    parse_switches,
    projects_for,
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
        ({"schalter": {"a_mit_b": ["firma-b"]}}, "a_mit_b.*_mit_"),
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


def test_parse_project_list_reads_the_projects_of_the_whole_cv() -> None:
    data = {"projekte": ["kuchen", "brot"], "schalter": {}}
    assert parse_project_list(data, {"brot", "kuchen", "torte"}) == ("kuchen", "brot")


@pytest.mark.parametrize("data", [None, {"schalter": {}}])
def test_without_a_project_list_the_cv_has_no_projects(data: object) -> None:
    assert parse_project_list(data, {"kuchen"}) == ()


@pytest.mark.parametrize(
    ("projects", "message"),
    [(["kuchen", "torte"], "torte"), ("kuchen", "Liste"), ([3], "Liste")],
)
def test_parse_project_list_stops_on_an_unknown_project_or_a_wrong_shape(
    projects: object, message: str
) -> None:
    with pytest.raises(InvalidVariantError, match=message):
        parse_project_list({"projekte": projects}, {"kuchen"})


PROJECTS = {"kuchen", "brot", "torte"}
ADDITIONS = (Switch("backen", ("brot", "torte")),)


def test_parse_additions_reads_the_switches_that_add_projects() -> None:
    data = {"schalter": {}, "mit": {"backen": ["brot", "torte"]}}
    assert parse_additions(data, PROJECTS) == ADDITIONS


@pytest.mark.parametrize("data", [None, {"schalter": {}}])
def test_without_additions_there_are_no_switches_that_add(data: object) -> None:
    assert parse_additions(data, PROJECTS) == ()


@pytest.mark.parametrize(
    ("additions", "message"),
    [
        (["backen"], "mit"),
        ({"backen": ["firma-a"]}, "backen.*firma-a"),
        ({"backen": ["lehre"]}, "backen.*lehre"),
        ({"a_mit_b": ["brot"]}, "a_mit_b.*_mit_"),
    ],
)
def test_parse_additions_takes_only_projects_and_names_the_problem(
    additions: object, message: str
) -> None:
    # Dazunehmen lassen sich nur Projekte, keine Stationen und keine Abschnitte.
    with pytest.raises(InvalidVariantError, match=message):
        parse_additions({"mit": additions}, PROJECTS)


def test_all_variants_adds_every_combination_with_the_switches_that_add() -> None:
    variants = all_variants(SWITCHES, ADDITIONS)
    assert list(variants) == [
        "ohne_firma_b",
        "ohne_lehre",
        "ohne_firma_b_und_lehre",
        "mit_backen",
        "ohne_firma_b_mit_backen",
        "ohne_lehre_mit_backen",
        "ohne_firma_b_und_lehre_mit_backen",
    ]
    assert variants["ohne_lehre_mit_backen"] == Variant(
        "ohne_lehre_mit_backen",
        variant_number("ohne_lehre_mit_backen"),
        ("lehre",),
        ("brot", "torte"),
    )


def test_switches_that_add_keep_names_and_numbers_of_the_old_variants() -> None:
    before = all_variants(SWITCHES)
    after = all_variants(SWITCHES, ADDITIONS)
    assert {name: after[name] for name in before} == before


def project(name: str) -> CvProject:
    return CvProject(name, name, YearMonth(2020), None, "", None)


def test_projects_for_takes_the_list_adds_and_leaves_out_as_the_variant_says() -> None:
    projects = [project("kuchen"), project("brot"), project("torte"), project("keks")]
    variant = Variant("ohne_torte_mit_backen", 1234, ("torte",), ("brot", "torte"))
    chosen = projects_for(projects, ("kuchen",), variant)
    assert [item.name for item in chosen] == ["kuchen", "brot"]


def test_projects_for_the_whole_cv_takes_only_the_list() -> None:
    projects = [project("kuchen"), project("brot")]
    assert [item.name for item in projects_for(projects, ("brot",), None)] == ["brot"]
