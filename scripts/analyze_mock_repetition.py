import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path


def norm(value):
    return " ".join(str(value or "").split()).strip()


def content_key(q):
    payload = "\x1f".join([
        norm(q.get("passage")),
        norm(q.get("questionBn")),
        norm(q.get("questionKo")),
        "\x1e".join(norm(option) for option in sorted(q.get("options", []))),
    ])
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

rows = []
for path in sorted(Path("content/lessons").glob("lesson-*.json")):
    lesson = json.loads(path.read_text())
    for q in lesson["epsQuestions"]:
        rows.append((lesson["chapter"], q))

content_groups = defaultdict(list)
image_groups = defaultdict(list)
for chapter, q in rows:
    content_groups[content_key(q)].append((chapter, q["id"], q.get("image", {}).get("src")))
    if q.get("image"):
        image_groups[q["image"]["src"]].append((chapter, q["id"], content_key(q)))

print(f"questions={len(rows)}")
print(f"image_questions={sum(bool(q.get('image')) for _, q in rows)}")
print(f"distinct_content={len(content_groups)}")
print(f"duplicate_content_groups={sum(len(items) > 1 for items in content_groups.values())}")
print(f"duplicate_content_excess={sum(len(items) - 1 for items in content_groups.values() if len(items) > 1)}")
print("top duplicate content groups:")
for items in sorted(content_groups.values(), key=len, reverse=True)[:20]:
    if len(items) > 1:
        chapter_ids = ", ".join(f"{chapter}:{qid}" for chapter, qid, _ in items[:6])
        print(len(items), chapter_ids)
print("top image source counts:")
for src, items in sorted(image_groups.items(), key=lambda pair: len(pair[1]), reverse=True)[:20]:
    print(len(items), src, "distinct_content", len({key for _, _, key in items}))
print("per chapter image counts:")
counts = Counter(chapter for chapter, q in rows if q.get("image"))
print(dict(sorted(counts.items())))
