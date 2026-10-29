from collections.abc import Mapping

import pytest

from bot.domain.cv import (
    CvEntry,
    CvProject,
    CvStation,
    InvalidStationError,
    YearMonth,
    cv_projects,
    cv_sections,
    parse_project,
    parse_station,
    period_label,
)

# Erfundene Stationen: Die Tests sollen nie die echte Wissensbasis lesen.
HEADER: Mapping[str, object] = {
    "art": "station",
    "abschnitt": "beruf",
    "von": "2019-03",
    "bis": "heute",
    "lebenslauf_titel": "Entwicklerin",
    "lebenslauf_organisation": "Beispiel GmbH",
    "stichpunkte": ["Erster Punkt", "Zweiter Punkt"],
}


def station(name: str, section: str, start: YearMonth, end: YearMonth | None = None) -> CvStation:
    return CvStation(name, section, start, end, f"Titel {name}", f"Firma {name}", ())


def test_year_month_reads_year_and_month_or_year_only() -> None:
    assert YearMonth.parse("2014-11") == YearMonth(2014, 11)
    assert YearMonth.parse("2008") == YearMonth(2008)
    assert YearMonth.parse(2008) == YearMonth(2008)


@pytest.mark.parametrize("text", ["11/2014", "2014-13", "2014-1", "etwa 2017", "", True])
def test_year_month_rejects_other_formats(text: object) -> None:
    with pytest.raises(ValueError, match="JJJJ"):
        YearMonth.parse(text)


def test_year_month_sorts_a_bare_year_before_its_months() -> None:
    assert sorted([YearMonth(2014, 4), YearMonth(2014), YearMonth(2011, 12)]) == [
        YearMonth(2011, 12),
        YearMonth(2014),
        YearMonth(2014, 4),
    ]


def test_parse_station_reads_all_cv_fields() -> None:
    assert parse_station("beispiel", HEADER) == CvStation(
        name="beispiel",
        section="beruf",
        start=YearMonth(2019, 3),
        end=None,
        title="Entwicklerin",
        organisation="Beispiel GmbH",
        points=("Erster Punkt", "Zweiter Punkt"),
    )


def test_parse_station_reads_an_end_date_and_an_empty_organisation() -> None:
    header = {**HEADER, "bis": "2020-09", "lebenslauf_organisation": ""}
    parsed = parse_station("beispiel", header)
    assert (parsed.end, parsed.organisation) == (YearMonth(2020, 9), "")


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("abschnitt", "hobby", "abschnitt"),
        ("von", "11/2014", "von"),
        ("bis", "bald", "bis"),
        ("lebenslauf_titel", "", "lebenslauf_titel"),
        ("lebenslauf_organisation", None, "lebenslauf_organisation"),
        ("stichpunkte", "kein Liste", "stichpunkte"),
        ("stichpunkte", ["gut", 3], "stichpunkte"),
    ],
)
def test_parse_station_names_station_and_field_of_a_bad_value(
    field: str, value: object, message: str
) -> None:
    with pytest.raises(InvalidStationError, match=f"beispiel.*{message}"):
        parse_station("beispiel", {**HEADER, field: value})


def test_parse_station_names_a_missing_field() -> None:
    header = {key: value for key, value in HEADER.items() if key != "von"}
    with pytest.raises(InvalidStationError, match="beispiel.*von"):
        parse_station("beispiel", header)


def test_period_label_with_months() -> None:
    running = station("a", "beruf", YearMonth(2020, 10))
    finished = station("b", "beruf", YearMonth(2014, 11), YearMonth(2020, 9))
    assert period_label(running, with_months=True) == "10/2020 – heute"
    assert period_label(finished, with_months=True) == "11/2014 – 09/2020"


def test_period_label_with_months_falls_back_to_the_year_where_no_month_is_known() -> None:
    mixed = station("a", "beruf", YearMonth(2011), YearMonth(2014, 3))
    assert period_label(mixed, with_months=True) == "2011 – 03/2014"


def test_period_label_with_years_only() -> None:
    running = station("a", "beruf", YearMonth(2020, 10))
    finished = station("b", "beruf", YearMonth(2011), YearMonth(2014, 3))
    assert period_label(running, with_months=False) == "2020 – heute"
    assert period_label(finished, with_months=False) == "2011 – 2014"


def test_period_label_shows_one_year_when_start_and_end_fall_into_it() -> None:
    short = station("a", "beruf", YearMonth(2014, 4), YearMonth(2014, 10))
    assert period_label(short, with_months=False) == "2014"


def test_cv_sections_orders_sections_and_puts_the_newest_station_first() -> None:
    stations = [
        station("schule", "schule", YearMonth(1990), YearMonth(1999)),
        station("alt", "beruf", YearMonth(2004), YearMonth(2008)),
        station("neu", "beruf", YearMonth(2012), YearMonth(2018)),
    ]
    sections = cv_sections(stations)
    assert list(sections) == ["beruf", "schule"]
    assert [entry.station.name for entry in sections["beruf"]] == ["neu", "alt"]


def test_cv_sections_shows_months_only_for_the_two_newest_jobs() -> None:
    stations = [
        station("jetzt", "beruf", YearMonth(2020, 10)),
        station("davor", "beruf", YearMonth(2014, 11), YearMonth(2020, 9)),
        station("frueher", "beruf", YearMonth(2014, 4), YearMonth(2014, 10)),
        station("studium", "studium", YearMonth(2005, 10), YearMonth(2010, 7)),
    ]
    sections = cv_sections(stations)
    assert [entry.period for entry in sections["beruf"]] == [
        "10/2020 – heute",
        "11/2014 – 09/2020",
        "2014",
    ]
    assert sections["studium"] == [CvEntry(stations[3], "2005 – 2010")]


PROJECT_HEADER: Mapping[str, object] = {
    "art": "projekt",
    "titel": "Kuchenrechner (Vortrag)",
    "link": "https://example.org/kuchen",
    "lebenslauf_titel": "Kuchenrechner",
    "lebenslauf_zeit": "2019 – 2025",
    "lebenslauf_text": "Rechnet Kuchen aus.",
}


def test_parse_project_reads_the_cv_fields() -> None:
    assert parse_project("kuchen", PROJECT_HEADER) == CvProject(
        name="kuchen",
        title="Kuchenrechner",
        period="2019 – 2025",
        text="Rechnet Kuchen aus.",
        link="https://example.org/kuchen",
    )


def test_a_project_without_cv_text_is_not_in_the_cv() -> None:
    header = {key: value for key, value in PROJECT_HEADER.items() if key != "lebenslauf_text"}
    assert parse_project("kuchen", header) is None


@pytest.mark.parametrize("field", ["lebenslauf_titel", "lebenslauf_zeit", "link"])
def test_a_cv_project_needs_title_period_and_link(field: str) -> None:
    with pytest.raises(InvalidStationError, match=f"kuchen.*{field}"):
        parse_project("kuchen", {**PROJECT_HEADER, field: ""})


def project(name: str, period: str) -> CvProject:
    return CvProject(name, name, period, "", "https://example.org")


def test_cv_projects_put_the_latest_year_first_and_then_go_by_name() -> None:
    projects = [
        project("vortrag-alt", "2018"),
        project("vortrag", "2019 – 2025"),
        project("zauber", "2020, 2026"),
        project("bot", "2026"),
    ]
    assert [item.name for item in cv_projects(projects)] == [
        "bot",
        "zauber",
        "vortrag",
        "vortrag-alt",
    ]
