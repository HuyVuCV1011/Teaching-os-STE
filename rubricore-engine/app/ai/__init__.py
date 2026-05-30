"""AI provider adapters kept outside core grading logic."""

from app.ai.gemini import GeminiProvider, GeminiProviderError
from app.ai.ollama import OllamaGradingProvider, OllamaProviderError
from app.ai.groq import GroqProvider, GroqProviderError
from app.ai.openrouter import OpenRouterProvider, OpenRouterProviderError
from app.ai.broker import (
    AIBroker,
    get_provider,
    generate_solution_key,
    generate_rubric,
    generate_assignment_questions,
)

__all__ = [
    # Providers
    "GeminiProvider",
    "GeminiProviderError",
    "OllamaGradingProvider",
    "OllamaProviderError",
    "GroqProvider",
    "GroqProviderError",
    "OpenRouterProvider",
    "OpenRouterProviderError",
    # Broker
    "AIBroker",
    "get_provider",
    "generate_solution_key",
    "generate_rubric",
    "generate_assignment_questions",
]
