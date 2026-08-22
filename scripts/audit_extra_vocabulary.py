from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS = ROOT / "content" / "lessons"
KOREAN_HEADWORD = re.compile(r"^[가-힣0-9·()\- ]+$")

lessons = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(LESSONS.glob("lesson-*.json"))]
issues: list[str] = []
terms: set[str] = set()
core_terms = {item["ko"].strip() for lesson in lessons for item in lesson.get("vocabulary", [])}
category_counts = Counter()

if len(lessons) != 60:
    issues.append(f"expected 60 lessons, found {len(lessons)}")
for lesson in lessons:
    extras = lesson.get("extraVocabulary", [])
    if len(extras) != 4:
        issues.append(f"chapter {lesson['chapter']} has {len(extras)} extra terms")
    category_counts[lesson["category"]] += len(extras)
    for item in extras:
        term = item["ko"].strip()
        if term in terms:
            issues.append(f"duplicate extra term: {term}")
        if term in core_terms:
            issues.append(f"extra term duplicates core term: {term}")
        if not KOREAN_HEADWORD.fullmatch(term):
            issues.append(f"non-Korean headword shape: {term}")
        if item.get("layer") != "exam-transfer":
            issues.append(f"wrong layer in chapter {lesson['chapter']}: {term}")
        if item.get("sourceChapter") != lesson["chapter"]:
            issues.append(f"wrong source chapter in chapter {lesson['chapter']}: {term}")
        if not item.get("example", {}).get("ko") or not item.get("example", {}).get("bn") or not item.get("example", {}).get("en"):
            issues.append(f"incomplete example: {term}")
        terms.add(term)

print(f"lessons={len(lessons)}")
print(f"extra_terms={len(terms)}")
print("category_counts=" + ", ".join(f"{key}:{value}" for key, value in sorted(category_counts.items())))
print(f"issues={len(issues)}")
for issue in issues:
    print(issue)
if issues:
    raise SystemExit(1)
