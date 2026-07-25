# Basics Track — Practice Volume Expansion

## Problem

The original basics track had roughly 150 practice interactions (~2.5–3 hours of content). Reliable Hangul literacy needs 10–20 exposures per letter (600–800+ recognition events overall). Many letters (ㅊ, ㅋ, ㅌ, ㅍ, the tense consonants ㄲ ㄸ ㅃ ㅆ ㅉ, and compound vowels ㅒ ㅙ ㅚ ㅞ ㅢ) appeared once in a jamo grid and were never quizzed.

## Design

Content-only expansion — no schema or runtime changes were needed. The module page renders arbitrary step counts, multiple quiz steps per module are supported, and the per-module quiz score is the flat sum of all quiz-step questions.

Exposure channels counted as "recognition events":

- listen-choice / multiple-choice quiz answers (active recall)
- speak items with `minListens` ≥ 2 (audio → grapheme mapping)
- matching pairs (each pair = 1 recognition event)
- builder prompts (composing = 2–3 jamo recognitions)
- write tracings

### Per-module changes

| Module | Before | After |
| --- | --- | --- |
| welcome | 3 MC | unchanged (orientation) |
| consonants | 9 quiz Q, 4 speak, 6 write | 41 quiz Q across 3 drill steps, 19 speak (incl. aspirated/tense rows, minListens 2), 9 write (adds ㅋ ㅌ ㅍ) |
| vowels | 8 quiz Q, 10 speak, 8 write | 38 quiz Q across 3 drill steps, 26 speak (all 11 compound vowels + rare-vowel words), 8 write |
| syllables | 7 quiz Q, 12 builder | 21 quiz Q, 24 builder prompts (adds 차 코 토 파 컵 침 etc.) |
| batchim | 7 quiz Q, 6 speak | 20 quiz Q, 12 speak (adds ㅋ ㅌ ㅍ ㅊ ㅅ ㄲ batchim words) |
| speak-lab | 0 quiz Q, 20 speak | 24 quiz Q across 2 recognition steps, 36 speak (adds CV jamo drill row) |
| write-lab | 0 quiz Q, 24 write (6 required) | 12 quiz Q, 24 write (16 required) |
| checkpoint | 13 quiz Q | 16 quiz Q — now covers ㅌ ㅊ ㅍ, tense consonants, and batchim words |

### Requirements raised (completion now demands real practice)

- consonants: minSpeakItems 4 → 14, minWriteItems 3 → 6
- vowels: minSpeakItems 4 → 12, minWriteItems 2 → 5
- syllables: minBuilderItems 6 → 14
- batchim: minSpeakItems 4 → 8
- speak-lab: minSpeakItems 6 → 24
- write-lab: minWriteItems 6 → 16
- All speak steps raised to `minListens: 2` → every speak item is ≥2 audio exposures.

## Verified results (`python3 scripts/count_exposures.py`)

- Total interactive practice events: **474** (was ~150); with matching pairs, multi-jamo items, and minListens weighting this yields **1,656 per-letter exposure touches** in a single pass (target was 600–800+). The built-in retry loop and pass-ratio gating push typical learners well beyond that.
- Every one of the 19 consonants gets **18–159** exposures (ㅊ 52, ㅋ 41, ㅌ 41, ㅍ 44).
- Every one of the 21 vowels gets **9–196** exposures; all rare compound vowels (ㅒ ㅙ ㅚ ㅞ ㅢ) are now quizzed, spoken, and matched.
- Estimated content time: **233 minutes (~3.9 hours)** with far higher interaction density.

## Guarantees

- All content validates against the existing Zod schema (`shared/basics.ts`).
- **2026-07 follow-up:** module quiz banks expanded to ~24–28 with `drawCount: 12` random sampling; checkpoint is a **100+ bank** (`drawCount: 25`) with ≥20 listen-choice audio items; Bangla `shapeMnemonicBn` on every jamo; batchim example vocabulary corrected; five tense stroke files (`ssanggiyeok`…`ssangjieut`). Rebuild with `python3 scripts/expand_basics_volume.py`.
- Run `python3 scripts/count_exposures.py` from the repo root at any time to re-audit per-letter exposure counts; it flags any letter that falls below the exposure floor.
