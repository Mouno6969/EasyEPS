#!/usr/bin/env python3
"""
Expand basics quiz banks, add Bangla shape mnemonics, fix batchim examples,
add tense write items, and build a 100+ checkpoint question bank with audio.
"""
from __future__ import annotations

import json
import random
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MOD = ROOT / "content" / "basics" / "modules"
rng = random.Random(42)

SHAPE_MNEMONICS = {
    "ㄱ": "আকৃতি: বন্দুকের হাতলের মতো — উপরে আড়াআড়ি, নিচে বাঁকা হাতল।",
    "ㄴ": "আকৃতি: চেয়ারে বসা 'ㄴ' — বাঁ দিকের খাড়া রেখা ও নিচের আসন।",
    "ㄷ": "আকৃতি: খোলা বাক্স বা দরজার ফ্রেম — উপরে ও নিচে আড়াআড়ি।",
    "ㄹ": "আকৃতি: সিঁড়ির ধাপ — উপর-নিচ ভাঁজ, 'র/ল' মনে রাখুন।",
    "ㅁ": "আকৃতি: বর্গাকার মুখ/জানালা — চার দিক বন্ধ বক্স।",
    "ㅂ": "আকৃতি: টেবিলের পায়া — দুই খাড়া রেখা ও মাঝে আড়াআড়ি।",
    "ㅅ": "আকৃতি: খাড়া 'V' বা তীরের ফলক — উপরে মিলিত দুই রেখা।",
    "ㅇ": "আকৃতি: গোল চাঁদ/শূন্য — শুরুতে নীরব, শেষে 'ং'।",
    "ㅈ": "আকৃতি: ㅅ-এর উপর এক আড়াআড়ি টুপি — 'জ/ছ' ধ্বনি।",
    "ㅊ": "আকৃতি: ㅈ-এর উপর আরেকটি ছোট দাগ — শ্বাসযুক্ত 'ছ'।",
    "ㅋ": "আকৃতি: ㄱ-এর মাঝে অতিরিক্ত আড়াআড়ি — শ্বাসযুক্ত 'খ'।",
    "ㅌ": "আকৃতি: ㄷ-এর মাঝে অতিরিক্ত আড়াআড়ি — শ্বাসযুক্ত 'থ'।",
    "ㅍ": "আকৃতি: ㅂ-এর মাঝে দুই আড়াআড়ি — শ্বাসযুক্ত 'ফ'।",
    "ㅎ": "আকৃতি: মানুষের মুখ/হাঁপানি — উপরে বিন্দু, নিচে খোলা বৃত্ত।",
    "ㄲ": "আকৃতি: দুইটি ㄱ পাশাপাশি — টানটান (tense) 'ক'।",
    "ㄸ": "আকৃতি: দুইটি ㄷ পাশাপাশি — টানটান 'ত'।",
    "ㅃ": "আকৃতি: দুইটি ㅂ পাশাপাশি — টানটান 'প'।",
    "ㅆ": "আকৃতি: দুইটি ㅅ পাশাপাশি — টানটান 'স'।",
    "ㅉ": "আকৃতি: দুইটি ㅈ পাশাপাশি — টানটান 'চ'।",
    "ㅏ": "আকৃতি: খাড়া লাইন + ডানে ছোট দাঁত — 'আ'।",
    "ㅑ": "আকৃতি: ㅏ-এর ডানে দুই দাঁত — 'ইয়া'।",
    "ㅓ": "আকৃতি: খাড়া লাইন + বামে ছোট দাঁত — 'অ/ও'।",
    "ㅕ": "আকৃতি: ㅓ-এর বামে দুই দাঁত — 'ইয়ো'।",
    "ㅗ": "আকৃতি: আড়াআড়ি + উপরে খাটো খাড়া — 'ও'।",
    "ㅛ": "আকৃতি: ㅗ-এর উপরে দুই খাড়া — 'ইয়ো'।",
    "ㅜ": "আকৃতি: আড়াআড়ি + নিচে খাটো খাড়া — 'উ'।",
    "ㅠ": "আকৃতি: ㅜ-এর নিচে দুই খাড়া — 'ইয়ু'।",
    "ㅡ": "আকৃতি: শুধু আড়াআড়ি রেখা — 'উ' (সংক্ষিপ্ত)।",
    "ㅣ": "আকৃতি: শুধু খাড়া রেখা — 'ই'।",
    "ㅐ": "আকৃতি: ㅏ + ㅣ মিশ্রণ — 'এ'।",
    "ㅒ": "আকৃতি: ㅑ + ㅣ — 'ইয়ে'।",
    "ㅔ": "আকৃতি: ㅓ + ㅣ — 'এ'।",
    "ㅖ": "আকৃতি: ㅕ + ㅣ — 'ইয়ে'।",
    "ㅘ": "আকৃতি: ㅗ + ㅏ — 'ওয়া'।",
    "ㅙ": "আকৃতি: ㅗ + ㅐ — 'ওয়ে'।",
    "ㅚ": "আকৃতি: ㅗ + ㅣ — 'ওয়ে/ওই'।",
    "ㅝ": "আকৃতি: ㅜ + ㅓ — 'ওয়ো'।",
    "ㅞ": "আকৃতি: ㅜ + ㅔ — 'ওয়ে'।",
    "ㅟ": "আকৃতি: ㅜ + ㅣ — 'উই'।",
    "ㅢ": "আকৃতি: ㅡ + ㅣ — 'উই/ই'।",
}

