"""Shared prompt builders for AI grading and generation tasks."""

from __future__ import annotations

import json
from typing import Any


def build_grading_messages(request_payload: dict[str, Any]) -> list[dict[str, str]]:
    """Build system and user messages for grading evaluation."""
    return [
        {
            "role": "system",
            "content": (
                "You are a grading assistant for RubriCore-STE. Return only one valid JSON object. "
                "Do not include markdown, prose outside JSON, or hidden reasoning. "
                "Use only the submitted evidence and rubric in the request. "
                "Every criterion suggestion must include criterion_key, score, confidence, explanation, "
                "and evidence_references using evidence IDs from the request. "
                "Scores must stay within each criterion's rubric maximum. "
                "The root object must include criterion_suggestions and confidence."
            ),
        },
        {
            "role": "user",
            "content": (
                "Evaluate the submitted evidence against the rubric. "
                "Return a grading JSON object for this exact request. "
                "Do not repeat the request. "
                "For each rubric criterion, create one criterion_suggestions item. "
                "Use the evidence id values exactly as provided.\n\n"
                f"REQUEST_JSON:\n{json.dumps(request_payload, sort_keys=True, default=str)}"
            ),
        },
    ]


def build_solution_key_messages(assignment_text: str) -> list[dict[str, str]]:
    """Build system and user messages for solution key generation."""
    return [
        {
            "role": "system",
            "content": (
                "You are a teaching assistant helper. Solve the assignment questions provided by the user. "
                "Write the expected correct answers, code snippets, or essay outlines. "
                "Output your response as a single valid JSON object with a single root key 'solution_key' containing "
                "the solution text formatted in Markdown. Do not wrap in markdown code blocks."
            ),
        },
        {
            "role": "user",
            "content": f"Please solve this assignment and write the solution key:\n\n{assignment_text}",
        },
    ]


def build_rubric_messages(assignment_text: str, solution_text: str) -> list[dict[str, str]]:
    """Build system and user messages for rubric generation."""
    return [
        {
            "role": "system",
            "content": (
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
            ),
        },
        {
            "role": "user",
            "content": (
                f"ASSIGNMENT PROMPT:\n{assignment_text}\n\n"
                f"SOLUTION KEY:\n{solution_text}"
            ),
        },
    ]


def build_assignment_questions_messages(
    assignment_type: str,
    category: str,
    question_count: int,
    generate_sample_data: bool,
    lesson_content: str,
) -> list[dict[str, str]]:
    """Build system and user messages for assignment question generation."""
    return [
        {
            "role": "system",
            "content": (
                "You are an educational assistant helper. Create a list of structured assignment questions "
                "based on the provided lesson overview content.\n"
                "Return only one valid JSON object. Do not include markdown code block syntax.\n"
                "The JSON must have a single root key 'questions' which is an array of objects. "
                "Each object must contain:\n"
                "- id: integer (starting from 1)\n"
                "- content: string (the question text or task description)\n"
                "- options: array of strings (e.g. ['A. ...', 'B. ...', 'C. ...', 'D. ...']) if assignment_type is 'multiple_choice', otherwise null\n"
                "- answer: string (the correct answer key/letter, e.g. 'A', 'B', 'C', 'D' if multiple_choice, or detailed answer key/sample code if essay)\n"
                "- data: object or null (if generate_sample_data is true, provide a small mock JSON dataset or sample input/output for students to work with, otherwise null)\n\n"
                f"Constraints: Generate exactly {question_count} questions of type '{assignment_type}' and category '{category}'."
            ),
        },
        {
            "role": "user",
            "content": (
                f"LESSON CONTENT:\n{lesson_content}\n\n"
                f"Generate {question_count} questions."
            ),
        },
    ]


def build_parse_questions_messages(file_content: str) -> list[dict[str, str]]:
    """Build system and user messages for parsing questions from file content."""
    return [
        {
            "role": "system",
            "content": (
                "You are an educational assistant helper. Read the provided file content and identify all assignment questions.\n"
                "Return only one valid JSON object. Do not include markdown code block syntax.\n"
                "The JSON must have a single root key 'questions' which is an array of objects. "
                "Each object must contain:\n"
                "- id: integer (starting from 1)\n"
                "- content: string (the question text or task description)\n"
                "- options: array of strings (e.g. ['A. ...', 'B. ...', 'C. ...', 'D. ...']) if multiple choice, otherwise null\n"
                "- answer: string (the correct answer key/letter if multiple choice, or correct answer/rubric outline if essay)\n"
                "- type: string ('multiple_choice' or 'essay')\n"
                "- data: object or null\n\n"
                "If no questions are found, return the JSON with an empty list for 'questions'."
            ),
        },
        {
            "role": "user",
            "content": f"Extract questions from the following content:\n\n{file_content}",
        },
    ]
