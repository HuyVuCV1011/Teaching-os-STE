# Python Robust Exception Handling Guidelines

This document provides guidelines on constructing error boundaries and debugging pipelines inside server-side Python contexts.

## 1. Avoid Broad Exceptions

Never capture general base exceptions without logging them or re-raising, as this masks critical semantic or syntax bugs:

* **Extremely Dangerous Pattern (Slower/Silent Errors):**
  ```python
  try:
      average = total / count
  except Exception:
      average = 0  # Masks ZeroDivisionError, TypeError, NameError, etc.
  ```
* **Robust Pattern:**
  ```python
  try:
      average = total / count
  except ZeroDivisionError:
      average = 0
  except TypeError as e:
      logger.error(f"Invalid grade inputs supplied: {e}")
      raise ValueError("Score arrays must contain only numerical inputs")
  ```

## 2. Using Finally and Else blocks

Leverage the full `try-except-else-finally` block structure for robust resource cleanup:

```python
try:
    file = open("grades_report.txt", "r")
except FileNotFoundError:
    logger.error("The specified grades file could not be found.")
else:
    # Runs ONLY if no exceptions were raised
    content = file.read()
    process_data(content)
finally:
    # ALWAYS runs, securing resource release
    if 'file' in locals() and not file.closed:
        file.close()
```

## 3. Custom Exception Types

For complex grading workflows, build clear custom business exceptions that inherit from `Exception`:

```python
class IncompleteGradesError(Exception):
    """Raised when critical evaluation criteria lists are missing from rubrics."""
    pass
```
