"""Einstieg des Lambdas. Hier wird später alles zusammengesteckt (Plan, Schritt 5)."""

import json

from bot.domain.answer import Answer


def handler(event: dict[str, object], context: object) -> dict[str, object]:
    """Platzhalter: antwortet auf jede Anfrage mit demselben Text im Antwortformat."""
    answer = Answer(text="Ich bin noch im Aufbau.")
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(answer.to_dict(), ensure_ascii=False),
    }
