#!/usr/bin/env python3
"""
Author real EPS-TOPIK-style picture-choice eps questions (imageOptions).

Format: a Korean prompt (reading sentence or listening script) with FOUR
PICTURES as the answer choices — the way questions 1–2 of the reading section
and the picture questions of the listening section appear on the real exam
(kLiFE taxonomy: picture→noun / picture→action / picture→tool).

Schema rules honoured (shared/lesson.ts):
  - imageOptions: exactly 4 {src, altBn, altKo, kind}
  - text `options` stays EMPTY for picture-choice questions
  - `answer` indexes into imageOptions (0–3)
  - listening picture questions keep a non-empty `passage` (the script)
"""
import glob
import json

KO_READING = "다음을 읽고 알맞은 그림을 고르십시오."
BN_READING = "লেখাটি পড়ে সঠিক ছবিটি বাছাই করুন।"
KO_LISTENING = "다음을 잘 듣고 알맞은 그림을 고르십시오."
BN_LISTENING = "অডিওটি শুনে সঠিক ছবিটি বাছাই করুন।"


def img(src_base, alt_bn, alt_ko):
    return {
        "src": f"/eps-images/{src_base}.svg",
        "altBn": alt_bn,
        "altKo": alt_ko,
        "captionBn": "",
        "kind": "illustration",
    }


