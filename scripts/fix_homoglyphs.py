#!/usr/bin/env python3
"""
Repair word-internal Korean-homoglyph corruptions of Bangla words and a set of
vocabulary meaning/example defects across content/lessons/*.json.

Two mechanisms:
  A. PATH_FIX — full-field rewrites addressed by (file, section-path, field).
     Values are authored clean Bengali; Korean syllables kept only when they are
     deliberate pronunciation/exam references, always separated by quotes or
     parentheses so Bangla words stay word-internal clean.
  B. GLOBAL_SUBS — safe codepoint-level substitutions applied everywhere.
"""
import glob
import json

# ---------------------------------------------------------------------------
# A. Path-based rewrites:  (lesson, json-path..., new value)
# ---------------------------------------------------------------------------
PATH_FIX = [
    # lesson-08: 'স্বরবর্ণ'에 한국어 '의' + 'ধ্বনিটি'에 한국어 '니'
    ("lesson-08", ["vocabulary", 10, "pronunciationTipBn"],
     "'ㄹ' ধ্বনিটি দুই স্বরবর্ণের মাঝে 'র'-এর মতো উচ্চারিত হয়।"),
    # lesson-16
    ("lesson-16", ["grammar", 1, "commonMistakeBn"],
     "অনেকে স্বরবর্ণের পরে ভুল করে '으면 되다' ব্যবহার করেন; স্বরবর্ণের পরে সবসময় '면 되다' বসবে।"),
    # lesson-17: 까지 → পর্যন্ত
    ("lesson-17", ["grammar", 3, "examples", 2, "bn"],
     "এখান থেকে ওখান পর্যন্ত হেঁটে যাই।"),
    # lesson-18: ক্রিয়াপদ의 → ক্রিয়ার সঙ্গে
    ("lesson-18", ["grammar", 1, "explanationBn"],
     "কোনো স্থানে যাওয়ার বা আসার উদ্দেশ্য বোঝাতে ক্রিয়ার সঙ্গে '-(으)러 가다/오다' ব্যবহৃত হয়। ব্যঞ্জনবর্ণ থাকলে '-으러' এবং স্বরবর্ণ বা 'ㄹ' থাকলে '-러' বসে।"),
    # lesson-18 eps 안내문টি → নোটিশটি
    ("lesson-18", ["epsQuestions", 5, "questionBn"],
     "পরবর্তী নোটিশটি পড়ে সঠিক উত্তরটি বাছাই করুন।"),
    # lesson-20: ভিডিও কল / চ্যাট
    ("lesson-20", ["vocabulary", 13, "bn"], "ভিডিও কল"),
    ("lesson-20", ["vocabulary", 20, "example", "bn"], "আমি বন্ধুর সঙ্গে চ্যাট করি।"),
    # lesson-28: garbled explanations
    ("lesson-28", ["epsQuestions", 10, "explanationBn"],
     "প্যাসেজে বলা আছে, হানবক ভাড়ার দোকান উৎসবের দিনে খুব ব্যস্ত থাকে—অর্থাৎ বন্ধ থাকে না। তাই 'উৎসবে হানবক ভাড়া নিয়ে ছবি তোলেন অনেকে'—এই বাক্যটিই পাঠের সঙ্গে মিলে যায়।"),
    ("lesson-28", ["epsQuestions", 11, "explanationBn"],
     "প্যাসেজটি মূলত পরিবার ও উৎসবের প্রস্তুতি নিয়ে; 'উৎসবের প্রস্তুতি' (বিকল্প 1) ও 'উৎসবের ঐতিহ্যবাহী খেলা' (বিকল্প 2)-এর মধ্যে পাঠের সঙ্গে মিলে যাওয়াটি সঠিক।"),
    # lesson-30
    ("lesson-30", ["grammar", 2, "explanationBn"],
     "কোনো কাজ করে দেখা বা চেষ্টা করা বোঝাতে ক্রিয়ার সঙ্গে '-আ/ও দেখুন' যুক্ত হয়।"),
    # lesson-32: বলায় → বলা উচিত
    ("lesson-32", ["practice", 0, "explanationBn"],
     "মিটিং রুমের বুকিং ম্যানেজারের কাজ; তাই 'ম্যানেজারের কাছে' বলা উচিত।"),
    # lesson-33: কাজটি → কাজটি
    ("lesson-33", ["grammar", 2, "explanationBn"],
     "বক্তা সামনে নিজের করণীয় প্রকাশ করতে এই গঠন ব্যবহার করেন; কাজের প্রতিশ্রুতি দিতে বা ভবিষ্যৎ কর্মকাণ্ড বর্ণনাতে সহায়ক। উদাহরণ: '내일 도와줄게요' (কাল সাহায্য করব), '제가 회의록을 작성할게요' (আমি মিটিংয়ের নোট লিখব)।"),
    # lesson-35: (비পজ্্জনক) → (বিপজ্জনক), 의 → -এর
    ("lesson-35", ["practice", 13, "explanationBn"],
     "'위험하다' (বিপজ্জনক)-এর বিপরীত শব্দ '안전하다' (নিরাপদ)।"),
    # lesson-36: ঠোঁট + উদাহরণের → উদাহরণগুলো
    ("lesson-36", ["vocabulary", 28, "pronunciationTipBn"],
     "'취' উচ্চারণ করার সময় ঠোঁট গোল করুন।"),
    ("lesson-36", ["grammar", 0, "explanationBn"],
     "কিছু বলার সময় বিনীতভাবে কাউকে অনুরোধ করতে ব্যবহৃত হয়। উদাহরণ: 'লেবেলটি লাগিয়ে দিন'।\nউদাহরণগুলো:\n1) '포장해 주세요' — দয়া করে প্যাক করুন।\n2) '송장을 보여 주세요' — ইনভয়েস দেখান অনুগ্রহ করে।"),
    ("lesson-36", ["grammar", 1, "explanationBn"],
     "কোনো কাজ করা আবশ্যক বা প্রয়োজন বোঝায়। সাধারণ কথ্যবাক্যে '~আ/ও হওয়া দরকার' বলা হয়।\nউদাহরণগুলো:\n1) '수량을 확인해야 해요' — পরিমাণ চেক করতে হবে।\n2) '운송장을 작성해야 해요' — শিপিং বিল লিখতে হবে।"),
    ("lesson-36", ["grammar", 2, "explanationBn"],
     "শর্ত জানাতে বা 'যদি... তবে...' বলতে ব্যবহৃত হয়।\nউদাহরণগুলো:\n1) '수량이 맞으면 출하합니다' — পরিমাণ ঠিক থাকলে চালান করব।\n2) '도착하면 연락 주세요' — পৌঁছালে জানান।"),
    # lesson-37: সুইচ
    ("lesson-37", ["vocabulary", 26, "example", "bn"], "সুইচ চালু করুন।"),
    # lesson-38: নিন → দিন
    ("lesson-38", ["vocabulary", 6, "example", "bn"], "বোল্টের সঙ্গে ওয়াশারটি দিন।"),
    # lesson-40: '정지하다'는বন্ধ → spaced, glossed
    ("lesson-40", ["practice", 15, "explanationBn"],
     "মোল্ডে সমস্যা থাকলে সঙ্গে সঙ্গে মেশিন '정지' (থামাতে) হবে। '정지하다'-এর অর্থ বন্ধ করা বা থামানো।"),
    # lesson-41: পরীক্ষা / বাধ্যবাধকতা
    ("lesson-41", ["practice", 6, "explanationBn"],
     "'바로 검사하고' মানে সঙ্গে সঙ্গে পরীক্ষা করা—এই প্রসঙ্গে '바로' (সঙ্গে সঙ্গে)-ই সঠিক।"),
    ("lesson-41", ["practice", 15, "explanationBn"],
     "বাধ্যবাধকতা বোঝাতে '-আয়া হামনিদা' প্রকাশটি সঠিক।"),
    # lesson-43: মুি → মাথা / বাক্যটি → বাক্যটির অর্থ
    ("lesson-43", ["practice", 1, "explanationBn"],
     "নিরাপত্তা হেলমেট মাথা নিরাপদ রাখার জন্য; তাই '머리 보호를 위해' (মাথার সুরক্ষার জন্য)-ই সঠিক।"),
    ("lesson-43", ["practice", 4, "explanationBn"],
     "বাক্যটির অর্থ: অনুমতি পেলে সঙ্গে সঙ্গে শুরু করুন — বিকল্প 1 সঠিক।"),
    # lesson-44: ধ্বনিটি + ঠোঁট
    ("lesson-44", ["vocabulary", 6, "pronunciationTipBn"],
     "'ㄹ' ধ্বনিটি 'ㄴ'-এর মতো উচ্চারিত হয় (측); '측' উচ্চারণ করার সময় 'ㅊ' একটু জোর দিয়ে বলুন।"),
    ("lesson-44", ["vocabulary", 11, "pronunciationTipBn"],
     "'ㄷ' ধ্বনিটি 'দ' এবং 'ত'-এর মাঝামাঝি; '트' উচ্চারণ করার সময় 'ㅌ' একটু জোর দিয়ে বলুন।"),
    ("lesson-44", ["vocabulary", 12, "pronunciationTipBn"],
     "'ㅋ' ধ্বনিটি 'খ'-এর মতো; '크' উচ্চারণ করার সময় 'ㅋ' ধ্বনিটি 'র'-এর মতো হবে।"),
    ("lesson-44", ["vocabulary", 13, "pronunciationTipBn"],
     "'ㅅ' ধ্বনিটি 'স'-এর মতো; '보' উচ্চারণ করার সময় ঠোঁট গোল করুন।"),
    ("lesson-44", ["vocabulary", 14, "pronunciationTipBn"],
     "'ㅇ' ধ্বনিটি শব্দের শুরুতে উচ্চারিত হয় না; '모' উচ্চারণ করার সময় ঠোঁট গোল করুন।"),
    ("lesson-44", ["vocabulary", 15, "pronunciationTipBn"],
     "'ㅈ' ধ্বনিটি 'জ' এবং 'চ'-এর মাঝামাঝি; '업' উচ্চারণ করার সময় 'ㅂ' ধ্বনিটি 'প'-এর মতো হবে।"),
    ("lesson-44", ["vocabulary", 16, "pronunciationTipBn"],
     "'ㅂ' ধ্বনিটি 'ব' এবং 'প'-এর মাঝামাঝি; '수' উচ্চারণ করার সময় ঠোঁট গোল করুন।"),
    ("lesson-44", ["vocabulary", 17, "pronunciationTipBn"],
     "'ㅂ' ধ্বনিটি 'ব' এবং 'প'-এর মাঝামাঝি; '도' উচ্চারণ করার সময় ঠোঁট গোল করুন।"),
    # lesson-44 파일 bn (pure Korean) → Bangla
    ("lesson-44", ["vocabulary", 21, "bn"], "ফাইল (নখ)/খুঁটি"),
    # lesson-45: অনেক → অতিরিক্ত
    ("lesson-45", ["practice", 15, "explanationBn"],
     "মাটি খোঁড়ার জন্য '벨차' (কোদাল) ব্যবহার করা হয়। তাই 2 নম্বরটি সঠিক।"),
    # lesson-47: প্রথমটি → প্রথমটি
    ("lesson-47", ["epsQuestions", 0, "explanationBn"],
     "নির্দেশ-বাক্যে নিরাপত্তা সরঞ্জাম পরতে বলা হয়েছে; তাই প্রথমটি সঠিক।"),
    # lesson-48: সুইচ + সেফটি ×3
    ("lesson-48", ["vocabulary", 27, "example", "bn"], "সুইচ বন্ধ করুন।"),
    ("lesson-48", ["practice", 10, "explanationBn"],
     "চোখ রক্ষার জন্য নিরাপত্তা চশমা (সেফটি গগলস) ব্যবহার করতে হবে।"),
    ("lesson-48", ["practice", 11, "explanationBn"],
     "পা রক্ষার জন্য নিরাপত্তা জুতা (সেফটি জুতো) পরতে হবে।"),
    ("lesson-48", ["practice", 12, "explanationBn"],
     "উঁচু জায়গায় কাজ করার সময় নিরাপত্তা বেল্ট (সেফটি বেল্ট) বাঁধতে হবে।"),
    # lesson-50: বনধ ×3 → বন পরিষদ
    ("lesson-50", ["vocabulary", 13, "bn"], "কোরিয়ার বন পরিষদ (Forest Service)"),
    ("lesson-50", ["vocabulary", 13, "example", "bn"], "বন পরিষদের সঙ্গে যোগাযোগ করুন।"),
    ("lesson-50", ["dialogues", 1, "lines", 1, "bn"], "হ্যাঁ, বন পরিষদ থেকে ইস্যু করা অনুমতিপত্র আছে।"),
    # lesson-51: হোটেলেই + ভালোবাসা + অর্থের সঙ্গে
    ("lesson-51", ["vocabulary", 0, "example", "bn"], "এই ব্যবসা সফরে আমি থাকার ব্যবস্থা হোটেলেই করেছি।"),
    ("lesson-51", ["grammar", 1, "explanationBn"],
     "বর্ণনা: কাউকে কোনো কিছু করার জন্য বিনীতভাবে অনুরোধ করতে ক্রিয়ার মূলের পরে '-আ/ও দিন' যুক্ত হয়। উদাহরণ:\n1) '문을 닫아 주세요' → দরজা বন্ধ করে দিন।\n2) '수건을 더 주세요' → আরও তোয়ালে দিন।"),
    ("lesson-51", ["practice", 8, "explanationBn"],
     "প্রতিটি কোরীয় শব্দের সঙ্গে সঠিক বাংলা অর্থ মেলালেই হবে।"),
    # lesson-53: ঢুকবেন না + চিহ্ন
    ("lesson-53", ["grammar", 0, "explanationBn"],
     "এই গঠনটি কাউকে কোনো কাজ না করতে বলার জন্য। উদাহরণ: '출입금지' দেখলে 'ভেতরে যাবেন না' বলি। উদাহরণ বাক্য:\n1) বিপজ্জনক এলাকা: 들어가지 마세요 — ভেতরে যাবেন না।\n2) অগ্নিনির্বাপক যন্ত্র: 손대지 마세요 — স্পর্শ করবেন না।"),
    ("lesson-53", ["practice", 1, "questionBn"],
     "যদি '전기위험' (বৈদ্যুতিক বিপদ) চিহ্ন থাকে আপনি কী করবেন?"),
    # lesson-57
    ("lesson-57", ["practice", 14, "explanationBn"],
     "ভিসা নবায়নের কাজ '출입국관리사무소' (অভিবাসন অফিস)-এ করা হয়।"),
    # lesson-59: অবস্থানের সময় + স্বেচ্ছা প্রস্থান
    ("lesson-59", ["practice", 1, "explanationBn"],
     "চেউগিয়ান (체류기간) মানে কত দিন থাকা যাবে—অর্থাৎ অবস্থানের মেয়াদ।"),
    ("lesson-59", ["epsQuestions", 2, "explanationBn"],
     "প্যাসেজে স্বেচ্ছায় দেশে ফেরাকে (자진출국) একটি সমাধান হিসেবে উল্লেখ করা হয়েছে; তাই তৃতীয়টি সঠিক।"),
    # lesson-60: আবেদন ফর্ম + নিবন্ধন ফর্ম
    ("lesson-60", ["practice", 0, "explanationBn"],
     "'신청서' মানে আবেদনপত্র বা আবেদন ফর্ম — সঠিক উত্তর প্রথমটি।"),
    ("lesson-60", ["epsQuestions", 1, "explanationBn"],
     "পাঠে বলা আছে নিবন্ধন ফর্ম জমা দিতে হবে — দ্বিতীয়টি সঠিক।"),
]

