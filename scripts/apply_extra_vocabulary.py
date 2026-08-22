from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS = ROOT / "content" / "lessons"
GENERATED = ROOT / "scripts" / "generated_extra_vocabulary.json"


def main() -> None:
    generated = json.loads(GENERATED.read_text(encoding="utf-8"))
    by_chapter = {entry["chapter"]: entry["items"] for entry in generated}
    if set(by_chapter) != set(range(1, 61)):
        raise SystemExit("generated extra vocabulary must cover chapters 1 through 60")
    global_terms: set[str] = set()
    for chapter, items in sorted(by_chapter.items()):
        if len(items) != 4:
            raise SystemExit(f"chapter {chapter} must have exactly 4 extra terms")
        for item in items:
            term = item["ko"].strip()
            if term in global_terms:
                raise SystemExit(f"duplicate extra term: {term}")
            global_terms.add(term)

    for path in sorted(LESSONS.glob("lesson-*.json")):
        lesson = json.loads(path.read_text(encoding="utf-8"))
        chapter = lesson["chapter"]
        existing = {item["ko"].strip() for item in lesson.get("vocabulary", [])}
        extras = []
        for item in by_chapter[chapter]:
            if item["ko"].strip() in existing:
                raise SystemExit(f"extra term already exists in chapter {chapter}: {item['ko']}")
            extras.append({**item, "layer": "exam-transfer", "sourceChapter": chapter})
        lesson["extraVocabulary"] = extras
        path.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"applied {len(global_terms)} unique extra vocabulary items to 60 lessons")


if __name__ == "__main__":
    main()
