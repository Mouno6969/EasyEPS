#!/usr/bin/env python3
"""Normalize listening dialogue passages to the canonical EPS two-speaker format.

Canonical format (documented in content/SCHEMA.md):
    남자: <utterance>\n여자: <utterance>[\n남자: ...]

Rules applied to every epsQuestions[] entry with section == "listening":
1. 남/M -> 남자, 여/W -> 여자 (short labels expanded).
2. Role labels (직원, 반장, 감독자, A/B, 가/나, ...) are mapped positionally:
   the first distinct speaker becomes 남자, the second 여자, alternating fairly.
   Role context is preserved by keeping the role word in parentheses only when
   it is exam-relevant? -> NO: real EPS scripts use bare 남자/여자, so roles are
   dropped from the passage. Explanations already carry the role context.
3. Single-speaker labelled passages (announcements: 대사, 안내 방송, single 직원)
   with only ONE distinct speaker keep no label at all -> narrator item,
   unless the label is 남/여-based (then expanded and kept, single voice).
4. Turns are separated by a newline.
5. Quotation wrappers ('...' / "...") around whole utterances are stripped.

Idempotent: running twice yields identical output.
"""
import json
import glob
import re
import sys

# Any leading token that looks like a speaker label: hangul/latin word up to 6 chars + colon
GENERIC_LABEL = re.compile(r"(?:(?<=^)|(?<=[\s\u00a0|]))([가-힣A-Za-z]{1,6})\s*[:：]\s*")
MALE = {"남자", "남", "M"}
FEMALE = {"여자", "여", "W"}

# Labels that indicate a single-narrator announcement, not a dialogue speaker
ANNOUNCE = {"대사", "질문", "방송", "안내"}


def split_labelled(passage: str):
    """Return list of (label, text) using any generic label; text before the
    first label gets label None."""
    # Treat slash-separated turns as real line breaks before locating labels.
    passage = re.sub(r"\s[/／]\s", "\n", passage)
    parts = []
    matches = list(GENERIC_LABEL.finditer(passage))
    if not matches:
        return [(None, passage.strip())]
    if matches[0].start() > 0:
        head = passage[: matches[0].start()].strip(" |\n")
        if head:
            parts.append((None, head))
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(passage)
        text = passage[m.end() : end].strip(" |\n")
        if text:
            parts.append((m.group(1), text))
    return parts


def strip_quotes(text: str) -> str:
    t = text.strip()
    for a, b in (("'", "'"), ('"', '"'), ("\u2018", "\u2019"), ("\u201c", "\u201d")):
        if t.startswith(a) and t.endswith(b) and len(t) > 1:
            t = t[1:-1].strip()
    return t


def normalize_passage(passage: str):
    """Return (new_passage, changed_reason or None)."""
    parts = split_labelled(passage)
    labelled = [(l, t) for l, t in parts if l is not None]
    if not labelled:
        return passage, None  # pure narrator, leave as-is

    distinct = []
    for l, _ in labelled:
        if l not in distinct:
            distinct.append(l)

    # Single-speaker passages
    if len(distinct) == 1:
        label = distinct[0]
        body = " ".join(strip_quotes(t) for _, t in labelled)
        head = " ".join(strip_quotes(t) for l, t in parts if l is None)
        combined = (head + " " + body).strip() if head else body
        if label in MALE:
            new = "남자: " + combined
        elif label in FEMALE:
            new = "여자: " + combined
        else:
            # announcement / single role speaker -> narrator (no label read aloud)
            new = combined
        return (new, "single-speaker") if new != passage else (passage, None)

    # Multi-speaker: map each distinct label to 남자/여자 positionally,
    # honoring explicit gender labels first.
    mapping = {}
    genders = ["남자", "여자"]
    # pre-assign explicit gendered labels
    for l in distinct:
        if l in MALE:
            mapping[l] = "남자"
        elif l in FEMALE:
            mapping[l] = "여자"
    used = set(mapping.values())
    next_free = [g for g in genders if g not in used]
    for l in distinct:
        if l not in mapping:
            mapping[l] = next_free.pop(0) if next_free else genders[len(mapping) % 2]

    lines = []
    for l, t in parts:
        text = strip_quotes(t)
        if l is None:
            if text:
                lines.append(text)  # narration line, no label
        else:
            lines.append(f"{mapping[l]}: {text}")
    new = "\n".join(lines)
    return (new, "multi-speaker") if new != passage else (passage, None)


def main():
    changed_files = 0
    changed_q = 0
    by_reason = {}
    for f in sorted(glob.glob("content/lessons/lesson-*.json")):
        d = json.load(open(f, encoding="utf-8"))
        dirty = False
        for q in d.get("epsQuestions", []):
            if q.get("section") != "listening":
                continue
            p = q.get("passage") or ""
            new, reason = normalize_passage(p)
            if reason:
                q["passage"] = new
                dirty = True
                changed_q += 1
                by_reason[reason] = by_reason.get(reason, 0) + 1
        if dirty:
            json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            with open(f, "a", encoding="utf-8") as fh:
                fh.write("\n")
            changed_files += 1
    print(f"normalized {changed_q} passages in {changed_files} files; reasons: {by_reason}")


if __name__ == "__main__":
    sys.exit(main())
