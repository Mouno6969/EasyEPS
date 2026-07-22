# EasyEPS Lesson JSON Schema (v2)

Every lesson file `content/lessons/lesson-NN.json` MUST be valid JSON matching this structure:

```json
{
  "chapter": 1,
  "slug": "self-introduction",
  "title": { "ko": "자기소개", "bn": "নিজের পরিচয়", "en": "Self Introduction" },
  "category": "daily-life",
  "level": "beginner",
  "objectives": { "bn": ["..."], "en": ["..."] },
  "vocabulary": [
    {
      "ko": "이름",
      "romanization": "ireum",
      "bn": "নাম",
      "en": "name",
      "pos": "noun",
      "example": {
        "ko": "제 이름은 라힘입니다.",
        "bn": "আমার নাম রহিম।",
        "en": "My name is Rahim."
      }
    }
  ],
  "grammar": [
    {
      "pattern": "N + 은/는",
      "titleBn": "টপিক মার্কার",
      "explanationBn": "বিষয়বস্তু নির্দেশ করতে ব্যবহৃত হয়...",
      "explanationEn": "Topic marker...",
      "examples": [
        { "ko": "저는 방글라데시 사람입니다.", "bn": "আমি বাংলাদেশি।", "en": "I am Bangladeshi." }
      ]
    }
  ],
  "dialogues": [
    {
      "titleBn": "প্রথম সাক্ষাৎ",
      "titleEn": "First Meeting",
      "lines": [
        { "speaker": "A", "ko": "안녕하세요?", "bn": "নমস্কার/আসসালামু আলাইকুম?", "en": "Hello?" }
      ]
    }
  ],
  "practice": [
    {
      "id": "p1",
      "type": "multiple-choice",  // or "fill-blank" or "matching"
      "questionBn": "প্রশ্ন...",
      "questionKo": "선택 문항 (optional)",
      "options": ["...", "...", "...", "..."],   // for multiple-choice & fill-blank (4 options)
      "pairs": [{ "left": "이름", "right": "নাম" }], // for matching (4-6 pairs, options/answer omitted)
      "answer": 0,               // index into options
      "explanationBn": "ব্যাখ্যা..."
    }
  ],
  "epsQuestions": [
    {
      "id": "e1",
      "section": "reading",      // "reading" or "listening"
      "questionBn": "প্রশ্নের নির্দেশনা বাংলায়",
      "questionKo": "다음을 읽고 알맞은 것을 고르십시오.",
      "passage": "지문 (optional Korean text/dialogue)",
      "options": ["...", "...", "...", "..."],
      "answer": 2,
      "explanationBn": "ব্যাখ্যা..."
    }
  ]
}
```

## Hard requirements
- `vocabulary`: 30–35 items, each with ko/romanization/bn/en/pos/example (example has ko/bn/en).
- `grammar`: 4–5 patterns with Bengali explanations and 2+ examples each.
- `dialogues`: 3 dialogues, 4–8 lines each.
- `practice`: EXACTLY 20 items. Mix: ≥4 multiple-choice, ≥3 fill-blank, ≥2 matching.
- `epsQuestions`: EXACTLY 16 items. Mix: 10 reading + 6 listening-style. All options in Korean where natural; instructions in Bengali.
- `answer` index MUST point to the correct option. Content MUST be original (no copying textbook text verbatim).
- All Bengali text natural and correct; Korean text uses standard hangul with correct spacing.

## Categories
chapters 1–24: "daily-life", 25–30: "culture", 31–52: "workplace", 53–56: "safety", 57–60: "laws"
