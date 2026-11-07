"""Kev (kev-4b) auf der DGX: ein Entscheidungsmodell, das keinen Text schreibt, sondern Fragen zu
einem Text mit Wahrscheinlichkeiten beantwortet. Aufruf über `POST /v1/systemone`, im Heimnetz
ohne Schlüssel.

Kev urteilt schlecht allein („Ist das gut?“), aber gut im Vergleich zweier Vorschläge. Deshalb
fragt die Messung des Stichworts nur: Welches von beiden ist die bessere Überschrift?
"""

import json
import urllib.request

KEV_RULE = (
    "Ein Chatbot beantwortet Fragen über den Softwareentwickler Chris und zeigt über jeder Antwort "
    "ein Stichwort: eine kurze Überschrift aus ein oder zwei Wörtern, die den wichtigsten Aspekt "
    "von Frage und Antwort trägt."
)
_CHOICE = "Welches Stichwort ist die bessere Überschrift für Frage und Antwort?"


class Kev:
    """Vergleicht zwei Stichwörter zu Frage und Antwort."""

    def __init__(self, url: str, timeout_seconds: float = 60.0) -> None:
        self._url = url
        self._timeout_seconds = timeout_seconds

    def prefers(self, question: str, answer: str, mine: str, reference: str) -> float:
        """Kevs Wahrscheinlichkeit, dass `mine` die bessere Überschrift ist als `reference`."""
        body = {
            "model": "kev-4b",
            "state": f"{KEV_RULE}\n\nFrage: {question}\nAntwort: {answer}",
            "questions": {
                "wahl": {
                    "type": "choice",
                    "instructions": _CHOICE,
                    "criteria": {mine: None, reference: None},
                }
            },
        }
        request = urllib.request.Request(
            self._url, json.dumps(body).encode(), {"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(request, timeout=self._timeout_seconds) as response:
            reply = json.load(response)
        return float(reply["answers"]["wahl"]["probabilities"][mine])
