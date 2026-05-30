from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import get_settings
from app.ai.gemini import GeminiProvider, GeminiProviderError
from app.ai.ollama import OllamaGradingProvider, OllamaProviderError
from app.ai.groq import GroqProvider
from app.ai.openrouter import OpenRouterProvider
from app.ai.prompts import (
    build_assignment_questions_messages,
    build_grading_messages,
    build_rubric_messages,
    build_solution_key_messages,
    build_parse_questions_messages,
)

logger = logging.getLogger("rubricore_worker")


def get_provider(model_choice: str = "ollama") -> Any:
    """Factory function to get the appropriate AI provider.

    Routes based on model_choice prefix:
    - gemini-* -> GeminiProvider
    - groq/* -> GroqProvider
    - openrouter/* or deepseek/* -> OpenRouterProvider
    - otherwise -> local Ollama fallback.
    """
    settings = get_settings()

    if model_choice.startswith("gemini"):
        if not settings.gemini_api_key:
            logger.warning("Gemini model selected but GEMINI_API_KEY is not set. Falling back to local Ollama.")
            return OllamaGradingProvider.from_settings(settings)
        gemini_model = "gemini-2.5-flash" if model_choice == "gemini" else model_choice
        logger.info("Using Gemini provider (%s) with model %s", settings.gemini_api_key[:8] + "...", gemini_model)
        return GeminiProvider(api_key=settings.gemini_api_key, model=gemini_model)

    elif model_choice.startswith("groq/"):
        if not settings.groq_api_key:
            logger.warning("Groq model selected but GROQ_API_KEY is not set. Falling back to local Ollama.")
            return OllamaGradingProvider.from_settings(settings)
        logger.info("Using Groq provider (%s) with model %s", settings.groq_api_key[:8] + "...", model_choice)
        return GroqProvider(api_key=settings.groq_api_key, model=model_choice)

    elif model_choice.startswith("openrouter/") or model_choice.startswith("deepseek/"):
        if not settings.openrouter_api_key:
            logger.warning("OpenRouter/DeepSeek model selected but OPENROUTER_API_KEY is not set. Falling back to local Ollama.")
            return OllamaGradingProvider.from_settings(settings)
        logger.info("Using OpenRouter provider (%s) with model %s", settings.openrouter_api_key[:8] + "...", model_choice)
        return OpenRouterProvider(api_key=settings.openrouter_api_key, model=model_choice)

    logger.info("Using Ollama provider (local)")
    return OllamaGradingProvider.from_settings(settings)


def generate_solution_key(model_choice: str, assignment_text: str) -> str:
    """AI generates a draft solution key for the given assignment questions."""
    provider = get_provider(model_choice)
    messages = build_solution_key_messages(assignment_text)
    system_instruction = messages[0]["content"]
    user_prompt = messages[1]["content"]

    raw_json = provider.generate(system_instruction, user_prompt)

    try:
        data = json.loads(raw_json)
        return data.get("solution_key", "")
    except Exception:
        return raw_json


def generate_rubric(model_choice: str, assignment_text: str, solution_text: str) -> dict[str, Any]:
    """AI generates a complete rubric schema with criteria, weights, and match rules."""
    provider = get_provider(model_choice)
    messages = build_rubric_messages(assignment_text, solution_text)
    system_instruction = messages[0]["content"]
    user_prompt = messages[1]["content"]

    raw_json = provider.generate(system_instruction, user_prompt)

    try:
        return json.loads(raw_json)
    except Exception as e:
        raise RuntimeError(f"AI output was not valid JSON: {raw_json}") from e


def generate_assignment_questions(
    model_choice: str,
    assignment_type: str,
    category: str,
    question_count: int,
    generate_sample_data: bool,
    lesson_content: str,
) -> dict[str, Any]:
    """AI generates structured assignment questions based on lesson content."""
    provider = get_provider(model_choice)
    messages = build_assignment_questions_messages(
        assignment_type=assignment_type,
        category=category,
        question_count=question_count,
        generate_sample_data=generate_sample_data,
        lesson_content=lesson_content,
    )
    system_instruction = messages[0]["content"]
    user_prompt = messages[1]["content"]

    try:
        raw_json = provider.generate(system_instruction, user_prompt)
        return _parse_json_response(raw_json)
    except Exception as api_err:
        logger.warning("AI generation failed (%s). Falling back to simulated generator.", api_err)
        return _mock_assignment_questions(assignment_type, question_count, generate_sample_data)


