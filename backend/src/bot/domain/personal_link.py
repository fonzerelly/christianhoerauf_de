"""Der persönliche Link in den Unterlagen einer Bewerbung (siehe docs/bewerbung/).

Hinter `#` steht base64url von „Variantennummer|Ansprechpartner|Prüfsumme“. Den Teil hinter `#`
schickt der Browser an keinen Server. Die Prüfsumme (FNV-1a, 4 Hex-Ziffern) erkennt nur
abgeschnittene oder verstümmelte Links; ein Geheimnis schützt sie nicht.
"""

import base64

SITE = "https://christianhoerauf.de/"
SEPARATOR = "|"

_FNV_OFFSET = 2166136261
_FNV_PRIME = 16777619


def fnv1a(text: str) -> int:
    """FNV-1a mit 32 Bit über die Unicode-Zeichen des Texts.

    Rechnet genau wie seedFromText in corporate-identity/lebenslauf/streifen.js, damit Frontend
    und PDF dieselbe Prüfsumme bilden."""
    value = _FNV_OFFSET
    for character in text:
        value ^= ord(character)
        value = (value * _FNV_PRIME) & 0xFFFFFFFF
    return value


def checksum(number: int, name: str) -> str:
    """Die ersten 4 Hex-Ziffern von FNV-1a über „Nummer|Name“."""
    return f"{fnv1a(f'{number}{SEPARATOR}{name}'):08x}"[:4]


def personal_fragment(number: int, name: str) -> str:
    """Der Teil hinter `#`: base64url (ohne `=`) von „Nummer|Name|Prüfsumme“."""
    if SEPARATOR in name:
        raise ValueError(f"Der Name darf kein {SEPARATOR} enthalten: {name!r}")
    text = SEPARATOR.join([str(number), name, checksum(number, name)])
    return base64.urlsafe_b64encode(text.encode("utf-8")).decode("ascii").rstrip("=")


def personal_link(number: int, name: str) -> str:
    """Der ganze Link für Variante `number` und Ansprechpartner `name`."""
    return f"{SITE}#{personal_fragment(number, name)}"
