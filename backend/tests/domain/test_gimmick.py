from bot.domain.answer import Answer
from bot.domain.gimmick import GimmickRegistry, gimmick_for
from bot.domain.intent import Intent


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


def test_flirt_shows_a_heart() -> None:
    assert gimmick_for(Intent.FLIRT) == {"type": "heart"}


def test_sexual_shows_the_face_with_hand_over_mouth() -> None:
    assert gimmick_for(Intent.SEXUAL) == {"type": "face_with_hand_over_mouth"}


def test_only_flirt_and_sexual_have_a_gimmick_so_far() -> None:
    with_gimmick = [intent for intent in Intent if gimmick_for(intent) is not None]

    assert with_gimmick == [Intent.FLIRT, Intent.SEXUAL]


def test_the_gimmick_is_a_copy_the_caller_may_change() -> None:
    gimmick = gimmick_for(Intent.FLIRT)
    assert gimmick is not None
    gimmick["type"] = "geändert"

    assert gimmick_for(Intent.FLIRT) == {"type": "heart"}
