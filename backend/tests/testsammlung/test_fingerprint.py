import json
from pathlib import Path

import pytest

from testsammlung.fingerprint import (
    main,
    measurement_fingerprint,
    problems,
    training_fingerprint,
)

QUESTIONS = '- {frage: "Hauptstadt?", absicht: general/knowledge}\n'


@pytest.fixture
def files(tmp_path: Path) -> dict[str, Path]:
    paths = {
        "catalog": tmp_path / "absichten.yaml",
        "training": tmp_path / "fragen_training.yaml",
        "test": tmp_path / "fragen_test.yaml",
        "program": tmp_path / "intent_program.json",
        "source": tmp_path / "intent_classifier.py",
    }
    paths["catalog"].write_text("regeln: [R]\nabsichten: {gibberish: Unsinn}\n", "utf-8")
    paths["training"].write_text(QUESTIONS, "utf-8")
    paths["test"].write_text(QUESTIONS, "utf-8")
    paths["program"].write_text('{"labels": []}', "utf-8")
    paths["source"].write_text("GATE_TEMPERATURE = 0.0\n", "utf-8")
    return paths


def training(files: dict[str, Path]) -> str:
    return training_fingerprint(files["catalog"], files["training"])


def measurement(files: dict[str, Path]) -> str:
    return measurement_fingerprint(files["program"], files["test"], files["source"])


def test_training_fingerprint_is_stable(files: dict[str, Path]) -> None:
    assert training(files) == training(files)
    assert len(training(files)) == 16


@pytest.mark.parametrize("name", ["catalog", "training"])
def test_training_fingerprint_changes_with_the_content(files: dict[str, Path], name: str) -> None:
    before = training(files)
    files[name].write_text(
        files[name]
        .read_text("utf-8")
        .replace("Hauptstadt", "Kapitale")
        .replace("Unsinn", "Quatsch"),
        "utf-8",
    )

    assert training(files) != before


def test_training_fingerprint_ignores_comments_and_layout(files: dict[str, Path]) -> None:
    before = training(files)
    files["training"].write_text(
        "# Kommentar\n- frage: Hauptstadt?\n  absicht: general/knowledge\n", "utf-8"
    )

    assert training(files) == before


@pytest.mark.parametrize("name", ["program", "test", "source"])
def test_measurement_fingerprint_changes_with_each_input(files: dict[str, Path], name: str) -> None:
    before = measurement(files)
    files[name].write_text(files[name].read_text("utf-8") + "\n# anders\n", "utf-8")

    changed = measurement(files)

    if name == "test":  # YAML: ein Kommentar ändert nichts, eine neue Frage schon
        assert changed == before
        files[name].write_text(QUESTIONS + '- {frage: "B?", absicht: gibberish}\n', "utf-8")
        changed = measurement(files)
    assert changed != before


def write_records(
    tmp_path: Path, training: str | None, measurement: str | None, passed: bool = True
) -> tuple[Path, Path]:
    training_file = tmp_path / "training.json"
    measurement_file = tmp_path / "messung.json"
    if training is not None:
        training_file.write_text(json.dumps({"fingerabdruck": training}), "utf-8")
    if measurement is not None:
        record = {
            "fingerabdruck": measurement,
            "bestanden": passed,
            "stufe_1": 99.0,
            "stufe_2": 89.0,
            "kritisch": 1,
        }
        measurement_file.write_text(json.dumps(record), "utf-8")
    return training_file, measurement_file


def test_no_problems_when_both_fingerprints_match_and_the_measurement_passed(
    tmp_path: Path,
) -> None:
    assert problems(*write_records(tmp_path, "T", "M"), "T", "M") == []


@pytest.mark.parametrize(
    ("training", "measurement", "passed", "expected"),
    [
        (None, "M", True, "Training fehlt"),
        ("alt", "M", True, "Training veraltet"),
        ("T", None, True, "Messung fehlt"),
        ("T", "alt", True, "Messung veraltet"),
        ("T", "M", False, "Messung nicht bestanden (Stufe 1 99.0 %, Stufe 2 89.0 %, kritisch 1)"),
    ],
)
def test_problems_name_what_is_missing_outdated_or_failed(
    tmp_path: Path, training: str | None, measurement: str | None, passed: bool, expected: str
) -> None:
    found = problems(*write_records(tmp_path, training, measurement, passed), "T", "M")

    assert len(found) == 1
    assert found[0].startswith(expected)


def test_training_problems_name_the_training_script(tmp_path: Path) -> None:
    assert "scripts/trainiere.sh" in problems(*write_records(tmp_path, "alt", "M"), "T", "M")[0]


def test_measurement_problems_name_the_measurement_script(tmp_path: Path) -> None:
    assert "scripts/messe.sh" in problems(*write_records(tmp_path, "T", "alt"), "T", "M")[0]


def test_main_prints_the_state_and_returns_0_when_all_is_current(
    tmp_path: Path, files: dict[str, Path], capsys: pytest.CaptureFixture[str]
) -> None:
    training_file, measurement_file = write_records(tmp_path, training(files), measurement(files))

    exit_code = main(
        training_record=training_file,
        measurement_record=measurement_file,
        current_training=training(files),
        current_measurement=measurement(files),
    )

    assert exit_code == 0
    assert "Türsteher: Training und Messung aktuell, Messung bestanden." in capsys.readouterr().out


def test_main_prints_every_problem_and_returns_1(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    training_file, measurement_file = write_records(tmp_path, None, None)

    exit_code = main(
        training_record=training_file,
        measurement_record=measurement_file,
        current_training="T",
        current_measurement="M",
    )

    out = capsys.readouterr().out
    assert exit_code == 1
    assert "Training fehlt" in out
    assert "Messung fehlt" in out


def test_main_uses_the_real_files_by_default() -> None:
    assert main() in {0, 1}
