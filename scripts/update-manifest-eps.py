#!/usr/bin/env python3
"""Sync content/manifest.json eps counts with actual lesson files and bump updatedAt."""
import json
from datetime import datetime, timezone

with open("content/manifest.json", encoding="utf-8") as f:
    manifest = json.load(f)

changed = False
for entry in manifest["completed"]:
    path = f"content/lessons/{entry['file']}"
    with open(path, encoding="utf-8") as f:
        lesson = json.load(f)
    actual = len(lesson["epsQuestions"])
    if entry.get("eps") != actual:
        print(f"chapter {entry['chapter']}: eps {entry.get('eps')} -> {actual}")
        entry["eps"] = actual
        changed = True

if changed:
    manifest["updatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open("content/manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("manifest updated")
else:
    print("manifest already in sync")
