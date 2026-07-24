#!/usr/bin/env python3
"""Count per-jamo recognition exposures across the basics track content.

An "exposure" is any event where the learner sees/hears a letter in an
interactive context: quiz question (prompt/options/pairs/listen), speak item,
write item, or builder prompt. Decomposes syllables into component jamo.
"""
import json
import glob
import unicodedata
from collections import Counter

CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
JUNGSEONG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
JONGSEONG = [
    "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ",
    "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ",
    "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
]
ALL_JAMO = set(CHOSEONG) | set(JUNGSEONG)


def decompose(text: str):
    out = []
    for ch in text:
        code = ord(ch)
        if 0xAC00 <= code <= 0xD7A3:
            idx = code - 0xAC00
            out.append(CHOSEONG[idx // 588])
            out.append(JUNGSEONG[(idx % 588) // 28])
            fin = JONGSEONG[idx % 28]
            if fin:
                out.extend(list(fin) if len(fin) > 1 else [fin])
        elif ch in ALL_JAMO:
            out.append(ch)
    return out


def texts_from_question(q):
    txts = [q.get("promptBn", ""), q.get("promptEn", ""), q.get("listenText", "")]
    txts += q.get("options", [])
    for p in q.get("pairs", []):
        txts += [p.get("left", ""), p.get("right", "")]
    return txts


counter = Counter()
events = 0
for f in sorted(glob.glob("content/basics/modules/*.json")):
    m = json.load(open(f))
    for st in m["steps"]:
        t = st["type"]
        if t == "quiz":
            for q in st["questions"]:
                events += 1
                seen = set()
                for txt in texts_from_question(q):
                    seen.update(decompose(txt))
                counter.update(seen)
        elif t == "speak":
            reps = max(1, st.get("minListens", 1))
            for it in st["items"]:
                events += reps
                seen = set(decompose(it.get("text", "") + it.get("audioText", "")))
                for j in seen:
                    counter[j] += reps
        elif t == "write":
            for it in st["items"]:
                events += 1
                counter.update(set(decompose(it.get("char", ""))))
        elif t == "builder":
            for p in st["prompts"]:
                events += 1
                seen = set(decompose(p.get("initial", "") + p.get("vowel", "") + p.get("final", "") + p.get("answer", "")))
                counter.update(seen)
        elif t == "jamo-grid":
            for it in st.get("items", []):
                events += 1
                counter.update(set(decompose(it.get("char", ""))))

print(f"Total interactive practice events: {events}")
print(f"Total per-letter exposure touches: {sum(counter.values())}\n")
print("Letter exposures (consonants):")
for j in "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ":
    flag = " <-- LOW" if counter[j] < 10 else ""
    print(f"  {j}: {counter[j]}{flag}")
print("\nLetter exposures (vowels):")
for j in JUNGSEONG:
    flag = " <-- LOW" if counter[j] < 8 else ""
    print(f"  {j}: {counter[j]}{flag}")
