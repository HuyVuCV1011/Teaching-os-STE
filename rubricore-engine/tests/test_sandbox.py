import pytest
from app.core.sandbox import execute_student_code

def test_execute_correct_code():
    code = "print('hello from sandbox')"
    res = execute_student_code(code)
    
    assert res["success"] is True
    assert "hello from sandbox" in res["stdout"]
    assert not res["stderr"]
    assert res["error"] is None

def test_execute_syntax_error():
    code = "print('hello'  # syntax error: missing closing paren"
    res = execute_student_code(code)
    
    assert res["success"] is False
    assert "SyntaxError" in res["stderr"] or "SyntaxError" in (res["error"] or "")

def test_execute_timeout():
    # Write a script that loops infinitely
    code = """
import time
while True:
    time.sleep(0.1)
"""
    res = execute_student_code(code, timeout=2)
    
    assert res["success"] is False
    assert "TimeoutExpired" in (res["error"] or "")