CONSONANTS = [
    ("ㄱ", "g/k", "기역"),
    ("ㄴ", "n", "니은"),
    ("ㄷ", "d/t", "디귿"),
    ("ㄹ", "r/l", "리을"),
    ("ㅁ", "m", "미음"),
    ("ㅂ", "b/p", "비읍"),
    ("ㅅ", "s", "시옷"),
    ("ㅇ", "ng", "이응"),
    ("ㅈ", "j", "지읒"),
    ("ㅊ", "ch", "치읓"),
    ("ㅋ", "k", "키읔"),
    ("ㅌ", "t", "티읕"),
    ("ㅍ", "p", "피읖"),
    ("ㅎ", "h", "히읗"),
    ("ㄲ", "kk", "쌍기역"),
    ("ㄸ", "tt", "쌍디귿"),
    ("ㅃ", "pp", "쌍비읍"),
    ("ㅆ", "ss", "쌍시옷"),
    ("ㅉ", "jj", "쌍지읒"),
]

VOWELS = [
    ("ㅏ", "a", "아"),
    ("ㅑ", "ya", "야"),
    ("ㅓ", "eo", "어"),
    ("ㅕ", "yeo", "여"),
    ("ㅗ", "o", "오"),
    ("ㅛ", "yo", "요"),
    ("ㅜ", "u", "우"),
    ("ㅠ", "yu", "유"),
    ("ㅡ", "eu", "으"),
    ("ㅣ", "i", "이"),
    ("ㅐ", "ae", "애"),
    ("ㅔ", "e", "에"),
    ("ㅒ", "yae", "얘"),
    ("ㅖ", "ye", "예"),
    ("ㅘ", "wa", "와"),
    ("ㅙ", "wae", "왜"),
    ("ㅚ", "oe", "외"),
    ("ㅝ", "wo", "워"),
    ("ㅞ", "we", "웨"),
    ("ㅟ", "wi", "위"),
    ("ㅢ", "ui", "의"),
]

CV_PAIRS = [
    ("가", "ga"), ("나", "na"), ("다", "da"), ("라", "ra"), ("마", "ma"),
    ("바", "ba"), ("사", "sa"), ("아", "a"), ("자", "ja"), ("차", "cha"),
    ("카", "ka"), ("타", "ta"), ("파", "pa"), ("하", "ha"),
    ("고", "go"), ("누", "nu"), ("디", "di"), ("루", "ru"), ("미", "mi"),
    ("보", "bo"), ("수", "su"), ("이", "i"), ("주", "ju"), ("치", "chi"),
    ("코", "ko"), ("토", "to"), ("피", "pi"), ("후", "hu"),
    ("까", "kka"), ("따", "tta"), ("빠", "ppa"), ("싸", "ssa"), ("짜", "jja"),
    ("개", "gae"), ("네", "ne"), ("되", "doe"), ("뢰", "roe"), ("매", "mae"),
    ("배", "bae"), ("세", "se"), ("예", "ye"), ("제", "je"),
]

