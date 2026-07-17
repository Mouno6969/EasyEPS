#!/usr/bin/env python3
"""Download lesson JSON files from a map-batch result JSON, validate, save to
content/lessons/, and update content/manifest.json. Idempotent and resumable.

Usage: python3 scripts/collect-lessons.py /home/ubuntu/author_easyeps_lessons_batchN.json
"""
import json, sys, os, urllib.request, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSONS_DIR = os.path.join(ROOT, "content", "lessons")
MANIFEST = os.path.join(ROOT, "content", "manifest.json")
os.makedirs(LESSONS_DIR, exist_ok=True)

def validate(data):
    errs = []
    ch = data.get("chapter")
    if not isinstance(ch, int) or not (1 <= ch <= 60): errs.append("bad chapter")
    v = data.get("vocabulary", [])
    if not (16 <= len(v) <= 22): errs.append(f"vocab count {len(v)}")
    p = data.get("practice", [])
    if len(p) != 10: errs.append(f"practice count {len(p)}")
    e = data.get("epsQuestions", [])
    if len(e) != 8: errs.append(f"eps count {len(e)}")
    for q in p:
        if q.get("type") == "matching":
            if not (4 <= len(q.get("pairs", [])) <= 6): errs.append(f"{q.get('id')}: bad pairs")
        else:
            if len(q.get("options", [])) != 4: errs.append(f"{q.get('id')}: options != 4")
            if not (0 <= q.get("answer", -1) <= 3): errs.append(f"{q.get('id')}: bad answer")
    for q in e:
        if len(q.get("options", [])) != 4: errs.append(f"{q.get('id')}: options != 4")
        if not (0 <= q.get("answer", -1) <= 3): errs.append(f"{q.get('id')}: bad answer")
    if len(data.get("dialogues", [])) != 2: errs.append("dialogues != 2")
    return errs

def main(result_file):
    with open(result_file) as f:
        results = json.load(f)["results"]
    manifest = json.load(open(MANIFEST))
    done = {c["chapter"]: c for c in manifest["completed"]}
    ok, failed = [], []
    for r in results:
        out = r.get("output") or {}
        url = out.get("lesson_json_file")
        if not url:
            failed.append((r.get("input", "?")[:30], "no file")); continue
        try:
            raw = urllib.request.urlopen(url, timeout=60).read().decode("utf-8")
            data = json.loads(raw)
            errs = validate(data)
            if errs:
                failed.append((data.get("chapter"), "; ".join(errs))); continue
            ch = data["chapter"]
            path = os.path.join(LESSONS_DIR, f"lesson-{ch:02d}.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            done[ch] = {
                "chapter": ch,
                "file": f"lesson-{ch:02d}.json",
                "vocabulary": len(data["vocabulary"]),
                "practice": len(data["practice"]),
                "eps": len(data["epsQuestions"]),
            }
            ok.append(ch)
        except Exception as ex:
            failed.append((r.get("input", "?")[:30], str(ex)))
    manifest["completed"] = [done[k] for k in sorted(done)]
    manifest["updatedAt"] = datetime.datetime.utcnow().isoformat() + "Z"
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"saved: {sorted(ok)}")
    print(f"failed: {failed}")
    print(f"manifest now has {len(manifest['completed'])}/60 chapters")

if __name__ == "__main__":
    main(sys.argv[1])
