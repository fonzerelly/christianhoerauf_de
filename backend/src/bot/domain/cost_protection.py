import hashlib
import hmac
from datetime import date

DAILY_LIMIT = 2000
VISITOR_LIMIT = 10
_TAG_LENGTH = 16


def daily_limit_reached(count: int) -> bool:
    """`count` ist die Zahl der heutigen Fragen inklusive der aktuellen."""
    return count > DAILY_LIMIT


def visitor_limit_reached(count: int) -> bool:
    """`count`: heutige allgemeine Fragen des Besuchers inklusive der aktuellen."""
    return count > VISITOR_LIMIT


def normalize_question(question: str) -> str:
    """Kleinschreibung und einfache Leerzeichen, damit gleiche Fragen gleich aussehen."""
    return " ".join(question.lower().split())


def daily_counter_key(day: date) -> str:
    return f"daily:{day.isoformat()}"


def visitor_counter_key(tag: str, day: date) -> str:
    return f"visitor:{day.isoformat()}:{tag}"


def cache_key(question: str, day: date, version: str = "") -> str:
    """Schlüssel des Zwischenspeichers; nur ein Hash, die Frage selbst steht nicht darin.
    `version` kennzeichnet das Ausrollen: Nach einem neuen Ausrollen passt kein alter Eintrag mehr,
    der Speicher ist also leer, ohne dass jemand ihn löschen muss."""
    digest = hashlib.sha256(normalize_question(question).encode()).hexdigest()
    return f"cache:{version}:{day.isoformat()}:{digest}"


def visitor_tag(ip: str, secret: str, day: date) -> str:
    """Kurzes Kürzel des Besuchers. Das Tagessalz wird aus Geheimnis und Datum abgeleitet
    und nie gespeichert; ohne das Geheimnis lässt sich aus dem Kürzel die IP nicht zurückrechnen."""
    daily_salt = hmac.new(secret.encode(), day.isoformat().encode(), hashlib.sha256).digest()
    return hmac.new(daily_salt, ip.encode(), hashlib.sha256).hexdigest()[:_TAG_LENGTH]


def suggestion_key(question: str, day: date, conversation: str) -> str:
    """Schlüssel für eine Folgefrage, die der Bot heute in diesem Gespräch vorgeschlagen hat; wie
    beim Zwischenspeicher nur ein Hash. `conversation` ist die Gesprächs-ID oder, ohne sie, das
    Besucherkürzel: Nur wem sie vorgeschlagen wurde, kommt mit ihr am Türsteher vorbei (Plan,
    „Folgefragen-Lücke“). Ohne Version: Eine Folgefrage bleibt nach einem neuen Ausrollen eine
    Frage des Bots."""
    text = f"{conversation}\n{normalize_question(question)}"
    digest = hashlib.sha256(text.encode()).hexdigest()
    return f"suggestion:{day.isoformat()}:{digest}"


def conversation_key(conversation: str) -> str:
    """Schlüssel, unter dem der Bot sich die letzte Frage und Antwort eines Gesprächs merkt
    (ADR 0005). Nur ein Hash der Gesprächs-ID, ohne Tag: Ein Gespräch darf über Mitternacht gehen,
    es verfällt mit dem Speicher."""
    digest = hashlib.sha256(conversation.encode()).hexdigest()
    return f"conversation:{digest}"
