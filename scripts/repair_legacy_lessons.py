#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "content" / "lessons"
changed_files = 0
changed_items = 0

question_by_type = {
    "matching": "서로 맞는 것을 연결하세요.",
    "fill-blank": "빈칸에 들어갈 알맞은 것을 고르세요.",
    "multiple-choice": "알맞은 답을 고르세요.",
}
explanation_by_type = {
    "matching": "প্রতিটি কোরিয়ান শব্দ বা বাক্যের সঙ্গে তার সঠিক বাংলা অর্থ মিলিয়ে দেখুন।",
    "fill-blank": "সঠিক উত্তরটি শূন্যস্থানের অর্থ ও বাক্যের ব্যাকরণের সঙ্গে সামঞ্জস্যপূর্ণ।",
    "multiple-choice": "সঠিক উত্তরটি প্রশ্নের অর্থ এবং এই অধ্যায়ে শেখা ভাষার ব্যবহারের সঙ্গে সামঞ্জস্যপূর্ণ।",
}

for path in sorted(root.glob("lesson-*.json")):
    data = json.loads(path.read_text(encoding="utf-8"))
    file_changed = False
    for item in data.get("practice", []):
        item_changed = False
        kind = item.get("type", "multiple-choice")
        if not isinstance(item.get("questionKo"), str) or not item.get("questionKo", "").strip():
            item["questionKo"] = question_by_type.get(kind, question_by_type["multiple-choice"])
            item_changed = True
        if not isinstance(item.get("explanationBn"), str) or not item.get("explanationBn", "").strip():
            item["explanationBn"] = explanation_by_type.get(kind, explanation_by_type["multiple-choice"])
            item_changed = True
        if item_changed:
            changed_items += 1
            file_changed = True
    if file_changed:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        changed_files += 1

print(f"changed_files={changed_files}")
print(f"changed_items={changed_items}")
