import json

from bot.handler import handler


def test_placeholder_handler_answers_with_json_text() -> None:
    response = handler({}, None)

    assert response["statusCode"] == 200
    assert json.loads(str(response["body"])) == {"text": "Ich bin noch im Aufbau."}