BATCHIM_WORDS = [
    ("간", "gan", "ㄱ", "কলিজা/মধ্য"),
    ("문", "mun", "ㄴ", "দরজা"),
    ("받", "bat", "ㄷ", "গ্রহণ (base)"),
    ("달", "dal", "ㄹ", "চাঁদ"),
    ("밤", "bam", "ㅁ", "রাত/চেস্টনাট"),
    ("밥", "bap", "ㅂ", "ভাত"),
    ("옷", "ot", "ㅅ", "কাপড়"),
    ("방", "bang", "ㅇ", "ঘর"),
    ("낮", "nat", "ㅈ", "দিন"),
    ("꽃", "kkot", "ㅊ", "ফুল"),
    ("부엌", "bu-eok", "ㅋ", "রান্নাঘর"),
    ("밭", "bat", "ㅌ", "ক্ষেত"),
    ("앞", "ap", "ㅍ", "সামনে"),
    ("밖", "bak", "ㄲ", "বাইরে"),
    ("값", "gap", "ㅄ", "দাম"),
    ("앉다", "an-tta", "ㄵ", "বসা"),
    ("많다", "man-ta", "ㄶ", "বেশি"),
    ("읽다", "ik-tta", "ㄺ", "পড়া"),
    ("없다", "eop-tta", "ㅄ", "নেই"),
    ("한국어", "han-gu-geo", "ㄱ→linking", "কোরিয়ান ভাষা"),
]


def load(name: str) -> dict:
    return json.loads((MOD / f"{name}.json").read_text(encoding="utf-8"))


