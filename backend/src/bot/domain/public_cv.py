"""Der öffentliche Lebenslauf für die Webseite: dieselbe Auswahl wie im PDF, ohne Privates.

Keine Noten, keine Angaben zur Person, keine Seitenaufteilung; nur Stationen und Projekte, wie die
Variante sie auswählt (siehe docs/bewerbung/DATENSTRUKTUR.md).
"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from bot.domain.cv import (
    PROJECTS_SECTION,
    SECTION_TITLES,
    CvEntry,
    CvProject,
    CvStation,
    cv_projects,
    cv_sections,
)
from bot.domain.cv_variant import Variant, omit, projects_for


@dataclass(frozen=True)
class CvData:
    """Alles, woraus ein Lebenslauf entsteht: Stationen, Projekte, die Projekte des ganzen
    Lebenslaufs (`projekte:` in varianten.yaml) und alle Varianten nach Namen."""

    stations: Sequence[CvStation]
    projects: Sequence[CvProject]
    listed: tuple[str, ...]
    variants: Mapping[str, Variant]


# Wie im PDF (`nicht_im_pdf` in seiten.yaml): Die Praktika stehen nur als Sammelzeile im Studium.
SUMMARIZED_SECTIONS = ("praktikum",)


def _station_entry(entry: CvEntry) -> dict[str, object]:
    return {
        "zeit": entry.period,
        "titel": entry.station.title,
        "organisation": entry.station.organisation,
        "stichpunkte": list(entry.station.points),
    }


def _project_entry(project: CvProject) -> dict[str, object]:
    return {"titel": project.title, "link": project.link, "text": project.text}


def public_cv(
    stations: Sequence[CvStation],
    projects: Sequence[CvProject],
    listed: tuple[str, ...],
    variant: Variant | None,
) -> dict[str, object]:
    """Die Abschnitte des Lebenslaufs der Variante (`None`: der ganze) als JSON-fähige Daten.

    `listed` sind die Projekte des ganzen Lebenslaufs (`projekte:` in varianten.yaml). Die
    Abschnitte stehen in fester Reihenfolge, Projekte zuletzt; leere fallen weg."""
    left_out = variant.omissions if variant else ()
    shown = [
        station
        for station in omit(stations, left_out)
        if station.section not in SUMMARIZED_SECTIONS
    ]
    sections: list[dict[str, object]] = [
        {
            "name": name,
            "titel": SECTION_TITLES[name],
            "eintraege": [_station_entry(entry) for entry in entries],
        }
        for name, entries in cv_sections(shown).items()
    ]
    chosen = cv_projects(projects_for(projects, listed, variant))
    if chosen:
        sections.append(
            {
                "name": PROJECTS_SECTION,
                "titel": SECTION_TITLES[PROJECTS_SECTION],
                "eintraege": [_project_entry(project) for project in chosen],
            }
        )
    return {"abschnitte": sections}
