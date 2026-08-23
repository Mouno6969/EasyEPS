import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rows = []
for path in sorted((ROOT / "content/lessons").glob("lesson-*.json")):
    lesson = json.loads(path.read_text(encoding="utf-8"))
    for dialogue_index, dialogue in enumerate(lesson.get("dialogues", []), start=1):
        for line_index, line in enumerate(dialogue.get("lines", []), start=1):
            rows.append((lesson["chapter"], dialogue_index, line_index, line["ko"], bool(line.get("audio"))))
counts = Counter(row[3] for row in rows)
print(f"dialogue_lines={len(rows)}")
print(f"unique_dialogue_texts={len(counts)}")
print(f"line_level_audio_attached={sum(row[4] for row in rows)}")
print(f"generated_audio_missing_line_units={sum(not row[4] for row in rows)}")
print(f"reused_text_occurrences={sum(count - 1 for count in counts.values() if count > 1)}")
for text, count in counts.most_common(10):
    if count > 1:
        print(f"reused_count={count} text={text!r}")
