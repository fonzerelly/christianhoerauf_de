from bot.domain.answer import Answer
from bot.domain.gimmick import GimmickRegistry


class FakeGimmick:
    name = "fake"
    description = "Fragen nach dem Fake"

    def answer(self, question: str) -> Answer:
        return Answer(text="fake")


def test_new_registry_is_empty() -> None:
    assert GimmickRegistry().gimmicks == ()


def test_registered_gimmick_is_listed_with_its_description() -> None:
    registry = GimmickRegistry()
    gimmick = FakeGimmick()

    registry.register(gimmick)

    assert registry.gimmicks == (gimmick,)
    assert registry.descriptions() == ["Fragen nach dem Fake"]
