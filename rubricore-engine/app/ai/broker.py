from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.core.config import get_settings
from app.ai.ollama import OllamaGradingProvider

logger = logging.getLogger("rubricore_worker")


class GeminiProviderError(RuntimeError):
    """Raised when Google Gemini API fails or returns invalid output."""


class GeminiProvider:
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        # Use gemini-1.5-flash as the default fast and capable model
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

    def generate(self, system_instruction: str, user_prompt: str) -> str:
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
            with httpx.Client(timeout=120.0) as client:
                response = client.post(self.api_url, json=payload)
                response.raise_for_status()
                response_json = response.json()
                
                # Extract text response from Gemini's nested payload structure
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
        except Exception as e:
            logger.error(f"Gemini API invocation failed: {e}")
            raise GeminiProviderError(f"Failed to query Gemini API: {e}") from e


class AIBroker:
    """
    Brokers prompt requests to the configured LLM engine.
    Supports local Ollama and Google Gemini.
    """

    @classmethod
    def get_provider(cls, model_choice: str = "ollama") -> Any:
        settings = get_settings()
        
        # Route to Gemini if selected and API key is present
        if model_choice.startswith("gemini"):
            if not settings.gemini_api_key:
                logger.warning("Gemini model selected but GEMINI_API_KEY is not set in env config. Falling back to local Ollama.")
                return OllamaGradingProvider.from_settings(settings)
            return GeminiProvider(api_key=settings.gemini_api_key)
            
        # Default to local Ollama
        return OllamaGradingProvider.from_settings(settings)

    @classmethod
    def generate_solution_key(cls, model_choice: str, assignment_text: str) -> str:
        """
        AI generates a draft solution key for the given assignment questions.
        """
        system_instruction = (
            "You are a teaching assistant helper. Solve the assignment questions provided by the user. "
            "Write the expected correct answers, code snippets, or essay outlines. "
            "Output your response as a single valid JSON object with a single root key 'solution_key' containing "
            "the solution text formatted in Markdown. Do not wrap in markdown code blocks."
        )
        
        user_prompt = (
            f"Please solve this assignment and write the solution key:\n\n{assignment_text}"
        )
        
        provider = cls.get_provider(model_choice)
        
        if isinstance(provider, GeminiProvider):
            raw_json = provider.generate(system_instruction, user_prompt)
            try:
                data = json.loads(raw_json)
                return data.get("solution_key", "")
            except Exception:
                return raw_json
        else:
            # Fallback local Ollama evaluation via standard chat prompt
            payload = {
                "model": provider.model_name,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                "format": {"type": "object", "properties": {"solution_key": {"type": "string"}}, "required": ["solution_key"]},
                "stream": False,
                "options": {"temperature": 0.1}
            }
            res = provider._post_chat(payload)
            try:
                content = json.loads(res["message"]["content"])
                return content.get("solution_key", "")
            except Exception:
                return res.get("message", {}).get("content", "")

    @classmethod
    def generate_rubric(cls, model_choice: str, assignment_text: str, solution_text: str) -> dict[str, Any]:
        """
        AI generates a complete rubric schema with criteria, weights, and match rules.
        """
        system_instruction = (
            "You are a rubric design assistant. Build a structured grading rubric matrix based on "
            "the assignment prompt and expected solutions. "
            "Return only one valid JSON object. Do not include markdown code block syntax. "
            "The JSON must have a single root key 'criteria' which is an array of objects. "
            "Each criterion object must contain:\n"
            "- key: string (a unique URL-safe slug, e.g. 'python-syntax')\n"
            "- label: string (name of the metric, e.g. 'Python Syntax')\n"
            "- description: string (what to grade, e.g. 'Verify code structure')\n"
            "- max_points: number (e.g. 10)\n"
            "- weight: number (decimal weight, e.g. 1.0)\n"
            "- evaluation_hints: object containing:\n"
            "    * rule_type: string ('regex', 'exact', or 'none')\n"
            "    * expected_value: string (the regex pattern or exact phrase to match, or null if rule_type is 'none')\n"
            "\n"
            "Make sure the criteria sum up logically (total max_points * weights should match the total assignment score, usually 100)."
        )
        
        user_prompt = (
            f"ASSIGNMENT PROMPT:\n{assignment_text}\n\n"
            f"SOLUTION KEY:\n{solution_text}"
        )
        
        provider = cls.get_provider(model_choice)
        
        if isinstance(provider, GeminiProvider):
            raw_json = provider.generate(system_instruction, user_prompt)
            try:
                return json.loads(raw_json)
            except Exception as e:
                raise RuntimeError(f"Gemini output was not valid JSON: {raw_json}") from e
        else:
            # Local Ollama fallback
            schema = {
                "type": "object",
                "required": ["criteria"],
                "properties": {
                    "criteria": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["key", "label", "description", "max_points", "weight", "evaluation_hints"],
                            "properties": {
                                "key": {"type": "string"},
                                "label": {"type": "string"},
                                "description": {"type": "string"},
                                "max_points": {"type": "integer"},
                                "weight": {"type": "number"},
                                "evaluation_hints": {
                                    "type": "object",
                                    "required": ["rule_type", "expected_value"],
                                    "properties": {
                                        "rule_type": {"type": "string"},
                                        "expected_value": {"type": ["string", "null"]}
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            payload = {
                "model": provider.model_name,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                "format": schema,
                "stream": False,
                "options": {"temperature": 0.1}
            }
            res = provider._post_chat(payload)
            try:
                return json.loads(res["message"]["content"])
            except Exception as e:
                raise RuntimeError(f"Ollama output was not valid JSON: {res}") from e
