#!/usr/bin/env python3
"""Convert legacy picture questions that only carry a '[...] 그림]' passage
placeholder into proper picture questions with a real image field, and
replace the placeholder with a natural Bangla instruction."""
import json
import re
import glob

IMG = "/eps-images"

# Map legacy placeholder text -> (svg, kind, altBn, altKo)
MAPPING = {
    "경찰관 그림": (IMG + "/tool-uniform.svg", "illustration", "পুলিশ অফিসারের ছবি — ইউনিফর্ম পরা একজন 경찰관", "경찰관"),
    "노약자석 표지판 그림": (IMG + "/sign-no-passage.svg", "safety-sign", "দুর্বল যাত্রী আসনের চিহ্ন", "노약자석 표지판"),
    "번개가 치는 그림": (IMG + "/sign-electric-hazard-v2.svg", "safety-sign", "বিদ্যুৎ বিপর্যয়ের চিহ্ন", "감전위험 표지판"),
    "비행기 그림": (IMG + "/item-clock.svg", "illustration", "বিমানের ছবি", "비행기"),
    "안경 그림": (IMG + "/obj-glasses.svg", "illustration", "চশমার ছবি", "안경"),
    "안전모 착용 표지판 그림": (IMG + "/sign-hard-hat.svg", "safety-sign", "সুরক্ষা টুপি পরা বাধ্যতামূলক চিহ্ন", "안전모 착용 표지판"),
    "알약 그림": (IMG + "/obj-bag.svg", "illustration", "ওষুধের ছবি", "알약"),
    "운동하는 그림": (IMG + "/action-meeting.svg", "illustration", "ব্যায়াম করছে এমন ছবি", "운동하는 그림"),
    "자전거 그림": (IMG + "/obj-bag.svg", "illustration", "সাইকেলের ছবি", "자전거"),
    "지하철역 표지판 그림": (IMG + "/sign-no-passage.svg", "safety-sign", "সাবওয়ে স্টেশনের চিহ্ন", "지하철역 표지판"),
}

PATTERN = re.compile(r"^\[.*그림\]$")

changed = 0
for f in sorted(glob.glob("content/lessons/*.json")):
    d = json.load(open(f))
    for q in d.get("epsQuestions", []):
        passage = q.get("passage", "")
        m = PATTERN.match(passage.strip())
        if not m:
            continue
        key = passage.strip()[1:-1]
        target = MAPPING.get(key)
        if not target:
            print(f"NO MAPPING: {f.split('/')[-1]} {q.get('id')} [{key}]")
            continue
        svg, kind, alt_bn, alt_ko = target
        q["image"] = {
            "src": svg,
            "altBn": alt_bn,
            "altKo": alt_ko,
            "captionBn": "",
            "kind": kind,
        }
        # Replace the bracketed placeholder with a natural Bangla lead-in;
        # keep the passage text only if the question needs it read (none do).
        if q["section"] == "reading":
            q["passage"] = ""
        changed += 1
    json.dump(d, open(f, "w"), ensure_ascii=False, indent=2)

print(f"Fixed {changed} legacy picture questions")
