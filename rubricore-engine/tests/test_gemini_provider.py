from __future__ import annotations

import json

import httpx
import pytest

from app.ai.gemini import GeminiProvider, GeminiProviderError, GEMINI_DEFAULT_MODEL


class TestGeminiProvider:
    """Tests for GeminiProvider."""

    def test_provider_has_correct_attributes(self) -> None:
        provider = GeminiProvider(api_key="test-key-123")

        assert provider.provider_name == "gemini"
        assert provider.model_name == GEMINI_DEFAULT_MODEL
        assert provider.api_key == "test-key-123"
        assert "gemini-2.5-flash" in provider.api_url

    def test_provider_custom_model(self) -> None:
        provider = GeminiProvider(api_key="test-key", model="gemini-2.0-flash")

        assert provider.model == "gemini-2.0-flash"
        assert "gemini-2.0-flash" in provider.api_url

    def test_generate_returns_text_from_gemini_response(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            body = json.loads(request.content)
            assert "contents" in body
            assert "systemInstruction" in body
            return httpx.Response(
                200,
                json={
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {"text": '{"solution_key": "Test solution"}'}
                                ]
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = GeminiProvider(api_key="test-key")
        provider._client = client

        result = provider.generate("System instruction", "User prompt")
        assert result == '{"solution_key": "Test solution"}'

    def test_generate_json_parses_json_response(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {"text": '{"key": "value"}'}
                                ]
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = GeminiProvider(api_key="test-key")
        provider._client = client

        result = provider.generate_json("System", "User")
        assert result == {"key": "value"}

    def test_generate_strips_markdown_code_fences(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {"text": '```json\n{"key": "value"}\n```'}
                                ]
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = GeminiProvider(api_key="test-key")
        provider._client = client

        result = provider.generate_json("System", "User")
        assert result == {"key": "value"}

    def test_generate_raises_error_on_no_candidates(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"candidates": []})

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = GeminiProvider(api_key="test-key")
        provider._client = client

        with pytest.raises(GeminiProviderError, match="no candidates"):
            provider.generate("System", "User")

    def test_generate_raises_error_on_empty_text(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {"text": "   "}
                                ]
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = GeminiProvider(api_key="test-key")
        provider._client = client

        with pytest.raises(GeminiProviderError, match="empty text"):
            provider.generate("System", "User")

    def test_generate_raises_error_on_invalid_json(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {"text": "not valid json"}
                                ]
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = GeminiProvider(api_key="test-key")
        provider._client = client

        with pytest.raises(GeminiProviderError, match="not valid JSON"):
            provider.generate_json("System", "User")

    def test_evaluate_returns_grading_payload(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {
                                        "text": json.dumps(
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
                                ]
                            }
                        }
                    ]
                },
            )

        client = httpx.Client(transport=httpx.MockTransport(handler))
        provider = GeminiProvider(api_key="test-key")
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
        provider = GeminiProvider(api_key="invalid-key")
        provider._client = client

        with pytest.raises(GeminiProviderError, match="Failed to query Gemini API"):
            provider.generate("System", "User")
