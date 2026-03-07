#!/usr/bin/env python3
"""
Auto-update todo.md on branch create (Doing) and PR merge (Done).

Universal script — works with any project that has a todo.md with
a kanban-style table using status emojis (⬜/🔄/🧪/✅).

Usage:
  python3 update-todo.py doing <branch-name> <todo-file>
  python3 update-todo.py done  <branch-name> <pr-number> <pr-url> <todo-file>

Deployment: Copy to .github/scripts/update-todo.py in your project.
Source of truth: ~/.claude/trine/github-spec-kit/scripts/update-todo.py
"""
import sys
import re
from datetime import datetime, timezone


def extract_keywords(branch: str) -> list[str]:
    """Extract meaningful keywords from branch name."""
    spec = branch.split("/", 1)[-1] if "/" in branch else branch
    return [k.lower() for k in spec.split("-") if len(k) > 2]


def find_todo_table_row(lines: list[str], status: str, keywords: list[str]) -> int:
    """Find the best matching row with given status emoji."""
    best_idx = -1
    best_score = 0

    for i, line in enumerate(lines):
        if status not in line or "|" not in line:
            continue
        line_lower = line.lower()
        score = sum(1 for k in keywords if k in line_lower)
        if score > best_score:
            best_score = score
            best_idx = i

    return best_idx if best_score >= 1 else -1


def mark_doing(lines: list[str], branch: str) -> bool:
    keywords = extract_keywords(branch)
    idx = find_todo_table_row(lines, "\u2b1c", keywords)  # ⬜
    if idx < 0:
        print(f"No matching Todo row found for keywords={keywords}")
        return False

    lines[idx] = lines[idx].replace("\u2b1c Todo", "\U0001f504 Doing")
    print(f"Row {idx}: Todo -> Doing | {lines[idx].strip()}")
    return True


def mark_done(lines: list[str], branch: str, pr_num: str, pr_url: str) -> bool:
    keywords = extract_keywords(branch)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # First try matching by keywords in Doing rows
    idx = find_todo_table_row(lines, "\U0001f504", keywords)  # 🔄
    if idx < 0:
        # Fallback: if only one Doing row, use it
        doing_rows = [i for i, l in enumerate(lines) if "\U0001f504" in l and "|" in l]
        if len(doing_rows) == 1:
            idx = doing_rows[0]
        else:
            print(f"No matching Doing row found for keywords={keywords}")
            return False

    line = lines[idx]
    cells = line.split("|")

    # Table format: | # | Spec | ... | Status | PR | Date |
    # Find Status cell and replace
    for j, cell in enumerate(cells):
        if "\U0001f504" in cell:  # 🔄
            cells[j] = cell.replace("\U0001f504 Doing", "\u2705 Done")
            # PR cell is next
            if j + 1 < len(cells):
                cells[j + 1] = f" [#{pr_num}]({pr_url}) "
            # Date cell is after PR
            if j + 2 < len(cells):
                cells[j + 2] = f" {today} "
            break

    lines[idx] = "|".join(cells)
    print(f"Row {idx}: Doing -> Done | {lines[idx].strip()}")
    return True


def main():
    action = sys.argv[1]
    branch = sys.argv[2]

    if action == "doing":
        todo_file = sys.argv[3]
    elif action == "done":
        pr_num = sys.argv[3]
        pr_url = sys.argv[4]
        todo_file = sys.argv[5]
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)

    with open(todo_file, "r") as f:
        lines = f.readlines()

    if action == "doing":
        updated = mark_doing(lines, branch)
    else:
        updated = mark_done(lines, branch, pr_num, pr_url)

    if updated:
        with open(todo_file, "w") as f:
            f.writelines(lines)
        print("todo.md updated")
    else:
        print("No changes made")

    sys.exit(0 if updated else 0)  # Don't fail workflow if no match


if __name__ == "__main__":
    main()
