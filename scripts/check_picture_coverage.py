#!/usr/bin/env python3
"""Check picture-question coverage per category/lesson."""
import json
import glob
from collections import defaultdict

per_category = defaultdict(lambda: [0, 0])  # pic, total
per_lesson = []
for f in sorted(glob.glob("content/lessons/*.json")):
    d = json.load(open(f))
    qs = d["epsQuestions"]
    pic = sum(1 for q in qs if q.get("image"))
    per_category[d["category"]][0] += pic
    per_category[d["category"]][1] += len(qs)
    per_lesson.append((f.split("/")[-1], d["category"], pic, len(qs)))

print("category pic/total pic_pct:")
for cat, (p, t) in sorted(per_category.items()):
    print(f"  {cat}: {p}/{t} = {p/t*100:.1f}%")
print()
print("lessons with pic < 2:")
for name, cat, pic, tot in per_lesson:
    if pic < 2:
        print(f"  {name} {cat} pic={pic} total={tot}")
