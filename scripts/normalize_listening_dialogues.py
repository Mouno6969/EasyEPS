from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "content" / "lessons"
SLASH_DIALOGUE = re.compile(r"^\s*남\s*[:：]\s*(.*?)\s*/\s*여\s*[:：]\s*(.*?)\s*$")
DUPLICATED_SENTENCE = "반사 조끼를 입어야 합니다.을 입어야 해요."

changed = 0
for path in sorted(LESSONS_DIR.glob("lesson-*.json")):
    lesson = json.loads(path.read_text(encoding="utf-8"))
    for question in lesson.get("epsQuestions", []):
        if question.get("section") != "listening" or not isinstance(question.get("passage"), str):
            continue
        passage = question["passage"].strip()
        match = SLASH_DIALOGUE.fullmatch(passage)
        if match:
            passage = f"남자: {match.group(1).strip()}\n여자: {match.group(2).strip()}"
        passage = passage.replace(DUPLICATED_SENTENCE, "반사 조끼를 입어야 해요.")
        if passage != question["passage"]:
            question["passage"] = passage
            changed += 1
    path.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print(f"normalized {changed} listening passages")
