from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "content" / "lessons"
romanization_re = re.compile(r"^[A-Za-z][A-Za-z0-9' .-]*$")
hangul_re = re.compile(r"[가-힣]")
issues: list[str] = []
terms: list[str] = []
counts: Counter[str] = Counter()
for path in sorted(LESSONS_DIR.glob("lesson-*.json")):
    lesson = json.loads(path.read_text(encoding="utf-8"))
    extra = lesson.get("extraVocabulary", [])
    if len(extra) != 2:
        issues.append(f"{path.name}: expected 2 extra terms, found {len(extra)}")
    for index, word in enumerate(extra):
        label = f"{path.name}:extra[{index}]"
        ko = word.get("ko", "")
        romanization = word.get("romanization", "")
        example = word.get("example", {}).get("ko", "")
        if not hangul_re.search(ko): issues.append(f"{label}: Korean term has no Hangul: {ko!r}")
        if not romanization_re.fullmatch(romanization): issues.append(f"{label}: malformed romanization: {romanization!r}")
        if ko in terms: issues.append(f"{label}: duplicate Korean term: {ko}")
        if not example or not hangul_re.search(example): issues.append(f"{label}: example has no Korean text")
        if "{{" in example or "}}" in example or "TODO" in example: issues.append(f"{label}: template artifact in example")
        terms.append(ko)
        counts[ko] += 1
print(f"lessons={len(list(LESSONS_DIR.glob('lesson-*.json')))} extra_terms={len(terms)} unique={len(set(terms))}")
if issues:
    print(f"issues={len(issues)}")
    print("\n".join(issues))
    raise SystemExit(1)
print("issues=0")