def parse_file_questions(
    model_choice: str,
    file_content: str,
) -> dict[str, Any]:
    """AI parses assignment questions from file content."""
    provider = get_provider(model_choice)
    messages = build_parse_questions_messages(file_content)
    system_instruction = messages[0]["content"]
    user_prompt = messages[1]["content"]

    try:
        raw_json = provider.generate(system_instruction, user_prompt)
        return _parse_json_response(raw_json)
    except Exception as api_err:
        logger.warning("AI file parsing failed (%s). Returning empty list.", api_err)
        return {"questions": []}


def _parse_json_response(raw_json: str) -> dict[str, Any]:
    """Parse JSON from AI response, stripping markdown code fences if present."""
    cleaned = raw_json.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    try:
        return json.loads(cleaned.strip())
    except Exception as e:
        raise RuntimeError(f"AI output was not valid JSON: {raw_json}") from e


def _mock_assignment_questions(
    assignment_type: str,
    question_count: int,
    generate_sample_data: bool,
) -> dict[str, Any]:
    """Generate mock assignment questions as fallback when AI fails."""
    mock_questions = []
    for i in range(1, question_count + 1):
        if assignment_type == "multiple_choice":
            if i % 3 == 1:
                q_text = "What is the average time complexity of searching an element in a binary search tree (BST)?"
                opts = ["A. O(n)", "B. O(log n)", "C. O(1)", "D. O(n log n)"]
                ans = "B"
            elif i % 3 == 2:
                q_text = "Which of the following data structures operates on a Last In First Out (LIFO) basis?"
                opts = ["A. Queue", "B. Stack", "C. Binary Tree", "D. Heap"]
                ans = "B"
            else:
                q_text = "What is the worst-case space complexity of a recursive depth-first search (DFS) algorithm?"
                opts = ["A. O(1)", "B. O(log n)", "C. O(n)", "D. O(V + E)"]
                ans = "C"
        else:
            if i % 3 == 1:
                q_text = "Explain the difference between call-by-value and call-by-reference parameter passing."
                opts = None
                ans = "Call-by-value passes a copy of the argument's value, meaning changes inside the function do not affect the caller. Call-by-reference passes the address of the actual variable, so changes inside the function directly modify the caller's variable."
            elif i % 3 == 2:
                q_text = "Describe how a hash table handles collisions using open addressing vs chaining."
                opts = None
                ans = "Open addressing resolves collisions by probing for the next empty slot in the table array. Chaining resolves collisions by maintaining a linked list or bucket structure at each hash index."
            else:
                q_text = "Analyze the time complexity of the merge sort algorithm."
                opts = None
                ans = "Merge sort is a divide-and-conquer algorithm. It divides the array into halves in O(1) time, recursively sorts them, and merges the sorted halves in O(n) time. The recurrence yields a time complexity of O(n log n) in all cases."

        q_data = None
        if generate_sample_data:
            q_data = {
                "test_case_input": [10, 20, 30],
                "expected_output": 60,
                "data_type": "array_integer"
            }

        mock_questions.append({
            "id": i,
            "content": q_text,
            "options": opts,
            "answer": ans,
            "data": q_data
        })

    return {"questions": mock_questions}


class AIBroker:
    """
    Brokers prompt requests to the configured LLM engine.
    Supports local Ollama and Google Gemini.

    Deprecated: Use the module-level functions directly.
    This class is kept for backward compatibility.
    """

    @classmethod
    def get_provider(cls, model_choice: str = "ollama") -> Any:
        return get_provider(model_choice)

    @classmethod
    def generate_solution_key(cls, model_choice: str, assignment_text: str) -> str:
        return generate_solution_key(model_choice, assignment_text)

    @classmethod
    def generate_rubric(cls, model_choice: str, assignment_text: str, solution_text: str) -> dict[str, Any]:
        return generate_rubric(model_choice, assignment_text, solution_text)

    @classmethod
    def generate_assignment_questions(
        cls,
        model_choice: str,
        assignment_type: str,
        category: str,
        question_count: int,
        generate_sample_data: bool,
        lesson_content: str,
    ) -> dict[str, Any]:
        return generate_assignment_questions(
            model_choice,
            assignment_type,
            category,
            question_count,
            generate_sample_data,
            lesson_content,
        )

    @classmethod
    def parse_file_questions(
        cls,
        model_choice: str,
        file_content: str,
    ) -> dict[str, Any]:
        return parse_file_questions(model_choice, file_content)
