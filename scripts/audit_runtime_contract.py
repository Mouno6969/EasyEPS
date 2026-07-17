#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "content" / "lessons"
issues = []
for path in sorted(root.glob("lesson-*.json")):
    data = json.loads(path.read_text(encoding="utf-8"))
    for index, item in enumerate(data.get("practice", [])):
        for key in ("id", "type", "questionBn", "questionKo", "explanationBn"):
            if not isinstance(item.get(key), str) or not item.get(key):
                issues.append((path.name, f"practice[{index}]", key, repr(item.get(key))))
        if item.get("type") == "matching":
            if not isinstance(item.get("pairs"), list) or not item.get("pairs"):
                issues.append((path.name, f"practice[{index}]", "pairs", repr(item.get("pairs"))))
        else:
            if not isinstance(item.get("options"), list) or len(item.get("options", [])) < 2:
                issues.append((path.name, f"practice[{index}]", "options", repr(item.get("options"))))
            if not isinstance(item.get("answer"), int):
                issues.append((path.name, f"practice[{index}]", "answer", repr(item.get("answer"))))

for issue in issues:
    print("\t".join(issue))
print(f"issues={len(issues)}")
