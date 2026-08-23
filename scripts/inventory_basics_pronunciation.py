import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
rows = []
for path in sorted((ROOT / "content/basics/modules").glob("*.json")):
    data = json.loads(path.read_text(encoding="utf-8"))
    for step in data.get("steps", []):
        kind = step.get("type")
        if kind in {"jamo-grid", "speak"}:
            for item in step.get("items", []):
                text = item.get("audioText") or item.get("text") or item.get("char")
                rows.append((path.name, step["id"], kind, item["id"], text))
        elif kind == "read":
            for item in step.get("items", []):
                rows.append((path.name, step["id"], kind, item["id"], item.get("audioText") or item["text"]))
        elif kind == "quiz":
            for q in step.get("questions", []):
                if q.get("kind") == "listen-choice" and q.get("listenText"):
                    rows.append((path.name, step["id"], "listen-choice", q["id"], q["listenText"]))
counts = Counter(row[4] for row in rows)
print(f"basics_audio_units={len(rows)}")
print(f"unique_audio_texts={len(counts)}")
for kind in ("jamo-grid", "speak", "read", "listen-choice"):
    subset = [r for r in rows if r[2] == kind]
    print(f"{kind}_units={len(subset)} unique={len(set(r[4] for r in subset))}")
print(f"duplicate_text_occurrences={sum(n-1 for n in counts.values() if n > 1)}")
for row in rows:
    print("\t".join(row))
