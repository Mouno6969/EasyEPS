import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tmp/basics_audio_prompts"
OUT.mkdir(parents=True, exist_ok=True)
rows = {}
for path in sorted((ROOT / "content/basics/modules").glob("*.json")):
    data = json.loads(path.read_text(encoding="utf-8"))
    for step in data.get("steps", []):
        kind = step.get("type")
        if kind in {"jamo-grid", "speak"}:
            for item in step.get("items", []):
                text = item.get("audioText") or item.get("text") or item.get("char")
                rows.setdefault(text, {"text": text, "kinds": set(), "refs": []})
                rows[text]["kinds"].add(kind)
                rows[text]["refs"].append((path.name, step["id"], item["id"]))
        elif kind == "read":
            for item in step.get("items", []):
                text = item.get("audioText") or item["text"]
                rows.setdefault(text, {"text": text, "kinds": set(), "refs": []})
                rows[text]["kinds"].add(kind)
                rows[text]["refs"].append((path.name, step["id"], item["id"]))
        elif kind == "quiz":
            for q in step.get("questions", []):
                if q.get("kind") == "listen-choice" and q.get("listenText"):
                    text = q["listenText"]
                    rows.setdefault(text, {"text": text, "kinds": set(), "refs": []})
                    rows[text]["kinds"].add("listen-choice")
                    rows[text]["refs"].append((path.name, step["id"], q["id"]))

def safe(text):
    slug = re.sub(r"[^0-9A-Za-z가-힣]+", "-", text).strip("-")[:42]
    return slug or "unit"

jobs = []
for index, text in enumerate(sorted(rows), start=1):
    key = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    filename = f"basic-{key}-{safe(text)}.wav"
    (OUT / f"{index:03d}-{filename}.txt").write_text(
        "Speak in standard South Korean Korean very slowly and clearly for a beginner Hangul pronunciation drill. Use a calm, patient teacher voice. Pronounce the exact Korean text naturally but deliberately, with clear syllable boundaries and a short pause at punctuation. Do not add narration, translation, spelling, or extra words. Speak only the exact Korean text after the colon.: " + text,
        encoding="utf-8",
    )
    jobs.append({"index": index, "text": text, "filename": filename, "kinds": sorted(rows[text]["kinds"]), "refs": rows[text]["refs"]})
(ROOT / "tmp/basics_audio_jobs.json").write_text(json.dumps(jobs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"unique_basics_jobs={len(jobs)}")
for kind in ("jamo-grid", "speak", "read", "listen-choice"):
    print(f"{kind}_unique={len({j['text'] for j in jobs if kind in j['kinds']})}")