# ---------------------------------------------------------------------------
# B. Vocabulary lookups by Korean headword:  lesson -> ko word -> new bn/example
# ---------------------------------------------------------------------------
VOCAB_FIX = {
    "lesson-34": {
        "성폭력": {"example_bn": "যৌন সহিংসতার ভুক্তভোগীরা সহায়তা পেতে পারেন।"},
    },
    "lesson-37": {
        "가공": {"bn": "প্রক্রিয়াকরণ"},
        "밀링": {"bn": "মিলিং (মিলিং প্রক্রিয়াকরণ)"},
    },
    "lesson-45": {
        "비료": {"example_bn": "সার খুব বেশি দেবেন না।"},
    },
    "lesson-46": {
        "물통": {"bn": "পানির টব"},
    },
    "lesson-59": {
        "체류자격": {"bn": "থাকার যোগ্যতা/স্টে"},
    },
    "lesson-60": {
        "고용보험": {"example_bn": "দক্ষিণ কোরিয়ায় কর্মসংস্থান বীমায় যোগ দিলে বেকার ভাতা পাওয়া যেতে পারে।"},
    },
}

# ---------------------------------------------------------------------------
# C. Global codepoint-safe substitutions
# ---------------------------------------------------------------------------
KOREAN_TEU = chr(0xd2b8)  # 트
GLOBAL_SUBS = [
    # ঠোঁট with Korean 트 → ঠোঁট
    ("ঁ" + KOREAN_TEU, "ঁট"),
]


