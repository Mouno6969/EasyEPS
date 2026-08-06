# EasyEPS Basics Track JSON Schema (v1)

Content under `content/basics/` is **separate** from the 60-chapter lesson schema. Runtime validation: `shared/basics.ts` (Zod). Loader: `server/basicsContent.ts`.

## Layout

```
content/basics/
  manifest.json
  SCHEMA.md
  modules/{welcome,consonants,vowels,syllables,batchim,speak-lab,write-lab,survival-phrases,my-name-is,simple-sentences,checkpoint}.json
  strokes/{id}.json
```

## Manifest

- `version: 1`, `passScore` default **0.7** (checkpoint unlock ratio)
- Exactly **11** modules matching `BASICS_MODULE_IDS`, in that order
- `checkpoint` **must stay last** — next-module navigation and the curriculum gate key off its position

## Track shape (decode → produce → verify)

| Order | Modules | Teaches |
|---|---|---|
| 0–6 | welcome … write-lab | **Decoding**: jamo, syllable assembly, batchim, pronunciation, stroke order |
| 7–9 | survival-phrases, my-name-is, simple-sentences | **Production**: fixed phrases, copula, subject particles |
| 10 | checkpoint | **Verification**: stratified draw across both halves |

Modules 0–6 leave a learner able to sound out `저는 학생입니다` without knowing what it
means. Lesson 1 opens with five grammar patterns and 35 vocabulary items, so the bridge
modules exist to close that gap — they are not optional polish. See
[basics-track-design.md](../../docs/basics-track-design.md#bridge-modules-79) for rationale.

## Module root

| Field | Notes |
|---|---|
| `id` | `welcome` … `checkpoint` |
| `order` | 0–10 matching id order |
| `title` | `{ ko, bn, en }` |
| `requirements` | `requiredStepIds`, `minSpeakItems`, `minWriteItems`, `minBuilderItems`, `minReadItems`, `passRatio` |
| `steps` | explain / jamo-grid / speak / write / builder / read / quiz |

### Requirements integrity

- `requiredStepIds` must exist on the module.
- `minSpeakItems` / `minWriteItems` / `minBuilderItems` / `minReadItems` must be **≤ available items** of that type (schema rejects unachievable minima).
- Item ids (speak / write / builder / read / jamo-grid / quiz) must be **unique** within the module category.
- `isModuleComplete` counts **unique** done-ids (duplicate pushes do not inflate progress).

### Welcome passRatio

Fixture uses **`passRatio: 0.66`** so a 2-of-3 quiz passes (`2/3 ≈ 0.666…`). A strict `0.67` would reject 2/3.

## Step types

| `type` | Key fields |
|---|---|
| `explain` | `body.bn[]` (+ optional en/ko) |
| `jamo-grid` | `items[]` with `char`, `romanization`, **`audioText`** (CV preferred) |
| `speak` | `minListens`, `items[]` with **`audioText`** |
| `write` | `items[]` with `char`, **`strokeId`** (must exist under `strokes/`) |
| `builder` | `prompts[]`: `initial`, `vowel`, `final?`, **`answer`** |
| `read` | whole-word cards: `text` (Hangul), `bn`/`en` meaning, `distractorsBn[]` — learner reads the word and picks meaning |
| `quiz` | `questions[]` |

### Builder integrity

`answer` **must equal** `composeHangul(initial, vowel, final)`. Invalid finals (typos not in the jongseong table) **throw** — they do not silently become empty batchim.

## Quiz

- `kind`: `multiple-choice` | `matching` | `listen-choice`
- Optional `topic`: `jamo` | `syllable` | `batchim` | `reading` | `sentence` | `general`
  - `reading` = whole-word recognition (Hangul word → meaning), not letter meta-questions
  - `sentence` = above word level: particles, copula, situational choice, dialogue turns
- Optional `drawCount`: runtime sample size from the bank (Fisher–Yates + stratified minima)
- **Checkpoint bank:** ≥100 questions with `drawCount: 25`; bank must include ≥20 listen-choice, ≥8 matching, ≥15 syllable-related, ≥10 batchim-related, **≥20 reading**, **≥30 sentence**
- Checkpoint draws stratified-include **≥5 whole-word reading** and **≥5 sentence-level** items, so a learner cannot pass on composition trivia alone *or* on decoding alone
- **Module quiz banks:** typically 20–30 questions with `drawCount` 10–14 (legacy small banks still allowed, ≥3)
- Jamo grid items may include `shapeMnemonicBn` (Bangla visual mnemonic)
- **Anti-memorization:** every attempt calls `prepareBasicsQuizDraw` (new sample + per-question option shuffle). Matching left-row order is also shuffled. Retry returns to the checkpoint start screen so a new paper is drawn.
- Rebuild reading content: `python3 scripts/add_reading_practice.py`

Scoring (`scoreBasicsQuiz` / `scoreBasicsQuestions`): prefer `selectedOptions` (option **text**) for MC/listen so shuffled presentation still grades against the bank; matching prefers left→right maps. Checkpoint submit **requires** `questionIds` of length `drawCount` (25).

## Unlock semantics (important)

| Helper | Use |
|---|---|
| `isModuleComplete(module, progress)` | Teaching modules 0–6 only. **Always false for `checkpoint`.** |
| `isBasicsComplete(progress)` | **Curriculum unlock** — true only when `checkpointPassedAt` is set (trusted server grade / guest local pass / grandfather / admin). |
| `isCheckpointPassing(score, total, 0.7)` | Server/local capstone pass decision (`score/total`, score clamped to total). |

Never treat client-reported checkpoint quiz fields alone as curriculum unlock.

## Strokes

```json
{
  "id": "giyeok",
  "char": "ㄱ",
  "viewBox": [0, 0, 100, 100],
  "strokes": [{ "order": 1, "d": "M…", "samples": [{ "x": 20, "y": 25 }] }]
}
```

- `samples` — authoritative grading targets for `coverageRatio`
- `d` — SVG underlay only
- Loader rejects write items whose `strokeId` is missing from `content/basics/strokes/`

## Pure helpers

| Function | Module |
|---|---|
| `composeHangul` / `decomposeHangul` | `shared/hangul.ts` |
| `coverageRatio` | `shared/strokeCoverage.ts` |
| `isModuleComplete`, `scoreBasicsQuiz`, `isCheckpointPassing`, `quizRatio` | `shared/basics.ts` |

## Content expansion

Run `python3 scripts/expand_basics_volume.py` to rebuild expanded banks (idempotent-ish; re-reads modules). Stroke files for tense consonants: `ssanggiyeok`, `ssangdigeut`, `ssangbieup`, `ssangsiot`, `ssangjieut`.

### Pedagogy notes (rev 2026-07)

| Module | Must teach |
|---|---|
| `syllables` | Block geometry (`sy-geometry`): vertical vs horizontal vowels, batchim at bottom |
| `consonants` | Plain/aspirated/tense contrast (`c-contrast` + `c-speak-pairs`) — 다/타/따 etc. for Bangla speakers |
| `batchim` | **7 surface sounds** first (`b-seven-sounds`); light linking only; **no early 경음화 stack** |
| `speak-lab` | Late light tensification (`sp-tensify`) with easy words only (학교, 있다, 먹다…) |
| `survival-phrases` | Whole fixed phrases as unanalyzed chunks; the 가세요/계세요 split; never answer 네 without understanding |
| `my-name-is` | Verb-final word order; 입니다 vs 이에요/예요; the 받침 rule that selects 이에요 or 예요 |
| `simple-sentences` | 은/는 vs 이/가; 있어요/없어요; adjectives in final position; 안 negation |

### Why modules 7–9 exist

A learner who finishes `write-lab` can decode any syllable but has met **zero** grammar:
no particles, no copula, no sentence-length speech. Lesson 1 assumes all three from its
first vocabulary card. The bridge modules convert decoding into production so lesson 1
reads as expansion rather than first exposure. Removing them re-opens that cliff.

Rebuild pedagogy patches: `python3 scripts/fix_basics_pedagogy.py` (run after volume expand if needed).
