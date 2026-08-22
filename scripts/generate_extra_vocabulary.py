from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
LESSONS = ROOT / "content" / "lessons"
OUTPUT = ROOT / "scripts" / "generated_extra_vocabulary.json"
MODEL = os.environ.get("EASYEPS_VOCAB_MODEL", "gpt-5-mini")

RESPONSE_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "extra_vocabulary_batch",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "chapters": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "chapter": {"type": "integer", "minimum": 1, "maximum": 60},
                            "items": {
                                "type": "array",
                                "minItems": 4,
                                "maxItems": 4,
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "ko": {"type": "string", "minLength": 1},
                                        "romanization": {"type": "string", "minLength": 1},
                                        "bn": {"type": "string", "minLength": 1},
                                        "en": {"type": "string", "minLength": 1},
                                        "pos": {"type": "string", "minLength": 1},
                                        "example": {
                                            "type": "object",
                                            "properties": {
                                                "ko": {"type": "string", "minLength": 1},
                                                "bn": {"type": "string", "minLength": 1},
                                                "en": {"type": "string", "minLength": 1},
                                            },
                                            "required": ["ko", "bn", "en"],
                                            "additionalProperties": False,
                                        },
                                        "pronunciationTipBn": {"type": "string"},
                                    },
                                    "required": ["ko", "romanization", "bn", "en", "pos", "example", "pronunciationTipBn"],
                                    "additionalProperties": False,
                                },
                            },
                        },
                        "required": ["chapter", "items"],
                        "additionalProperties": False,
                    },
                }
            },
            "required": ["chapters"],
            "additionalProperties": False,
        },
    },
}


def load_lessons() -> list[dict[str, Any]]:
    return [json.loads(path.read_text(encoding="utf-8")) for path in sorted(LESSONS.glob("lesson-*.json"))]


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())


def validate_batch(batch: dict[str, Any], requested: list[dict[str, Any]], banned: set[str]) -> list[dict[str, Any]]:
    by_chapter = {entry["chapter"]: entry["items"] for entry in batch.get("chapters", [])}
    if set(by_chapter) != {entry["chapter"] for entry in requested}:
        raise ValueError("model returned the wrong chapter set")
    seen = set(banned)
    for chapter in requested:
        items = by_chapter[chapter["chapter"]]
        if len(items) != 4:
            raise ValueError(f"chapter {chapter['chapter']} returned {len(items)} items")
        for item in items:
            for key in ("ko", "romanization", "bn", "en", "pos"):
                if not clean(item[key]):
                    raise ValueError(f"empty {key} in chapter {chapter['chapter']}")
            ko = clean(item["ko"])
            if ko in seen:
                raise ValueError(f"duplicate Korean term: {ko}")
            if len(ko) > 24 or len(item["bn"]) > 80 or len(item["en"]) > 80:
                raise ValueError(f"unusually long vocabulary item: {ko}")
            for key in ("ko", "bn", "en"):
                item["example"][key] = clean(item["example"][key])
            seen.add(ko)
    return [
        {"chapter": chapter["chapter"], "items": by_chapter[chapter["chapter"]]}
        for chapter in requested
    ]


def generate_batch(client: OpenAI, requested: list[dict[str, Any]], banned: set[str]) -> list[dict[str, Any]]:
    chapter_brief = "\n".join(
        f"Chapter {entry['chapter']} [{entry['category']}] — {entry['title']['ko']} / {entry['title']['en']} / {entry['title']['bn']}\n"
        f"Objectives: {'; '.join(entry['objectives']['en'])}\n"
        f"Existing core terms to avoid: {', '.join(entry['existing'])}"
        for entry in requested
    )
    reserved = ", ".join(sorted(banned))
    prompt = f"""Create exactly four new extraVocabulary items for each of the following EPS-TOPIK chapters.

You are a senior Korean curriculum editor for Bangla-speaking adult learners preparing for EPS-TOPIK. The items must be genuinely useful for the chapter theme and exam transfer: include concrete terms, action verbs, adjectives, formal instructions, workplace collocations, procedures, measurements, or administrative expressions as appropriate. Do not merely repeat the chapter's core vocabulary. Use standard modern Korean and accurate natural Bangla translations. Every example must be a natural Korean sentence tied to the chapter context, with faithful Bangla and English translations.

Rules:
- Return only the requested JSON structure.
- Exactly 4 items per chapter.
- Every Korean headword must be unique across this batch and not in the reserved list.
- Do not use punctuation-only or multiword English explanations as headwords.
- Use concise part-of-speech labels such as noun, verb, adjective, adverb, expression, or phrase.
- Include a short Bangla pronunciation tip when useful; otherwise use an empty string.
- Do not include grammar patterns as vocabulary headwords.

Chapters:
{chapter_brief}

Reserved Korean terms from the full existing corpus and earlier generated batches:
{reserved}
"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "Output only valid JSON matching the requested schema. Accuracy and natural Korean/Bangla are more important than creativity."},
            {"role": "user", "content": prompt},
        ],
        response_format=RESPONSE_SCHEMA,
        max_completion_tokens=16000,
        extra_body={"reasoning": {"effort": "minimal"}},
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("empty model response")
    return validate_batch(json.loads(content), requested, banned)


def main() -> int:
    lessons = load_lessons()
    if len(lessons) != 60:
        raise SystemExit(f"expected 60 lessons, found {len(lessons)}")
    existing = {item["ko"].strip() for lesson in lessons for item in lesson.get("vocabulary", [])}
    output: list[dict[str, Any]] = []
    reserved = set(existing)
    client = OpenAI()
    for offset in range(0, len(lessons), 3):
        requested = []
        for lesson in lessons[offset : offset + 3]:
            requested.append({
                "chapter": lesson["chapter"],
                "category": lesson["category"],
                "title": lesson["title"],
                "objectives": lesson["objectives"],
                "existing": [item["ko"] for item in lesson.get("vocabulary", [])],
            })
        last_error: Exception | None = None
        for attempt in range(6):
            try:
                batch = generate_batch(client, requested, reserved)
                output.extend(batch)
                for chapter in batch:
                    reserved.update(item["ko"].strip() for item in chapter["items"])
                print(f"generated chapters {offset + 1}-{offset + len(requested)}", flush=True)
                break
            except Exception as exc:
                last_error = exc
                print(f"retrying batch {offset + 1}: {exc}", file=sys.stderr, flush=True)
                time.sleep(2 * (attempt + 1))
        else:
            raise SystemExit(f"failed batch {offset + 1}: {last_error}")
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {sum(len(entry['items']) for entry in output)} items to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