def apply_path(data, path, new_value):
    node = data
    for key in path[:-1]:
        node = node[key]
    leaf = path[-1]
    old = node.get(leaf, "")
    node[leaf] = new_value
    return old


def main():
    files = sorted(glob.glob("content/lessons/lesson-*.json"))
    by_lesson = {p.split("/")[-1].replace(".json", ""): p for p in files}
    applied, missing = [], []
    touched = set()

    for lesson, path, new_value in PATH_FIX:
        p = by_lesson.get(lesson)
        if not p:
            missing.append((lesson, path, "file not found"))
            continue
        data = json.loads(open(p, encoding="utf-8").read())
        try:
            old = apply_path(data, path, new_value)
        except (KeyError, IndexError, TypeError) as e:
            missing.append((lesson, path, repr(e)))
            continue
        if old != new_value:
            with open(p, "w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)
                fh.write("\n")
            applied.append((lesson, path))
            touched.add(p)

    for lesson, fixes in VOCAB_FIX.items():
        p = by_lesson.get(lesson)
        data = json.loads(open(p, encoding="utf-8").read())
        changed = False
        for v in data.get("vocabulary", []):
            fx = fixes.get(v.get("ko", ""))
            if not fx:
                continue
            if "bn" in fx and v.get("bn") != fx["bn"]:
                v["bn"] = fx["bn"]
                changed = True
            if "example_bn" in fx:
                ex = v.get("example") or {}
                if ex.get("bn") != fx["example_bn"]:
                    ex["bn"] = fx["example_bn"]
                    v["example"] = ex
                    changed = True
        if changed:
            with open(p, "w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)
                fh.write("\n")
            applied.append((lesson, ["vocabulary", list(fixes)]))
            touched.add(p)

    for p in files:
        raw = open(p, encoding="utf-8").read()
        new = raw
        for old_s, new_s in GLOBAL_SUBS:
            new = new.replace(old_s, new_s)
        if new != raw:
            open(p, "w", encoding="utf-8").write(new)
            touched.add(p)
            applied.append((p, ["global-subs"]))

    print(f"applied: {len(applied)} fixes across {len(touched)} files")
    if missing:
        print("MISSING (verify paths!):")
        for m in missing:
            print("  ", m)
    else:
        print("no missing paths")


if __name__ == "__main__":
    main()
