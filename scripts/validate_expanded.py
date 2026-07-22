#!/usr/bin/env python3
"""Validate an expanded EasyEPS lesson JSON against the v2 expansion spec.

Usage: python3 validate_expanded.py <lesson.json> [--chapter N]
Exits 0 if valid; prints errors and exits 1 otherwise.
"""
import json
import sys


def validate(data, expected_chapter=None):
    errors = []

    def need(cond, msg):
        if not cond:
            errors.append(msg)

    need(isinstance(data, dict), "root must be object")
    if not isinstance(data, dict):
        return errors

    # basic fields
    for key in ["chapter", "slug", "title", "category", "level", "objectives",
                "vocabulary", "grammar", "dialogues", "practice", "epsQuestions"]:
        need(key in data, f"missing key {key}")
    if errors:
        return errors

    if expected_chapter is not None:
        need(data["chapter"] == expected_chapter, f"chapter mismatch: {data['chapter']} != {expected_chapter}")

    ch = data["chapter"]
    expected_cat = ("daily-life" if ch <= 24 else "culture" if ch <= 30 else
                    "workplace" if ch <= 52 else "safety" if ch <= 56 else "laws")
    need(data["category"] == expected_cat, f"category should be {expected_cat}")
    need(data["level"] == "beginner", "level must be beginner")
    for lang in ["ko", "bn", "en"]:
        need(bool(data["title"].get(lang)), f"title.{lang} required")

    # vocabulary
    vocab = data["vocabulary"]
    need(30 <= len(vocab) <= 40, f"vocabulary count {len(vocab)} not in 30-40")
    seen_ko = set()
    for i, v in enumerate(vocab):
        for key in ["ko", "romanization", "bn", "en", "pos", "example"]:
            need(bool(v.get(key)), f"vocab[{i}] missing {key}")
        need(bool(v.get("pronunciationTipBn")), f"vocab[{i}] missing pronunciationTipBn")
        ex = v.get("example") or {}
        for lang in ["ko", "bn", "en"]:
            need(bool(ex.get(lang)), f"vocab[{i}].example.{lang} required")
        ko = v.get("ko", "")
        need(ko not in seen_ko, f"vocab[{i}] duplicate ko: {ko}")
        seen_ko.add(ko)

    # grammar
    grammar = data["grammar"]
    need(4 <= len(grammar) <= 6, f"grammar count {len(grammar)} not in 4-6")
    for i, g in enumerate(grammar):
        for key in ["pattern", "titleBn", "explanationBn", "explanationEn"]:
            need(bool(g.get(key)), f"grammar[{i}] missing {key}")
        need(bool(g.get("commonMistakeBn")), f"grammar[{i}] missing commonMistakeBn")
        exs = g.get("examples") or []
        need(len(exs) >= 2, f"grammar[{i}] needs >=2 examples")
        for j, ex in enumerate(exs):
            for lang in ["ko", "bn", "en"]:
                need(bool(ex.get(lang)), f"grammar[{i}].examples[{j}].{lang} required")

    # dialogues
    dialogues = data["dialogues"]
    need(3 <= len(dialogues) <= 4, f"dialogues count {len(dialogues)} not in 3-4")
    for i, d in enumerate(dialogues):
        need(bool(d.get("titleBn")) and bool(d.get("titleEn")), f"dialogue[{i}] titles required")
        lines = d.get("lines") or []
        need(4 <= len(lines) <= 8, f"dialogue[{i}] lines {len(lines)} not in 4-8")
        for j, line in enumerate(lines):
            for key in ["speaker", "ko", "bn", "en"]:
                need(bool(line.get(key)), f"dialogue[{i}].lines[{j}].{key} required")

    # practice
    practice = data["practice"]
    need(len(practice) == 20, f"practice count {len(practice)} != 20")
    ids = set()
    mc = fill = matching = 0
    for i, p in enumerate(practice):
        pid = p.get("id")
        need(bool(pid), f"practice[{i}] missing id")
        need(pid not in ids, f"practice duplicate id {pid}")
        ids.add(pid)
        t = p.get("type")
        need(t in ("multiple-choice", "fill-blank", "matching"), f"practice[{i}] bad type {t}")
        need(bool(p.get("questionBn")), f"practice[{i}] missing questionBn")
        need(bool(p.get("explanationBn")), f"practice[{i}] missing explanationBn")
        if t == "matching":
            matching += 1
            pairs = p.get("pairs") or []
            need(len(pairs) >= 2, f"practice[{i}] matching needs >=2 pairs")
            for j, pair in enumerate(pairs):
                need(bool(pair.get("left")) and bool(pair.get("right")), f"practice[{i}].pairs[{j}] incomplete")
        else:
            if t == "multiple-choice":
                mc += 1
            else:
                fill += 1
            opts = p.get("options") or []
            need(len(opts) == 4, f"practice[{i}] needs 4 options, has {len(opts)}")
            ans = p.get("answer")
            need(isinstance(ans, int) and 0 <= ans < len(opts), f"practice[{i}] bad answer {ans}")
    need(mc >= 8, f"need >=8 multiple-choice, have {mc}")
    need(fill >= 6, f"need >=6 fill-blank, have {fill}")
    need(matching >= 4, f"need >=4 matching, have {matching}")

    # eps
    eps = data["epsQuestions"]
    need(len(eps) == 16, f"epsQuestions count {len(eps)} != 16")
    eids = set()
    reading = listening = 0
    answer_dist = [0, 0, 0, 0]
    for i, e in enumerate(eps):
        eid = e.get("id")
        need(bool(eid), f"eps[{i}] missing id")
        need(eid not in eids, f"eps duplicate id {eid}")
        eids.add(eid)
        sec = e.get("section")
        need(sec in ("reading", "listening"), f"eps[{i}] bad section {sec}")
        if sec == "reading":
            reading += 1
        else:
            listening += 1
        need(bool(e.get("questionBn")), f"eps[{i}] missing questionBn")
        need(bool(e.get("questionKo")), f"eps[{i}] missing questionKo")
        need(bool(e.get("explanationBn")), f"eps[{i}] missing explanationBn")
        opts = e.get("options") or []
        need(len(opts) == 4 and all(bool(o) for o in opts), f"eps[{i}] needs 4 non-empty options")
        ans = e.get("answer")
        need(isinstance(ans, int) and 0 <= ans <= 3, f"eps[{i}] bad answer {ans}")
        if isinstance(ans, int) and 0 <= ans <= 3:
            answer_dist[ans] += 1
    need(reading == 10, f"need exactly 10 reading, have {reading}")
    need(listening == 6, f"need exactly 6 listening, have {listening}")
    need(max(answer_dist) <= 8, f"eps answer distribution too skewed: {answer_dist}")

    return errors


def main():
    path = sys.argv[1]
    expected = None
    if "--chapter" in sys.argv:
        expected = int(sys.argv[sys.argv.index("--chapter") + 1])
    try:
        data = json.load(open(path, encoding="utf-8"))
    except Exception as exc:
        print(f"INVALID JSON: {exc}")
        sys.exit(1)
    errors = validate(data, expected)
    if errors:
        for err in errors:
            print(f"ERROR: {err}")
        sys.exit(1)
    print("OK")


if __name__ == "__main__":
    main()
