import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rows = []
for path in sorted((ROOT / "content/lessons").glob("lesson-*.json")):
    lesson = json.loads(path.read_text(encoding="utf-8"))
    for item in lesson.get("epsQuestions", []):
        if item.get("section") != "listening":
            continue
        passage = item.get("passage", "").strip()
        key = hashlib.sha256(passage.encode("utf-8")).hexdigest() if passage else "EMPTY"
        rows.append((lesson["chapter"], item["id"], passage, key))
counts = Counter(row[3] for row in rows)
print(f"listening_items={len(rows)}")
print(f"unique_nonempty_passages={sum(1 for key in counts if key != 'EMPTY')}")
print(f"empty_passages={counts.get('EMPTY', 0)}")
print(f"duplicate_items_saved={len(rows) - sum(1 for key in counts if key != 'EMPTY') - counts.get('EMPTY', 0)}")
for key, count in counts.most_common(20):
    if count > 1:
        example = next(row for row in rows if row[3] == key)
        print(f"duplicate_count={count} example={example[0]:02d}:{example[1]} passage={example[2]!r}")
