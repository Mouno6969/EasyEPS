#!/usr/bin/env python3
"""
Add whole-word reading practice to the Hangul basics track.

- `read` steps (see Hangul → pick Bangla meaning)
- quiz banks with topic=reading
- checkpoint bank enriched so ≥20 reading items exist for stratified draws
"""
from __future__ import annotations

import json
import random
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MOD = ROOT / "content" / "basics" / "modules"
rng = random.Random(20260725)

# Beginner EPS-relevant whole words: (hangul, romanization, bn, en)
WORDS: list[tuple[str, str, str, str]] = [
    ("가", "ga", "যাওয়া (ক্রিয়া মূল)", "go (verb stem)"),
    ("나", "na", "আমি", "I/me"),
    ("다", "da", "সব / শেষ", "all / finish"),
    ("물", "mul", "পানি", "water"),
    ("불", "bul", "আগুন", "fire"),
    ("손", "son", "হাত", "hand"),
    ("발", "bal", "পা", "foot"),
    ("눈", "nun", "চোখ / তুষার", "eye / snow"),
    ("입", "ip", "মুখ", "mouth"),
    ("코", "ko", "নাক", "nose"),
    ("집", "jip", "বাড়ি", "house"),
    ("방", "bang", "ঘর", "room"),
    ("문", "mun", "দরজা", "door"),
    ("밥", "bap", "ভাত / খাবার", "rice / meal"),
    ("국", "guk", "স্যুপ", "soup"),
    ("차", "cha", "চা / গাড়ি", "tea / car"),
    ("책", "chaek", "বই", "book"),
    ("펜", "pen", "কলম", "pen"),
    ("공", "gong", "বল", "ball"),
    ("산", "san", "পাহাড়", "mountain"),
    ("강", "gang", "নদী", "river"),
    ("바다", "ba-da", "সমুদ্র", "sea"),
    ("하늘", "ha-neul", "আকাশ", "sky"),
    ("사람", "sa-ram", "মানুষ", "person"),
    ("이름", "i-reum", "নাম", "name"),
    ("학교", "hak-kyo", "স্কুল", "school"),
    ("회사", "hoe-sa", "কোম্পানি", "company"),
    ("공장", "gong-jang", "কারখানা", "factory"),
    ("병원", "byeong-won", "হাসপাতাল", "hospital"),
    ("시장", "si-jang", "বাজার", "market"),
    ("은행", "eun-haeng", "ব্যাংক", "bank"),
    ("역", "yeok", "স্টেশন", "station"),
    ("버스", "beo-seu", "বাস", "bus"),
    ("지하철", "ji-ha-cheol", "মেট্রো", "subway"),
    ("택시", "taek-si", "ট্যাক্সি", "taxi"),
    ("오늘", "o-neul", "আজ", "today"),
    ("내일", "nae-il", "কাল (আগামী)", "tomorrow"),
    ("어제", "eo-je", "গতাল (গতের)", "yesterday"),
    ("시간", "si-gan", "সময়", "time"),
    ("아침", "a-chim", "সকাল", "morning"),
    ("점심", "jeom-sim", "দুপুরের খাবার", "lunch"),
    ("저녁", "jeo-nyeok", "সন্ধ্যা / রাতের খাবার", "evening / dinner"),
    ("친구", "chin-gu", "বন্ধু", "friend"),
    ("가족", "ga-jok", "পরিবার", "family"),
    ("엄마", "eom-ma", "মা", "mom"),
    ("아빠", "a-ppa", "বাবা", "dad"),
    ("형", "hyeong", "দাদা (ছেলের)", "older brother (male)"),
    ("누나", "nu-na", "দিদি (ছেলের)", "older sister (male)"),
    ("언니", "eon-ni", "দিদি (মেয়ের)", "older sister (female)"),
    ("동생", "dong-saeng", "ছোট ভাই/বোন", "younger sibling"),
    ("선생", "seon-saeng", "শিক্ষক", "teacher"),
    ("학생", "hak-saeng", "ছাত্র", "student"),
    ("일", "il", "কাজ / দিন", "work / day"),
    ("돈", "don", "টাকা", "money"),
    ("값", "gap", "দাম", "price"),
    ("옷", "ot", "কাপড়", "clothes"),
    ("신발", "sin-bal", "জুতো", "shoes"),
    ("모자", "mo-ja", "টুপি", "hat"),
    ("가방", "ga-bang", "ব্যাগ", "bag"),
    ("전화", "jeon-hwa", "ফোন", "phone"),
    ("사진", "sa-jin", "ছবি", "photo"),
    ("음악", "eum-ak", "সঙ্গীত", "music"),
    ("영화", "yeong-hwa", "সিনেমা", "movie"),
    ("운동", "un-dong", "ব্যায়াম", "exercise"),
    ("건강", "geon-gang", "স্বাস্থ্য", "health"),
    ("안전", "an-jeon", "নিরাপত্তা", "safety"),
    ("위험", "wi-heom", "বিপদ", "danger"),
    ("입구", "ip-gu", "প্রবেশপথ", "entrance"),
    ("출구", "chul-gu", "বেরোনোর পথ", "exit"),
    ("화장실", "hwa-jang-sil", "টয়লেট", "restroom"),
    ("식당", "sik-dang", "রেস্তোরাঁ", "restaurant"),
    ("커피", "keo-pi", "কফি", "coffee"),
    ("우유", "u-yu", "দুধ", "milk"),
    ("고기", "go-gi", "মাংস", "meat"),
    ("야채", "ya-chae", "সবজি", "vegetable"),
    ("과일", "gwa-il", "ফল", "fruit"),
    ("사과", "sa-gwa", "আপেল", "apple"),
    ("하나", "ha-na", "এক", "one"),
    ("둘", "dul", "দুই", "two"),
    ("셋", "set", "তিন", "three"),
    ("넷", "net", "চার", "four"),
    ("다섯", "da-seot", "পাঁচ", "five"),
    ("한국", "han-guk", "কোরিয়া", "Korea"),
    ("한국인", "han-gu-gin", "কোরিয়ান মানুষ", "Korean person"),
    ("한국어", "han-gu-geo", "কোরিয়ান ভাষা", "Korean language"),
    ("안녕하세요", "an-nyeong-ha-se-yo", "নমস্কার / হ্যালো", "hello"),
    ("감사합니다", "gam-sa-ham-ni-da", "ধন্যবাদ", "thank you"),
    ("죄송합니다", "joe-song-ham-ni-da", "দুঃখিত", "sorry"),
    ("네", "ne", "হ্যাঁ", "yes"),
    ("아니요", "a-ni-yo", "না", "no"),
    ("좋아요", "jo-a-yo", "ভালো", "good / like"),
    ("많아요", "man-a-yo", "অনেক", "many / a lot"),
    ("없어요", "eop-seo-yo", "নেই", "there isn't"),
    ("있어요", "i-sseo-yo", "আছে", "there is"),
    ("어디", "eo-di", "কোথায়", "where"),
    ("뭐", "mwo", "কী", "what"),
    ("누구", "nu-gu", "কে", "who"),
    ("언제", "eon-je", "কখন", "when"),
    ("왜", "wae", "কেন", "why"),
    ("어떻게", "eo-tteo-ke", "কীভাবে", "how"),
]


