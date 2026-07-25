# EasyEPS Basics Track JSON Schema (v1)

Content under `content/basics/` is **separate** from the 60-chapter lesson schema. Runtime validation: `shared/basics.ts` (Zod). Loader: `server/basicsContent.ts`.

## Layout

```
content/basics/
  manifest.json
  SCHEMA.md
  modules/{welcome,consonants,vowels,syllables,batchim,speak-lab,write-lab,checkpoint}.json
  strokes/{id}.json
```

## Manifest

- `version: 1`, `passScore` default **0.7** (checkpoint unlock ratio)
- Exactly **8** modules matching `BASICS_MODULE_IDS`

## Module root

| Field | Notes |
|---|---|
| `id` | `welcome` … `checkpoint` |
| `order` | 0–7 matching id order |
| `title` | `{ ko, bn, en }` |
| `requirements` | `requiredStepIds`, `minSpeakItems`, `minWriteItems`, `minBuilderItems`, `passRatio` |
| `steps` | explain / jamo-grid / speak / write / builder / quiz |

### Requirements integrity

- `requiredStepIds` must exist on the module.
- `minSpeakItems` / `minWriteItems` / `minBuilderItems` must be **≤ available items** of that type (schema rejects unachievable minima).
- Item ids (speak / write / builder / jamo-grid / quiz) must be **unique** within the module category.
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
| `quiz` | `questions[]` |

### Builder integrity

`answer` **must equal** `composeHangul(initial, vowel, final)`. Invalid finals (typos not in the jongseong table) **throw** — they do not silently become empty batchim.

## Quiz

- `kind`: `multiple-choice` | `matching` | `listen-choice`
- Optional `topic`: `jamo` | `syllable` | `batchim` | `general` (helps checkpoint composition checks; heuristics also apply)
- Optional `drawCount`: runtime sample size from the bank (Fisher–Yates + stratified minima)
- **Checkpoint bank:** ≥100 questions with `drawCount: 25`; bank must include ≥20 listen-choice, ≥8 matching, ≥15 syllable-related, ≥10 batchim-related
- **Module quiz banks:** typically 20–30 questions with `drawCount` 10–12 (legacy small banks still allowed, ≥3)
- Jamo grid items may include `shapeMnemonicBn` (Bangla visual mnemonic)

Scoring (`scoreBasicsQuiz` / `scoreBasicsQuestions`): MC/listen index match → 1 pt; matching all pairs correct → 1 pt. Checkpoint submit accepts `questionIds` so only the drawn sample is graded.

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
