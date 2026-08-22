import json
from collections import Counter, defaultdict
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "content" / "lessons"
lessons = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(root.glob("lesson-*.json"))]
core_entries = [(lesson["chapter"], item) for lesson in lessons for item in lesson.get("vocabulary", [])]
extra_entries = [(lesson["chapter"], item) for lesson in lessons for item in lesson.get("extraVocabulary", [])]
entries = core_entries + extra_entries
ko_counts = Counter(item["ko"].strip() for _, item in entries)
romanization_counts = Counter(item["romanization"].strip().lower() for _, item in entries)
by_ko_chapters = defaultdict(set)
for chapter, item in entries:
    by_ko_chapters[item["ko"].strip()].add(chapter)

counts = [len(lesson.get("vocabulary", [])) for lesson in lessons]
extra_counts = [len(lesson.get("extraVocabulary", [])) for lesson in lessons]
print(f"lessons={len(lessons)}")
print(f"core_entries={len(core_entries)}")
print(f"extra_entries={len(extra_entries)}")
print(f"total_entries={len(entries)}")
print(f"unique_korean={len(ko_counts)}")
print(f"unique_romanization={len(romanization_counts)}")
print(f"avg_core_per_lesson={sum(counts)/len(counts):.1f}")
print(f"avg_extra_per_lesson={sum(extra_counts)/len(extra_counts):.1f}")
print(f"min_core_per_lesson={min(counts)}")
print(f"max_core_per_lesson={max(counts)}")
print(f"repeated_korean_entries={sum(count - 1 for count in ko_counts.values() if count > 1)}")
print(f"korean_terms_repeated={sum(1 for count in ko_counts.values() if count > 1)}")
print(f"terms_in_multiple_chapters={sum(1 for chapters in by_ko_chapters.values() if len(chapters) > 1)}")
print("top_repeated=" + ", ".join(f"{term}:{count}" for term, count in ko_counts.most_common(20) if count > 1))
print("chapter_counts=" + ", ".join(f"{lesson['chapter']}:{len(lesson.get('vocabulary', []))}" for lesson in lessons))
print("category_totals=")
category_totals = Counter()
for lesson in lessons:
    category_totals[lesson["category"]] += len(lesson.get("vocabulary", [])) + len(lesson.get("extraVocabulary", []))
for category, total in sorted(category_totals.items()):
    print(f"  {category}={total}")
