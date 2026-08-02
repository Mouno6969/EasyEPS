#!/usr/bin/env python3
"""Assemble a lesson from per-section fragments into content/lessons/lesson-NN.json.

A full lesson is ~47 KB of Hangul and Bengali, which is too much to emit in one
model response — single-shot writes get truncated by max_tokens. Authors instead
write one small JSON fragment per section and this merges them in the canonical
field order.

Fragments live in  .lesson-work/<NN>/  and are:
    meta.json        object: chapter, slug, title, category, level, objectives
    vocabulary.json  array of 30-35 vocabulary items
    grammar.json     array of 4-5 grammar patterns
    dialogues.json   array of exactly 3 dialogues
    practice.json    array of exactly 20 practice items
    eps.json         array of 16-20 epsQuestions

Usage:  python3 scripts/assemble-lesson.py 24
        python3 scripts/assemble-lesson.py 24 --check   # also run the gate
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

WORK = Path(".lesson-work")
OUT = Path("content/lessons")

# Canonical key order, matching the accepted lessons.
META_KEYS = ["chapter", "slug", "title", "category", "level", "objectives"]
SECTIONS = [
    ("vocabulary", "vocabulary.json", list),
    ("grammar", "grammar.json", list),
    ("dialogues", "dialogues.json", list),
    ("practice", "practice.json", list),
    ("epsQuestions", "eps.json", list),
]


def load(path: Path, expect: type):
    if not path.exists():
        sys.exit(f"missing fragment: {path}")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        sys.exit(f"invalid JSON in {path}: {exc}")
    if not isinstance(data, expect):
        sys.exit(f"{path}: expected {expect.__name__}, got {type(data).__name__}")
    return data


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    run_check = "--check" in sys.argv
    if len(args) != 1:
        print(__doc__)
        return 2
    n = int(args[0])
    src = WORK / f"{n:02d}"
    if not src.is_dir():
        sys.exit(f"no fragment directory: {src}")

    meta = load(src / "meta.json", dict)
    missing = [k for k in META_KEYS if k not in meta]
    if missing:
        sys.exit(f"meta.json missing keys: {missing}")
    if meta["chapter"] != n:
        sys.exit(f"meta.json chapter {meta['chapter']} != {n}")

    lesson: dict = {k: meta[k] for k in META_KEYS}
    for field, fname, kind in SECTIONS:
        lesson[field] = load(src / fname, kind)

    dest = OUT / f"lesson-{n:02d}.json"
    dest.write_text(
        json.dumps(lesson, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    counts = " ".join(f"{f}={len(lesson[f])}" for f, _, _ in SECTIONS)
    print(f"wrote {dest} ({dest.stat().st_size} bytes)  {counts}")

    if run_check:
        return subprocess.call(
            [sys.executable, "scripts/check-lesson.py", str(n)]
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
