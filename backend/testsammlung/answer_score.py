"""Bewertung einer Antwort aus den Befunden der Regeln und des Richters.

Entschieden am 03.11.2026 (KRITERIEN.md, „Training mit GEPA“): Fällt ein muss-Kriterium durch,
zählt die Antwort 0; sonst der Anteil der bestandenen soll-Kriterien. GEPA bekommt dazu den Text
von `feedback`.
"""

from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class Finding:
    """Ein geprüftes Kriterium (K1 … K32 aus KRITERIEN.md): muss oder soll, bestanden oder nicht,
    dazu eine kurze Begründung."""

    criterion: str
    must: bool
    passed: bool
    note: str = ""


def score(findings: Sequence[Finding]) -> float:
    """0, wenn ein muss-Kriterium durchfiel; sonst der Anteil bestandener soll-Kriterien, ohne
    soll-Kriterien 1."""
    if any(finding.must and not finding.passed for finding in findings):
        return 0.0
    should = [finding for finding in findings if not finding.must]
    if not should:
        return 1.0
    return sum(finding.passed for finding in should) / len(should)


def feedback(findings: Sequence[Finding]) -> str:
    """Text für GEPA und für Menschen: jedes nicht bestandene Kriterium mit Begründung, die
    muss-Kriterien zuerst."""
    failed = [finding for finding in findings if not finding.passed]
    if not failed:
        return "Alle Kriterien bestanden."
    failed.sort(key=lambda finding: not finding.must)
    lines = [
        f"- {finding.criterion} ({'muss' if finding.must else 'soll'}): {finding.note}"
        for finding in failed
    ]
    return "Nicht bestanden:\n" + "\n".join(lines)
