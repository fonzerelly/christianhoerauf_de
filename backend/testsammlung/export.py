"""Wandelt die Nachrichten, die DSPys ChatAdapter baut, in den Export für das Lambda
(`src/bot/pipeline/prompts/intent_program.json`, ADR 0002). Ohne DSPy, damit testbar."""

from bot.ports.language_model import Message

# Steht statt der Frage in der letzten Nachricht; kommt in keiner echten Frage vor.
PLACEHOLDER = "\x00FRAGE\x00"


def program_export(labels: list[str], messages: list[Message]) -> dict[str, object]:
    """`messages` hat DSPy für die Frage `PLACEHOLDER` gebaut. Alle Nachrichten außer der letzten
    bleiben wörtlich; die letzte wird am Platzhalter in Anfang und Ende geteilt. Sieht die letzte
    Nachricht anders aus als erwartet, `ValueError`: dann hat sich das Format von DSPy geändert."""
    *fixed, last = messages
    if last["role"] != "user" or last["content"].count(PLACEHOLDER) != 1:
        raise ValueError("Unerwarteter Aufbau der letzten Nachricht; Export abgebrochen.")
    prefix, suffix = last["content"].split(PLACEHOLDER)
    return {
        "labels": labels,
        "messages": fixed,
        "question_prefix": prefix,
        "question_suffix": suffix,
    }
