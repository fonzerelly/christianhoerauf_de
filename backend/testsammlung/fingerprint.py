"""Fingerabdrücke des Türstehers (Plan „Absichten neu“, Schritt C).

Zwei Hashes zeigen, ob Training und Messung noch zum Stand im Repo passen:
1. Training: `absichten.yaml`, Trainingsfragen und Trainingseinstellungen. Gespeichert beim
   Training in `kompilat/training.json`.
2. Messung: exportierter Türsteher, Testfragen, Modellname und `intent_classifier.py` (Lesefunktion
   und Einstellungen des Türstehers). Gespeichert bei der Messung in `kompilat/messung.json`.

YAML-Dateien gehen mit ihrem Inhalt ein, nicht wörtlich: Kommentare und Zeilenumbrüche ändern
nichts. Aufruf `python -m testsammlung.fingerprint` (aus den Git-Hooks): Exit 0, wenn alles
aktuell und bestanden ist, sonst 1 mit dem Befehl, der weiterhilft.
"""

import hashlib
import json
import sys
from pathlib import Path

import yaml

from bot.pipeline import intent_classifier
from bot.pipeline.prompts import INTENT_PROGRAM_FILE
from testsammlung.lm_studio import LM_STUDIO_MODEL
from testsammlung.questions import (
    CATALOG_FILE,
    LEARN_PER_INTENT,
    TEST_FILE,
    TESTSAMMLUNG,
    TRAINING_FILE,
)

KOMPILAT_DIR = TESTSAMMLUNG / "kompilat"
TRAINING_RECORD = KOMPILAT_DIR / "training.json"
MEASUREMENT_RECORD = KOMPILAT_DIR / "messung.json"
CLASSIFIER_SOURCE = Path(intent_classifier.__file__)

# Alles, was das Training beeinflusst, außer den Dateien. testsammlung/training.py liest es von
# hier; eine Änderung macht das Training veraltet.
TRAINING_SETTINGS: dict[str, object] = {
    "modell": LM_STUDIO_MODEL,
    "optimierer": "MIPROv2",
    "auto": "medium",
    "max_bootstrapped_demos": 4,
    "max_labeled_demos": 8,
    "lernfragen_je_absicht": LEARN_PER_INTENT,
    "temperature": 0.0,
    "max_tokens": 100,
    "ideengeber_temperature": 1.0,
    "ideengeber_max_tokens": 4000,
    # Wie der Bot: bei unlesbarer Antwort nicht im JSON-Format nachfragen.
    "json_nachfrage": False,
}

_TRAINING_COMMAND = "scripts/trainiere.sh (etwa 35 min, Mac mini), danach scripts/messe.sh"
_MEASUREMENT_COMMAND = "scripts/messe.sh (etwa 5 min, Mac mini)"


def _yaml_content(path: Path) -> object:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _digest(parts: dict[str, object]) -> str:
    text = json.dumps(parts, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def training_fingerprint(
    catalog_file: Path = CATALOG_FILE, training_file: Path = TRAINING_FILE
) -> str:
    """Hash über Absichten, Trainingsfragen und `TRAINING_SETTINGS`."""
    return _digest(
        {
            "absichten": _yaml_content(catalog_file),
            "training": _yaml_content(training_file),
            "einstellungen": TRAINING_SETTINGS,
        }
    )


def measurement_fingerprint(
    program_file: Path = INTENT_PROGRAM_FILE,
    test_file: Path = TEST_FILE,
    classifier_source: Path = CLASSIFIER_SOURCE,
) -> str:
    """Hash über exportierten Türsteher, Testfragen, Modellname und Quelltext des Türstehers."""
    return _digest(
        {
            "export": program_file.read_text(encoding="utf-8"),
            "test": _yaml_content(test_file),
            "modell": LM_STUDIO_MODEL,
            "tuersteher": classifier_source.read_text(encoding="utf-8"),
        }
    )


def _read_record(path: Path) -> dict[str, object] | None:
    if not path.exists():
        return None
    record: dict[str, object] = json.loads(path.read_text(encoding="utf-8"))
    return record


def problems(
    training_record: Path,
    measurement_record: Path,
    current_training: str,
    current_measurement: str,
) -> list[str]:
    """Was nicht stimmt, je ein Satz mit dem Befehl, der weiterhilft. Leer: alles in Ordnung."""
    found = []
    training = _read_record(training_record)
    if training is None:
        found.append(f"Training fehlt ({training_record.name}). → {_TRAINING_COMMAND}")
    elif training["fingerabdruck"] != current_training:
        found.append(
            "Training veraltet: Absichten, Trainingsfragen oder Einstellungen haben sich "
            f"geändert. → {_TRAINING_COMMAND}"
        )
    measurement = _read_record(measurement_record)
    if measurement is None:
        found.append(f"Messung fehlt ({measurement_record.name}). → {_MEASUREMENT_COMMAND}")
    elif measurement["fingerabdruck"] != current_measurement:
        found.append(
            "Messung veraltet: Export, Testfragen, Modell oder Türsteher-Code haben sich "
            f"geändert. → {_MEASUREMENT_COMMAND}"
        )
    elif measurement["bestanden"] is not True:
        found.append(
            f"Messung nicht bestanden (Stufe 1 {measurement['stufe_1']} %, Stufe 2 "
            f"{measurement['stufe_2']} %, kritisch {measurement['kritisch']}). → Fragen oder "
            f"Absichten verbessern, dann {_TRAINING_COMMAND}"
        )
    return found


def main(
    training_record: Path = TRAINING_RECORD,
    measurement_record: Path = MEASUREMENT_RECORD,
    current_training: str | None = None,
    current_measurement: str | None = None,
) -> int:
    """Druckt den Stand des Türstehers. Exit 0, wenn alles aktuell und bestanden ist, sonst 1."""
    found = problems(
        training_record,
        measurement_record,
        current_training if current_training is not None else training_fingerprint(),
        current_measurement if current_measurement is not None else measurement_fingerprint(),
    )
    if not found:
        print("Türsteher: Training und Messung aktuell, Messung bestanden.")
        return 0
    for problem in found:
        print(f"Türsteher: {problem}")
    return 1


if __name__ == "__main__":  # pragma: no cover - Einstieg, wird von den Git-Hooks gestartet
    sys.exit(main())
