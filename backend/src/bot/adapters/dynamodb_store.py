from collections.abc import Callable
from typing import Any, Protocol


class DynamoDbClient(Protocol):
    """Der Teil des boto3-Clients `dynamodb`, den der Speicher braucht."""

    def update_item(self, **kwargs: Any) -> dict[str, Any]: ...
    def get_item(self, **kwargs: Any) -> dict[str, Any]: ...
    def put_item(self, **kwargs: Any) -> dict[str, Any]: ...


class DynamoDbStore:
    """Zähler und Zwischenspeicher in einer DynamoDB-Tabelle (ADR backend/0003).

    Schlüssel `pk` (Text). Zähler stehen in `n`, Texte in `v`, Ablaufzeit (Unix-Sekunden, die
    TTL-Spalte der Tabelle) in `expires_at`. Es werden keine echten IP-Adressen gespeichert.
    """

    def __init__(
        self,
        client: DynamoDbClient,
        table: str,
        ttl_seconds: int,
        now: Callable[[], float],
    ) -> None:
        self._client = client
        self._table = table
        self._ttl_seconds = ttl_seconds
        self._now = now

    def _expires_at(self) -> dict[str, str]:
        return {"N": str(int(self._now()) + self._ttl_seconds)}

    def increment(self, key: str) -> int:
        """Zählt atomar um eins hoch (ADD) und gibt den neuen Stand zurück."""
        response = self._client.update_item(
            TableName=self._table,
            Key={"pk": {"S": key}},
            UpdateExpression="ADD n :one SET expires_at = :exp",
            ExpressionAttributeValues={":one": {"N": "1"}, ":exp": self._expires_at()},
            ReturnValues="UPDATED_NEW",
        )
        return int(response["Attributes"]["n"]["N"])

    def read(self, key: str) -> str | None:
        """Der gespeicherte Text zu `key`, sonst `None` (auch bei reinen Zählern)."""
        response = self._client.get_item(TableName=self._table, Key={"pk": {"S": key}})
        text = response.get("Item", {}).get("v")
        return None if text is None else str(text["S"])

    def write(self, key: str, value: str) -> None:
        self._client.put_item(
            TableName=self._table,
            Item={"pk": {"S": key}, "v": {"S": value}, "expires_at": self._expires_at()},
        )
