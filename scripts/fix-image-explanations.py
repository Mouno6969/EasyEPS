#!/usr/bin/env python3
"""Rewrite explanation option-number references for e-img-* questions after rebalance."""
import json

BN_DIGITS = {0: "১", 1: "২", 2: "৩", 3: "৪"}

for ch in [21, 53, 54, 55, 56]:
    path = f"content/lessons/lesson-{ch:02d}.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    changed = False
    for q in data["epsQuestions"]:
        if not q["id"].startswith("e-img"):
            continue
        correct_bn = BN_DIGITS[q["answer"]]
        expl = q["explanationBn"]
        for wrong in BN_DIGITS.values():
            token = f"বিকল্প {wrong} সঠিক"
            if token in expl and wrong != correct_bn:
                expl = expl.replace(token, f"বিকল্প {correct_bn} সঠিক")
                changed = True
        q["explanationBn"] = expl
    if changed:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"chapter {ch}: fixed explanations")
print("Done.")
