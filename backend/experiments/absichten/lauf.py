"""Führt die Schritte des Absichten-Experiments gegen LM Studio aus.

Aufruf (aus backend/):  uv run --group dspy python experiments/absichten/lauf.py [schritt ...]
Ohne Schritt laufen alle, erst alle Gemma-Schritte, dann alle Safeguard-Schritte, damit LM Studio
nur einmal das Modell wechselt. Jeder Schritt schreibt nach ergebnisse/<schritt>.jsonl und
überspringt Fragen, die dort schon stehen.
"""

import sys
import time
import traceback
from collections.abc import Callable
from typing import Literal

from gemeinsam import (
    ANTWORT_PROMPT,
    ERGEBNISSE,
    GEMMA,
    LM_STUDIO_URL,
    PRUEF_RICHTLINIE,
    SAFEGUARD,
    Absichten,
    Ergebnisdatei,
    Frage,
    aufwaermen,
    chat,
    dspy_anweisung,
    gemma_prompt,
    gruppe,
    kuerzel_im_text,
    lade_absichten,
    lade_fragen,
    pruef_inhalt,
    safeguard_kuerzel,
    safeguard_richtlinie,
    safeguard_verstoss,
)

DSPY_PROGRAMM = ERGEBNISSE / "gemma_dspy_programm.json"
DSPY_PROMPT = ERGEBNISSE / "gemma_dspy_prompt.txt"


def gemma_handprompt(absichten: Absichten, fragen: list[Frage]) -> None:
    """Türsteher Gemma mit dem handgeschriebenen Prompt (Vergleichsbasis)."""
    datei = Ergebnisdatei("gemma_handprompt")
    system = gemma_prompt(absichten)
    for frage in fragen:
        if datei.hat(frage.text):
            continue
        antwort = chat(
            GEMMA, system, frage.text, temperature=0, max_tokens=20, reasoning_effort="none"
        )
        datei.schreibe(
            {
                "frage": frage.text,
                "ausgabe": antwort.text,
                "absicht": kuerzel_im_text(antwort.text, absichten.kuerzel),
                "sekunden": antwort.sekunden,
            }
        )


def _dspy_modelle(dspy):  # type: ignore[no-untyped-def]
    """Gemma als ausführendes Modell (temperature 0) und als Ideengeber für neue Anweisungen
    (temperature 1, mehr Ausgabe). Beide ohne Nachdenken."""
    gemeinsam = {
        "api_base": LM_STUDIO_URL,
        "api_key": "lm-studio",
        "reasoning_effort": "none",
    }
    ausfuehrend = dspy.LM(
        f"openai/{GEMMA}", temperature=0.0, max_tokens=100, cache=False, **gemeinsam
    )
    ideengeber = dspy.LM(f"openai/{GEMMA}", temperature=1.0, max_tokens=4000, **gemeinsam)
    return ausfuehrend, ideengeber


def _dspy_programm(dspy, absichten: Absichten):  # type: ignore[no-untyped-def]
    """Ein dspy.Predict mit Frage als Eingabe und einer der 18 Absichten als Ausgabe."""
    absicht_typ = Literal[tuple(absichten.kuerzel)]  # type: ignore[valid-type]

    class Einstufen(dspy.Signature):  # type: ignore[misc]
        frage: str = dspy.InputField(desc="Frage eines Besuchers")
        absicht: absicht_typ = dspy.OutputField()  # type: ignore[valid-type]

    return dspy.Predict(Einstufen.with_instructions(dspy_anweisung(absichten)))


def _dspy_metrik(beispiel, vorhersage, trace=None) -> float:  # type: ignore[no-untyped-def]
    """1 für die richtige Absicht, 0,5 für die richtige Gruppe. Beim Sammeln von Beispielen
    (trace gesetzt) zählt nur ein Volltreffer."""
    richtig = vorhersage.absicht == beispiel.absicht
    if trace is not None:
        return float(richtig)
    if richtig:
        return 1.0
    return 0.5 if gruppe(str(vorhersage.absicht)) == gruppe(beispiel.absicht) else 0.0


def gemma_dspy_training(absichten: Absichten, training: list[Frage]) -> None:
    """Optimiert den Türsteher mit DSPy (MIPROv2) auf der Trainingsmenge: je Absicht 6 Fragen
    zum Lernen, 4 zum Bewerten der Kandidaten. Speichert Programm und lesbaren Prompt."""
    if DSPY_PROGRAMM.exists():
        print("DSPy-Programm liegt schon vor, Training übersprungen.")
        return
    import dspy

    ausfuehrend, ideengeber = _dspy_modelle(dspy)
    dspy.configure(lm=ausfuehrend)
    lernen, bewerten = [], []
    for kuerzel in absichten.kuerzel:
        je_absicht = [f for f in training if f.absicht == kuerzel]
        beispiele = [
            dspy.Example(frage=f.text, absicht=f.absicht).with_inputs("frage") for f in je_absicht
        ]
        lernen += beispiele[:6]
        bewerten += beispiele[6:]
    optimierer = dspy.MIPROv2(
        metric=_dspy_metrik,
        prompt_model=ideengeber,
        task_model=ausfuehrend,
        auto="medium",
        num_threads=4,
        max_bootstrapped_demos=4,
        max_labeled_demos=8,
        log_dir=str(ERGEBNISSE / "dspy_log"),
    )
    start = time.monotonic()
    programm = optimierer.compile(
        _dspy_programm(dspy, absichten),
        trainset=lernen,
        valset=bewerten,
        requires_permission_to_run=False,
    )
    print(f"DSPy-Training fertig nach {(time.monotonic() - start) / 60:.0f} Minuten.")
    programm.save(str(DSPY_PROGRAMM))
    nachrichten = dspy.ChatAdapter().format(
        programm.signature, demos=programm.demos, inputs={"frage": "<FRAGE DES BESUCHERS>"}
    )
    DSPY_PROMPT.write_text(
        "\n\n".join(f"=== {n['role']} ===\n{n['content']}" for n in nachrichten),
        encoding="utf-8",
    )


