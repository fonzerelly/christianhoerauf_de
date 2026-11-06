from datetime import UTC, datetime, timedelta

from bot.adapters.system_clock import SystemClock


def test_today_is_the_utc_date() -> None:
    assert SystemClock().today() == datetime.now(UTC).date()


def test_seconds_never_go_backwards() -> None:
    clock = SystemClock()
    first = clock.seconds()

    assert clock.seconds() >= first > 0


def test_now_is_the_current_time_in_germany() -> None:
    now = SystemClock().now()

    assert str(now.tzinfo) == "Europe/Berlin"
    assert abs(now - datetime.now(UTC)) < timedelta(seconds=5)
