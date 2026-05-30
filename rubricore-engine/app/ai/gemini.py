from __future__ import annotations

import json
import logging
from typing import Any

import httpx

logger = logging.getLogger("rubricore_worker")

GEMINI_DEFAULT_MODEL = "gemini-2.5-flash"
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProviderError(RuntimeError):
    """Raised when Google Gemini API fails or returns invalid output."""


class GeminiProvider:
    """Google Gemini API provider for AI grading and generation tasks."""

    provider_name = "gemini"
    model_name = GEMINI_DEFAULT_MODEL

    def __init__(self, api_key: str, model: str = GEMINI_DEFAULT_MODEL) -> None:
        self.api_key = api_key
        self.model = model
        self.api_url = f"{GEMINI_API_BASE}/{model}:generateContent?key={api_key}"

    def generate(self, system_instruction: str, user_prompt: str) -> str:
        """Send a prompt to Gemini and return the raw text response."""
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": user_prompt}
                    ]
                }
            ],
            "systemInstruction": {
                "parts": [
                    {"text": system_instruction}
                ]
            },
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1
            }
        }

        try:
            client = getattr(self, "_client", None)
            if client is not None:
                response = client.post(self.api_url, json=payload)
                response.raise_for_status()
            else:
                with httpx.Client(timeout=120.0) as owned_client:
                    response = owned_client.post(self.api_url, json=payload)
                    response.raise_for_status()

            response_json = response.json()

            candidates = response_json.get("candidates", [])
            if not candidates:
                raise GeminiProviderError("Gemini returned no candidates.")

            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            if not parts:
                raise GeminiProviderError("Gemini candidate content contained no parts.")

            text_out = parts[0].get("text", "")
            if not text_out.strip():
                raise GeminiProviderError("Gemini returned empty text output.")

            return text_out
        except GeminiProviderError:
            raise
        except Exception as e:
            logger.error(f"Gemini API invocation failed: {e}")
            raise GeminiProviderError(f"Failed to query Gemini API: {e}") from e

    def generate_json(self, system_instruction: str, user_prompt: str) -> dict[str, Any]:
        """Send a prompt to Gemini and parse the JSON response."""
        raw_output = self.generate(system_instruction, user_prompt)
        return _parse_gemini_json(raw_output)

    def evaluate(self, request_payload: dict[str, Any]) -> dict[str, Any]:
        """Evaluate a grading request using Gemini."""
        from app.ai.prompts import build_grading_messages
        from app.ai.ollama import _normalize_local_grading_payload

        messages = build_grading_messages(request_payload)
        system_instruction = messages[0]["content"]
        user_prompt = messages[1]["content"]

        raw_output = self.generate(system_instruction, user_prompt)
        parsed = _parse_gemini_json(raw_output)

        return _normalize_local_grading_payload(parsed, request_payload)


def _parse_gemini_json(raw_output: str) -> dict[str, Any]:
    """Parse JSON from Gemini output, stripping markdown code fences if present."""
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
        raise GeminiProviderError(f"Gemini output was not valid JSON: {raw_output}") from e