def gemma_dspy(absichten: Absichten, fragen: list[Frage]) -> None:
    """Türsteher Gemma mit dem von DSPy optimierten Programm."""
    import dspy

    ausfuehrend, _ = _dspy_modelle(dspy)
    dspy.configure(lm=ausfuehrend)
    programm = _dspy_programm(dspy, absichten)
    programm.load(str(DSPY_PROGRAMM))
    datei = Ergebnisdatei("gemma_dspy")
    for frage in fragen:
        if datei.hat(frage.text):
            continue
        start = time.monotonic()
        try:
            absicht: str | None = str(programm(frage=frage.text).absicht)
            fehler = None
        except Exception as ausnahme:  # Ausgabe nicht lesbar: zählt als Fehlgriff
            absicht, fehler = None, repr(ausnahme)
        datei.schreibe(
            {
                "frage": frage.text,
                "absicht": absicht if absicht in absichten.kuerzel else None,
                "ausgabe": absicht if fehler is None else fehler,
                "sekunden": time.monotonic() - start,
            }
        )


def gemma_antworten(_: Absichten, fragen: list[Frage]) -> None:
    """Gemma beantwortet jede Testfrage mit dem Antwort-Prompt aus dem Live-Betrieb. So lässt
    sich für jede Variante nachspielen, was passiert, wenn der Türsteher sie zu Gemma lässt."""
    datei = Ergebnisdatei("gemma_antworten")
    system = ANTWORT_PROMPT.read_text(encoding="utf-8")
    for frage in fragen:
        if datei.hat(frage.text):
            continue
        antwort = chat(GEMMA, system, frage.text, max_tokens=300, reasoning_effort="none")
        datei.schreibe({"frage": frage.text, "antwort": antwort.text, "sekunden": antwort.sekunden})


def _safeguard_tuersteher(stufe: str) -> Callable[[Absichten, list[Frage]], None]:
    def schritt(absichten: Absichten, fragen: list[Frage]) -> None:
        datei = Ergebnisdatei(f"safeguard_{stufe}")
        richtlinie = safeguard_richtlinie(absichten)
        for frage in fragen:
            if datei.hat(frage.text):
                continue
            antwort = chat(
                SAFEGUARD, richtlinie, frage.text, reasoning_effort=stufe, max_tokens=3000
            )
            datei.schreibe(
                {
                    "frage": frage.text,
                    "ausgabe": antwort.text,
                    "absicht": safeguard_kuerzel(antwort.text, absichten.kuerzel),
                    "sekunden": antwort.sekunden,
                    "ausgabe_tokens": antwort.ausgabe_tokens,
                }
            )

    schritt.__doc__ = f"Türsteher gpt-oss-safeguard mit reasoning_effort={stufe}."
    return schritt


def safeguard_pruefung(_: Absichten, fragen: list[Frage]) -> None:
    """Safeguard prüft jede Antwort, die Gemma im Schritt gemma_antworten gegeben hat."""
    antworten = Ergebnisdatei("gemma_antworten").zeilen
    datei = Ergebnisdatei("safeguard_pruefung")
    for frage in fragen:
        if datei.hat(frage.text) or frage.text not in antworten:
            continue
        gemma = str(antworten[frage.text]["antwort"])
        antwort = chat(
            SAFEGUARD,
            PRUEF_RICHTLINIE,
            pruef_inhalt(frage.text, gemma),
            reasoning_effort="low",
            max_tokens=3000,
        )
        datei.schreibe(
            {
                "frage": frage.text,
                "ausgabe": antwort.text,
                "verstoss": safeguard_verstoss(antwort.text),
                "sekunden": antwort.sekunden,
            }
        )


# Reihenfolge: erst alles mit Gemma, dann alles mit Safeguard (nur ein Modellwechsel).
SCHRITTE: dict[str, tuple[str, Callable[[Absichten, list[Frage]], None]]] = {
    "gemma_handprompt": (GEMMA, gemma_handprompt),
    "gemma_dspy_training": (GEMMA, lambda a, _: gemma_dspy_training(a, lade_fragen("training"))),
    "gemma_dspy": (GEMMA, gemma_dspy),
    "gemma_antworten": (GEMMA, gemma_antworten),
    "safeguard_low": (SAFEGUARD, _safeguard_tuersteher("low")),
    "safeguard_pruefung": (SAFEGUARD, safeguard_pruefung),
    "safeguard_medium": (SAFEGUARD, _safeguard_tuersteher("medium")),
}


def main(namen: list[str]) -> int:
    absichten = lade_absichten()
    fragen = lade_fragen("test")
    geladen = None
    fehlgeschlagen = []
    for name in namen or list(SCHRITTE):
        modell, schritt = SCHRITTE[name]
        print(f"\n=== {name} ({time.strftime('%H:%M:%S')}) ===", flush=True)
        try:
            if modell != geladen:
                aufwaermen(modell)
                geladen = modell
            schritt(absichten, fragen)
        except Exception:
            traceback.print_exc()
            fehlgeschlagen.append(name)
    print(f"\nFertig ({time.strftime('%H:%M:%S')}). Fehlgeschlagen: {fehlgeschlagen or 'keine'}")
    return 1 if fehlgeschlagen else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