def save(name: str, data: dict) -> None:
    (MOD / f"{name}.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def mc(qid, prompt_bn, options, answer, explanation, topic="general", prompt_ko="", listen=None, kind="multiple-choice"):
    q = {
        "id": qid,
        "kind": kind,
        "promptBn": prompt_bn,
        "promptKo": prompt_ko or "",
        "promptEn": "",
        "options": options,
        "pairs": [],
        "answer": answer,
        "explanationBn": explanation,
        "topic": topic,
    }
    if listen is not None:
        q["listenText"] = listen
        q["kind"] = "listen-choice"
    return q


def matching(qid, prompt_bn, pairs, explanation, topic="general"):
    return {
        "id": qid,
        "kind": "matching",
        "promptBn": prompt_bn,
        "promptKo": "",
        "promptEn": "",
        "options": [],
        "pairs": pairs,
        "answer": 0,
        "explanationBn": explanation,
        "topic": topic,
    }


def ensure_bank(existing: list, target: int, factory) -> list:
    """Grow bank to at least target unique ids via factory(i) generators."""
    by_id = {q["id"]: q for q in existing}
    i = 0
    while len(by_id) < target and i < target * 5:
        for q in factory(i):
            if q["id"] not in by_id:
                by_id[q["id"]] = q
            if len(by_id) >= target:
                break
        i += 1
    return list(by_id.values())


def consonant_factory(seed: int):
    out = []
    for n, (ch, rom, name) in enumerate(CONSONANTS):
        idx = seed * 100 + n
        # romanization MC
        opts = [rom, "x", "ng", "ae"]
        # unique options
        opts = list(dict.fromkeys(opts))
        while len(opts) < 4:
            opts.append(f"alt{len(opts)}")
        ans = opts.index(rom)
        # rotate so answer not always 0
        rot = (seed + n) % 4
        opts = opts[rot:] + opts[:rot]
        ans = (ans - rot) % 4
        out.append(
            mc(
                f"c-gen-rom-{idx}",
                f"{ch} ({name}) এর রোমানাইজেশন?",
                opts[:4],
                ans,
                f"{ch} = {rom} ({name})।",
                topic="jamo",
            )
        )
        # char from sound
        others = [c for c, _, _ in CONSONANTS if c != ch]
        choices = [ch] + rng.sample(others, 3)
        rng.shuffle(choices)
        out.append(
            mc(
                f"c-gen-char-{idx}",
                f"'{rom}' ধ্বনির ব্যঞ্জন কোনটি?",
                choices,
                choices.index(ch),
                f"{rom} → {ch}।",
                topic="jamo",
            )
        )
        # listen
        listen_word = ch + "ㅏ" if ch != "ㅇ" else "아"
        # precomposed-ish using simple syllables when possible
        listen_map = {
            "ㄱ": "가", "ㄴ": "나", "ㄷ": "다", "ㄹ": "라", "ㅁ": "마", "ㅂ": "바",
            "ㅅ": "사", "ㅇ": "아", "ㅈ": "자", "ㅊ": "차", "ㅋ": "카", "ㅌ": "타",
            "ㅍ": "파", "ㅎ": "하", "ㄲ": "까", "ㄸ": "따", "ㅃ": "빠", "ㅆ": "싸", "ㅉ": "짜",
        }
        word = listen_map.get(ch, "가")
        opts2 = [word] + rng.sample([v for v in listen_map.values() if v != word], 3)
        rng.shuffle(opts2)
        out.append(
            mc(
                f"c-gen-listen-{idx}",
                "শুনে সঠিক অক্ষর/শব্দ বেছে নিন",
                opts2,
                opts2.index(word),
                f"শোনা গেছে: {word} ({ch})।",
                topic="jamo",
                listen=word,
                kind="listen-choice",
            )
        )
    # matching pack
    pack = rng.sample(CONSONANTS, 4)
    out.append(
        matching(
            f"c-gen-match-{seed}",
            "ব্যঞ্জন ও রোমানাইজেশন মেলান",
            [{"left": c, "right": r} for c, r, _ in pack],
            "প্রতিটি জামোর রোমানাইজেশন মিলিয়ে দেখুন।",
            topic="jamo",
        )
    )
    return out


def vowel_factory(seed: int):
    out = []
    for n, (ch, rom, name) in enumerate(VOWELS):
        idx = seed * 100 + n
        opts = [rom, "a", "u", "o"]
        opts = list(dict.fromkeys(opts))
        while len(opts) < 4:
            opts.append(f"v{len(opts)}")
        ans = opts.index(rom)
        rot = (seed + n) % 4
        opts = opts[rot:] + opts[:rot]
        ans = (ans - rot) % 4
        out.append(
            mc(
                f"v-gen-rom-{idx}",
                f"{ch} স্বরের রোমানাইজেশন?",
                opts[:4],
                ans,
                f"{ch} = {rom}।",
                topic="jamo",
            )
        )
        others = [c for c, _, _ in VOWELS if c != ch]
        choices = [ch] + rng.sample(others, 3)
        rng.shuffle(choices)
        out.append(
            mc(
                f"v-gen-char-{idx}",
                f"'{rom}' স্বর কোনটি?",
                choices,
                choices.index(ch),
                f"{rom} → {ch}।",
                topic="jamo",
            )
        )
        opts_l = [name] + rng.sample([v for _, _, v in VOWELS if v != name], 3)
        rng.shuffle(opts_l)
        out.append(
            mc(
                f"v-gen-listen-{idx}",
                "শুনে সঠিক স্বর বেছে নিন",
                opts_l,
                opts_l.index(name),
                f"শোনা গেছে: {name} ({ch})।",
                topic="jamo",
                listen=name,
                kind="listen-choice",
            )
        )
    pack = rng.sample(VOWELS, 4)
    out.append(
        matching(
            f"v-gen-match-{seed}",
            "স্বর ও রোমানাইজেশন মেলান",
            [{"left": c, "right": r} for c, r, _ in pack],
            "স্বরের রোমানাইজেশন মিলান।",
            topic="jamo",
        )
    )
    return out


def syllable_factory(seed: int):
    out = []
    for n, (word, rom) in enumerate(CV_PAIRS):
        idx = seed * 100 + n
        opts = [word] + rng.sample([w for w, _ in CV_PAIRS if w != word], 3)
        rng.shuffle(opts)
        out.append(
            mc(
                f"sy-gen-mc-{idx}",
                f"'{rom}' কোন অক্ষর?",
                opts,
                opts.index(word),
                f"{rom} = {word}।",
                topic="syllable",
            )
        )
        out.append(
            mc(
                f"sy-gen-listen-{idx}",
                "শুনে সঠিক অক্ষর বেছে নিন",
                opts,
                opts.index(word),
                f"শোনা গেছে: {word}।",
                topic="syllable",
                listen=word,
                kind="listen-choice",
            )
        )
    pack = rng.sample(CV_PAIRS, 4)
    out.append(
        matching(
            f"sy-gen-match-{seed}",
            "অক্ষর ও উচ্চারণ মেলান",
            [{"left": w, "right": r} for w, r in pack],
            "CV অক্ষর মিলান।",
            topic="syllable",
        )
    )
    return out


def batchim_factory(seed: int):
    out = []
    for n, (word, rom, final, meaning) in enumerate(BATCHIM_WORDS):
        idx = seed * 100 + n
        # what is batchim letter - for multi-char words take last jamo conceptually
        finals = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅇ", "ㅅ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㄲ"]
        if final in finals:
            opts = [final] + rng.sample([f for f in finals if f != final], 3)
            rng.shuffle(opts)
            out.append(
                mc(
                    f"b-gen-final-{idx}",
                    f"{word} শব্দে ব্যাচিম কোনটি? ({meaning})",
                    opts,
                    opts.index(final),
                    f"{word}-এর ব্যাচিম {final}। উচ্চারণ: {rom}।",
                    topic="batchim",
                )
            )
        # listen
        distractors = [w for w, _, _, _ in BATCHIM_WORDS if w != word]
        opts2 = [word] + rng.sample(distractors, min(3, len(distractors)))
        while len(opts2) < 4:
            opts2.append(opts2[0] + "x")
        rng.shuffle(opts2)
        out.append(
            mc(
                f"b-gen-listen-{idx}",
                "শুনে সঠিক শব্দ বেছে নিন (ব্যাচিম)",
                opts2[:4],
                opts2.index(word),
                f"{word} ({rom}) — {meaning}।",
                topic="batchim",
                listen=word,
                kind="listen-choice",
            )
        )
    # linking MC
    linking = [
        ("한국어", "[한구거]", ["[한국어]", "[한구거]", "[한구고]", "[항우거]"], 1),
        ("음악", "[으막]", ["[음악]", "[으막]", "[음아크]", "[응악]"], 1),
        ("같이", "[가치]", ["[같이]", "[가치]", "[가티]", "[갇이]"], 1),
        ("발음", "[바름]", ["[발음]", "[바름]", "[바름이]", "[발음음]"], 1),
    ]
    for n, (word, correct, opts, ans) in enumerate(linking):
        out.append(
            mc(
                f"b-gen-link-{seed}-{n}",
                f"{word} শব্দের সঠিক উচ্চারণ (লিংকিং)?",
                opts,
                ans,
                f"ㅇ দিয়ে শুরু পরের অক্ষরে ব্যাচিম চলে যায় → {correct}।",
                topic="batchim",
            )
        )
    pack = rng.sample([(w, f) for w, _, f, _ in BATCHIM_WORDS if len(f) == 1], 4)
    out.append(
        matching(
            f"b-gen-match-{seed}",
            "শব্দ ও ব্যাচিম মেলান",
            [{"left": w, "right": f} for w, f in pack],
            "প্রতি শব্দের শেষ ব্যঞ্জন (ব্যাচিম) মিলান।",
            topic="batchim",
        )
    )
    return out


def expand_quiz_step(step: dict, target: int, factory, draw_count: int | None, id_prefix: str) -> dict:
    step = deepcopy(step)
    # Prefix generated ids so multiple quiz steps in one module stay unique.
    def prefixed_factory(seed: int):
        out = []
        for q in factory(seed):
            qq = deepcopy(q)
            if not qq["id"].startswith(id_prefix):
                qq["id"] = f"{id_prefix}{qq['id']}"
            out.append(qq)
        return out

    bank = ensure_bank(step.get("questions", []), target, prefixed_factory)
    step["questions"] = bank
    if draw_count is not None:
        step["drawCount"] = draw_count
    return step


def add_mnemonics(module: dict) -> dict:
    for step in module.get("steps", []):
        if step.get("type") != "jamo-grid":
            continue
        for item in step.get("items", []):
            ch = item.get("char", "")
            if ch in SHAPE_MNEMONICS and not item.get("shapeMnemonicBn"):
                item["shapeMnemonicBn"] = SHAPE_MNEMONICS[ch]
    return module


def fix_batchim(module: dict) -> dict:
    """Correct known wrong example vocabulary / explanations."""
    for step in module.get("steps", []):
        if step.get("type") == "explain" and step.get("id") == "b-explain":
            step["body"]["bn"] = [
                "কোনো ব্যঞ্জনবর্ণ যখন কোনো স্বরবর্ণের নিচে বসে, তখন তাকে ব্যাচিম (받침) বলে। উদাহরণ: 간, 문, 밥।",
                "একক ব্যাচিম: যেমন 먹다=[먹따] (খাওয়া), 닫다=[닫따] (বন্ধ করা) — এখানে ㄱ ও ㄷ ব্যাচিম।",
                "জোড় ব্যাচিম: যেমন 앉다=[안따] (বসা), 많다=[만타] (বেশি) — ㄵ, ㄶ ইত্যাদি।",
                "জোড় ব্যাচিমে সাধারণত নির্দিষ্ট নিয়ম অনুসারে একটি ধ্বনিই শোনা যায় (সবসময় বর্ণমালার ‘আগের’ অক্ষর নয়)। যেমন 앉다-তে ㄴ শোনা যায়; 읽다-তে প্রায়ই ㄱ।",
                "লিংকিং: ব্যাচিমের পরে ㅇ দিয়ে শুরু অক্ষর থাকলে ব্যাচিমের ধ্বনি পরের অক্ষরে যায়। যেমন: 한국어=[한구거], 음악=[으막], 발음=[바름], 같이=[가치]।",
            ]
            step["body"]["en"] = [
                "A consonant under the vowel is batchim (받침). Examples: 간, 문, 밥.",
                "Single batchim: 먹다=[먹따] (to eat), 닫다=[닫따] (to close).",
                "Double batchim: 앉다=[안따] (to sit), 많다=[만타] (many).",
                "Double batchim usually surfaces as one sound by rule (not simply 'alphabet order'). E.g. 앉다 keeps ㄴ; 읽다 often ㄱ.",
                "Linking: before ㅇ, batchim moves to the next syllable: 한국어=[한구거], 음악=[으막].",
            ]
            step["body"]["ko"] = [
                "모음 아래 자음을 받침이라고 합니다. 예: 간, 문, 밥.",
                "홑받침: 먹다=[먹따], 닫다=[닫따].",
                "겹받침: 앉다=[안따], 많다=[만타].",
                "겹받침은 규칙에 따라 한 소리로 납니다(단순 사전순이 아님).",
                "연음: 받침 뒤 ㅇ이 오면 소리가 넘어갑니다. 예: 한국어=[한구거].",
            ]
        if step.get("type") == "explain" and step.get("id") == "b-tense":
            # Fix 입상 example — use clearer tensification set; 입상→[입쌍] is actually standard for ㅅ after ㅂ
            # Replace confusing 입상 with 밥상 if needed, and fix 문법 placement
            bn = step["body"]["bn"]
            step["body"]["bn"] = [
                line.replace("입상=[입쌍] (পুরস্কার জেতা)", "입술=[입쓸] (ঠোঁট — ㅅ→ㅆ)")
                .replace("먹다=(মকত্তা)", "먹다=[먹따]")
                .replace("닫다=(তাতত্তা)", "닫다=[닫따]")
                for line in bn
            ]
            # also clean any remaining wrong forms
            step["body"]["bn"] = [
                "নিয়ম: ব্যাচিম ㄱ, ㄷ, ㅂ (এবং কিছু ক্ষেত্রে ㄴ, ㅁ)-এর পরে ㄱ, ㄷ, ㅂ, ㅅ, ㅈ থাকলে যথাক্রমে ㄲ, ㄸ, ㅃ, ㅆ, ㅉ পড়তে হয়।",
                "ㄷ-ব্যাচিমের পরে: 받고=[받꼬], 듣다=[듣따], 돋보기=[돋뽀기], 걷자=[걷짜]।",
                "ㅂ-ব্যাচিমের পরে: 입국=[입꾹], 입다=[입따], 십분=[십뿐], 잡지=[잡찌]।",
                "ㄴ-ব্যাচিমের পরে (কিছু শব্দে): 신고=[신꼬], 신다=[신따], 문법=[문뻡], 손수건=[손쑤건]।",
                "আরও: 인구=[인꾸], 만두=[만뚜], 담배=[담빼], 감자=[감짜]।",
            ]
            step["body"]["en"] = [
                "After batchim ㄱ/ㄷ/ㅂ (sometimes ㄴ/ㅁ), following ㄱㄷㅂㅅㅈ become tense ㄲㄸㅃㅆㅉ.",
                "After ㄷ: 받고=[받꼬], 듣다=[듣따].",
                "After ㅂ: 입국=[입꾹], 입다=[입따], 잡지=[잡찌].",
                "After ㄴ (some words): 신고=[신꼬], 문법=[문뻡].",
                "More: 인구=[인꾸], 만두=[만뚜], 담배=[담빼], 감자=[감짜].",
            ]
        if step.get("type") == "speak":
            for item in step.get("items", []):
                if item.get("id") == "b-sp1":
                    item["romanization"] = "deut-tta"
                    item["bn"] = "দূত্তা — শোনা [듣따]"
                if item.get("id") == "b-sp4":
                    item["romanization"] = "mun-ppeop"
                    item["bn"] = "মুনপ্পাদ — গ্রামার [문뻡]"
                if item.get("id") == "b-sp5":
                    item["romanization"] = "han-gu-geo"
                    item["bn"] = "হানগুগও — কোরিয়ান ভাষা (লিংকিং) [한구거]"
                if item.get("id") == "b-sp6":
                    item["bn"] = "উমাক — সঙ্গীত (লিংকিং) [으막]"
        if step.get("type") == "quiz":
            for q in step.get("questions", []):
                # Fix wrong double-batchim rule quiz
                if q.get("id") == "b-q6":
                    q["promptBn"] = "앉다 (ㄵ ব্যাচিম) সাধারণত কীভাবে উচ্চারিত হয়?"
                    q["options"] = ["[안따] — ㄴ ধ্বনি + পরের অক্ষর কঠিন", "দুটি বর্ণই সমান জোরে", "শুধু ㅈ", "কোনো ধ্বনিই নয়"]
                    q["answer"] = 0
                    q["explanationBn"] = "앉다-এর জোড় ব্যাচিম ㄵ সাধারণত ㄴ হিসেবে শোনা যায় এবং পরের ㄷ কঠিন হয়ে [안따]। এটি সরল ‘বর্ণমালার আগের অক্ষর’ নিয়ম নয়।"
                    q["topic"] = "batchim"
    return module


def add_tense_write_items(write_lab: dict) -> dict:
    """Add the 5 tense-consonant write items once (first write step only)."""
    extras = [
        {"id": "wr-kk", "char": "ㄲ", "strokeId": "ssanggiyeok"},
        {"id": "wr-tt", "char": "ㄸ", "strokeId": "ssangdigeut"},
        {"id": "wr-pp", "char": "ㅃ", "strokeId": "ssangbieup"},
        {"id": "wr-ss", "char": "ㅆ", "strokeId": "ssangsiot"},
        {"id": "wr-jj", "char": "ㅉ", "strokeId": "ssangjieut"},
    ]
    # Module-level uniqueness: only insert ids not already present anywhere.
    existing_global = set()
    for step in write_lab.get("steps", []):
        if step.get("type") == "write":
            existing_global.update(it["id"] for it in step["items"])
    for step in write_lab.get("steps", []):
        if step.get("type") != "write":
            continue
        for it in extras:
            if it["id"] not in existing_global:
                step["items"].append(it)
                existing_global.add(it["id"])
        break  # only first write step
    req = write_lab.get("requirements", {})
    if req.get("minWriteItems", 0) < 18:
        req["minWriteItems"] = 18
        write_lab["requirements"] = req
    return write_lab


def build_checkpoint() -> dict:
    base = load("checkpoint")
    bank: list = []
    # harvest from all modules
    for name in ["consonants", "vowels", "syllables", "batchim", "speak-lab", "write-lab", "welcome"]:
        mod = load(name)
        for step in mod.get("steps", []):
            if step.get("type") == "quiz":
                for q in step.get("questions", []):
                    qq = deepcopy(q)
                    qq["id"] = f"cp-h-{name}-{q['id']}"
                    bank.append(qq)
    # generate more until >= 110
    seed = 0
    while len({q["id"] for q in bank}) < 110 and seed < 40:
        for factory in (consonant_factory, vowel_factory, syllable_factory, batchim_factory):
            for q in factory(seed):
                qq = deepcopy(q)
                qq["id"] = f"cp-{qq['id']}"
                bank.append(qq)
        seed += 1
    # de-dupe
    by_id = {}
    for q in bank:
        by_id[q["id"]] = q
    questions = list(by_id.values())
    # ensure minima
    def count(pred):
        return sum(1 for q in questions if pred(q))

    # top up listen if needed
    seed = 100
    while count(lambda q: q["kind"] == "listen-choice") < 25 and seed < 200:
        for q in syllable_factory(seed) + batchim_factory(seed) + consonant_factory(seed):
            if q["kind"] == "listen-choice":
                q = deepcopy(q)
                q["id"] = f"cp-extra-listen-{seed}-{q['id']}"
                by_id[q["id"]] = q
        questions = list(by_id.values())
        seed += 1

    while count(lambda q: q["kind"] == "matching") < 10 and seed < 250:
        for q in consonant_factory(seed) + vowel_factory(seed) + batchim_factory(seed):
            if q["kind"] == "matching":
                q = deepcopy(q)
                q["id"] = f"cp-extra-match-{seed}-{q['id']}"
                by_id[q["id"]] = q
        questions = list(by_id.values())
        seed += 1

    # syllable / batchim topic counts
    def is_syl(q):
        if q.get("topic") == "syllable":
            return True
        blob = json.dumps(q, ensure_ascii=False)
        return any(ord(c) >= 0xAC00 and ord(c) <= 0xD7A3 for c in blob)

    def is_bat(q):
        if q.get("topic") == "batchim":
            return True
        blob = (q.get("promptBn", "") + q.get("explanationBn", "")).lower()
        return "받침" in blob or "batchim" in blob or "ব্যাচিম" in blob or "ব্যাচ্চিম" in blob

    seed = 300
    while count(is_syl) < 20 and seed < 360:
        for q in syllable_factory(seed):
            q = deepcopy(q)
            q["id"] = f"cp-extra-syl-{seed}-{q['id']}"
            by_id[q["id"]] = q
        questions = list(by_id.values())
        seed += 1
    while count(is_bat) < 12 and seed < 420:
        for q in batchim_factory(seed):
            q = deepcopy(q)
            q["id"] = f"cp-extra-bat-{seed}-{q['id']}"
            by_id[q["id"]] = q
        questions = list(by_id.values())
        seed += 1

    questions = list(by_id.values())
    # replace quiz step
    for step in base["steps"]:
        if step.get("type") == "quiz":
            step["drawCount"] = 25
            step["questions"] = questions
    base["estimatedMinutes"] = max(base.get("estimatedMinutes", 20), 25)
    return base


def expand_module_quizzes(name: str, factories: list, target_per_quiz=24, draw=12) -> dict:
    # Always reload originals if we already expanded once — re-run from git? 
    # Caller should pass clean modules; we prefix by step id for uniqueness.
    mod = load(name)
    quiz_i = 0
    for i, step in enumerate(mod["steps"]):
        if step.get("type") != "quiz":
            continue
        # welcome stays small orientation
        if name == "welcome":
            continue
        factory = factories[quiz_i % len(factories)]
        prefix = f"{name[:3]}-{step['id']}-"
        mod["steps"][i] = expand_quiz_step(step, target_per_quiz, factory, draw, prefix)
        quiz_i += 1
    return add_mnemonics(mod)


def main() -> None:
    # Consonants / vowels / syllables / batchim
    cons = expand_module_quizzes("consonants", [consonant_factory], target_per_quiz=28, draw=12)
    save("consonants", cons)

    vows = expand_module_quizzes("vowels", [vowel_factory], target_per_quiz=28, draw=12)
    save("vowels", vows)

    syl = expand_module_quizzes("syllables", [syllable_factory], target_per_quiz=26, draw=12)
    save("syllables", syl)

    bat = expand_module_quizzes("batchim", [batchim_factory], target_per_quiz=26, draw=12)
    bat = fix_batchim(bat)
    save("batchim", bat)

    speak = expand_module_quizzes(
        "speak-lab",
        [syllable_factory, consonant_factory],
        target_per_quiz=24,
        draw=12,
    )
    save("speak-lab", speak)

    write = expand_module_quizzes("write-lab", [consonant_factory, vowel_factory], target_per_quiz=24, draw=12)
    write = add_tense_write_items(write)
    write = add_mnemonics(write)
    save("write-lab", write)

    wel = add_mnemonics(load("welcome"))
    save("welcome", wel)

    cp = build_checkpoint()
    save("checkpoint", cp)

    # report
    for name in ["consonants", "vowels", "syllables", "batchim", "speak-lab", "write-lab", "checkpoint"]:
        m = load(name)
        for step in m["steps"]:
            if step.get("type") == "quiz":
                kinds = {}
                for q in step["questions"]:
                    kinds[q["kind"]] = kinds.get(q["kind"], 0) + 1
                print(
                    f"{name}/{step['id']}: bank={len(step['questions'])} draw={step.get('drawCount')} kinds={kinds}"
                )
    # mnemonic coverage
    for name in ["consonants", "vowels"]:
        m = load(name)
        total = with_m = 0
        for step in m["steps"]:
            if step.get("type") == "jamo-grid":
                for it in step["items"]:
                    total += 1
                    if it.get("shapeMnemonicBn"):
                        with_m += 1
        print(f"{name} mnemonics: {with_m}/{total}")


if __name__ == "__main__":
    main()
