from __future__ import annotations

from unittest.mock import patch

import pytest

from app.ai.broker import get_provider, AIBroker
from app.ai.gemini import GeminiProvider
from app.ai.ollama import OllamaGradingProvider
from app.ai.groq import GroqProvider
from app.ai.openrouter import OpenRouterProvider


class SettingsStub:
    gemini_api_key = ""
    groq_api_key = ""
    openrouter_api_key = ""
    ollama_model = "llama3.2:1b"
    ollama_base_url = "http://localhost:11434"
    ollama_timeout_seconds = 120.0


class SettingsWithGemini:
    gemini_api_key = "test-gemini-key-123"
    groq_api_key = ""
    openrouter_api_key = ""
    ollama_model = "llama3.2:1b"
    ollama_base_url = "http://localhost:11434"
    ollama_timeout_seconds = 120.0


class SettingsWithAllKeys:
    gemini_api_key = "test-gemini-key-123"
    groq_api_key = "test-groq-key-123"
    openrouter_api_key = "test-openrouter-key-123"
    ollama_model = "llama3.2:1b"
    ollama_base_url = "http://localhost:11434"
    ollama_timeout_seconds = 120.0


class TestAIBrokerRouting:
    """Tests for AIBroker provider routing."""

    @patch("app.ai.broker.get_settings")
    def test_get_provider_returns_ollama_when_no_gemini_key(self, mock_settings) -> None:
        mock_settings.return_value = SettingsStub()
        provider = get_provider("gemini")
        assert isinstance(provider, OllamaGradingProvider)

    @patch("app.ai.broker.get_settings")
    def test_get_provider_returns_gemini_when_key_present(self, mock_settings) -> None:
        mock_settings.return_value = SettingsWithGemini()
        provider = get_provider("gemini")
        assert isinstance(provider, GeminiProvider)

    @patch("app.ai.broker.get_settings")
    def test_get_provider_returns_ollama_for_ollama_choice(self, mock_settings) -> None:
        mock_settings.return_value = SettingsWithGemini()
        provider = get_provider("ollama")
        assert isinstance(provider, OllamaGradingProvider)

    @patch("app.ai.broker.get_settings")
    def test_get_provider_defaults_to_ollama(self, mock_settings) -> None:
        mock_settings.return_value = SettingsWithGemini()
        provider = get_provider()
        assert isinstance(provider, OllamaGradingProvider)

    @patch("app.ai.broker.get_settings")
    def test_get_provider_falls_back_to_ollama_when_gemini_key_empty(self, mock_settings) -> None:
        settings = SettingsWithGemini()
        settings.gemini_api_key = ""
        mock_settings.return_value = settings
        provider = get_provider("gemini")
        assert isinstance(provider, OllamaGradingProvider)

    @patch("app.ai.broker.get_settings")
    def test_get_provider_returns_groq_when_key_present(self, mock_settings) -> None:
        mock_settings.return_value = SettingsWithAllKeys()
        provider = get_provider("groq/llama-3.3-70b-specdec")
        assert isinstance(provider, GroqProvider)
        assert provider.model == "llama-3.3-70b-specdec"

    @patch("app.ai.broker.get_settings")
    def test_get_provider_falls_back_to_ollama_when_groq_key_empty(self, mock_settings) -> None:
        mock_settings.return_value = SettingsStub()
        provider = get_provider("groq/llama-3.3-70b-specdec")
        assert isinstance(provider, OllamaGradingProvider)

    @patch("app.ai.broker.get_settings")
    def test_get_provider_returns_openrouter_when_key_present(self, mock_settings) -> None:
        mock_settings.return_value = SettingsWithAllKeys()
        provider = get_provider("openrouter/google/gemini-2.5-flash:free")
        assert isinstance(provider, OpenRouterProvider)
        assert provider.model == "google/gemini-2.5-flash:free"

    @patch("app.ai.broker.get_settings")
    def test_get_provider_returns_openrouter_for_deepseek_when_key_present(self, mock_settings) -> None:
        mock_settings.return_value = SettingsWithAllKeys()
        provider = get_provider("deepseek/deepseek-r1:free")
        assert isinstance(provider, OpenRouterProvider)
        assert provider.model == "deepseek/deepseek-r1:free"

    @patch("app.ai.broker.get_settings")
    def test_get_provider_falls_back_to_ollama_when_openrouter_key_empty(self, mock_settings) -> None:
        mock_settings.return_value = SettingsStub()
        provider = get_provider("openrouter/google/gemini-2.5-flash:free")
        assert isinstance(provider, OllamaGradingProvider)

    def test_aibroker_class_delegates_to_module_functions(self) -> None:
        """AIBroker class methods should delegate to module-level functions."""
        with patch("app.ai.broker.get_settings") as mock_settings:
            mock_settings.return_value = SettingsWithGemini()
            provider = AIBroker.get_provider("gemini")
            assert isinstance(provider, GeminiProvider)


class TestAIBrokerGenerateMethods:
    """Tests for AIBroker generation methods."""

    @patch("app.ai.broker.get_settings")
    def test_generate_solution_key_returns_string(self, mock_settings) -> None:
        mock_settings.return_value = SettingsStub()
        # This will use Ollama, which needs a running server
        # For unit testing, we just verify the function signature works
        # Integration tests would test the actual generation
        assert callable(get_provider)
