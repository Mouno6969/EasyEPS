#!/usr/bin/env python3
"""Print the authoring prompt for one chapter.

Composing 35 of these by hand invites copy-paste mistakes in the fixed values,
so they are generated from shared/chapters.ts plus the committed lesson's slug.

Usage:  python3 scripts/make-author-prompt.py 26
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

CATEGORY_FOR = lambda n: (  # noqa: E731 - matches SCHEMA.md category bands
    "daily-life" if n <= 24 else
    "culture" if n <= 30 else
    "workplace" if n <= 52 else
    "safety" if n <= 56 else
    "laws"
)


def titles() -> list[tuple[str, str, str]]:
    ts = Path("shared/chapters.ts").read_text(encoding="utf-8")
    raw = re.search(r"const RAW[^=]*=\s*\[(.*?)\n\];", ts, re.S).group(1)
    return re.findall(r'\["([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\]', raw)


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    n = int(sys.argv[1])
    ko, bn, en = titles()[n - 1]
    lesson = json.loads(
        Path(f"content/lessons/lesson-{n:02d}.json").read_text(encoding="utf-8")
    )
    slug = lesson["slug"]
    category = CATEGORY_FOR(n)
    extract = f"unit-{n:02d}.txt" if n <= 30 else f"unit-{n:02d}.ocr.txt"

    ocr_note = ""
    if n > 30:
        ocr_note = f"""
## Source is OCR — read it critically
`reference/extracts/{extract}` was produced by OCR from page images, so some
Hangul is misread. Page images are in `reference/extracts/pages/u{n}/` (ten
PNGs). **When a Korean word looks wrong or a sentence does not parse, open the
matching page image with `read_file` and check it** rather than copying the OCR.
Never propagate a word you cannot confirm. Chapter {n} is workplace Korean for
adult workers: keep sentences practical and job-site realistic.
"""

    print(f"""Author EasyEPS lesson **chapter {n}** ({ko} / {bn} / {en}).

Working directory: `/root/EasyEPS` — this is **Linux**. Use `run_terminal_command`
for shell, `read_file` to read, `write` to write files, `grep` to search. If a
tool name is rejected as "not found", you are guessing — the names above are the
only ones that work.

## Read these first — and ONLY these
1. `reference/AUTHOR_TEMPLATE.md` — procedure and exact field shapes. Follow it
   literally, especially the section on writing SMALL NUMBERED PARTS.
2. `reference/SHAPE.json` — compact exemplar of the exact JSON shape.
3. `reference/extracts/{extract}` — your source unit.

**Do NOT read any file in `content/lessons/`.** They are ~70 KB each and will
waste your context for no benefit. Do not read `content/SCHEMA.md`.
{ocr_note}
## Fixed values for meta.json
```json
"chapter": {n},
"slug": "{slug}",
"category": "{category}",
"level": "beginner",
"title": {{"ko": "{ko}", "bn": "{bn}", "en": "{en}"}}
```
Keep `slug` exactly as given — it is referenced elsewhere. `level` is
`"beginner"` for every chapter (the schema hardcodes it). `objectives` needs 4
strings in `bn` and 4 in `en`.

## Output — write these SMALL parts in `.lesson-work/{n:02d}/`

Korean and Bengali cost 3–4 output tokens per character, so a whole section does
not fit in one response. **An oversized write truncates and loses the run.**
Write these files, each a complete valid JSON array, one `write` call each:

- `meta.json` — the single object above (not an array)
- `vocabulary-1.json` … `vocabulary-4.json` — **≤ 9 items each**, 30–35 total
- `grammar-1.json` … `grammar-3.json` — **≤ 2 patterns each**, 4–5 total
- `dialogues-1.json`, `dialogues-2.json`, `dialogues-3.json` — **1 dialogue each**
- `practice-1.json` … `practice-4.json` — **5 items each**: p1–p5, p6–p10,
  p11–p15, p16–p20
- `eps-1.json` … `eps-4.json` — **4 items each**: e1–e4, e5–e8, e9–e12, e13–e16

For eps, e1–e10 are `"section": "reading"` and e11–e16 are
`"section": "listening"` (so `eps-3.json` holds e9, e10 reading + e11, e12
listening). Practice mix across the whole set: ~10 `multiple-choice`,
~7 `fill-blank`, ~3 `matching`. Matching items use `pairs` of 4–5
`{{left, right}}` with no `options`/`answer`; every other item has exactly 4
`options` and a 0-based `answer`.

**Every `listening` eps item MUST have a `passage`**, using only `남자:` and
`여자:` labels separated by `\\n`, e.g.
`"남자: 안녕하세요.\\n여자: 반갑습니다."` Reading passages may be notices or
forms with their own bullet labels — that is fine.

Dialogue `speaker` values are the characters' names or roles in Korean (e.g.
`직원`, `반장`, `라힘`), matching the source unit's characters.

## Critical process rules
- **One `write` call per part file.** Never use `search_replace` to build
  content — that corrupts encoding mid-Bengali-conjunct. If a part feels large,
  split it further.
- Work in order: meta → vocabulary → grammar → dialogues → practice → eps.
- After each write: `grep -c $'\\ufffd' .lesson-work/{n:02d}/<file>.json`. If the
  count is nonzero, rewrite that whole part in one call — do not patch it.
- Spread correct answers roughly evenly across indices 0–3 over the whole lesson.
- Every `explanationBn` must say *why* the answer is right and what the
  distractors mean — not just restate the answer.
- Keep your reasoning terse. Your budget is JSON output, not commentary.

## Finish
1. `python3 scripts/assemble-lesson.py {n} --check` → must end `ALL CLEAN`.
2. `npx tsx scripts/validate-all-lessons.ts` → must pass.
3. Reply with 3 lines: chapter, counts, and anything you could not verify from
   the source.

**Do not `git add` or `git commit`.** Do not modify files outside
`.lesson-work/{n:02d}/`. The orchestrator reviews and commits.""")
    return 0


if __name__ == "__main__":
    sys.exit(main())