NEW_QUESTIONS = {
    "lesson-06": [  # 하루 일과 — daily routine (listening picture-choice)
        {
            "id": "q21",
            "section": "listening",
            "questionBn": BN_LISTENING,
            "questionKo": KO_LISTENING,
            "passage": "(남) 퇴근 후에 피아노를 쳐요.",
            "options": [],
            "imageOptions": [
                img("action-eating", "কেউ খাবার খাচ্ছেন", "밥을 먹습니다"),
                img("action-meeting", "দুজন বন্ধু হাত মিলাচ্ছেন", "친구를 만납니다"),
                img("action-reading", "কেউ বই পড়ছেন", "책을 읽습니다"),
                img("action-piano", "কেউ পিয়ানো বাজাচ্ছেন", "피아노를 칩니다"),
            ],
            "answer": 3,
            "explanationBn": "অডিওতে বলা হয়েছে '퇴근 후에 피아노를 쳐요' (কাজ শেষে পিয়ানো বাজাই)—তাই পিয়ানো বাজানোর ছবিটি সঠিক।",
        },
        {
            "id": "q22",
            "section": "listening",
            "questionBn": BN_LISTENING,
            "questionKo": KO_LISTENING,
            "passage": "(여) 저는 아침에 일어나서 밥을 먹어요.",
            "options": [],
            "imageOptions": [
                img("action-piano", "কেউ পিয়ানো বাজাচ্ছেন", "피아노를 칩니다"),
                img("action-eating", "কেউ খাবার খাচ্ছেন", "밥을 먹습니다"),
                img("action-meeting", "দুজন বন্ধু হাত মিলাচ্ছেন", "친구를 만납니다"),
                img("action-reading", "কেউ বই পড়ছেন", "책을 읽습니다"),
            ],
            "answer": 1,
            "explanationBn": "'밥을 먹어요' (ভাত খাই)—তাই খাবার খাওয়ার ছবিটি সঠিক।",
        },
    ],
    "lesson-42": [  # 가구 제작 — woodworking (reading picture-choice, tools)
        {
            "id": "q21",
            "section": "reading",
            "questionBn": BN_READING,
            "questionKo": KO_READING,
            "passage": "못을 두드릴 때 망치를 사용합니다.",
            "options": [],
            "imageOptions": [
                img("obj-scissors", "কাঁচি", "가위"),
                img("tool-hammer", "হাতুড়ি", "망치"),
                img("tool-pliers", "প্লায়ার", "펜치"),
                img("obj-pen", "বলপয়েন্ট কলম", "볼펜"),
            ],
            "answer": 1,
            "explanationBn": "'망치' (হাতুড়ি) দিয়ে পেরেক ঠোকা হয়—তাই হাতুড়ির ছবিটি সঠিক।",
        },
        {
            "id": "q22",
            "section": "reading",
            "questionBn": BN_READING,
            "questionKo": KO_READING,
            "passage": "전선의 피복을 벗길 때 펜치를 사용합니다.",
            "options": [],
            "imageOptions": [
                img("obj-pen", "বলপয়েন্ট কলম", "볼펜"),
                img("tool-hammer", "হাতুড়ি", "망치"),
                img("tool-pliers", "প্লায়ার", "펜치"),
                img("obj-scissors", "কাঁচি", "가위"),
            ],
            "answer": 2,
            "explanationBn": "'펜치' (প্লায়ার) দিয়ে তারের আবরণ ছাঁটা হয়—তাই প্লায়ারের ছবিটি সঠিক।",
        },
    ],
    "lesson-45": [  # 작물 재배 — farming (reading picture-choice, machines)
        {
            "id": "q21",
            "section": "reading",
            "questionBn": BN_READING,
            "questionKo": KO_READING,
            "passage": "논을 갈 때 트랙터를 사용합니다.",
            "options": [],
            "imageOptions": [
                img("obj-tiller", "কৃষিযন্ত্র (টিলার)", "경운기"),
                img("obj-excavator", "খননযন্ত্র", "굴착기"),
                img("obj-tractor", "ট্রাক্টর", "트랙터"),
                img("obj-bag", "ব্যাগ", "가방"),
            ],
            "answer": 2,
            "explanationBn": "'트랙터' (ট্রাক্টর) দিয়ে জমি চাষ করা হয়—তাই ট্রাক্টরের ছবিটি সঠিক।",
        },
        {
            "id": "q22",
            "section": "reading",
            "questionBn": BN_READING,
            "questionKo": KO_READING,
            "passage": "밭을 곱게 갈 때 경운기를 사용합니다.",
            "options": [],
            "imageOptions": [
                img("obj-bag", "ব্যাগ", "가방"),
                img("obj-tiller", "কৃষিযন্ত্র (টিলার)", "경운기"),
                img("obj-excavator", "খননযন্ত্র", "굴착기"),
                img("obj-tractor", "ট্রাক্টর", "트랙터"),
            ],
            "answer": 1,
            "explanationBn": "'경운기' (টিলার) দিয়ে মাটি নরম ও ঝুরঝুরে করা হয়—তাই টিলারের ছবিটি সঠিক।",
        },
    ],
    "lesson-41": [  # 섬유 제조 — textile factory safety (reading picture-choice)
        {
            "id": "q21",
            "section": "reading",
            "questionBn": BN_READING,
            "questionKo": KO_READING,
            "passage": "불티가 튀는 작업장에서는 보안경을 씁니다.",
            "options": [],
            "imageOptions": [
                img("tool-vest", "প্রতিফলক নিরাপত্তা ভেস্ট", "반사 조끼"),
                img("obj-glasses", "নিরাপত্তা চশমা", "보안경"),
                img("tool-uniform", "কর্মপোশাক", "작업복"),
                img("obj-scissors", "কাঁচি", "가위"),
            ],
            "answer": 1,
            "explanationBn": "'보안경' (নিরাপত্তা চশমা) স্ফুলিঙ্গ থেকে চোখ রক্ষা করে—তাই চশমার ছবিটি সঠিক।",
        },
        {
            "id": "q22",
            "section": "reading",
            "questionBn": BN_READING,
            "questionKo": KO_READING,
            "passage": "작업할 때는 반사 조끼를 착용해야 합니다.",
            "options": [],
            "imageOptions": [
                img("tool-uniform", "কর্মপোশাক", "작업복"),
                img("obj-glasses", "নিরাপত্তা চশমা", "보안경"),
                img("tool-vest", "প্রতিফলক নিরাপত্তা ভেস্ট", "반사 조끼"),
                img("obj-scissors", "কাঁচি", "가위"),
            ],
            "answer": 2,
            "explanationBn": "'반사 조끼' (প্রতিফলক নিরাপত্তা ভেস্ট) পরলে কর্মক্ষেত্রে সহজে দেখা যায়—তাই ভেস্টের ছবিটি সঠিক।",
        },
    ],
    "lesson-12": [  # 대중교통 — commute objects (mixed picture-choice)
        {
            "id": "q21",
            "section": "listening",
            "questionBn": BN_LISTENING,
            "questionKo": KO_LISTENING,
            "passage": "(남) 출근길에 가방 안에 서류를 넣어요.",
            "options": [],
            "imageOptions": [
                img("item-clock", "দেয়াল ঘড়ি", "시계"),
                img("obj-bag", "ব্যাগ", "가방"),
                img("obj-glasses", "চশমা", "안경"),
                img("obj-pen", "বলপয়েন্ট কলম", "볼펜"),
            ],
            "answer": 1,
            "explanationBn": "'가방' (ব্যাগ)-এর ভেতরে কাগজপত্র রাখা হয়—তাই ব্যাগের ছবিটি সঠিক।",
        },
        {
            "id": "q22",
            "section": "reading",
            "questionBn": BN_READING,
            "questionKo": KO_READING,
            "passage": "버스는 아침 여섯 시 십 분에 출발합니다. 시계를 보고 나오세요.",
            "options": [],
            "imageOptions": [
                img("obj-bag", "ব্যাগ", "가방"),
                img("obj-pen", "বলপয়েন্ট কলম", "볼펜"),
                img("item-clock", "দেয়াল ঘড়ি", "시계"),
                img("obj-glasses", "চশমা", "안경"),
            ],
            "answer": 2,
            "explanationBn": "বাসের সময় মেনে চলতে '시계' (ঘড়ি) দেখতে হবে—তাই ঘড়ির ছবিটি সঠিক।",
        },
    ],
}

# Wrong alt text shipped earlier: obj-bag.svg is a bag, not a bicycle.
ALT_FIX = {"lesson-12": ("q02", "ব্যাগ", "가방")}


def main():
    changed = 0
    for lesson, questions in NEW_QUESTIONS.items():
        path = f"content/lessons/{lesson}.json"
        data = json.loads(open(path, encoding="utf-8").read())
        eps = data.setdefault("epsQuestions", [])
        existing = {q["id"] for q in eps}
        added = 0
        for q in questions:
            if q["id"] in existing:
                print(f"  skip {lesson}:{q['id']} (already present)")
                continue
            eps.append(q)
            added += 1
        fix = ALT_FIX.get(lesson)
        if fix:
            qid, alt_bn, alt_ko = fix
            for q in eps:
                if q["id"] == qid and q.get("image"):
                    if q["image"]["src"].endswith("obj-bag.svg") and q["image"]["altBn"] != alt_bn:
                        q["image"]["altBn"] = alt_bn
                        q["image"]["altKo"] = alt_ko
                        added += 1
        if added:
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)
                fh.write("\n")
            changed += 1
            print(f"{lesson}: +{added}")
    print(f"files changed: {changed}")


if __name__ == "__main__":
    main()