def load(name: str) -> dict:
    return json.loads((MOD / f"{name}.json").read_text(encoding="utf-8"))


def save(name: str, data: dict) -> None:
    (MOD / f"{name}.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def distractors_for(bn: str, k: int = 3) -> list[str]:
    pool = [w[2] for w in WORDS if w[2] != bn]
    return rng.sample(pool, min(k, len(pool)))


def make_read_items(prefix: str, words: list[tuple[str, str, str, str]]) -> list[dict]:
    items = []
    for i, (text, rom, bn, en) in enumerate(words):
        items.append(
            {
                "id": f"{prefix}-r{i+1:02d}",
                "text": text,
                "romanization": rom,
                "audioText": text,
                "bn": bn,
                "en": en,
                "distractorsBn": distractors_for(bn, 3),
            }
        )
    return items


def make_reading_questions(prefix: str, words: list[tuple[str, str, str, str]]) -> list[dict]:
    """Hangul word → meaning, and meaning → Hangul word."""
    qs = []
    for i, (text, rom, bn, en) in enumerate(words):
        # Word → meaning (Bangla options)
        opts = [bn] + distractors_for(bn, 3)
        rng.shuffle(opts)
        qs.append(
            {
                "id": f"{prefix}-rq-wm-{i+1:02d}",
                "kind": "multiple-choice",
                "promptBn": f"এই শব্দটি পড়ুন: {text} — অর্থ কী?",
                "promptKo": text,
                "promptEn": f"Read this word: {text} — meaning?",
                "options": opts,
                "pairs": [],
                "answer": opts.index(bn),
                "explanationBn": f"{text} ({rom}) = {bn} / {en}। পুরো শব্দ হিসেবে পড়ুন।",
                "topic": "reading",
            }
        )
        # Meaning → word (Hangul options)
        hangul_pool = [w[0] for w in WORDS if w[0] != text]
        h_opts = [text] + rng.sample(hangul_pool, 3)
        rng.shuffle(h_opts)
        qs.append(
            {
                "id": f"{prefix}-rq-mw-{i+1:02d}",
                "kind": "matching" if False else "multiple-choice",
                "promptBn": f"‘{bn}’ অর্থের শব্দ কোনটি? (পড়ে বেছে নিন)",
                "promptKo": "",
                "promptEn": f"Which word means ‘{en}’?",
                "options": h_opts,
                "pairs": [],
                "answer": h_opts.index(text),
                "explanationBn": f"{bn} = {text}। অক্ষর নয়, পুরো শব্দ দেখুন।",
                "topic": "reading",
            }
        )
        # Listen + choose Hangul word (still whole-word reading of options)
        if i % 2 == 0:
            h2 = [text] + rng.sample(hangul_pool, 3)
            rng.shuffle(h2)
            qs.append(
                {
                    "id": f"{prefix}-rq-li-{i+1:02d}",
                    "kind": "listen-choice",
                    "promptBn": "শুনে সঠিক শব্দটি বেছে নিন (পড়ে মিলান)",
                    "promptKo": "",
                    "promptEn": "Listen and pick the word",
                    "listenText": text,
                    "options": h2,
                    "pairs": [],
                    "answer": h2.index(text),
                    "explanationBn": f"শোনা গেছে: {text} = {bn}।",
                    "topic": "reading",
                }
            )
    # Word–meaning matching packs
    for pack_i in range(0, len(words), 4):
        pack = words[pack_i : pack_i + 4]
        if len(pack) < 4:
            break
        qs.append(
            {
                "id": f"{prefix}-rq-match-{pack_i//4 + 1}",
                "kind": "matching",
                "promptBn": "শব্দ পড়ে অর্থ মেলান",
                "promptKo": "",
                "promptEn": "Match word to meaning",
                "options": [],
                "pairs": [{"left": t, "right": b} for t, _, b, _ in pack],
                "answer": 0,
                "explanationBn": "প্রতিটি হ্যাঙ্গুল শব্দ পড়ে বাংলা অর্থ মিলান।",
                "topic": "reading",
            }
        )
    return qs


def insert_before_quiz(steps: list, new_steps: list[dict]) -> list:
    out = []
    inserted = False
    for s in steps:
        if s.get("type") == "quiz" and not inserted:
            out.extend(new_steps)
            inserted = True
        out.append(s)
    if not inserted:
        out.extend(new_steps)
    return out


def ensure_req(m: dict, step_ids: list[str], min_read: int) -> None:
    req = m.setdefault("requirements", {})
    ids = list(req.get("requiredStepIds", []))
    for sid in step_ids:
        if sid not in ids:
            # insert before first quiz id if present
            quiz_ids = [s["id"] for s in m["steps"] if s.get("type") == "quiz"]
            if quiz_ids and quiz_ids[0] in ids:
                pos = ids.index(quiz_ids[0])
                ids.insert(pos, sid)
            else:
                ids.append(sid)
    req["requiredStepIds"] = ids
    req["minReadItems"] = max(int(req.get("minReadItems") or 0), min_read)
    m["requirements"] = req


def add_to_module(name: str, word_slice: list[tuple[str, str, str, str]], step_id: str) -> None:
    m = load(name)
    # Remove prior generated steps if re-run
    m["steps"] = [s for s in m["steps"] if s.get("id") not in (step_id, f"{step_id}-quiz")]
    read_step = {
        "id": step_id,
        "type": "read",
        "title": {
            "bn": "পুরো শব্দ পড়া",
            "ko": "단어 읽기",
            "en": "Read whole words",
        },
        "items": make_read_items(step_id, word_slice),
    }
    read_quiz = {
        "id": f"{step_id}-quiz",
        "type": "quiz",
        "drawCount": 10,
        "questions": make_reading_questions(step_id, word_slice),
    }
    # Ensure bank large enough for drawCount
    while len(read_quiz["questions"]) < 20:
        extra = make_reading_questions(f"{step_id}-x{len(read_quiz['questions'])}", word_slice)
        for q in extra:
            if q["id"] not in {x["id"] for x in read_quiz["questions"]}:
                read_quiz["questions"].append(q)
        break
    m["steps"] = insert_before_quiz(m["steps"], [read_step, read_quiz])
    ensure_req(m, [step_id, f"{step_id}-quiz"], min_read=min(8, len(word_slice)))
    m["estimatedMinutes"] = max(int(m.get("estimatedMinutes") or 30), int(m.get("estimatedMinutes") or 30) + 10)
    save(name, m)
    print(f"{name}: +read {len(read_step['items'])} items, +quiz {len(read_quiz['questions'])} Q")


def enrich_checkpoint() -> None:
    m = load("checkpoint")
    # Build a large reading set from WORDS
    reading_qs = make_reading_questions("cp-read", WORDS)
    for step in m["steps"]:
        if step.get("type") != "quiz":
            continue
        existing_ids = {q["id"] for q in step["questions"]}
        added = 0
        for q in reading_qs:
            if q["id"] in existing_ids:
                continue
            step["questions"].append(q)
            existing_ids.add(q["id"])
            added += 1
        # Count reading
        reading = sum(1 for q in step["questions"] if q.get("topic") == "reading")
        print(f"checkpoint: bank={len(step['questions'])} reading={reading} (+{added})")
        # Ensure drawCount stays 25
        step["drawCount"] = step.get("drawCount") or 25
    save("checkpoint", m)


def main() -> None:
    # Split vocabulary across modules for progressive reading load
    add_to_module("syllables", WORDS[0:24], "sy-read")
    add_to_module("batchim", WORDS[12:36], "b-read")
    add_to_module("speak-lab", WORDS[24:56], "sp-read")
    # consonants/vowels get a lighter early set of CV words
    add_to_module("consonants", WORDS[0:12], "c-read")
    add_to_module("vowels", WORDS[8:20], "v-read")
    enrich_checkpoint()
    print("done")


if __name__ == "__main__":
    main()
