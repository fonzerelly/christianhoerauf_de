from bot.domain.cv import CvProject, CvStation, YearMonth
from bot.domain.cv_variant import Variant
from bot.domain.public_cv import public_cv

# Erfundene Testperson; die echte Wissensbasis kommt nie in Tests.
STATIONS = [
    CvStation("baeckerei", "beruf", YearMonth(2020, 1), None, "Bäckerin", "Sonne GmbH", ("Brot",)),
    CvStation(
        "konditorei", "beruf", YearMonth(2015, 3), YearMonth(2019, 12), "Konditorin", "Mond", ()
    ),
    CvStation("kurse", "lehre", YearMonth(2016), YearMonth(2018), "Backkurse", "ehrenamtlich", ()),
    CvStation("uni", "studium", YearMonth(2010), YearMonth(2015), "Backkunst", "Uni", ("Diplom",)),
    CvStation("praktikum", "praktikum", YearMonth(2012), YearMonth(2012), "Praktikum", "X", ()),
]
PROJECTS = [
    CvProject("kuchen", "Kuchenrechner", YearMonth(2019), YearMonth(2021), "Rechnet.", "https://k"),
    CvProject("brot", "Brotrechner", YearMonth(2022), None, "Rechnet Brot.", None),
    CvProject("torte", "Tortenrechner", YearMonth(2023), YearMonth(2023), "Rechnet Torte.", None),
]


def test_the_whole_cv_has_the_sections_in_order_without_internships() -> None:
    # Praktika stehen wie im PDF nur als Sammelzeile im Studium.
    cv = public_cv(STATIONS, PROJECTS, ("kuchen",), None)
    assert cv == {
        "abschnitte": [
            {
                "name": "beruf",
                "titel": "Berufserfahrung",
                "eintraege": [
                    {
                        "zeit": "01/2020 – heute",
                        "titel": "Bäckerin",
                        "organisation": "Sonne GmbH",
                        "stichpunkte": ["Brot"],
                    },
                    {
                        "zeit": "03/2015 – 12/2019",
                        "titel": "Konditorin",
                        "organisation": "Mond",
                        "stichpunkte": [],
                    },
                ],
            },
            {
                "name": "lehre",
                "titel": "Lehre und Ehrenamt",
                "eintraege": [
                    {
                        "zeit": "2016 – 2018",
                        "titel": "Backkurse",
                        "organisation": "ehrenamtlich",
                        "stichpunkte": [],
                    }
                ],
            },
            {
                "name": "studium",
                "titel": "Studium",
                "eintraege": [
                    {
                        "zeit": "2010 – 2015",
                        "titel": "Backkunst",
                        "organisation": "Uni",
                        "stichpunkte": ["Diplom"],
                    }
                ],
            },
            {
                "name": "projekte",
                "titel": "Projekte und Vorträge",
                "eintraege": [{"titel": "Kuchenrechner", "link": "https://k", "text": "Rechnet."}],
            },
        ]
    }


def test_a_variant_leaves_out_and_adds_like_in_the_pdf() -> None:
    variant = Variant("ohne_lehre_mit_backen", 4711, ("lehre",), ("brot",))
    cv = public_cv(STATIONS, PROJECTS, ("kuchen",), variant)
    sections = cv["abschnitte"]
    assert isinstance(sections, list)
    assert [section["name"] for section in sections] == ["beruf", "studium", "projekte"]
    assert sections[-1]["eintraege"] == [
        {"titel": "Brotrechner", "link": None, "text": "Rechnet Brot."},
        {"titel": "Kuchenrechner", "link": "https://k", "text": "Rechnet."},
    ]


def test_without_projects_there_is_no_project_section() -> None:
    cv = public_cv(STATIONS[:1], PROJECTS, (), None)
    assert cv == {
        "abschnitte": [
            {
                "name": "beruf",
                "titel": "Berufserfahrung",
                "eintraege": [
                    {
                        "zeit": "01/2020 – heute",
                        "titel": "Bäckerin",
                        "organisation": "Sonne GmbH",
                        "stichpunkte": ["Brot"],
                    }
                ],
            }
        ]
    }
