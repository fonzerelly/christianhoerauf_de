import pytest

from bot.adapters.bedrock_token import bedrock_token_provider


def test_provider_creates_a_bedrock_api_key_from_the_role_credentials(
    monkeypatch: pytest.MonkeyPatch, tmp_path: object
) -> None:
    # Erfundene Zugangsdaten: der Schlüssel wird nur lokal signiert, es gibt keinen Aufruf bei AWS.
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "AKIAEXAMPLEEXAMPLE")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "geheim-geheim-geheim")
    monkeypatch.setenv("AWS_SHARED_CREDENTIALS_FILE", f"{tmp_path}/nicht-da")
    monkeypatch.setenv("AWS_CONFIG_FILE", f"{tmp_path}/nicht-da")

    token = bedrock_token_provider("eu-central-1")()

    assert token.startswith("bedrock-api-key-")
