from __future__ import annotations

import json
import logging
from typing import Any

import httpx

logger = logging.getLogger("rubricore_worker")

GROQ_DEFAULT_MODEL = "llama-3.3-70b-specdec"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqProviderError(RuntimeError):
    """Raised when Groq API fails or returns invalid output."""


class GroqProvider:
    """Groq API provider for AI grading and generation tasks."""

    provider_name = "groq"

    def __init__(self, api_key: str, model: str = GROQ_DEFAULT_MODEL) -> None:
        self.api_key = api_key
        # Strip groq/ prefix if present
        if model.startswith("groq/"):
            model = model[len("groq/"):]
        self.model = model
        self.api_url = GROQ_API_URL

    def generate(self, system_instruction: str, user_prompt: str) -> str:
        """Send a prompt to Groq and return the raw text response."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }

        try:
            client = getattr(self, "_client", None)
            if client is not None:
                response = client.post(self.api_url, headers=headers, json=payload)
                response.raise_for_status()
            else:
                with httpx.Client(timeout=120.0) as owned_client:
                    response = owned_client.post(self.api_url, headers=headers, json=payload)
                    response.raise_for_status()

            response_json = response.json()
            choices = response_json.get("choices", [])
            if not choices:
                raise GroqProviderError("Groq returned no choices.")

            message = choices[0].get("message", {})
            text_out = message.get("content", "")
            if not text_out.strip():
                raise GroqProviderError("Groq returned empty text output.")

            return text_out
        except GroqProviderError:
            raise
        except Exception as e:
            logger.error(f"Groq API invocation failed: {e}")
            raise GroqProviderError(f"Failed to query Groq API: {e}") from e

    def generate_json(self, system_instruction: str, user_prompt: str) -> dict[str, Any]:
        """Send a prompt to Groq and parse the JSON response."""
        raw_output = self.generate(system_instruction, user_prompt)
        return _parse_json_content(raw_output)

    def evaluate(self, request_payload: dict[str, Any]) -> dict[str, Any]:
        """Evaluate a grading request using Groq."""
        from app.ai.prompts import build_grading_messages
        from app.ai.ollama import _normalize_local_grading_payload

        messages = build_grading_messages(request_payload)
        system_instruction = messages[0]["content"]
        user_prompt = messages[1]["content"]

        raw_output = self.generate(system_instruction, user_prompt)
        parsed = _parse_json_content(raw_output)

        return _normalize_local_grading_payload(parsed, request_payload)


def _parse_json_content(raw_output: str) -> dict[str, Any]:
    """Parse JSON from provider output, stripping markdown code fences if present."""
    cleaned = raw_output.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    try:
        return json.loads(cleaned.strip())
    except Exception as e:
        raise GroqProviderError(f"Groq output was not valid JSON: {raw_output}") from e
