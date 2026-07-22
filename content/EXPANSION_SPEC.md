# EasyEPS Lesson Expansion Specification (v2)

You will receive an existing lesson JSON file (`lesson-NN.json`) for a Bangla-first EPS-TOPIK Korean course for Bangladeshi workers. Your job is to EXPAND it into a richer, beginner-friendly version while keeping the SAME JSON structure and all existing content (you may lightly fix obvious errors, but do not delete existing items).

## Target counts (per lesson)

| Section | Current | Target | Rule |
|---|---|---|---|
| vocabulary | ~18 | 30–35 items | Keep all existing items; ADD new topic-relevant items until total is 30–35 |
| grammar | 2–3 | 4–5 patterns | Keep existing; ADD beginner-appropriate patterns relevant to the topic. Each pattern needs 3+ examples |
| dialogues | 2 | 3 | Keep existing 2; ADD 1 new realistic dialogue (4–8 lines) |
| practice | 10 | 20 questions | Keep existing 10; ADD 10 more (ids p11–p20) |
| epsQuestions | 8 | 16 questions | Keep existing 8; ADD 8 more (ids e9–e16). Final split MUST be exactly 10 reading + 6 listening |

## New beginner-friendly fields

1. **vocabulary items** — add `"pronunciationTipBn"` (string) to EVERY vocabulary item (existing and new): a short Bangla tip on how to pronounce the Korean word correctly (e.g., which sound is tense/aspirated, batchim behavior, vowel length). Keep it 1 sentence, practical, in natural Bangla. Example: `"pronunciationTipBn": "'ㄹ' ধ্বনিটি বাংলা 'র' ও 'ল'-এর মাঝামাঝি; জিভ হালকাভাবে তালুতে স্পর্শ করান।"`
2. **grammar items** — add `"commonMistakeBn"` (string) to EVERY grammar pattern (existing and new): one common mistake Bangladeshi beginners make with this pattern and how to avoid it, in natural Bangla. Example: `"commonMistakeBn": "অনেকে স্বরবর্ণের পরে ভুল করে '은' ব্যবহার করেন; স্বরবর্ণের পরে সবসময় '는' বসবে।"`

## Schema (unchanged fields)

- vocabulary item: `{ ko, romanization, bn, en, pos, example: { ko, bn, en }, pronunciationTipBn }`
- grammar item: `{ pattern, titleBn, explanationBn, explanationEn, examples: [{ko,bn,en}, ...>=3 for new], commonMistakeBn }`
- dialogue: `{ titleBn, titleEn, lines: [{ speaker, ko, bn, en }] }` (4–8 lines)
- practice question: `{ id, type: "multiple-choice"|"fill-blank"|"matching", questionBn, questionKo?, options?: [4 strings], pairs?: [{left,right} x4-6], answer: index, explanationBn }`
  - matching questions omit options/answer (use pairs only)
  - non-matching questions need exactly 4 options and a correct `answer` index
- epsQuestion: `{ id, section: "reading"|"listening", questionBn, questionKo, passage?, options: [exactly 4 Korean strings], answer: 0-3, explanationBn }`

## Hard requirements

1. Output MUST be a single valid JSON object (the whole expanded lesson), matching the structure above. No markdown fences, no commentary in the file.
2. All ids unique: practice p1..p20, eps e1..e16.
3. Practice mix in final set: ≥8 multiple-choice, ≥6 fill-blank, ≥4 matching.
4. EPS final split: EXACTLY 10 "reading" + 6 "listening". Existing lessons have 5 reading + 3 listening, so add 5 reading + 3 listening.
5. Answer indexes MUST be correct and balanced across positions 0–3 (don't put every answer at index 0).
6. All new content must be ORIGINAL (do not copy official textbook text), topic-relevant, and EPS-TOPIK level (beginner Korean, workplace/daily-life focus).
7. Bangla must be natural and correct (Bangladeshi standard); Korean must use correct hangul and spacing; romanization uses Revised Romanization.
8. New vocabulary must NOT duplicate existing ko entries in the lesson.
9. Keep `chapter`, `slug`, `title`, `category`, `level`, `objectives` unchanged (you may append 1–2 extra objectives if natural).
10. New EPS listening questions: put the dialogue/audio script in `passage` (Korean), instructions in `questionBn`, `questionKo` like "다음을 듣고 알맞은 것을 고르십시오."
11. Difficulty curve: new practice questions p11–p20 should progress from easy recall to applied usage; new EPS questions should mirror real exam style (notice reading, dialogue comprehension, workplace signs, schedules, etc. as appropriate to the chapter topic).
