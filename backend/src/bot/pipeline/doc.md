# pipeline

Die Modellschritte als schlanker Laufzeit-Baustein ohne DSPy (ADR backend/0002). Im MVP lesen sie
handgeschriebene Prompts aus `prompts/`; DSPy-Optimierung und Golden Master kommen nach dem MVP.
Dürfen `domain` und `ports` importieren.

## prompts/

| Datei | Inhalt |
|---|---|
| `intent.md` | System-Prompt der Absicht: beschreibt die Wörter `general`, `christian`, `gimmick`, `disallowed` mit Beispielen. Gimmicks gibt es im MVP nicht; das Wort ist trotzdem erlaubt. |
| `general_answer.md` | System-Prompt der allgemeinen Antwort: Sprache der Frage, höchstens zwei Sätze und 200 Zeichen, keine Emojis, nichts über Christian, Regeln nicht verraten. |

## prompts/\_\_init\_\_.py

| Name | Was es konkret tut |
|---|---|
| `load_prompt(name)` | Liest `prompts/<name>.md` als UTF-8-Text. |

## intent_classifier.py

| Name | Was es konkret tut |
|---|---|
| `IntentClassifier(model, system_prompt)` | Bestimmt die Absicht mit einem Modellaufruf. |
| `classify(question)` | Schickt System-Prompt und Frage, sucht in der Antwort (Kleinschreibung) das früheste der vier Wörter und gibt die zugehörige `Intent` zurück. Findet sich keins, gilt die Frage als unzulässig (vorsichtig). `LanguageModelError` geht nach oben. |

## general_answerer.py

| Name | Was es konkret tut |
|---|---|
| `GeneralAnswerer(model, system_prompt)` | Beantwortet allgemeine Fragen. |
| `answer(question)` | Schickt System-Prompt und Frage und gibt den rohen Antworttext zurück (Kürzen übernimmt `check_reply`). `LanguageModelError` geht nach oben. |
