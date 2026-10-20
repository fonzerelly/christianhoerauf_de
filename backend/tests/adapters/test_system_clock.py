from datetime import UTC, datetime

from bot.adapters.system_clock import SystemClock


def test_today_is_the_utc_date() -> None:
    assert SystemClock().today() == datetime.now(UTC).date()


def test_seconds_never_go_backwards() -> None:
    clock = SystemClock()
    first = clock.seconds()

    assert clock.seconds() >= first > 0
