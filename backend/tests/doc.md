# tests

Unit-Tests (pytest) mit harter Abdeckungsschwelle von 100 % Zeilen und Zweigen. Der Ordnerbau
spiegelt `src/bot/`. Property-based Tests (Hypothesis) liegen neben den Beispieltests und enden
auf `_properties.py`.

| Datei | Was sie prüft |
|---|---|
| `domain/test_answer.py` | `Answer.to_dict()` ohne und mit Gimmick. |
| `domain/test_answer_properties.py` | Beliebiger Text übersteht die Umwandlung nach JSON und zurück unverändert. |
| `test_handler.py` | Der Platzhalter-Handler antwortet mit 200 und dem festen Text als JSON. |
