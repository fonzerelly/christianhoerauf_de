"""Der Lebenslauf-Endpunkt: GET /lebenslauf?variante=<Nummer> (Schritt 13 im Plan der Bewerbung)."""

import json
from pathlib import Path
from typing import Any

import pytest
from jsonschema import Draft202012Validator

from bot.adapters.cv_files import read_cv_data
from bot.domain.cv_variant import variant_number
from bot.domain.public_cv import CvData
from bot.handler import handle_cv, load_cv_data

SCHEMA = Draft202012Validator(
    json.loads((Path(__file__).parents[1] / "schema" / "lebenslauf.schema.json").read_text())
)

# Erfundene Testperson; die echte Wissensbasis kommt nie in Tests.
STATION = """---
titel: "Bäckerin"
organisation: "Sonne GmbH"
abschnitt: beruf
von: "2020-01"
bis: heute
stichpunkte: ["Brot"]
---
Erika backt.
"""
COURSE = STATION.replace("Bäckerin", "Backkurse").replace("abschnitt: beruf", "abschnitt: lehre")
PROJECT = """---
titel: "{titel}"
von: "2019"
bis: "2021"
zusammenfassung: "Rechnet."
---
Text.
"""
VARIANTS = "projekte: [kuchen]\nschalter:\n  kurse: [kurse]\nmit:\n  brot: [brot]\n"


def write_sources(base: Path) -> tuple[Path, Path]:
    """Wissensbasis und Ordner mit varianten.yaml, wie sie im Lambda-Paket liegen."""
    files = {
        "wissensbasis/stationen/baeckerei.md": STATION,
        "wissensbasis/stationen/kurse.md": COURSE,
        "wissensbasis/projekte/kuchen.md": PROJECT.format(titel="Kuchenrechner"),
        "wissensbasis/projekte/brot.md": PROJECT.format(titel="Brotrechner"),
        "lebenslauf/varianten.yaml": VARIANTS,
    }
    for name, text in files.items():
        path = base / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    return base / "wissensbasis", base / "lebenslauf"


@pytest.fixture
def cv_data(tmp_path: Path) -> CvData:
    knowledge_base, cv_folder = write_sources(tmp_path)
    return read_cv_data(knowledge_base, cv_folder / "varianten.yaml")


def cv_event(query: dict[str, str] | None = None) -> dict[str, Any]:
    event: dict[str, Any] = {
        "rawPath": "/lebenslauf",
        "requestContext": {"http": {"method": "GET", "sourceIp": "203.0.113.7"}},
    }
    if query is not None:
        event["queryStringParameters"] = query
    return event


def cv_body(response: dict[str, object]) -> dict[str, Any]:
    assert response["statusCode"] == 200
    parsed = json.loads(str(response["body"]))
    SCHEMA.validate(parsed)  # jeder Lebenslauf genügt dem Vertrag
    assert isinstance(parsed, dict)
    return parsed


def section_names(body: dict[str, Any]) -> list[str]:
    return [section["name"] for section in body["abschnitte"]]


def project_titles(body: dict[str, Any]) -> list[str]:
    return [item["titel"] for item in body["abschnitte"][-1]["eintraege"]]


def test_without_a_number_comes_the_whole_cv(cv_data: CvData) -> None:
    body = cv_body(handle_cv(cv_event(), cv_data))
    assert section_names(body) == ["beruf", "lehre", "projekte"]
    assert project_titles(body) == ["Kuchenrechner"]


def test_the_number_of_a_variant_selects_it(cv_data: CvData) -> None:
    number = variant_number("ohne_kurse_mit_brot")
    body = cv_body(handle_cv(cv_event({"variante": str(number)}), cv_data))
    assert section_names(body) == ["beruf", "projekte"]
    assert project_titles(body) == ["Brotrechner", "Kuchenrechner"]


@pytest.mark.parametrize("number", ["1", "abc", ""])
def test_an_unknown_or_broken_number_gives_the_whole_cv(cv_data: CvData, number: str) -> None:
    body = cv_body(handle_cv(cv_event({"variante": number}), cv_data))
    assert section_names(body) == ["beruf", "lehre", "projekte"]


def test_the_cv_is_json_and_may_be_cached_for_five_minutes(cv_data: CvData) -> None:
    response = handle_cv(cv_event(), cv_data)
    assert response["headers"] == {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
    }


def test_load_cv_data_reads_the_folders_from_the_environment(tmp_path: Path) -> None:
    knowledge_base, cv_folder = write_sources(tmp_path)
    environ = {"WISSENSBASIS_DIR": str(knowledge_base), "LEBENSLAUF_DIR": str(cv_folder)}
    assert load_cv_data(environ) == read_cv_data(knowledge_base, cv_folder / "varianten.yaml")


def test_the_handler_answers_the_cv_without_building_the_bot(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    import bot.handler as module

    knowledge_base, cv_folder = write_sources(tmp_path)
    monkeypatch.setenv("WISSENSBASIS_DIR", str(knowledge_base))
    monkeypatch.setenv("LEBENSLAUF_DIR", str(cv_folder))
    monkeypatch.setattr(module, "_cv_data", None)

    def no_bot(environ: object) -> None:
        raise AssertionError("Der Lebenslauf braucht keinen Bot")

    monkeypatch.setattr(module, "build_bot", no_bot)

    first = cv_body(module.handler(cv_event(), None))
    (knowledge_base / "projekte" / "kuchen.md").unlink()  # gelesen wird nur beim ersten Aufruf
    second = cv_body(module.handler(cv_event(), None))

    assert first == second
    assert project_titles(first) == ["Kuchenrechner"]


def test_broken_data_gives_503_and_is_read_again_next_time(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    import bot.handler as module

    knowledge_base, cv_folder = write_sources(tmp_path)
    monkeypatch.setenv("WISSENSBASIS_DIR", str(knowledge_base))
    monkeypatch.setenv("LEBENSLAUF_DIR", str(cv_folder))
    monkeypatch.setattr(module, "_cv_data", None)
    (cv_folder / "varianten.yaml").write_text("projekte: [gibts-nicht]\n", encoding="utf-8")

    broken = module.handler(cv_event(), None)
    assert broken["statusCode"] == 503
    assert json.loads(str(broken["body"])) == {"fehler": "Lebenslauf gerade nicht verfügbar"}

    (cv_folder / "varianten.yaml").write_text(VARIANTS, encoding="utf-8")
    assert section_names(cv_body(module.handler(cv_event(), None))) == [
        "beruf",
        "lehre",
        "projekte",
    ]
