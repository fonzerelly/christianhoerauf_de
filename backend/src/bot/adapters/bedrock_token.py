from collections.abc import Callable
from datetime import timedelta

from aws_bedrock_token_generator import provide_token

# Der Schlüssel wird nur lokal signiert (kein Aufruf bei AWS) und gilt nicht länger als die
# Zugangsdaten der Lambda-Rolle; deshalb kurz und bei jedem Modellaufruf neu.
_TOKEN_LIFETIME = timedelta(minutes=15)


def bedrock_token_provider(region: str) -> Callable[[], str]:
    """Liefert eine Funktion, die aus den Rechten der Lambda-Rolle einen Bedrock-API-Schlüssel
    (Bearer-Token) für `region` erzeugt."""

    def create_token() -> str:
        return str(provide_token(region=region, expiry=_TOKEN_LIFETIME))

    return create_token
