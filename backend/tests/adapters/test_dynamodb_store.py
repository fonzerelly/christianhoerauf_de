from typing import Any

from bot.adapters.dynamodb_store import DynamoDbStore


class FakeDynamoDb:
    """Merkt sich die Aufrufe und antwortet wie DynamoDB mit festen Antworten."""

    def __init__(self, item: dict[str, Any] | None = None) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.item = item

    def update_item(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(("update_item", kwargs))
        return {"Attributes": {"n": {"N": "7"}}}

    def get_item(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(("get_item", kwargs))
        return {"Item": self.item} if self.item else {}

    def put_item(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(("put_item", kwargs))
        return {}


def make_store(client: FakeDynamoDb) -> DynamoDbStore:
    return DynamoDbStore(client, table="bot", ttl_seconds=172_800, now=lambda: 1_000.0)


def test_increment_adds_one_sets_expiry_and_returns_the_new_count() -> None:
    client = FakeDynamoDb()

    count = make_store(client).increment("daily:2026-10-22")

    assert count == 7
    name, call = client.calls[0]
    assert name == "update_item"
    assert call["TableName"] == "bot"
    assert call["Key"] == {"pk": {"S": "daily:2026-10-22"}}
    assert call["ReturnValues"] == "UPDATED_NEW"
    assert call["ExpressionAttributeValues"] == {":one": {"N": "1"}, ":exp": {"N": "173800"}}
    assert "ADD n :one" in call["UpdateExpression"]
    assert "expires_at = :exp" in call["UpdateExpression"]


def test_write_puts_value_with_expiry() -> None:
    client = FakeDynamoDb()

    make_store(client).write("cache:x", "Antwort")

    name, call = client.calls[0]
    assert name == "put_item"
    assert call["TableName"] == "bot"
    assert call["Item"] == {
        "pk": {"S": "cache:x"},
        "v": {"S": "Antwort"},
        "expires_at": {"N": "173800"},
    }


def test_read_returns_the_stored_text() -> None:
    client = FakeDynamoDb(item={"pk": {"S": "cache:x"}, "v": {"S": "Antwort"}})

    assert make_store(client).read("cache:x") == "Antwort"
    assert client.calls[0][1]["Key"] == {"pk": {"S": "cache:x"}}


def test_read_returns_none_for_a_missing_item() -> None:
    assert make_store(FakeDynamoDb()).read("cache:x") is None


def test_read_returns_none_for_an_item_that_only_counts() -> None:
    client = FakeDynamoDb(item={"pk": {"S": "daily:x"}, "n": {"N": "3"}})

    assert make_store(client).read("daily:x") is None
