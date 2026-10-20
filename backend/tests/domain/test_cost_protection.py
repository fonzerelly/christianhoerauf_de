from datetime import date

from hypothesis import given
from hypothesis import strategies as st

from bot.domain.cost_protection import (
    DAILY_LIMIT,
    VISITOR_LIMIT,
    cache_key,
    daily_counter_key,
    daily_limit_reached,
    normalize_question,
    visitor_counter_key,
    visitor_limit_reached,
    visitor_tag,
)

DAY = date(2026, 10, 22)
secrets = st.text(min_size=1)
ips = st.ip_addresses().map(str)
days = st.dates()


def test_limits_are_the_agreed_values() -> None:
    assert (DAILY_LIMIT, VISITOR_LIMIT) == (2000, 10)


def test_daily_limit_is_reached_only_beyond_the_limit() -> None:
    assert not daily_limit_reached(2000)
    assert daily_limit_reached(2001)


def test_visitor_limit_is_reached_only_beyond_the_limit() -> None:
    assert not visitor_limit_reached(10)
    assert visitor_limit_reached(11)


def test_normalize_lowercases_and_collapses_whitespace() -> None:
    assert normalize_question("  Wie   SPÄT\tist es?\n") == "wie spät ist es?"


def test_counter_keys_contain_the_day() -> None:
    assert daily_counter_key(DAY) == "daily:2026-10-22"
    assert visitor_counter_key("abc", DAY) == "visitor:2026-10-22:abc"


def test_cache_key_ignores_case_and_spacing() -> None:
    assert cache_key("Wie spät ist es?", DAY) == cache_key("  wie  SPÄT ist es? ", DAY)


def test_cache_key_differs_by_day_and_question() -> None:
    assert cache_key("a", DAY) != cache_key("a", date(2026, 10, 23))
    assert cache_key("a", DAY) != cache_key("b", DAY)


def test_cache_key_does_not_contain_the_question() -> None:
    assert "geheim" not in cache_key("geheim", DAY)


@given(ip=ips, secret=secrets, day=days)
def test_same_ip_same_day_gives_same_tag(ip: str, secret: str, day: date) -> None:
    assert visitor_tag(ip, secret, day) == visitor_tag(ip, secret, day)


@given(ip=ips, secret=secrets, day=days)
def test_another_day_gives_another_tag(ip: str, secret: str, day: date) -> None:
    next_day = date.fromordinal(day.toordinal() % 3_000_000 + 1)

    assert visitor_tag(ip, secret, day) != visitor_tag(ip, secret, next_day)


@given(ip=ips, other_ip=ips, secret=secrets, day=days)
def test_another_ip_gives_another_tag(ip: str, other_ip: str, secret: str, day: date) -> None:
    if ip != other_ip:
        assert visitor_tag(ip, secret, day) != visitor_tag(other_ip, secret, day)


@given(ip=ips, secret=secrets, day=days)
def test_tag_is_short_hex_and_does_not_reveal_the_ip(ip: str, secret: str, day: date) -> None:
    tag = visitor_tag(ip, secret, day)

    assert len(tag) == 16
    assert int(tag, 16) >= 0
    assert ip not in tag


def test_another_secret_gives_another_tag() -> None:
    assert visitor_tag("1.2.3.4", "a", DAY) != visitor_tag("1.2.3.4", "b", DAY)
