#!/usr/bin/env python3
"""Sync content/manifest.json counts with the actual lesson files and bump updatedAt.

Keeps vocabulary / practice / eps in step with what is really on disk. Re-authoring
a chapter changes these counts, and CONTINUATION.md tells future sessions to trust
the manifest, so drift here can mislead a later session into re-generating work.
"""
import json
from datetime import datetime, timezone

FIELDS = {
    "vocabulary": "vocabulary",
    "practice": "practice",
    "eps": "epsQuestions",
}

with open("content/manifest.json", encoding="utf-8") as f:
    manifest = json.load(f)

changed = False
for entry in manifest["completed"]:
    path = f"content/lessons/{entry['file']}"
    with open(path, encoding="utf-8") as f:
        lesson = json.load(f)
    for key, lesson_key in FIELDS.items():
        actual = len(lesson[lesson_key])
        if entry.get(key) != actual:
            print(f"chapter {entry['chapter']:>2}: {key} {entry.get(key)} -> {actual}")
            entry[key] = actual
            changed = True

if changed:
    manifest["updatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open("content/manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("manifest updated")
else:
    print("manifest already in sync")
