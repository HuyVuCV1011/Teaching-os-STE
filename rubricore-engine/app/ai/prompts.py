"""Shared prompt builders for AI grading and generation tasks."""

from __future__ import annotations

import json
from typing import Any


def build_grading_messages(request_payload: dict[str, Any]) -> list[dict[str, str]]:
    """Build system and user messages for grading evaluation."""
    system_instruction = (
        "You are a grading assistant for RubriCore-STE. Return only one valid JSON object. "
        "Do not include markdown, prose outside JSON, or hidden reasoning. "
        "Use only the submitted evidence and rubric in the request. "
        "Every criterion suggestion must include criterion_key, score, confidence, explanation, "
        "and evidence_references using evidence IDs from the request. "
        "Scores must stay within each criterion's rubric maximum. "
        "The root object must include criterion_suggestions and confidence."
    )

    # AI Grading Memory Loop: check if few-shot examples are present
    few_shots = request_payload.get("rubric_schema", {}).get("few_shot_examples")
    if few_shots:
        system_instruction += (
            "\n\nCRITICAL CONTEXT (Teacher Preferences / Few-Shot Examples):\n"
            "Below are examples of how the teacher historically evaluated similar student submissions "
            "for specific criteria. You MUST align your grading style, score stringency, and feedback "
            "tone with these historical override examples:\n"
        )
        for crit_key, examples in few_shots.items():
            system_instruction += f"\nCriterion Key: {crit_key}\n"
            for idx, ex in enumerate(examples):
                system_instruction += (
                    f"Example {idx + 1}:\n"
                    f"- Student Submission Text Snippet: {ex.get('student_submission_text', '')[:500]}...\n"
                    f"- Teacher Grade: {ex.get('override_score')} points\n"
                    f"- Teacher Feedback: {ex.get('override_feedback')}\n"
                    f"- Teacher Correction Reason: {ex.get('override_reason')}\n"
                )

    return [
        {
            "role": "system",
            "content": system_instruction,
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


def build_solution_key_messages(assignment_text: str, knowledge_dossier: str | None = None) -> list[dict[str, str]]:
    """Build system and user messages for solution key generation."""
    system_prompt = (
        "You are a teaching assistant helper. Solve the assignment questions provided by the user. "
        "Write the expected correct answers, code snippets, or essay outlines. "
        "Output your response as a single valid JSON object with a single root key 'solution_key' containing "
        "the solution text formatted in Markdown. Do not wrap in markdown code blocks."
    )
    if knowledge_dossier:
        system_prompt += f"\n\nConform strictly to these established pedagogical concepts and guidelines:\n{knowledge_dossier}\n"

    return [
        {
            "role": "system",
            "content": system_prompt,
        },
        {
            "role": "user",
            "content": f"Please solve this assignment and write the solution key:\n\n{assignment_text}",
        },
    ]


DEFAULT_RAG_RUBRIC_TEMPLATE = (
    "You are a rubric design assistant. Build a structured grading rubric matrix based on "
    "the assignment prompt and expected solutions. "
    "Return only one valid JSON object. Do not include markdown code block syntax. "
    "The JSON must have a single root key 'criteria' which is an array of objects. "
    "\n"
    "CRITICAL REQUIREMENT FOR MULTIPLE QUESTIONS:\n"
    "If the assignment contains multiple specific questions (e.g. Question 1, Question 2, etc.), "
    "you MUST generate separate criteria for each question. The label or key of each criterion "
    "MUST explicitly start with the question reference, e.g., 'Question 1: [Metric Name]' or "
    "'Question 2: [Metric Name]' so the system can map the criteria to the correct question.\n"
    "\n"
    "Each criterion object must contain:\n"
    "- key: string (a unique URL-safe slug, e.g. 'q1-python-syntax')\n"
    "- label: string (name of the metric, e.g. 'Question 1: Python Syntax')\n"
    "- description: string (what to grade, e.g. 'Verify code structure for Question 1')\n"
    "- max_points: number (e.g. 10)\n"
    "- weight: number (decimal weight, e.g. 1.0)\n"
    "- evaluation_hints: object containing:\n"
    "    * rule_type: string ('regex', 'exact', or 'none')\n"
    "    * expected_value: string (the regex pattern or exact phrase to match, or null if rule_type is 'none')\n"
    "\n"
    "Make sure the criteria sum up logically (total max_points * weights should match the total assignment score, usually 100)."
)


def build_rubric_messages(
    assignment_text: str,
    solution_text: str,
    knowledge_dossier: str | None = None,
    prompt_template: str | None = None,
    target_essay_score: float | None = None,
    question_count: int | None = None,
) -> list[dict[str, str]]:
    """Build system and user messages for rubric generation."""
    system_prompt = prompt_template if prompt_template is not None else DEFAULT_RAG_RUBRIC_TEMPLATE
    
    if target_essay_score is not None or question_count is not None:
        budget_instruction = "\n\nCRITICAL SCORING BUDGET CONTEXT:\n"
        if question_count is not None:
            budget_instruction += f"- There are exactly {question_count} essay/programming questions in this assignment.\n"
        if target_essay_score is not None:
            budget_instruction += f"- The TOTAL combined score budget for all essay questions is exactly {target_essay_score} points.\n"
        budget_instruction += (
            "- You MUST allocate this point budget logically across all essay questions (e.g. if questions are equal difficulty, divide equally; otherwise allocate proportionally).\n"
            "- For each question, ensure the sum of its criteria's `max_points * weight` corresponds to that question's share of the budget.\n"
            "- The overall sum of all criteria's `max_points * weight` in the JSON MUST equal exactly the total budget of points."
        )
        system_prompt += budget_instruction

    if knowledge_dossier:
        system_prompt += f"\n\nConform strictly to these established pedagogical concepts and guidelines:\n{knowledge_dossier}\n"

    return [
        {
            "role": "system",
            "content": system_prompt,
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
    knowledge_dossier: str | None = None,
) -> list[dict[str, str]]:
    """Build system and user messages for assignment question generation."""
    system_prompt = (
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
    )
    if knowledge_dossier:
        system_prompt += f"\n\nConform strictly to these established pedagogical concepts and guidelines:\n{knowledge_dossier}\n"

    return [
        {
            "role": "system",
            "content": system_prompt,
        },
        {
            "role": "user",
            "content": (
                f"LESSON CONTENT:\n{lesson_content}\n\n"
                f"Generate {question_count} questions."
            ),
        },
    ]


def build_parse_questions_messages(file_content: str, solution_content: str | None = None) -> list[dict[str, str]]:
    """Build system and user messages for parsing questions from file content."""
    system_prompt = (
        "You are an educational assistant helper. Read the provided file content and identify all assignment questions.\n"
        "Return only one valid JSON object. Do not include markdown code block syntax.\n"
        "The JSON must have a single root key 'questions' which is an array of objects. "
        "Each object must contain:\n"
        "- id: integer (starting from 1)\n"
        "- content: string (the question text or task description)\n"
        "- options: array of strings (e.g. ['A. ...', 'B. ...', 'C. ...', 'D. ...']) if multiple choice, otherwise null\n"
    )
    if solution_content:
        system_prompt += (
            "- answer: string or null. We have provided a companion solution key / master solution file content. "
            "You must match each identified question with its corresponding correct answer/solution from the solution key, and copy it here. "
            "CRITICAL: You must extract the FULL, COMPLETE code block, explanation, and solution text. "
            "Never truncate the code, never use placeholders like '...', '# ...', 'TODO', or write only the function header. "
            "You must output the exact, complete, runnable code block or complete text answer found in the solution key. "
            "Set 'answer_source' to 'file_import'.\n"
        )
    else:
        system_prompt += (
            "- answer: string or null. Only extract an answer when the source file explicitly contains an answer key, sample solution, rubric outline, or teacher solution for that exact question. "
            "Do not invent or solve missing answers during parsing.\n"
        )
    
    system_prompt += (
        "- answer_source: string or null. Use 'file_import' when answer was explicitly extracted from the source file or matched from the provided solution key; otherwise null.\n"
        "- type: string ('multiple_choice' or 'essay')\n"
        "- data: object or null\n\n"
        "This task is extraction, not answer generation. If a question has no explicit answer in the provided file(s), set answer to null and answer_source to null.\n"
        "If no questions are found, return the JSON with an empty list for 'questions'."
    )

    user_prompt = f"Extract questions from the following content:\n\n{file_content}"
    if solution_content:
        user_prompt += f"\n\nHere is the companion solution key file content containing the answers:\n\n{solution_content}"

    return [
        {
            "role": "system",
            "content": system_prompt,
        },
        {
            "role": "user",
            "content": user_prompt,
        },
    ]


def build_refined_knowledge_extraction_messages(
    sources_payload: list[dict[str, Any]],
    existing_concepts: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Build system and user messages for refined hierarchical concept extraction and deduplication."""
    return [
        {
            "role": "system",
            "content": (
                "You are an expert curriculum designer and knowledge engineer. "
                "Analyze the provided raw teaching materials, lessons, and assignments to extract structured concepts.\n"
                "Return ONLY one valid JSON object. Do not include markdown code blocks (e.g. ```json).\n"
                "The JSON must have a single root key 'entries' which is an array of concept objects.\n"
                "Each concept object must contain:\n"
                "- action: string ('create', 'update', or 'supersede')\n"
                "- existing_entry_id: string or null (if action is 'update' or 'supersede', specify the UUID from the list of existing concepts)\n"
                "- title: string (the name of the concept)\n"
                "- summary: string (a concise 1-paragraph summary)\n"
                "- content: string (rich detail, explanation, code snippets, or formulas formatted in Markdown)\n"
                "- knowledge_type: string (one of: 'definition', 'procedure', 'example', 'rule', 'formula', 'code_pattern')\n"
                "- domain_name: string (the high-level Domain grouping name, e.g. 'Computer Science', 'Data Science', 'Mathematics')\n"
                "- subject_name: string (the specific Subject name, e.g. 'Python Programming', 'Data Analysis with Python', 'Statistics')\n"
                "- tags: array of strings (cross-cutting metadata tags, e.g. ['Python', 'visualization', 'probability'])\n"
                "- prerequisites: array of strings (titles of concepts that should be learned first)\n"
                "- citation_notes: string (short note explaining what source text/question this was extracted from)\n"
                "\n"
                "Compare each concept you extract with the provided list of existing concepts. "
                "If it covers the same concept as an existing entry, mark the action as 'update' if it refines it, "
                "or 'supersede' if it replaces it, and set the existing_entry_id. Otherwise, mark it as 'create'.\n"
                "Split a single source document across multiple Domains/Subjects if its content spans multiple areas."
            )
        },
        {
            "role": "user",
            "content": (
                f"EXISTING_CONCEPTS (For Deduplication Context):\n{json.dumps(existing_concepts, default=str)}\n\n"
                f"RAW_SOURCES_TO_EXTRACT:\n{json.dumps(sources_payload, default=str)}"
            )
        }
    ]
