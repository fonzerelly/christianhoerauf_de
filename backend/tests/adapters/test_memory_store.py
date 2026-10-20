from bot.adapters.memory_store import MemoryStore


def test_increment_counts_per_key() -> None:
    store = MemoryStore()

    assert [store.increment("a"), store.increment("a"), store.increment("b")] == [1, 2, 1]


def test_read_returns_none_until_written() -> None:
    store = MemoryStore()
    assert store.read("k") is None

    store.write("k", "Wert")

    assert store.read("k") == "Wert"
