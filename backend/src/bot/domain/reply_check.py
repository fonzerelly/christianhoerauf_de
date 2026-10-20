import re

MAX_LENGTH = 200

# Emoji-Bereiche, Variationsselektor und Zero-Width-Joiner (hält Emoji-Folgen zusammen).
_EMOJI = re.compile("[\U0001f000-\U0001faff☀-➿⬀-⯿️‍]")
_SENTENCE_END = re.compile(r"[.!?](?=\s|$)")


def check_reply(text: str) -> str:
    """Entfernt Emojis, ordnet Leerraum und kürzt auf höchstens MAX_LENGTH Zeichen."""
    tidy = " ".join(_EMOJI.sub("", text).split())
    if len(tidy) <= MAX_LENGTH:
        return tidy
    return _shorten(tidy[: MAX_LENGTH + 1])


def _shorten(candidate: str) -> str:
    """Kürzt an der letzten Satzgrenze, sonst am letzten Wort (mit Punkt), sonst hart."""
    sentence_ends = [match.end() for match in _SENTENCE_END.finditer(candidate)]
    if sentence_ends:
        return candidate[: sentence_ends[-1]]
    if " " in candidate[:MAX_LENGTH]:
        words = candidate[:MAX_LENGTH].rsplit(" ", 1)[0]
        return words.rstrip(",;:") + "."
    return candidate[:MAX_LENGTH]
