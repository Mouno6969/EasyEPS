#!/usr/bin/env python3
"""Inject extra picture questions for culture/laws lessons under-covered by the first pass."""
import json
import re
import glob

LESSONS_DIR = "content/lessons"
IMG = "/eps-images"

EXTRA_QUESTIONS = [
    # Culture lessons: bibimbap / kimbap food pictures (daily-life vocab transfers),
    # and ticket/item identification fitting culture topics.
    {
        "lesson_matches": ["culture"],
        "section": "reading",
        "image": {"src": IMG + "/obj-bag.svg", "altBn": "ব্যাগের ছবি — লাগেজ/কাবান", "altKo": "가방", "kind": "illustration"},
        "questionKo": "여행할 때 짐을 넣는 것을 고르십시오.",
        "questionBn": "ভ্রমণের সময় জিনিসপত্র রাখার জন্য যা ব্যবহার করা হয়, সেটি বেছে নিন।",
        "options": ["볼펜", "가방", "안경", "가위"],
        "answer": 1,
        "explanationBn": "ছবিতে ব্যাগ (가방) আঁকা আছে — ভ্রমণের সময় জিনিসপত্র ব্যাগে রাখা হয়।",
    },
    {
        "lesson_matches": ["culture"],
        "section": "reading",
        "image": {"src": IMG + "/obj-glasses.svg", "altBn": "চশমার ছবি", "altKo": "안경", "kind": "illustration"},
        "questionKo": "눈이 잘 보이지 않을 때 쓰는 것을 고르십시오.",
        "questionBn": "চোখে ভালো না লাগলে যা পরা হয়, সেটি বেছে নিন।",
        "options": ["볼펜", "가방", "안경", "가위"],
        "answer": 2,
        "explanationBn": "ছবিতে চশমা (안경) আঁকা আছে।",
    },
    {
        "lesson_matches": ["culture"],
        "section": "listening",
        "image": {"src": IMG + "/obj-pen.svg", "altBn": "বলপেনের ছবি", "altKo": "볼펜", "kind": "illustration"},
        "questionKo": "그림을 보고 대화를 들은 후 알맞은 것을 고르십시오.",
        "questionBn": "ছবিতি দেখে কথোপকথন শুনে সঠিক উত্তরটি বেছে নিন।",
        "passage": "남: 이 선물은 어디에서 샀어요? / 여: 문구점에서 볼펜을 샀어요.",
        "options": ["문구점에서 샀어요.", "병원에서 샀어요.", "시장에서 샀어요.", "도서관에서 샀어요."],
        "answer": 0,
        "explanationBn": "কথোপকথনে বলা হয়েছে স্টেশনারি দোকান থেকে বলপেন কেনা হয়েছে — ছবিতেও বলপেন।",
    },
    # Laws lessons: identification + reading of prohibition items
    {
        "lesson_matches": ["laws"],
        "section": "reading",
        "image": {"src": IMG + "/sign-no-passage.svg", "altBn": "চলাচল নিষেধের চিহ্ন", "altKo": "통행금지", "kind": "safety-sign"},
        "questionKo": "이 표지판의 뜻을 고르십시오.",
        "questionBn": "এই চিহ্নের অর্থ বেছে নিন।",
        "options": ["여기서 쉬기", "이 길로 통행 금지", "여기서 식사하기", "이 길로 통행하기"],
        "answer": 1,
        "explanationBn": "চিহ্নটি চলাচল নিষেধ (통행금지) বোঝায় — 'এই পথ দিয়ে যাওয়া যায় না'।",
    },
    {
        "lesson_matches": ["laws"],
        "section": "reading",
        "image": {"src": IMG + "/tool-uniform.svg", "altBn": "কাজের পোশাকের ছবি", "altKo": "작업복", "kind": "illustration"},
        "questionKo": "다음 그림의 물건을 고르십시오. 근로자가 작업장에서 입는 옷입니다.",
        "questionBn": "নিচের ছবির জিনিসটি বেছে নিন। শ্রমিকরা কাজের জায়গায় যে পোশাক পরে।",
        "options": ["컴퓨터", "작업복", "비빔밥", "기차표"],
        "answer": 1,
        "explanationBn": "ছবিতে কাজের পোশাক (작업복) আঁকা আছে।",
    },
    {
        "lesson_matches": ["laws"],
        "section": "listening",
        "image": {"src": IMG + "/item-clock.svg", "altBn": "ঘড়ির ছবি — ৯টা বাজছে", "altKo": "오전 아홉 시", "kind": "illustration"},
        "questionKo": "그림을 보고 대화를 들은 후 알맞은 것을 고르십시오.",
        "questionBn": "ছবিতি দেখে কথোপকথন শুনে সঠিক উত্তরটি বেছে নিন।",
        "passage": "남: 공장 일하는 시간은 몇 시부터예요? / 여: 오전 아홉 시부터예요.",
        "options": ["아침 일곱 시", "오전 아홉 시", "오후 두 시", "밤 열 시"],
        "answer": 1,
        "explanationBn": "কথোপকথনে বলা হয়েছে সকাল ৯টা থেকে কাজ শুরু, ছবিতেও ঘড়ি ৯টা দেখাচ্ছে।",
    },
]


def next_ids(lesson):
    ids = set()
    for q in lesson.get("epsQuestions", []):
        m = re.match(r"^p(\d+)$", q.get("id", ""))
        if m:
            ids.add(int(m.group(1)))
    n = 1
    while n in ids:
        n += 1
    return n


def main():
    lessons = [(f, json.load(open(f))) for f in sorted(glob.glob(f"{LESSONS_DIR}/*.json"))]
    added = 0
    for path, lesson in lessons:
        category = lesson.get("category", "")
        questions = lesson.get("epsQuestions", [])
        before = len(questions)
        used_images = {q.get("image", {}).get("src") for q in questions if q.get("image")}
        n = next_ids(lesson)
        injected = []
        for qdef in EXTRA_QUESTIONS:
            if category not in qdef["lesson_matches"]:
                continue
            if qdef["image"]["src"] in used_images:
                continue
            q = {
                "id": f"p{n}",
                "section": qdef["section"],
                "questionBn": qdef["questionBn"],
                "questionKo": qdef["questionKo"],
                "image": qdef["image"],
                "options": qdef["options"],
                "answer": qdef["answer"],
                "explanationBn": qdef["explanationBn"],
            }
            if qdef.get("passage"):
                q["passage"] = qdef["passage"]
            injected.append(q)
            used_images.add(qdef["image"]["src"])
            n += 1
            added += 1
        if injected:
            questions = questions + injected
            over = len(questions) - 20
            if over > 0:
                keep_pic = [q for q in questions if q.get("image")]
                drop_count = min(over, len(questions) - len(keep_pic))
                removed = 0
                trimmed = []
                for q in questions:
                    if not q.get("image") and removed < drop_count:
                        removed += 1
                        continue
                    trimmed.append(q)
                questions = trimmed[:20]
            lesson["epsQuestions"] = questions
            json.dump(lesson, open(path, "w"), ensure_ascii=False, indent=2)
            print(f"{path.split('/')[-1]}: {before} -> {len(questions)} (+{len(questions)-before})")
    print(f"Total injected: {added}")


if __name__ == "__main__":
    main()
