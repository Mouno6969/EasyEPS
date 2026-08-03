#!/usr/bin/env python3
"""Strict SCHEMA.md v2 gate for authored lessons.

`scripts/validate-all-lessons.ts` checks the loose Zod schema (practice 10-30,
eps 8-20). SCHEMA.md states tighter contracts that the Zod schema does not
enforce, and those are what the re-authoring run must hit. This checks the
tight rules plus the correctness traps that matter pedagogically:
answer indices in range, no duplicate vocabulary, dialogue speaker labels,
and required trilingual fields actually being non-empty.

Usage:  python3 scripts/check-lesson.py 20 [21 ...]      # specific chapters
        python3 scripts/check-lesson.py --all
Exit 0 = all clean.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

LESSONS = Path("content/lessons")
HANGUL = re.compile(r"[\uac00-\ud7a3]")
BENGALI = re.compile(r"[\u0980-\u09ff]")

CATEGORY_FOR = lambda n: (  # noqa: E731 - matches SCHEMA.md category bands
    "daily-life" if n <= 24 else
    "culture" if n <= 30 else
    "workplace" if n <= 52 else
    "safety" if n <= 56 else
    "laws"
)


def check(path: Path) -> list[str]:
    errs: list[str] = []
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"unparseable JSON: {exc}"]

    ch = d.get("chapter")
    if not isinstance(ch, int):
        errs.append(f"chapter must be int, got {ch!r}")
        ch = 0

    expected_cat = CATEGORY_FOR(ch)
    if d.get("category") != expected_cat:
        errs.append(f"category {d.get('category')!r} != expected {expected_cat!r} for ch {ch}")

    for key in ("slug", "level"):
        if not d.get(key):
            errs.append(f"missing {key}")

    title = d.get("title") or {}
    for lang in ("ko", "bn", "en"):
        if not title.get(lang):
            errs.append(f"title.{lang} empty")
    if title.get("ko") and not HANGUL.search(title["ko"]):
        errs.append("title.ko has no Hangul")
    if title.get("bn") and not BENGALI.search(title["bn"]):
        errs.append("title.bn has no Bengali")

    obj = d.get("objectives") or {}
    for lang in ("bn", "en"):
        if not obj.get(lang):
            errs.append(f"objectives.{lang} empty")

    # -- vocabulary: 30-35, full trilingual entries, no duplicates -------------
    vocab = d.get("vocabulary") or []
    if not 30 <= len(vocab) <= 35:
        errs.append(f"vocabulary {len(vocab)} outside 30-35")
    seen: dict[str, int] = {}
    for i, v in enumerate(vocab):
        where = f"vocab[{i}]"
        for f in ("ko", "romanization", "bn", "en", "pos"):
            if not v.get(f):
                errs.append(f"{where} missing {f}")
        ko = v.get("ko", "")
        # Numeric entries (emergency numbers like 119) legitimately have no Hangul.
        if ko and not HANGUL.search(ko) and not re.fullmatch(r"[\d\s\-().]+", ko):
            errs.append(f"{where} ko {ko!r} has no Hangul")
        if ko:
            if ko in seen:
                errs.append(f"{where} duplicate ko {ko!r} (also vocab[{seen[ko]}])")
            seen[ko] = i
        ex = v.get("example") or {}
        for f in ("ko", "bn", "en"):
            if not ex.get(f):
                errs.append(f"{where}.example missing {f}")
        if v.get("bn") and not BENGALI.search(v["bn"]):
            errs.append(f"{where} bn {v['bn']!r} has no Bengali")

    # -- grammar: 4-5 patterns, 2+ examples each -------------------------------
    grammar = d.get("grammar") or []
    if not 4 <= len(grammar) <= 5:
        errs.append(f"grammar {len(grammar)} outside 4-5")
    for i, g in enumerate(grammar):
        where = f"grammar[{i}]"
        for f in ("pattern", "titleBn", "explanationBn"):
            if not g.get(f):
                errs.append(f"{where} missing {f}")
        exs = g.get("examples") or []
        if len(exs) < 2:
            errs.append(f"{where} has {len(exs)} examples, need >=2")
        for j, e in enumerate(exs):
            for f in ("ko", "bn", "en"):
                if not e.get(f):
                    errs.append(f"{where}.examples[{j}] missing {f}")

    # -- dialogues: exactly 3, 4-8 lines each ----------------------------------
    dialogues = d.get("dialogues") or []
    if len(dialogues) != 3:
        errs.append(f"dialogues {len(dialogues)} != 3")
    for i, dl in enumerate(dialogues):
        where = f"dialogues[{i}]"
        for f in ("titleBn", "titleEn"):
            if not dl.get(f):
                errs.append(f"{where} missing {f}")
        lines = dl.get("lines") or []
        if not 4 <= len(lines) <= 8:
            errs.append(f"{where} has {len(lines)} lines, need 4-8")
        for j, ln in enumerate(lines):
            if not ln.get("speaker"):
                errs.append(f"{where}.lines[{j}] missing speaker")
            for f in ("ko", "bn", "en"):
                if not ln.get(f):
                    errs.append(f"{where}.lines[{j}] missing {f}")

    # -- practice: EXACTLY 20, with type mix ----------------------------------
    practice = d.get("practice") or []
    if len(practice) != 20:
        errs.append(f"practice {len(practice)} != 20")
    kinds: dict[str, int] = {}
    for i, p in enumerate(practice):
        where = f"practice[{i}]"
        t = p.get("type", "")
        kinds[t] = kinds.get(t, 0) + 1
        if not p.get("id"):
            errs.append(f"{where} missing id")
        if not p.get("questionBn"):
            errs.append(f"{where} missing questionBn")
        if not p.get("explanationBn"):
            errs.append(f"{where} missing explanationBn")
        if t == "matching":
            if not (p.get("pairs") or []):
                errs.append(f"{where} matching with no pairs")
        else:
            opts = p.get("options") or []
            ans = p.get("answer")
            if len(opts) < 2:
                errs.append(f"{where} has {len(opts)} options")
            if not isinstance(ans, int) or not 0 <= ans < len(opts):
                errs.append(f"{where} answer {ans!r} out of range for {len(opts)} options")
    for need, n in (("multiple-choice", 4), ("fill-blank", 3), ("matching", 2)):
        if kinds.get(need, 0) < n:
            errs.append(f"practice type {need}: {kinds.get(need, 0)} < required {n}")

    ids = [p.get("id") for p in practice]
    if len(set(ids)) != len(ids):
        errs.append("practice ids not unique")

    # -- epsQuestions: 16 (up to 20 with image items), 10 reading / 6 listening -
    eps = d.get("epsQuestions") or []
    if not 16 <= len(eps) <= 20:
        errs.append(f"epsQuestions {len(eps)} outside 16-20")
    sections: dict[str, int] = {}
    for i, q in enumerate(eps):
        where = f"eps[{i}]"
        sec = q.get("section", "")
        sections[sec] = sections.get(sec, 0) + 1
        if not q.get("id"):
            errs.append(f"{where} missing id")
        if not q.get("questionBn"):
            errs.append(f"{where} missing questionBn")
        if not q.get("explanationBn"):
            errs.append(f"{where} missing explanationBn")
        opts = q.get("options") or []
        ans = q.get("answer")
        if len(opts) < 2:
            errs.append(f"{where} has {len(opts)} options")
        if not isinstance(ans, int) or not 0 <= ans < len(opts):
            errs.append(f"{where} answer {ans!r} out of range for {len(opts)} options")
        if "passage" in q and not isinstance(q["passage"], str):
            # Zod types passage as an optional string: an explicit null fails the
            # runtime schema even though it reads as "no passage" here. Omit the
            # key instead, which is what the other lessons do.
            errs.append(f"{where} passage is {q['passage']!r}, must be a string or absent")
        if sec == "listening":
            passage = q.get("passage") or ""
            if not passage:
                errs.append(f"{where} listening item without passage (no audio possible)")
            elif ":" in passage and not re.search(r"(남자|여자)\s*:", passage):
                errs.append(f"{where} listening passage uses non-canonical speaker labels")
    if sections.get("reading", 0) < 10:
        errs.append(f"eps reading {sections.get('reading', 0)} < 10")
    if sections.get("listening", 0) < 6:
        errs.append(f"eps listening {sections.get('listening', 0)} < 6")

    ids = [q.get("id") for q in eps]
    if len(set(ids)) != len(ids):
        errs.append("eps ids not unique")

    # Answer-key balance: all correct answers landing on one index is a red flag.
    all_ans = [q["answer"] for q in eps if isinstance(q.get("answer"), int)]
    if all_ans and len(set(all_ans)) == 1:
        errs.append(f"all eps answers are index {all_ans[0]} (unbalanced key)")

    return errs


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    if args == ["--all"]:
        files = sorted(LESSONS.glob("lesson-*.json"))
    else:
        files = [
            Path(a) if not a.isdigit() else LESSONS / f"lesson-{int(a):02d}.json"
            for a in args
        ]

    total = 0
    for f in files:
        if not f.exists():
            print(f"MISSING {f}")
            total += 1
            continue
        errs = check(f)
        if errs:
            total += len(errs)
            print(f"\nFAIL {f.name}  ({len(errs)} issues)")
            for e in errs[:25]:
                print(f"   - {e}")
            if len(errs) > 25:
                print(f"   ... and {len(errs) - 25} more")
        else:
            print(f"OK   {f.name}")
    print(f"\n{'ALL CLEAN' if total == 0 else str(total) + ' ISSUES'}")
    return 0 if total == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
