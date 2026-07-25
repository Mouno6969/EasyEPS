#!/usr/bin/env python3
"""
Fix Hangul basics pedagogy gaps:
1. Syllable-block geometry lesson
2. Seven batchim realization sounds
3. Plain / aspirated / tense minimal-pair drills (Bangla gap)
4. Defer 경음화; replace advanced vocab with beginner examples
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

MOD = Path(__file__).resolve().parents[1] / "content" / "basics" / "modules"


def load(name: str) -> dict:
    return json.loads((MOD / f"{name}.json").read_text(encoding="utf-8"))


def save(name: str, data: dict) -> None:
    (MOD / f"{name}.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def insert_after(steps: list, after_id: str, new_step: dict) -> list:
    out = []
    for step in steps:
        out.append(step)
        if step.get("id") == after_id:
            out.append(new_step)
    # If after_id missing, append
    if not any(s.get("id") == new_step["id"] for s in out):
        out.append(new_step)
    return out


def replace_step(steps: list, step_id: str, new_step: dict) -> list:
    return [new_step if s.get("id") == step_id else s for s in steps]


def remove_step(steps: list, step_id: str) -> list:
    return [s for s in steps if s.get("id") != step_id]


def upsert_required(req: dict, add: list[str], remove: list[str] | None = None) -> dict:
    ids = list(req.get("requiredStepIds", []))
    remove = remove or []
    ids = [i for i in ids if i not in remove]
    for a in add:
        if a not in ids:
            # insert near related content if possible
            ids.append(a)
    req["requiredStepIds"] = ids
    return req


# ---------------------------------------------------------------------------
# 1) Syllable geometry
# ---------------------------------------------------------------------------

SY_GEOMETRY = {
    "id": "sy-geometry",
    "type": "explain",
    "title": {
        "bn": "অক্ষর ব্লকের জ্যামিতি (어떻게 লেখা হয়?)",
        "ko": "음절 블록 배치",
        "en": "Syllable-block geometry",
    },
    "body": {
        "bn": [
            "হ্যাঙ্গুল অক্ষর একটি ‘ব্লক’ — বাংলা/ইংরেজির মতো এক লাইনে আলাদা অক্ষর নয়। প্রতি ব্লকে: (১) শুরুর ব্যঞ্জন, (২) স্বর, (৩) চাইলে নিচে ব্যাচিম।",
            "স্বরের আকৃতি অনুসারে ব্লকের ভিতরের লেআউট বদলায়। খাড়া স্বর (ㅏ ㅑ ㅓ ㅕ ㅣ): ব্যঞ্জন বামে, স্বর ডানে। উদাহরণ: 가 = ㄱ|ㅏ, 너 = ㄴ|ㅓ, 미 = ㅁ|ㅣ।",
            "শুয়ে থাকা স্বর (ㅗ ㅛ ㅜ ㅠ ㅡ): ব্যঞ্জন উপরে, স্বর নিচে। উদাহরণ: 고 = ㄱ/ㅗ, 수 = ㅅ/ㅜ, 그 = ㄱ/ㅡ।",
            "যৌগিক স্বর (ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ…): ব্লক আরও জটিল — সাধারণত ব্যঞ্জন + স্বর-গুচ্ছ একসাথে। যেমন: 와, 위, 의।",
            "ব্যাচিম থাকলে সবসময় ব্লকের সবচেয়ে নিচে বসে: 간, 문, 밥। মনে রাখুন: লেখা ‘উপর→বাম→ডান→নিচ’ ক্রমে, পড়া এক ব্লক = এক অক্ষর।",
            "অনুশীলন টিপ: 가 / 고 / 간 তুলনা করুন — একই ㄱ, কিন্তু স্বরের দিক ও ব্যাচিম থাকায় ব্লকের আকৃতি আলাদা।",
        ],
        "en": [
            "Hangul is written in syllable blocks, not a linear alphabet chain. Each block has: (1) initial consonant, (2) vowel, (3) optional final batchim.",
            "Vertical vowels (ㅏㅑㅓㅕㅣ) sit to the right of the initial: 가, 너, 미.",
            "Horizontal vowels (ㅗㅛㅜㅠㅡ) sit under the initial: 고, 수, 그.",
            "Compound vowels (ㅘ ㅟ ㅢ …) form denser blocks: 와, 위, 의.",
            "Batchim always goes at the bottom of the block: 간, 문, 밥. Writing order is top/left → right → bottom; one block = one syllable.",
            "Compare 가 / 고 / 간 — same ㄱ, different geometry from vowel direction and batchim.",
        ],
        "ko": [
            "한글은 음절 블록으로 씁니다. 초성+중성(+종성).",
            "세로 모음(ㅏㅑㅓㅕㅣ)은 초성 오른쪽: 가, 너, 미.",
            "가로 모음(ㅗㅛㅜㅠㅡ)은 초성 아래: 고, 수, 그.",
            "복합 모음은 더 복잡한 블록: 와, 위, 의.",
            "받침은 항상 블록 맨 아래: 간, 문, 밥.",
            "가/고/간을 비교해 배치 차이를 익히세요.",
        ],
    },
}


def fix_syllables() -> None:
    m = load("syllables")
    # Avoid duplicate if re-run
    m["steps"] = [s for s in m["steps"] if s.get("id") != "sy-geometry"]
    m["steps"] = insert_after(m["steps"], "sy-intro", SY_GEOMETRY)
    m["requirements"] = upsert_required(m["requirements"], ["sy-geometry"])
    # Keep geometry before builders in required list order
    order = ["sy-intro", "sy-geometry", "sy-builder", "sy-builder-2", "sy-quiz", "sy-drill"]
    cur = m["requirements"]["requiredStepIds"]
    m["requirements"]["requiredStepIds"] = [x for x in order if x in cur] + [
        x for x in cur if x not in order
    ]
    m["estimatedMinutes"] = max(m.get("estimatedMinutes", 35), 40)
    save("syllables", m)
    print("syllables: added sy-geometry")


# ---------------------------------------------------------------------------
# 2 + 4) Batchim: 7 sounds; remove early advanced tensification
# ---------------------------------------------------------------------------

B_SEVEN = {
    "id": "b-seven-sounds",
    "type": "explain",
    "title": {
        "bn": "৭টি ব্যাচিম ধ্বনি (সবচেয়ে গুরুত্বপূর্ণ নিয়ম)",
        "ko": "받침 7개 소리",
        "en": "The 7 batchim sounds",
    },
    "body": {
        "bn": [
            "লেখার সময় অনেক ব্যঞ্জন ব্যাচিম হতে পারে, কিন্তু শেষে উচ্চারণে মাত্র ৭টি ধ্বনি থাকে। এটা বাংলাভাষীদের জন্য সবচেয়ে গুরুত্বপূর্ণ ‘রিডাকশন’ নিয়ম।",
            "১) [ক্] ㄱ ㅋ ㄲ → উদাহরণ: 국, 부엌, 밖",
            "২) [ন্] ㄴ → 문, 산",
            "৩) [ত্] ㄷ ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ → 곧, 옷, 있다, 낮, 꽃, 밭, 히읗-ব্যাচিম শব্দ",
            "৪) [ল্] ㄹ → 달, 말",
            "৫) [ম্] ㅁ → 밤, 감",
            "৬) [প্] ㅂ ㅍ → 밥, 앞",
            "৭) [ং] ㅇ → 방, 강",
            "টিপ: 부엌 লেখায় ㅋ, কিন্তু শোনায় [부억]≈‘পুঅক’ — লেখার অক্ষর ≠ শেষ ধ্বনি। আগে ৭ ধ্বনি আয়ত্ত করুন; কঠিন 경음화 (경음화) পরে শিখব।",
        ],
        "en": [
            "Many letters can be written as batchim, but they surface as only seven coda sounds. This reduction is essential for beginners.",
            "1) [k] ㄱ ㅋ ㄲ — 국, 부엌, 밖",
            "2) [n] ㄴ — 문, 산",
            "3) [t] ㄷ ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ — 곧, 옷, 낮, 꽃, 밭",
            "4) [l] ㄹ — 달, 말",
            "5) [m] ㅁ — 밤, 감",
            "6) [p] ㅂ ㅍ — 밥, 앞",
            "7) [ng] ㅇ — 방, 강",
            "Tip: 부엌 is written with ㅋ but ends in the [k] sound. Master these seven sounds first; tensification comes later.",
        ],
        "ko": [
            "받침 글자는 많아도 소리로는 7개입니다.",
            "ㄱ/ㅋ/ㄲ→[ㄱ], ㄴ→[ㄴ], ㄷㅅㅆㅈㅊㅌㅎ→[ㄷ], ㄹ→[ㄹ], ㅁ→[ㅁ], ㅂㅍ→[ㅂ], ㅇ→[ㅇ].",
            "예: 국, 문, 옷, 달, 밤, 밥, 방.",
            "먼저 7소리를 익히고, 경음화는 나중에 배웁니다.",
        ],
    },
}

B_LINKING_LIGHT = {
    "id": "b-linking",
    "type": "explain",
    "title": {
        "bn": "সহজ লিংকিং (연음) — শুধু ㅇ থাকলে",
        "ko": "쉬운 연음",
        "en": "Light linking before ㅇ",
    },
    "body": {
        "bn": [
            "যখন পরের অক্ষর ㅇ দিয়ে শুরু (স্বরধ্বনি), ব্যাচিমের ধ্বনি পরের অক্ষরে চলে যায়। এটাই লিংকিং।",
            "সহজ উদাহরণ: 한국어 → [한구거], 음악 → [으막], 옷이 → [오시]।",
            "এখন শুধু এই সহজ কেস মনে রাখুন। কঠিন 경음화 (학교, 있다 টাইপ) স্পিক-ল্যাবে পরে আসবে — এখন 돋보기/잡지 শেখার দরকার নেই।",
        ],
        "en": [
            "If the next syllable starts with ㅇ (vowel onset), the batchim sound moves over (linking).",
            "Easy examples: 한국어→[한구거], 음악→[으막], 옷이→[오시].",
            "Skip advanced tensification vocabulary for now; you will meet a short 경음화 intro later in Speak Lab with easy words only.",
        ],
        "ko": [
            "다음 음절이 ㅇ으로 시작하면 받침 소리가 넘어갑니다.",
            "예: 한국어=[한구거], 음악=[으막], 옷이=[오시].",
            "어려운 경음화 단어는 나중(Speak Lab)에 쉬운 예로만 다룹니다.",
        ],
    },
}

BEGINNER_BATCHIM_SPEAK = [
    {"id": "b-sp-k", "text": "국", "romanization": "guk", "audioText": "국", "bn": "কুক — স্যুপ [ক্]", "en": "soup [k]"},
    {"id": "b-sp-n", "text": "문", "romanization": "mun", "audioText": "문", "bn": "মুন — দরজা [ন্]", "en": "door [n]"},
    {"id": "b-sp-t", "text": "옷", "romanization": "ot", "audioText": "옷", "bn": "ওত — কাপড় [ত্]", "en": "clothes [t]"},
    {"id": "b-sp-l", "text": "달", "romanization": "dal", "audioText": "달", "bn": "তাল — চাঁদ [ল্]", "en": "moon [l]"},
    {"id": "b-sp-m", "text": "밤", "romanization": "bam", "audioText": "밤", "bn": "পাম — রাত [ম্]", "en": "night [m]"},
    {"id": "b-sp-p", "text": "밥", "romanization": "bap", "audioText": "밥", "bn": "পাপ — ভাত [প্]", "en": "rice/meal [p]"},
    {"id": "b-sp-ng", "text": "방", "romanization": "bang", "audioText": "방", "bn": "পাং — ঘর [ং]", "en": "room [ng]"},
    {"id": "b-sp-kk", "text": "밖", "romanization": "bak", "audioText": "밖", "bn": "পাক — বাইরে (ㄲ→[ক্])", "en": "outside (ㄲ→[k])"},
    {"id": "b-sp-ch", "text": "꽃", "romanization": "kkot", "audioText": "꽃", "bn": "ক্কোত — ফুল (ㅊ→[ত্])", "en": "flower (ㅊ→[t])"},
    {"id": "b-sp-link", "text": "한국어", "romanization": "han-gu-geo", "audioText": "한국어", "bn": "হানগুগও — লিংকিং [한구거]", "en": "Korean language [linking]"},
]

SEVEN_SOUND_QUIZ = [
    {
        "id": "b-q1",
        "kind": "multiple-choice",
        "promptBn": "간-এর batchim (받침)?",
        "promptKo": "",
        "promptEn": "Batchim letter in 간?",
        "options": ["ㄱ", "ㄴ", "ㅏ", "ㅇ"],
        "pairs": [],
        "answer": 1,
        "explanationBn": "간-এর ব্যাচিম ㄴ, ধ্বনি [ন্]।",
        "topic": "batchim",
    },
    {
        "id": "b-q2",
        "kind": "multiple-choice",
        "promptBn": "가-তে ব্যাচিম আছে কি?",
        "promptKo": "",
        "promptEn": "",
        "options": ["হ্যাঁ", "না", "ㄱ", "ㅇ"],
        "pairs": [],
        "answer": 1,
        "explanationBn": "가-তে কোনো ব্যাচিম নেই।",
        "topic": "batchim",
    },
    {
        "id": "b-q3",
        "kind": "multiple-choice",
        "promptBn": "ব্যাচিম অক্ষর ব্লকের কোথায় বসে?",
        "promptKo": "",
        "promptEn": "",
        "options": ["উপরে", "নীচে", "বাইরে", "বামে"],
        "pairs": [],
        "answer": 1,
        "explanationBn": "ব্যাচিম ব্লকের নীচে বসে।",
        "topic": "batchim",
    },
    {
        "id": "b-q4",
        "kind": "multiple-choice",
        "promptBn": "ব্যাচিম উচ্চারণে মোট কয়টি ধ্বনি?",
        "promptKo": "",
        "promptEn": "How many batchim surface sounds?",
        "options": ["১৪", "৭", "১৯", "৩"],
        "pairs": [],
        "answer": 1,
        "explanationBn": "লেখার অক্ষর অনেক, কিন্তু শেষ ধ্বনি মাত্র ৭টি।",
        "topic": "batchim",
    },
    {
        "id": "b-q5",
        "kind": "multiple-choice",
        "promptBn": "옷-এর শেষ ধ্বনি কোন গ্রুপ?",
        "promptKo": "",
        "promptEn": "",
        "options": ["[ক্]", "[ত্]", "[প্]", "[ং]"],
        "pairs": [],
        "answer": 1,
        "explanationBn": "ㅅ ব্যাচিম → [ত্] গ্রুপ (ㄷㅅㅈㅊㅌㅎ…)।",
        "topic": "batchim",
    },
    {
        "id": "b-q6",
        "kind": "multiple-choice",
        "promptBn": "부엌-এর শেষ ধ্বনি?",
        "promptKo": "",
        "promptEn": "",
        "options": ["[খ্] আলাদা", "[ক্] (ㄱㅋㄲ গ্রুপ)", "[ত্]", "[ং]"],
        "pairs": [],
        "answer": 1,
        "explanationBn": "ㅋ ব্যাচিমও [ক্] গ্রুপে পড়ে — লেখার ㅋ ≠ আলাদা শেষ ধ্বনি।",
        "topic": "batchim",
    },
    {
        "id": "b-q7",
        "kind": "matching",
        "promptBn": "শব্দ ও ৭-ধ্বনি গ্রুপ মেলান",
        "promptKo": "",
        "promptEn": "Match word to surface sound",
        "options": [],
        "pairs": [
            {"left": "국", "right": "[ক্]"},
            {"left": "문", "right": "[ন্]"},
            {"left": "밥", "right": "[প্]"},
            {"left": "방", "right": "[ং]"},
        ],
        "answer": 0,
        "explanationBn": "৭টি সারফেস ধ্বনি: ক্ ন্ ত্ ল্ ম্ প্ ং।",
        "topic": "batchim",
    },
    {
        "id": "b-q8",
        "kind": "multiple-choice",
        "promptBn": "꽃-এর লেখা ব্যাচিম ㅊ — শোনায় কোন গ্রুপ?",
        "promptKo": "",
        "promptEn": "",
        "options": ["[ছ্] আলাদা", "[ত্]", "[ক্]", "[ং]"],
        "pairs": [],
        "answer": 1,
        "explanationBn": "ㅊ ব্যাচিমও [ত্] গ্রুপ।",
        "topic": "batchim",
    },
    {
        "id": "b-q9",
        "kind": "listen-choice",
        "promptBn": "শুনে সঠিক শব্দ বেছে নিন",
        "promptKo": "",
        "promptEn": "",
        "listenText": "밥",
        "options": ["바", "반", "밤", "밥"],
        "pairs": [],
        "answer": 3,
        "explanationBn": "밥 = [প্] ব্যাচিম।",
        "topic": "batchim",
    },
    {
        "id": "b-q10",
        "kind": "listen-choice",
        "promptBn": "শুনে সঠিক শব্দ বেছে নিন",
        "promptKo": "",
        "promptEn": "",
        "listenText": "방",
        "options": ["바", "반", "방", "밤"],
        "pairs": [],
        "answer": 2,
        "explanationBn": "방 = [ং] ব্যাচিম।",
        "topic": "batchim",
    },
    {
        "id": "b-q11",
        "kind": "multiple-choice",
        "promptBn": "한국어-এর লিংকিং উচ্চারণ?",
        "promptKo": "",
        "promptEn": "",
        "options": ["[한국어]", "[한구거]", "[한구고]", "[항우거]"],
        "pairs": [],
        "answer": 1,
        "explanationBn": "ㅇ-শুরু পরের অক্ষরে ব্যাচিম চলে যায় → [한구거]।",
        "topic": "batchim",
    },
    {
        "id": "b-q12",
        "kind": "matching",
        "promptBn": "লেখা ব্যাচিম → শোনার গ্রুপ",
        "promptKo": "",
        "promptEn": "",
        "options": [],
        "pairs": [
            {"left": "ㅋ/ㄲ", "right": "[ক্]"},
            {"left": "ㅅ/ㅊ/ㅌ", "right": "[ত্]"},
            {"left": "ㅍ", "right": "[প্]"},
            {"left": "ㅇ", "right": "[ং]"},
        ],
        "answer": 0,
        "explanationBn": "অনেক লেখা অক্ষর → মাত্র ৭ শোনার ধ্বনি।",
        "topic": "batchim",
    },
]


def fix_batchim() -> None:
    m = load("batchim")
    # Rewrite intro to stay beginner and point to 7 sounds
    for step in m["steps"]:
        if step.get("id") == "b-explain":
            step["body"] = {
                "bn": [
                    "ব্যাচিম (받침) = অক্ষর ব্লকের নিচে বসা ব্যঞ্জন। উদাহরণ: 간, 문, 밥।",
                    "এখন লক্ষ্য: ব্যাচিম চিনতে পারা + শেষ ধ্বনি বোঝা। জোড় ব্যাচিম (앉다, 없다) পরে ধীরে শিখব।",
                    "গুরুত্বপূর্ণ: লেখার অক্ষর আর শোনার ধ্বনি এক নাও হতে পারে — পরের ধাপে ৭টি ধ্বনির নিয়ম শিখবেন।",
                    "এই মডিউলে কঠিন 경음화 (경음화) বা 돋보기/잡지 টাইপ শব্দ নেই — সেগুলো স্পিক-ল্যাবে সহজ উদাহরণে পরে আসবে।",
                ],
                "en": [
                    "Batchim is the final consonant at the bottom of a syllable block: 간, 문, 밥.",
                    "Goal now: recognize batchim and its surface sound. Double batchim comes later.",
                    "Spelling letter ≠ always the sound you hear — next step teaches the 7 surface sounds.",
                    "No heavy tensification vocabulary here (no 돋보기/잡지). A light intro comes later in Speak Lab.",
                ],
                "ko": [
                    "받침은 음절 아래 자음입니다. 예: 간, 문, 밥.",
                    "지금은 받침 인식과 7소리 규칙이 목표입니다.",
                    "어려운 경음화 단어는 Speak Lab에서 쉬운 예로 다룹니다.",
                ],
            }

    # Remove old tensification step; insert 7-sounds + light linking
    m["steps"] = remove_step(m["steps"], "b-tense")
    m["steps"] = [s for s in m["steps"] if s.get("id") not in ("b-seven-sounds", "b-linking")]
    m["steps"] = insert_after(m["steps"], "b-explain", B_SEVEN)
    m["steps"] = insert_after(m["steps"], "b-seven-sounds", B_LINKING_LIGHT)

    # Replace speak items with beginner 7-sound set
    for step in m["steps"]:
        if step.get("id") == "b-speak" and step.get("type") == "speak":
            step["items"] = BEGINNER_BATCHIM_SPEAK
            step["minListens"] = 2

    # Replace hand-authored quiz items in b-quiz with seven-sound focused ones;
    # keep generated bank items (prefixed) for volume.
    for step in m["steps"]:
        if step.get("id") == "b-quiz" and step.get("type") == "quiz":
            generated = [q for q in step["questions"] if q["id"].startswith("bat-")]
            # Drop generated items that still push advanced tensification prompts
            filtered = []
            banned = ("돋보기", "잡지", "문법", "입상", "손수건", "십분", "듣다", "입다")
            for q in generated:
                blob = json.dumps(q, ensure_ascii=False)
                if any(b in blob for b in banned):
                    continue
                filtered.append(q)
            step["questions"] = SEVEN_SOUND_QUIZ + filtered
            # ensure drawCount still valid
            if step.get("drawCount") and step["drawCount"] > len(step["questions"]):
                step["drawCount"] = min(12, len(step["questions"]))

        if step.get("id") == "b-drill" and step.get("type") == "quiz":
            # Soft-filter advanced tensification from generated drill bank
            banned = ("돋보기", "잡지", "문법", "입상", "손수건", "십분")
            step["questions"] = [
                q
                for q in step["questions"]
                if not any(b in json.dumps(q, ensure_ascii=False) for b in banned)
            ]
            # Ensure enough seven-sound listen items remain
            extras = [
                {
                    "id": "b-d-extra-1",
                    "kind": "multiple-choice",
                    "promptBn": "밖-এর শেষ ধ্বনি গ্রুপ?",
                    "promptKo": "",
                    "promptEn": "",
                    "options": ["[প্]", "[ক্]", "[ত্]", "[ং]"],
                    "pairs": [],
                    "answer": 1,
                    "explanationBn": "ㄲ ব্যাচিম → [ক্]।",
                    "topic": "batchim",
                },
                {
                    "id": "b-d-extra-2",
                    "kind": "listen-choice",
                    "promptBn": "শুনে সঠিক শব্দ",
                    "promptKo": "",
                    "promptEn": "",
                    "listenText": "달",
                    "options": ["다", "단", "달", "담"],
                    "pairs": [],
                    "answer": 2,
                    "explanationBn": "달 = [ল্]।",
                    "topic": "batchim",
                },
                {
                    "id": "b-d-extra-3",
                    "kind": "listen-choice",
                    "promptBn": "শুনে সঠিক শব্দ",
                    "promptKo": "",
                    "promptEn": "",
                    "listenText": "국",
                    "options": ["구", "군", "굴", "국"],
                    "pairs": [],
                    "answer": 3,
                    "explanationBn": "국 = [ক্]।",
                    "topic": "batchim",
                },
            ]
            existing = {q["id"] for q in step["questions"]}
            for q in extras:
                if q["id"] not in existing:
                    step["questions"].append(q)
            if step.get("drawCount") and step["drawCount"] > len(step["questions"]):
                step["drawCount"] = min(12, len(step["questions"]))

    m["requirements"] = upsert_required(
        m["requirements"],
        add=["b-seven-sounds", "b-linking"],
        remove=["b-tense"],
    )
    # Order required steps
    order = ["b-explain", "b-seven-sounds", "b-linking", "b-speak", "b-quiz", "b-drill"]
    cur = m["requirements"]["requiredStepIds"]
    m["requirements"]["requiredStepIds"] = [x for x in order if x in cur] + [
        x for x in cur if x not in order
    ]
    m["requirements"]["minSpeakItems"] = min(8, len(BEGINNER_BATCHIM_SPEAK))
    m["estimatedMinutes"] = max(m.get("estimatedMinutes", 30), 35)
    save("batchim", m)
    print("batchim: 7-sounds, light linking, removed early tensification")


# ---------------------------------------------------------------------------
# 3) Plain / aspirated / tense minimal pairs (consonants)
# ---------------------------------------------------------------------------

C_CONTRAST = {
    "id": "c-contrast",
    "type": "explain",
    "title": {
        "bn": "তিন স্তর: সাধারণ / শ্বাসযুক্ত / টানটান (বাংলায় নেই)",
        "ko": "평음·격음·된소리",
        "en": "Plain · aspirated · tense (new for Bangla speakers)",
    },
    "body": {
        "bn": [
            "বাংলায় সাধারণত দুই স্তরের বিপরীত (যেমন ক/খ) থাকে। কোরিয়ানে একই জায়গায় প্রায়ই তিন স্তর: 평음 (সাধারণ) · 격음 (শ্বাসযুক্ত) · 된소리 (টানটান)।",
            "ক্লাসিক ত্রিপল: ㄱ/ㅋ/ㄲ · ㄷ/ㅌ/ㄸ · ㅂ/ㅍ/ㅃ · ㅈ/ㅊ/ㅉ · এবং ㅅ/ㅆ (দুই স্তর)।",
            "উদাহরণ মিনিমাল পেয়ার: 다 / 타 / 따 — তিনটার অর্থ আলাদা হতে পারে; বাংলা ‘ত/থ’ দিয়ে এক করে ফেলবেন না।",
            "আরও: 가/카/까, 바/파/빠, 자/차/짜, 사/싸। কান দিয়ে আলাদা করুন: সাধারণ (কম শ্বাস) · শ্বাসযুক্ত (বাতাস বেরোয়) · টানটান (গলা/জিভ শক্ত, কম বাতাস)।",
            "টিপ: হাতের তালু মুখের সামনে রেখে 타/카/파 বলুন — শ্বাস বেশি লাগবে; 따/까/빠-তে শ্বাস কম কিন্তু পেশী টানটান।",
        ],
        "en": [
            "Bangla usually contrasts two series; Korean often has three: plain (평음), aspirated (격음), tense (된소리).",
            "Triples: ㄱ/ㅋ/ㄲ, ㄷ/ㅌ/ㄸ, ㅂ/ㅍ/ㅃ, ㅈ/ㅊ/ㅉ, plus ㅅ/ㅆ.",
            "Minimal set: 다 / 타 / 따 — do not merge them into one Bangla ‘t/th’.",
            "Also drill: 가/카/까, 바/파/빠, 자/차/짜, 사/싸.",
            "Hand test: more air on aspirated; tense feels tight with less air.",
        ],
        "ko": [
            "한국어는 평음·격음·된소리 3단 대립이 있습니다.",
            "다/타/따, 가/카/까, 바/파/빠, 자/차/짜, 사/싸를 구분해 들으세요.",
            "격음은 숨이 많고, 된소리는 긴장되고 숨이 적습니다.",
        ],
    },
}

C_SPEAK_PAIRS = {
    "id": "c-speak-pairs",
    "type": "speak",
    "minListens": 2,
    "items": [
        {"id": "c-mp-da", "text": "다", "romanization": "da", "audioText": "다", "bn": "দা — সাধারণ ㄷ", "en": "plain ㄷ"},
        {"id": "c-mp-ta", "text": "타", "romanization": "ta", "audioText": "타", "bn": "থা — শ্বাসযুক্ত ㅌ", "en": "aspirated ㅌ"},
        {"id": "c-mp-tta", "text": "따", "romanization": "tta", "audioText": "따", "bn": "ত্তা — টানটান ㄸ", "en": "tense ㄸ"},
        {"id": "c-mp-ga", "text": "가", "romanization": "ga", "audioText": "가", "bn": "গা — সাধারণ ㄱ", "en": "plain ㄱ"},
        {"id": "c-mp-ka", "text": "카", "romanization": "ka", "audioText": "카", "bn": "খা — শ্বাসযুক্ত ㅋ", "en": "aspirated ㅋ"},
        {"id": "c-mp-kka", "text": "까", "romanization": "kka", "audioText": "까", "bn": "ক্কা — টানটান ㄲ", "en": "tense ㄲ"},
        {"id": "c-mp-ba", "text": "바", "romanization": "ba", "audioText": "바", "bn": "বা — সাধারণ ㅂ", "en": "plain ㅂ"},
        {"id": "c-mp-pa", "text": "파", "romanization": "pa", "audioText": "파", "bn": "ফা — শ্বাসযুক্ত ㅍ", "en": "aspirated ㅍ"},
        {"id": "c-mp-ppa", "text": "빠", "romanization": "ppa", "audioText": "빠", "bn": "প্পা — টানটান ㅃ", "en": "tense ㅃ"},
        {"id": "c-mp-ja", "text": "자", "romanization": "ja", "audioText": "자", "bn": "জা — সাধারণ ㅈ", "en": "plain ㅈ"},
        {"id": "c-mp-cha", "text": "차", "romanization": "cha", "audioText": "차", "bn": "ছা — শ্বাসযুক্ত ㅊ", "en": "aspirated ㅊ"},
        {"id": "c-mp-jja", "text": "짜", "romanization": "jja", "audioText": "짜", "bn": "চ্চা — টানটান ㅉ", "en": "tense ㅉ"},
        {"id": "c-mp-sa", "text": "사", "romanization": "sa", "audioText": "사", "bn": "সা/ছা — সাধারণ ㅅ", "en": "plain ㅅ"},
        {"id": "c-mp-ssa", "text": "싸", "romanization": "ssa", "audioText": "싸", "bn": "স্সা — টানটান ㅆ", "en": "tense ㅆ"},
    ],
    "fallbackQuizIds": [],
}

PAIR_QUIZ_EXTRAS = [
    {
        "id": "c-pair-q1",
        "kind": "listen-choice",
        "promptBn": "শুনে বেছে নিন: সাধারণ / শ্বাসযুক্ত / টানটান — কোনটি?",
        "promptKo": "",
        "promptEn": "",
        "listenText": "따",
        "options": ["다", "타", "따", "나"],
        "pairs": [],
        "answer": 2,
        "explanationBn": "따 = টানটান ㄸ। বাংলা ‘ত’ দিয়ে মিলাবেন না।",
        "topic": "jamo",
    },
    {
        "id": "c-pair-q2",
        "kind": "listen-choice",
        "promptBn": "শুনে সঠিকটি বেছে নিন",
        "promptKo": "",
        "promptEn": "",
        "listenText": "타",
        "options": ["다", "타", "따", "라"],
        "pairs": [],
        "answer": 1,
        "explanationBn": "타 = শ্বাসযুক্ত ㅌ (বেশি বাতাস)।",
        "topic": "jamo",
    },
    {
        "id": "c-pair-q3",
        "kind": "multiple-choice",
        "promptBn": "다 / 타 / 따 — কোনটি টানটান (된소리)?",
        "promptKo": "",
        "promptEn": "",
        "options": ["다", "타", "따", "나"],
        "pairs": [],
        "answer": 2,
        "explanationBn": "따 (ㄸ) টানটান; 타 শ্বাসযুক্ত; 다 সাধারণ।",
        "topic": "jamo",
    },
    {
        "id": "c-pair-q4",
        "kind": "multiple-choice",
        "promptBn": "가 / 카 / 까 — কোনটি শ্বাসযুক্ত (격음)?",
        "promptKo": "",
        "promptEn": "",
        "options": ["가", "카", "까", "나"],
        "pairs": [],
        "answer": 1,
        "explanationBn": "카 (ㅋ) শ্বাসযুক্ত।",
        "topic": "jamo",
    },
    {
        "id": "c-pair-q5",
        "kind": "listen-choice",
        "promptBn": "শুনে সঠিকটি",
        "promptKo": "",
        "promptEn": "",
        "listenText": "까",
        "options": ["가", "카", "까", "하"],
        "pairs": [],
        "answer": 2,
        "explanationBn": "까 = টানটান ㄲ।",
        "topic": "jamo",
    },
    {
        "id": "c-pair-q6",
        "kind": "matching",
        "promptBn": "অক্ষর ও স্তর মেলান",
        "promptKo": "",
        "promptEn": "",
        "options": [],
        "pairs": [
            {"left": "다", "right": "সাধারণ (평음)"},
            {"left": "타", "right": "শ্বাসযুক্ত (격음)"},
            {"left": "따", "right": "টানটান (된소리)"},
            {"left": "싸", "right": "টানটান ㅅ"},
        ],
        "answer": 0,
        "explanationBn": "তিন স্তরের বৈপরীত্য বাংলায় নেই — আলাদা করে শুনুন।",
        "topic": "jamo",
    },
]


def fix_consonants() -> None:
    m = load("consonants")
    m["steps"] = [s for s in m["steps"] if s.get("id") not in ("c-contrast", "c-speak-pairs")]
    m["steps"] = insert_after(m["steps"], "c-double-grid", C_CONTRAST)
    m["steps"] = insert_after(m["steps"], "c-contrast", C_SPEAK_PAIRS)

    # Inject pair quiz items into first drill bank
    for step in m["steps"]:
        if step.get("id") == "c-drill-1" and step.get("type") == "quiz":
            existing = {q["id"] for q in step["questions"]}
            for q in PAIR_QUIZ_EXTRAS:
                if q["id"] not in existing:
                    step["questions"].append(q)

    m["requirements"] = upsert_required(
        m["requirements"],
        add=["c-contrast", "c-speak-pairs"],
    )
    order = [
        "c-intro",
        "c-grid",
        "c-double-grid",
        "c-contrast",
        "c-speak",
        "c-speak-2",
        "c-speak-pairs",
        "c-write",
        "c-quiz",
        "c-drill-1",
        "c-drill-2",
    ]
    cur = m["requirements"]["requiredStepIds"]
    m["requirements"]["requiredStepIds"] = [x for x in order if x in cur] + [
        x for x in cur if x not in order
    ]
    # Raise speak minimum to include pair drills
    m["requirements"]["minSpeakItems"] = max(m["requirements"].get("minSpeakItems", 0), 18)
    m["estimatedMinutes"] = max(m.get("estimatedMinutes", 45), 50)
    save("consonants", m)
    print("consonants: contrast lesson + minimal-pair speak/quiz")


# ---------------------------------------------------------------------------
# 4b) Late, light tensification in speak-lab (beginner words only)
# ---------------------------------------------------------------------------

SP_TENSE_EXPLAIN = {
    "id": "sp-tensify",
    "type": "explain",
    "title": {
        "bn": "হালকা 경음화 (경음화) — সহজ শব্দ মাত্র",
        "ko": "쉬운 경음화 입문",
        "en": "Light tensification — easy words only",
    },
    "body": {
        "bn": [
            "এখন শুধু একটা ছোট নিয়ম: কিছু ব্যাচিমের পরে পরের ㄱ/ㄷ/ㅂ/ㅅ/ㅈ কখনো কখনো টানটান (ㄲ/ㄸ/ㅃ/ㅆ/ㅉ) শোনায়।",
            "সহজ শব্দ দিয়ে শুরু: 학교=[학꾜], 있다=[이따], 먹다=[먹따], 없다=[업따], 같다=[같따]।",
            "আরও সহজ: 국밥≈[국빱], 벚꽃 আপাতত বাদ। 돋보기·잡지·문법 এখন বাধ্যতামূলক নয়।",
            "মনে রাখুন: আগে ৭ ব্যাচিম ধ্বনি ঠিকমতো; 경음화 আস্তে আস্তে কানে আসবে।",
        ],
        "en": [
            "Short rule: after some batchim, the next ㄱㄷㅂㅅㅈ may sound tense (ㄲㄸㅃㅆㅉ).",
            "Easy set only: 학교=[학꾜], 있다=[이따], 먹다=[먹따], 없다=[업따].",
            "Skip advanced textbook piles (돋보기, 잡지, 문법) for now.",
            "Keep the 7 batchim sounds solid first; tensification is a late polish.",
        ],
        "ko": [
            "받침 뒤 ㄱㄷㅂㅅㅈ이 된소리로 나기도 합니다.",
            "쉬운 예: 학교=[학꾜], 있다=[이따], 먹다=[먹따], 없다=[업따].",
            "어려운 단어는 나중으로 미룹니다.",
        ],
    },
}

SP_TENSE_SPEAK = {
    "id": "sp-tensify-speak",
    "type": "speak",
    "minListens": 2,
    "items": [
        {"id": "sp-t1", "text": "학교", "romanization": "hak-kkyo", "audioText": "학교", "bn": "হাক্ক্যো — স্কুল [학꾜]", "en": "school"},
        {"id": "sp-t2", "text": "있다", "romanization": "it-tta", "audioText": "있다", "bn": "ইত্তা — আছে [이따]", "en": "to exist/have"},
        {"id": "sp-t3", "text": "먹다", "romanization": "meok-tta", "audioText": "먹다", "bn": "মক্‌ত্তা — খাওয়া [먹따]", "en": "to eat"},
        {"id": "sp-t4", "text": "없다", "romanization": "eop-tta", "audioText": "없다", "bn": "অপ্‌ত্তা — নেই [업따]", "en": "to not exist"},
        {"id": "sp-t5", "text": "같다", "romanization": "gat-tta", "audioText": "같다", "bn": "কাত্তা — একই [같따]", "en": "to be the same"},
        {"id": "sp-t6", "text": "국밥", "romanization": "guk-ppap", "audioText": "국밥", "bn": "কুক্পাপ — স্যুপ-ভাত", "en": "rice soup"},
    ],
    "fallbackQuizIds": [],
}


def fix_speak_lab() -> None:
    m = load("speak-lab")
    m["steps"] = [s for s in m["steps"] if s.get("id") not in ("sp-tensify", "sp-tensify-speak")]
    # Insert before quizzes
    out = []
    inserted = False
    for step in m["steps"]:
        if step.get("id") == "sp-quiz-1" and not inserted:
            out.append(SP_TENSE_EXPLAIN)
            out.append(SP_TENSE_SPEAK)
            inserted = True
        out.append(step)
    if not inserted:
        out.extend([SP_TENSE_EXPLAIN, SP_TENSE_SPEAK])
    m["steps"] = out
    m["requirements"] = upsert_required(
        m["requirements"],
        add=["sp-tensify", "sp-tensify-speak"],
    )
    # Keep quizzes required; tensify optional? User wanted tensification not too early —
    # include as required late module steps so learners meet it after batchim.
    order = ["sp-lab", "sp-vocab", "sp-jamo", "sp-tensify", "sp-tensify-speak", "sp-quiz-1", "sp-quiz-2"]
    cur = m["requirements"]["requiredStepIds"]
    m["requirements"]["requiredStepIds"] = [x for x in order if x in cur] + [
        x for x in cur if x not in order
    ]
    m["requirements"]["minSpeakItems"] = max(m["requirements"].get("minSpeakItems", 0), 28)
    m["estimatedMinutes"] = max(m.get("estimatedMinutes", 35), 40)
    save("speak-lab", m)
    print("speak-lab: light late tensification with easy words")


def main() -> None:
    fix_syllables()
    fix_batchim()
    fix_consonants()
    fix_speak_lab()
    # Validate module JSON still unique ids roughly
    for name in ["syllables", "batchim", "consonants", "speak-lab"]:
        m = load(name)
        print(name, "steps:", [s["id"] for s in m["steps"]])
        print("  required:", m["requirements"]["requiredStepIds"])


if __name__ == "__main__":
    main()
