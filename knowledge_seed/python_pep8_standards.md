# Python PEP 8 Naming and Code Structure Standards

This guide outlines the baseline criteria and formatting principles enforced by our pedagogical systems for Python source files.

## 1. Naming Conventions

Enforcing consistent naming patterns makes code bases readable and easy to scan during evaluations:

* **Variables & Functions:** Always use `snake_case`. Names should be clear, concise, and descriptive of the underlying data type or action.
  ```python
  # Good
  score_list = [85, 90, 78]
  def calculate_average(scores): ...

  # Bad
  scoreList = [85, 90, 78]
  def calculateAverage(scores): ...
  ```
* **Classes:** Always use `PascalCase`.
  ```python
  # Good
  class StudentReport: ...

  # Bad
  class student_report: ...
  ```
* **Constants:** Always use `UPPER_SNAKE_CASE`.
  ```python
  MAX_ATTEMPTS = 5
  ```

## 2. Docstrings and Comments

Every public function, module, and class should be documented with a clear docstring:

* Use triple double-quotes (`"""`) for all docstrings.
* Include a brief summary of the function's purpose, parameters, and return value shapes.
  ```python
  def summarize_scores(scores: list[float]) -> dict[str, float]:
      """
      Computes the total sum, count, and mathematical average of a score list.

      Parameters:
          scores (list[float]): A list of numerical grades.

      Returns:
          dict: A summary report containing 'total', 'count', and 'average'.
      """
      ...
  ```

## 3. Whitespace and Spacing

* **Indentation:** Standardize on exactly **4 spaces** per indentation level. Do not mix tabs and spaces.
* **Line Length:** Limit all code lines to a maximum of **79 characters** to maintain screen scannability.
* **Blank Lines:** 
  * Surround top-level function and class definitions with exactly **two blank lines**.
  * Use a single blank line to separate method definitions inside classes.
