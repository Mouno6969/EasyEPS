#!/usr/bin/env python3
"""Validate and summarize EPS listening passage dialogue formatting.

Canonical multi-speaker passages use one ``남자:`` or ``여자:`` turn per line.
Unlabelled narration and single-utterance questions remain valid. The command
exits non-zero when it finds content that the dialogue TTS parser would read
incorrectly or that bypassed the normalization pass.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "content" / "lessons"
CANONICAL_TURN_RE = re.compile(r"^(남자|여자):\s*(.+)$")
ANY_ROLE_RE = re.compile(r"^([^\s:：]{1,16})\s*([:：])\s*(.*)$")
LEGACY_ROLE_RE = re.compile(r"(?:^|\s)(남|여)\s*[:：]")
INLINE_CANONICAL_RE = re.compile(r"(?<!^)(?<!\n)(?:남자|여자)\s*[:：]")
SLASH_DIALOGUE_RE = re.compile(r"\s[/／]\s")

issues: list[tuple[str, str, str]] = []
formats: Counter[tuple[str, ...]] = Counter()
total = 0
labelled = 0
unlabelled = 0

for path in sorted(LESSONS_DIR.glob("lesson-*.json")):
    lesson = json.loads(path.read_text(encoding="utf-8"))
    for question in lesson.get("epsQuestions", []):
        if question.get("section") != "listening":
            continue

        total += 1
        question_id = str(question.get("id") or "<missing-id>")
        passage = question.get("passage")
        location = f"{path.name}:{question_id}"
        if not isinstance(passage, str) or not passage.strip():
            issues.append((location, "missing-passage", repr(passage)))
            continue

        passage = passage.strip()
        turns: list[tuple[str, str]] = []
        malformed_roles: list[str] = []
        has_mixed_paragraph = False

        for paragraph in re.split(r"\n\s*\n", passage):
            lines = [line.strip() for line in paragraph.splitlines() if line.strip()]
            paragraph_turns: list[tuple[str, str]] = []
            for line in lines:
                canonical = CANONICAL_TURN_RE.fullmatch(line)
                if canonical:
                    paragraph_turns.append((canonical.group(1), canonical.group(2).strip()))
                    continue

                role = ANY_ROLE_RE.fullmatch(line)
                if role:
                    malformed_roles.append(role.group(1))

            if paragraph_turns and len(paragraph_turns) != len(lines):
                has_mixed_paragraph = True
            turns.extend(paragraph_turns)

        if turns:
            labelled += 1
            formats[tuple(sorted({speaker for speaker, _ in turns}))] += 1
            if has_mixed_paragraph:
                issues.append((location, "mixed-or-malformed-turn-lines", passage.replace("\n", " | ")))
        else:
            unlabelled += 1

        if malformed_roles:
            issues.append((location, "noncanonical-role-label", ", ".join(malformed_roles)))
        if LEGACY_ROLE_RE.search(passage):
            issues.append((location, "legacy-short-role-label", passage.replace("\n", " | ")))
        if INLINE_CANONICAL_RE.search(passage):
            issues.append((location, "inline-speaker-label", passage.replace("\n", " | ")))
        if SLASH_DIALOGUE_RE.search(passage):
            issues.append((location, "slash-separated-dialogue", passage.replace("\n", " | ")))

print(
    f"total listening: {total} | speaker-labelled: {labelled} | "
    f"unlabelled: {unlabelled}"
)
print("label formats:", dict(formats))
print(f"issues={len(issues)}")
for location, code, detail in issues:
    print(f"{location}\t{code}\t{detail}")

if issues:
    sys.exit(1)
