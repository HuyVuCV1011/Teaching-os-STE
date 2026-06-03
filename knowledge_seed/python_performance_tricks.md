# Python Performance and Idiomatic Code Guidelines

This document details common performance optimizations and idiomatic practices (Pythonic patterns) expected in high-performing data pipelines.

## 1. List Comprehensions vs. Traditional Loops

When mapping or filtering lists, list comprehensions are typically faster because the looping is performed in C-speed within the Python interpreter:

* **Traditional Loop (Slower):**
  ```python
  squares = []
  for x in range(10):
      squares.append(x**2)
  ```
* **List Comprehension (Faster):**
  ```python
  squares = [x**2 for x in range(10)]
  ```
* **Filtering Chunks:**
  ```python
  passing_grades = [g for g in grades if g >= 60]
  ```

## 2. Dynamic Dictionary Lookups

Avoid checking keys explicitly using `if key in dict` when returning a default fallback. Use the `.get()` method or `setdefault()`:

* **Slower Pattern:**
  ```python
  if "count" in stats:
      c = stats["count"]
  else:
      c = 0
  ```
* **Pythonic Pattern (Faster):**
  ```python
  c = stats.get("count", 0)
  ```

## 3. Generator Expressions for Large Data Sets

When working with large collections, avoid generating massive lists in memory. Use generators to yield items on demand:

```python
# List comprehension (allocates entire list in memory)
total_sum = sum([x**2 for x in range(1000000)])

# Generator expression (evaluates lazily, O(1) memory complexity)
total_sum = sum(x**2 for x in range(1000000))
```
