import json

from bot.adapters.json_log import JsonLog


def test_record_becomes_one_json_line_with_umlauts_intact() -> None:
    lines: list[str] = []

    JsonLog(emit=lines.append).write({"question": "Größe?", "duration_ms": 12})

    assert len(lines) == 1
    assert "\n" not in lines[0]
    assert json.loads(lines[0]) == {"question": "Größe?", "duration_ms": 12}
    assert "Größe" in lines[0]
