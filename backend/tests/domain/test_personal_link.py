import base64
import json
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from bot.domain.personal_link import (
    SITE,
    checksum,
    fnv1a,
    personal_fragment,
    personal_link,
)

# Dieselben Beispiele prüft das Frontend beim Lesen des Links (Frontend-Plan, Schritt 12).
EXAMPLES_PATH = Path(__file__).parents[2] / "schema" / "personal-link.examples.json"
EXAMPLES = json.loads(EXAMPLES_PATH.read_text(encoding="utf-8"))

names = st.text(min_size=1).filter(lambda text: "|" not in text)


def decode(fragment: str) -> str:
    padded = fragment + "=" * (-len(fragment) % 4)
    return base64.urlsafe_b64decode(padded).decode("utf-8")


def test_fnv1a_known_values_match_the_letterhead_seed() -> None:
    # Dieselben Werte wie seedFromText in corporate-identity/lebenslauf/streifen.js.
    assert fnv1a("") == 2166136261
    assert fnv1a("a") == 0xE40C292C
    assert fnv1a("foobar") == 0xBF9CF968


def test_checksum_is_the_first_four_hex_digits_over_number_and_name() -> None:
    assert checksum(4711, "Frau Erika Muster") == "e9bd"


def test_personal_link_points_to_the_site_with_the_fragment_after_the_hash() -> None:
    assert personal_link(4711, "Frau Erika Muster") == (
        "https://christianhoerauf.de/#NDcxMXxGcmF1IEVyaWthIE11c3RlcnxlOWJk"
    )
    assert SITE == "https://christianhoerauf.de/"


@pytest.mark.parametrize("example", EXAMPLES["gueltig"], ids=lambda example: example["name"])
def test_valid_examples_are_built_exactly(example: dict[str, object]) -> None:
    assert (
        personal_fragment(int(str(example["nummer"])), str(example["name"])) == example["fragment"]
    )


@pytest.mark.parametrize("example", EXAMPLES["kaputt"], ids=lambda example: example["grund"])
def test_broken_examples_do_not_carry_a_matching_checksum(example: dict[str, str]) -> None:
    try:
        number, name, given_checksum = decode(example["fragment"]).split("|")
    except ValueError:
        return  # gar nicht lesbar: auch das ist kaputt
    assert checksum(int(number), name) != given_checksum


def test_a_name_with_the_separator_is_rejected() -> None:
    with pytest.raises(ValueError, match=r"\|"):
        personal_fragment(4711, "Frau A|B")


@given(number=st.integers(min_value=0, max_value=99999), name=names)
def test_fragment_decodes_to_number_name_and_checksum(number: int, name: str) -> None:
    assert decode(personal_fragment(number, name)) == f"{number}|{name}|{checksum(number, name)}"
