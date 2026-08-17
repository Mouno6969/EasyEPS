#!/usr/bin/env python3
"""Add official EPS-TOPIK-style picture questions to lesson JSON files.

Models the official HRD Korea 공개문제집 reading item types [1~4]:
- Picture identification (objects, vehicles, actions)
- Safety-sign sentence selection
- Vocabulary definition with picture
"""
import json
import re
import glob

LESSONS_DIR = "content/lessons"
IMG = "/eps-images"

# ---------------------------------------------------------------------------
# Picture question bank modeled on the official HRD Korea released items.
# Each question: {lesson_matches, section, kind, image, questionKo, questionBn,
#                 options, answer, explanationBn}
# ---------------------------------------------------------------------------

PICTURE_QUESTIONS = [
    # ---- Reading, object identification (official [1~4] type 1) ----
    {
        "lesson_matches": ["daily-life", "workplace"],
        "section": "reading",
        "image": {"src": IMG + "/obj-pen.svg", "altBn": "বলপেনের ছবি — একটি বলপেন", "altKo": "볼펜", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 단어를 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক শব্দটি বেছে নিন।",
        "options": ["볼펜입니다.", "가위입니다.", "안경입니다.", "가방입니다."],
        "answer": 0,
        "explanationBn": "ছবিতে একটি বলপেন (볼펜) আঁকা আছে।",
    },
    {
        "lesson_matches": ["daily-life"],
        "section": "reading",
        "image": {"src": IMG + "/obj-scissors.svg", "altBn": "কাঁচির ছবি — একজোড়া কাঁচি", "altKo": "가위", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 단어를 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক শব্দটি বেছে নিন।",
        "options": ["볼펜입니다.", "가위입니다.", "안경입니다.", "가방입니다."],
        "answer": 1,
        "explanationBn": "ছবিতে একজোড়া কাঁচি (가위) আঁকা আছে।",
    },
    {
        "lesson_matches": ["daily-life"],
        "section": "reading",
        "image": {"src": IMG + "/obj-glasses.svg", "altBn": "চশমার ছবি — একজোড়া চশমা", "altKo": "안경", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 단어를 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক শব্দটি বেছে নিন।",
        "options": ["볼펜입니다.", "가위입니다.", "안경입니다.", "가방입니다."],
        "answer": 2,
        "explanationBn": "ছবিতে একজোড়া চশমা (안경) আঁকা আছে।",
    },
    {
        "lesson_matches": ["daily-life"],
        "section": "reading",
        "image": {"src": IMG + "/obj-bag.svg", "altBn": "ব্যাগের ছবি — একটি ব্যাগ", "altKo": "가방", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 단어를 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক শব্দটি বেছে নিন।",
        "options": ["볼펜입니다.", "가위입니다.", "안경입니다.", "가방입니다."],
        "answer": 3,
        "explanationBn": "ছবিতে একটি ব্যাগ (가방) আঁকা আছে।",
    },
    # ---- Reading, vehicle identification (official [1~4] type 2) ----
    {
        "lesson_matches": ["workplace", "safety"],
        "section": "reading",
        "image": {"src": IMG + "/obj-forklift.svg", "altBn": "ফর্কলিফটের ছবি — একটি ফর্কলিফট", "altKo": "지게차", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 단어를 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক শব্দটি বেছে নিন।",
        "options": ["지게차입니다.", "굴착기입니다.", "트랙터입니다.", "경운기입니다."],
        "answer": 0,
        "explanationBn": "ছবিতে মাল তোলার যন্ত্র ফর্কলিফট (지게차) আঁকা আছে।",
    },
    {
        "lesson_matches": ["workplace", "safety"],
        "section": "reading",
        "image": {"src": IMG + "/obj-excavator.svg", "altBn": "এক্সকেভেটারের ছবি — একটি খননযন্ত্র", "altKo": "굴착기", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 단어를 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক শব্দটি বেছে নিন।",
        "options": ["지게차입니다.", "굴착기입니다.", "트랙터입니다.", "경운기입니다."],
        "answer": 1,
        "explanationBn": "ছবিতে মাটি খননকারী যন্ত্র এক্সকেভেটার (굴착기) আঁকা আছে।",
    },
    {
        "lesson_matches": ["daily-life", "workplace"],
        "section": "reading",
        "image": {"src": IMG + "/obj-tractor.svg", "altBn": "ট্র্যাক্টরের ছবি — একটি ট্র্যাক্টর", "altKo": "트랙터", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 단어를 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক শব্দটি বেছে নিন।",
        "options": ["지게차입니다.", "굴착기입니다.", "트랙터입니다.", "경운기입니다."],
        "answer": 2,
        "explanationBn": "ছবিতে বড় চাকার ট্র্যাক্টর (트랙터) আঁকা আছে।",
    },
    {
        "lesson_matches": ["daily-life", "workplace"],
        "section": "reading",
        "image": {"src": IMG + "/obj-tiller.svg", "altBn": "ঘূর্ণন চষাযন্ত্রের ছবি — একটি কাল্টিভেটর", "altKo": "경운기", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 단어를 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক শব্দটি বেছে নিন।",
        "options": ["지게차입니다.", "굴착기입니다.", "트랙터입니다.", "경운기입니다."],
        "answer": 3,
        "explanationBn": "ছবিতে ছোট চাষের যন্ত্র কাল্টিভেটর (경운기) আঁকা আছে।",
    },
    # ---- Reading, action identification (official [1~4] type 3) ----
    {
        "lesson_matches": ["daily-life"],
        "section": "reading",
        "image": {"src": IMG + "/action-reading.svg", "altBn": "বই পড়ার ছবি — মানুষটি বই পড়ছে", "altKo": "책을 읽고 있습니다", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 문장을 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক বাক্যটি বেছে নিন।",
        "options": ["책을 읽고 있습니다.", "밥을 먹고 있습니다.", "친구를 만나고 있습니다.", "피아노를 치고 있습니다."],
        "answer": 0,
        "explanationBn": "ছবিতে মানুষটি বই খুলে পড়ছে (책을 읽고 있습니다)।",
    },
    {
        "lesson_matches": ["daily-life"],
        "section": "reading",
        "image": {"src": IMG + "/action-eating.svg", "altBn": "খাবার খাওয়ার ছবি — মানুষটি খাবার খাচ্ছে", "altKo": "밥을 먹고 있습니다", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 문장을 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক বাক্যটি বেছে নিন।",
        "options": ["책을 읽고 있습니다.", "밥을 먹고 있습니다.", "친구를 만나고 있습니다.", "피아노를 치고 있습니다."],
        "answer": 1,
        "explanationBn": "ছবিতে মানুষটি খাবার খাচ্ছে (밥을 먹고 있습니다)।",
    },
    {
        "lesson_matches": ["daily-life"],
        "section": "reading",
        "image": {"src": IMG + "/action-meeting.svg", "altBn": "বন্ধুদের দেখা করার ছবি — দুজন মানুষ করমর্দন করছে", "altKo": "친구를 만나고 있습니다", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 문장을 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক বাক্যটি বেছে নিন।",
        "options": ["책을 읽고 있습니다.", "밥을 먹고 있습니다.", "친구를 만나고 있습니다.", "피아노를 치고 있습니다."],
        "answer": 2,
        "explanationBn": "ছবিতে দুজন মানুষ করমর্দন করে দেখা করছে (친구를 만나고 있습니다)।",
    },
    {
        "lesson_matches": ["daily-life", "culture"],
        "section": "reading",
        "image": {"src": IMG + "/action-piano.svg", "altBn": "পিয়ানো বাজানোর ছবি — মানুষটি পিয়ানো বাজাচ্ছে", "altKo": "피아노를 치고 있습니다", "kind": "illustration"},
        "questionKo": "다음 그림을 보고 맞는 문장을 고르십시오.",
        "questionBn": "ছবিটি দেখে সঠিক বাক্যটি বেছে নিন।",
        "options": ["책을 읽고 있습니다.", "밥을 먹고 있습니다.", "친구를 만나고 있습니다.", "피아노를 치고 있습니다."],
        "answer": 3,
        "explanationBn": "ছবিতে মানুষটি পিয়ানো বাজাচ্ছে (피아노를 치고 있습니다)।",
    },
    # ---- Reading, safety-sign sentence selection (official [1~4] type 4) ----
    {
        "lesson_matches": ["safety"],
        "section": "reading",
        "image": {"src": IMG + "/sign-slippery.svg", "altBn": "পিচ্ছল মেঝের সতর্কতা চিহ্ন", "altKo": "바닥이 미끄럽습니다", "kind": "safety-sign"},
        "questionKo": "다음 안전 표지판을 보고 맞는 문장을 고르십시오.",
        "questionBn": "নিচের নিরাপত্তা চিহ্ন দেখে সঠিক বাক্যটি বেছে নিন।",
        "options": ["전기가 흐르니까 조심하세요.", "떨어질 수 있으니까 조심하세요.", "바닥이 미끄러우니까 조심하세요.", "불이 붙을 수 있으니까 조심하세요."],
        "answer": 2,
        "explanationBn": "চিহ্নটি পিচ্ছল মেঝের সতর্কতা বোঝায়, তাই 'মেঝে পিচ্ছল, সাবধান' (바닥이 미끄러우니까 조심하세요) সঠিক।",
    },
    {
        "lesson_matches": ["safety"],
        "section": "reading",
        "image": {"src": IMG + "/sign-electric-hazard-v2.svg", "altBn": "বিদ্যুৎ বিপদের সতর্কতা চিহ্ন", "altKo": "전기가 흐릅니다", "kind": "safety-sign"},
        "questionKo": "다음 안전 표지판을 보고 맞는 문장을 고르십시오.",
        "questionBn": "নিচের নিরাপত্তা চিহ্ন দেখে সঠিক বাক্যটি বেছে নিন।",
        "options": ["전기가 흐르니까 조심하세요.", "떨어질 수 있으니까 조심하세요.", "바닥이 미끄러우니까 조심하세요.", "불이 붙을 수 있으니까 조심하세요."],
        "answer": 0,
        "explanationBn": "চিহ্নটিতে বিদ্যুতের চিহ্ন আছে, তাই 'বিদ্যুৎ প্রবাহিত হচ্ছে, সাবধান' (전기가 흐르니까 조심하세요) সঠিক।",
    },
    {
        "lesson_matches": ["safety"],
        "section": "reading",
        "image": {"src": IMG + "/sign-fall-hazard.svg", "altBn": "পড়ে যাওয়ার বিপদের সতর্কতা চিহ্ন", "altKo": "떨어질 수 있습니다", "kind": "safety-sign"},
        "questionKo": "다음 안전 표지판을 보고 맞는 문장을 고르십시오.",
        "questionBn": "নিচের নিরাপত্তা চিহ্ন দেখে সঠিক বাক্যটি বেছে নিন।",
        "options": ["전기가 흐르니까 조심하세요.", "떨어질 수 있으니까 조심하세요.", "바닥이 미끄러우니까 조심하세요.", "불이 붙을 수 있으니까 조심하세요."],
        "answer": 1,
        "explanationBn": "চিহ্নটিতে মানুষ পড়ে যাওয়ার ছবি আছে, তাই 'পড়ে যেতে পারে, সাবধান' (떨어질 수 있으니까 조심하세요) সঠিক।",
    },
    {
        "lesson_matches": ["safety"],
        "section": "reading",
        "image": {"src": IMG + "/sign-fire-hazard.svg", "altBn": "আগুনের বিপদের সতর্কতা চিহ্ন", "altKo": "불이 붙을 수 있습니다", "kind": "safety-sign"},
        "questionKo": "다음 안전 표지판을 보고 맞는 문장을 고르십시오.",
        "questionBn": "নিচের নিরাপত্তা চিহ্ন দেখে সঠিক বাক্যটি বেছে নিন।",
        "options": ["전기가 흐르니까 조심하세요.", "떨어질 수 있으니까 조심하세요.", "바닥이 미끄러우니까 조심하세요.", "불이 붙을 수 있으니까 조심하세요."],
        "answer": 3,
        "explanationBn": "চিহ্নটিতে আগুনের শিখা আছে, তাই 'আগুন লাগতে পারে, সাবধান' (불이 붙을 수 있으니까 조심하세요) সঠিক।",
    },
    # ---- Reading, no-entry sign (official workplace passage style) ----
    {
        "lesson_matches": ["workplace", "safety", "laws"],
        "section": "reading",
        "image": {"src": IMG + "/sign-no-passage.svg", "altBn": "চলাচল নিষেধের চিহ্ন", "altKo": "통행금지", "kind": "safety-sign"},
        "questionKo": "다음 표지판을 보고 맞는 문장을 고르십시오.",
        "questionBn": "নিচের চিহ্নটি দেখে সঠিক বাক্যটি বেছে নিন।",
        "options": ["이 길을 지나가도 됩니다.", "이 길로 통행하면 안 됩니다.", "여기서 쉬어도 됩니다.", "이 표지는 비상구입니다."],
        "answer": 1,
        "explanationBn": "চিহ্নটি চলাচল নিষেধ (통행금지) বোঝায়, তাই এই পথ দিয়ে যাওয়া যায় না (이 길로 통행하면 안 됩니다)।",
    },
    # ---- Reading, vocabulary with picture (official [17] definition type) ----
    {
        "lesson_matches": ["workplace", "safety"],
        "section": "reading",
        "image": {"src": IMG + "/tool-pliers.svg", "altBn": "প্লায়ার্সের ছবি — তার কাটা ও বাঁকানোর হাতিয়ার", "altKo": "펜치", "kind": "illustration"},
        "questionKo": "다음 그림의 도구를 고르십시오. 철사를 끊거나 구부릴 때 사용합니다.",
        "questionBn": "নিচের ছবির হাতিয়ারটি বেছে নিন। এটি তার কাটতে বা বাঁকাতে ব্যবহার করা হয়।",
        "options": ["토치", "펜치", "쇠톱", "망치"],
        "answer": 1,
        "explanationBn": "ছবিতে প্লায়ার্স (펜치) আঁকা আছে — এটি তার কাটা ও বাঁকানোর কাজে লাগে।",
    },
    {
        "lesson_matches": ["workplace"],
        "section": "reading",
        "image": {"src": IMG + "/tool-hammer.svg", "altBn": "হাতুড়ির ছবি — পেরেক ঠুকে বসানোর হাতিয়ার", "altKo": "망치", "kind": "illustration"},
        "questionKo": "다음 그림의 도구를 고르십시오. 못을 박을 때 사용합니다.",
        "questionBn": "নিচের ছবির হাতিয়ারটি বেছে নিন। এটি পেরেক ঠুকে বসাতে ব্যবহার করা হয়।",
        "options": ["토치", "펜치", "쇠톱", "망치"],
        "answer": 3,
        "explanationBn": "ছবিতে হাতুড়ি (망치) আঁকা আছে — এটি পেরেক ঠুকে বসানোর কাজে লাগে।",
    },
    # ---- Reading, safety equipment identification ----
    {
        "lesson_matches": ["safety"],
        "section": "reading",
        "image": {"src": IMG + "/tool-vest.svg", "altBn": "রিফ্লেকটিভ সেফটি ভেস্টের ছবি", "altKo": "반사 조끼", "kind": "illustration"},
        "questionKo": "어두운 곳에서 작업할 때 입는 것을 고르십시오.",
        "questionBn": "অন্ধকার জায়গায় কাজ করার সময় যা পরা হয়, সেটি বেছে নিন।",
        "options": ["반사 조끼", "작업복", "보호 장갑", "안전모"],
        "answer": 0,
        "explanationBn": "ছবিতে রিফ্লেকটিভ সেফটি ভেস্ট (반사 조끼) আঁকা আছে — অদ্ধকারে দূর থেকে দেখা যায় বলে এটি পরতে হয়।",
    },
    {
        "lesson_matches": ["workplace", "safety"],
        "section": "reading",
        "image": {"src": IMG + "/tool-uniform.svg", "altBn": "কাজের পোশাকের (কভারঅল) ছবি", "altKo": "작업복", "kind": "illustration"},
        "questionKo": "작업장에서 근로자가 입는 옷을 고르십시오.",
        "questionBn": "কাজের জায়গায় শ্রমিকরা যে পোশাক পরে, সেটি বেছে নিন।",
        "options": ["컴퓨터", "작업복", "비빔밥", "기차표"],
        "answer": 1,
        "explanationBn": "ছবিতে কাজের পোশাক (작업복) আঁকা আছে — এটি '복장' শব্দের সাথে সম্পর্কিত।",
    },
    # ---- Listening, visual-data item (official listening visual type) ----
    {
        "lesson_matches": ["daily-life"],
        "section": "listening",
        "image": {"src": IMG + "/item-clock.svg", "altBn": "ঘড়ির ছবি — ৯টা বাজছে", "altKo": "오전 아홉 시", "kind": "illustration"},
        "questionKo": "그림을 보고 대화를 들은 후 알맞은 것을 고르십시오.",
        "questionBn": "ছবিটি দেখে কথোপকথন শুনে সঠিক উত্তরটি বেছে নিন।",
        "passage": "남: 이 병원은 몇 시에 문을 열어요? / 여: 오전 아홉 시에 문을 엽니다.",
        "options": ["부천시입니다.", "김미소입니다.", "튼튼치과입니다.", "오전 아홉 시입니다."],
        "answer": 3,
        "explanationBn": "কথোপকথনে বলা হয়েছে স্পতালটি সকাল ৯টায় খোলে, আর ছবিতেও ঘড়িটি ৯টা দেখাচ্ছে — তাই দ্বিতীয় বিকল্প সঠিক।",
    },
    {
        "lesson_matches": ["daily-life"],
        "section": "listening",
        "image": {"src": IMG + "/obj-pen.svg", "altBn": "বলপেনের ছবি", "altKo": "볼펜", "kind": "illustration"},
        "questionKo": "그림을 보고 대화를 들은 후 알맞은 것을 고르십시오.",
        "questionBn": "ছবিটি দেখে কথোপকথন শুনে সঠিক উত্তরটি বেছে নিন।",
        "passage": "남: 사무실에 뭐가 있어요? / 여: 책상 위에 볼펜이 있어요.",
        "options": ["가위", "안경", "볼펜", "가방"],
        "answer": 2,
        "explanationBn": "কথোপকথনে বলা হয়েছে ডেস্কের উপর বলপেন আছে (볼펜), ছবিতেও বলপেন আঁকা — তাই তৃতীয় বিকল্প সঠিক।",
    },
    {
        "lesson_matches": ["safety"],
        "section": "listening",
        "image": {"src": IMG + "/sign-slippery.svg", "altBn": "পিচ্ছল মেঝের সতর্কতা চিহ্ন", "altKo": "바닥이 미끄럽습니다", "kind": "safety-sign"},
        "questionKo": "그림을 보고 대화를 들은 후 알맞은 것을 고르십시오.",
        "questionBn": "ছবিটি দেখে কথোপকথন শুনে সঠিক উত্তরটি 바ছে নিন।",
        "passage": "남: 이 표지판이 무슨 뜻이에요? / 여: 바닥이 미끄러우니까 조심하라는 뜻이에요.",
        "options": ["전기가 흐른다는 뜻이에요.", "떨어질 수 있다는 뜻이에요.", "바닥이 미끄럽다는 뜻이에요.", "불이 붙을 수 있다는 뜻이에요."],
        "answer": 2,
        "explanationBn": "কথোপকথনে বলা হয়েছে মেঝে পিচ্ছল তাই সাবধান — ছবিটির সাথে মিলে যায়, তাই তৃতীয় বিকল্প সঠিক।",
    },
    {
        "lesson_matches": ["safety", "workplace"],
        "section": "listening",
        "image": {"src": IMG + "/tool-vest.svg", "altBn": "রিফ্লেকটিভ সেফটি ভেস্টের ছবি", "altKo": "반사 조끼", "kind": "illustration"},
        "questionKo": "그림을 보고 대화를 들은 후 알맞은 것을 고르십시오.",
        "questionBn": "ছবিটি দেখে কথোপকথন শুনে সঠিক উত্তরটি বেছে নিন।",
        "passage": "남: 어두운 곳에서 작업할 때 무엇을 입어요? / 여: 반사 조끼를 입어야 해요.",
        "options": ["반사 조끼를 입어야 합니다.", "보호 장갑을 구매해야 합니다.", "비상 계단을 이용해야 합니다.", "환기 장치를 작동해야 합니다."],
        "answer": 0,
        "explanationBn": "কথোপকথনে বলা হয়েছে অদ্ধকারে রিফ্লেকটিভ ভেস্ট (반사 조끼) পরতে হয় — ছবিতেও সেটাই আঁকা, তাই প্রথম বিকল্প সঠিক।",
    },
]


def load_lessons():
    files = sorted(glob.glob(f"{LESSONS_DIR}/*.json"))
    return [(f, json.load(open(f))) for f in files]


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
    lessons = load_lessons()
    added = 0
    for path, lesson in lessons:
        category = lesson.get("category", "")
        chapter = lesson.get("chapter")
        questions = lesson.get("epsQuestions", [])
        before = len(questions)
        used_images = {q.get("image", {}).get("src") for q in questions if q.get("image")}
        n = next_ids(lesson)
        for qdef in PICTURE_QUESTIONS:
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
            questions.append(q)
            used_images.add(qdef["image"]["src"])
            n += 1
            added += 1
        if len(questions) > 20:
            # Schema caps epsQuestions at 20 — drop oldest non-picture questions
            over = len(questions) - 20
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
            # renumber ids sequentially to avoid collisions
            for i, q in enumerate(questions, 1):
                q["id"] = f"q{i:02d}"
        lesson["epsQuestions"] = questions
        if len(questions) != before:
            json.dump(lesson, open(path, "w"), ensure_ascii=False, indent=2)
            print(f"{path.split('/')[-1]}: {before} -> {len(questions)} (+{len(questions)-before} picture q)")
    print(f"Total picture questions injected: {added}")


if __name__ == "__main__":
    main()
