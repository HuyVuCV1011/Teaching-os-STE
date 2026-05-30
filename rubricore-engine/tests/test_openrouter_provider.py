from __future__ import annotations

import json

import httpx
import pytest

from app.ai.openrouter import OpenRouterProvider, OpenRouterProviderError, OPENROUTER_DEFAULT_MODEL


class TestOpenRouterProvider:
    """Tests for OpenRouterProvider."""

    def test_provider_has_correct_attributes(self) -> None:
        provider = OpenRouterProvider(api_key="test-key-openrouter")

        assert provider.provider_name == "openrouter"
        assert provider.model == OPENROUTER_DEFAULT_MODEL
        assert provider.api_key == "test-key-openrouter"
        assert provider.api_url == "https://openrouter.ai/api/v1/chat/completions"

    def test_provider_custom_model(self) -> None:
        provider = OpenRouterProvider(api_key="test-key", model="openrouter/google/gemini-2.5-pro")

        assert provider.model == "google/gemini-2.5-pro"

    def test_generate_returns_text_from_openrouter_response(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            body = json.loads(request.content)
            assert "messages" in body
            assert body["model"] == OPENROUTER_DEFAULT_MODEL
            assert request.headers.get("HTTP-Referer") == "https://github.com/HuyVuCV1011/Teaching-os-STE"
            assert request.headers.get("X-Title") == "STE Workspace"
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": '{"solution_key": "Test solution"}'
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = OpenRouterProvider(api_key="test-key")
        provider._client = client

        result = provider.generate("System instruction", "User prompt")
        assert result == '{"solution_key": "Test solution"}'

    def test_generate_json_parses_json_response(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": '{"key": "value"}'
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = OpenRouterProvider(api_key="test-key")
        provider._client = client

        result = provider.generate_json("System", "User")
        assert result == {"key": "value"}

    def test_generate_strips_markdown_code_fences(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": '```json\n{"key": "value"}\n```'
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = OpenRouterProvider(api_key="test-key")
        provider._client = client

        result = provider.generate_json("System", "User")
        assert result == {"key": "value"}

    def test_generate_raises_error_on_no_choices(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"choices": []})

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = OpenRouterProvider(api_key="test-key")
        provider._client = client

        with pytest.raises(OpenRouterProviderError, match="no choices"):
            provider.generate("System", "User")

    def test_generate_raises_error_on_empty_text(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": "   "
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = OpenRouterProvider(api_key="test-key")
        provider._client = client

        with pytest.raises(OpenRouterProviderError, match="empty text"):
            provider.generate("System", "User")

    def test_generate_raises_error_on_invalid_json(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": "not valid json"
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = OpenRouterProvider(api_key="test-key")
        provider._client = client

        with pytest.raises(OpenRouterProviderError, match="not valid JSON"):
            provider.generate_json("System", "User")

    def test_evaluate_returns_grading_payload(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": json.dumps(
                                    {
                                        "criterion_suggestions": [
                                            {
                                                "criterion_key": "correctness",
                                                "score": "2",
                                                "confidence": "0.86",
                                                "explanation": "Good answer.",
                                                "evidence_references": ["ev-1"],
                                            }
                                        ],
                                        "confidence": "0.86",
                                    }
                                )
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = OpenRouterProvider(api_key="openrouter-key-789")
        provider._client = client

        output = provider.evaluate(
            {
                "rubric_schema": {"criteria": [{"key": "correctness"}]},
                "evidence": [{"id": "ev-1"}],
            }
        )

        assert output["criterion_suggestions"][0]["criterion_key"] == "correctness"
        assert output["confidence"] == "0.86"

    def test_generate_raises_on_http_error(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(401, json={"error": "Unauthorized"})

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = OpenRouterProvider(api_key="invalid-key")
        provider._client = client

        with pytest.raises(OpenRouterProviderError, match="Failed to query OpenRouter API"):
            provider.generate("System", "User")
