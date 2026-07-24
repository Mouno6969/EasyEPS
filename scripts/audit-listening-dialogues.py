#!/usr/bin/env python3
"""Audit listening EPS questions: which passages are speaker-labelled dialogues
vs unlabeled single-block text, and which look like dialogues but lack labels."""
import json, glob, re, sys

LABEL_RE = re.compile(r"(남자|여자|남|여)\s*:")

total = 0
labelled = 0
unlabeled = []
formats = {}

for f in sorted(glob.glob("content/lessons/lesson-*.json"), key=lambda x: int(re.search(r"(\d+)", x).group(1))):
    d = json.load(open(f))
    for q in d.get("epsQuestions", []):
        if q.get("section") != "listening":
            continue
        total += 1
        p = q.get("passage") or ""
        labels = LABEL_RE.findall(p)
        if labels:
            labelled += 1
            key = tuple(sorted(set(labels)))
            formats[key] = formats.get(key, 0) + 1
        else:
            unlabeled.append((f.split("/")[-1], q.get("id"), p.replace("\n", " | ")[:110]))

print(f"total listening: {total} | speaker-labelled: {labelled} | unlabeled: {len(unlabeled)}")
print("label formats:", formats)
print("\nUNLABELED passages:")
for x in unlabeled:
    print(" ", x)
