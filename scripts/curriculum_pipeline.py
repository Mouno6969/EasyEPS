#!/usr/bin/env python3
"""Generate and validate EasyEPS lesson JSON files.

The generator is deliberately resumable: valid files are skipped, each accepted
lesson is written atomically, and the manifest is rebuilt only from validated
files. It uses the sandbox OpenAI-compatible endpoint and the live model ID
selected by the caller.
"""
from __future__ import annotations

import argparse
import concurrent.futures as futures
import json
import os
import re
import sys
import tempfile
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
LESSON_DIR = ROOT / "content" / "lessons"
MANIFEST = ROOT / "content" / "manifest.json"
PRINT_LOCK = threading.Lock()

CHAPTERS: list[dict[str, Any]] = [
    {"chapter": 31, "slug": "attire-and-work-attitude", "ko": "복장과 근무 태도", "bn": "কর্মস্থলের পোশাক ও কাজের মনোভাব", "en": "Attire and Work Attitude", "category": "workplace"},
    {"chapter": 32, "slug": "use-of-company-facilities", "ko": "회사 시설 이용", "bn": "কোম্পানির সুবিধা ব্যবহার", "en": "Use of Company Facilities", "category": "workplace"},
    {"chapter": 33, "slug": "colleague-relationships", "ko": "동료 관계", "bn": "সহকর্মীর সঙ্গে সম্পর্ক", "en": "Colleague Relationships", "category": "workplace"},
    {"chapter": 34, "slug": "sexual-harassment-and-assault-prevention", "ko": "성희롱과 성폭력 예방", "bn": "যৌন হয়রানি ও সহিংসতা প্রতিরোধ", "en": "Sexual Harassment and Assault Prevention", "category": "workplace"},
    {"chapter": 35, "slug": "workplace-management", "ko": "작업장 관리", "bn": "কর্মস্থল ব্যবস্থাপনা", "en": "Workplace Management", "category": "workplace"},
    {"chapter": 36, "slug": "shipment-management", "ko": "출하 관리", "bn": "প্যাকিং, লোডিং ও চালান ব্যবস্থাপনা", "en": "Shipment Management", "category": "workplace"},
    {"chapter": 37, "slug": "machine-processing", "ko": "기계 가공", "bn": "মেশিন চালনা ও প্রক্রিয়াকরণ", "en": "Machine Processing", "category": "workplace"},
    {"chapter": 38, "slug": "machine-assembly", "ko": "기계 조립", "bn": "মেশিন সংযোজন ও বিচ্ছিন্নকরণ", "en": "Machine Assembly", "category": "workplace"},
    {"chapter": 39, "slug": "metal-processing", "ko": "금속 가공", "bn": "ধাতু প্রক্রিয়াকরণ, কাটিং ও ওয়েল্ডিং", "en": "Metal Processing", "category": "workplace"},
    {"chapter": 40, "slug": "plastic-and-rubber-molding", "ko": "플라스틱과 고무 성형", "bn": "প্লাস্টিক ও রাবার মোল্ডিং", "en": "Plastic and Rubber Molding", "category": "workplace"},
    {"chapter": 41, "slug": "textile-manufacturing", "ko": "섬유 제조", "bn": "বস্ত্র উৎপাদন", "en": "Textile Manufacturing", "category": "workplace"},
    {"chapter": 42, "slug": "furniture-making", "ko": "가구 제작", "bn": "আসবাবপত্র তৈরি", "en": "Furniture Making", "category": "workplace"},
    {"chapter": 43, "slug": "building-construction", "ko": "건물 건설", "bn": "ভবন নির্মাণ", "en": "Building Construction", "category": "workplace"},
    {"chapter": 44, "slug": "civil-engineering", "ko": "토목 공사", "bn": "সিভিল ইঞ্জিনিয়ারিং কাজ", "en": "Civil Engineering", "category": "workplace"},
    {"chapter": 45, "slug": "crop-cultivation", "ko": "작물 재배", "bn": "ফসল চাষ", "en": "Crop Cultivation", "category": "workplace"},
    {"chapter": 46, "slug": "livestock-management", "ko": "가축 관리", "bn": "গবাদিপশু ব্যবস্থাপনা", "en": "Livestock Management", "category": "workplace"},
    {"chapter": 47, "slug": "coastal-fishery-and-aquaculture", "ko": "연근해 어업과 양식", "bn": "উপকূলীয় মৎস্য ও জলজ চাষ", "en": "Coastal Fishery and Aquaculture", "category": "workplace"},
    {"chapter": 48, "slug": "ship-hull-construction", "ko": "선체 건조", "bn": "জাহাজের হাল নির্মাণ", "en": "Ship Hull Construction", "category": "workplace"},
    {"chapter": 49, "slug": "mineral-resource-development-and-production", "ko": "광물 자원 개발과 생산", "bn": "খনিজ সম্পদ উন্নয়ন ও উৎপাদন", "en": "Mineral Resource Development and Production", "category": "workplace"},
    {"chapter": 50, "slug": "forest-resource-management", "ko": "산림 자원 관리", "bn": "বনসম্পদ ব্যবস্থাপনা", "en": "Forest Resource Management", "category": "workplace"},
    {"chapter": 51, "slug": "accommodation-services", "ko": "숙박 서비스", "bn": "আবাসন সেবা", "en": "Accommodation Services", "category": "workplace"},
    {"chapter": 52, "slug": "food-preparation", "ko": "음식 준비", "bn": "খাদ্য প্রস্তুতি", "en": "Food Preparation", "category": "workplace"},
    {"chapter": 53, "slug": "industrial-safety-and-health-signs", "ko": "산업 안전 보건 표지", "bn": "শিল্প নিরাপত্তা ও স্বাস্থ্য চিহ্ন", "en": "Industrial Safety and Health Signs", "category": "safety"},
    {"chapter": 54, "slug": "industrial-safety-and-health-regulations", "ko": "산업 안전 보건 규정", "bn": "শিল্প নিরাপত্তা ও স্বাস্থ্য বিধি", "en": "Industrial Safety and Health Regulations", "category": "safety"},
    {"chapter": 55, "slug": "industrial-safety-and-hygiene-equipment", "ko": "안전 보건 장비", "bn": "নিরাপত্তা ও স্বাস্থ্য সুরক্ষা সরঞ্জাম", "en": "Industrial Safety and Hygiene Equipment", "category": "safety"},
    {"chapter": 56, "slug": "industrial-accidents-and-first-aid", "ko": "산업 재해와 응급 처치", "bn": "শিল্প দুর্ঘটনা ও প্রাথমিক চিকিৎসা", "en": "Industrial Accidents and First Aid", "category": "safety"},
    {"chapter": 57, "slug": "employment-permit-system", "ko": "고용허가제", "bn": "কর্মসংস্থান অনুমতি ব্যবস্থা", "en": "Employment Permit System", "category": "laws"},
    {"chapter": 58, "slug": "labor-standards-act", "ko": "근로기준법", "bn": "শ্রমমান আইন", "en": "Labor Standards Act", "category": "laws"},
    {"chapter": 59, "slug": "immigration-act", "ko": "출입국관리법", "bn": "অভিবাসন আইন", "en": "Immigration Act", "category": "laws"},
    {"chapter": 60, "slug": "employment-insurance", "ko": "고용보험", "bn": "কর্মসংস্থান ও শ্রমিক বীমা", "en": "Employment Insurance", "category": "laws"},
]
META_BY_CHAPTER = {c["chapter"]: c for c in CHAPTERS}


def multilingual() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {"ko": {"type": "string"}, "bn": {"type": "string"}, "en": {"type": "string"}},
        "required": ["ko", "bn", "en"],
        "additionalProperties": False,
    }


def response_schema(meta: dict[str, Any]) -> dict[str, Any]:
    example = multilingual()
    vocab_item = {
        "type": "object",
        "properties": {
            "ko": {"type": "string"}, "romanization": {"type": "string"}, "bn": {"type": "string"},
            "en": {"type": "string"}, "pos": {"type": "string"}, "example": example,
        },
        "required": ["ko", "romanization", "bn", "en", "pos", "example"],
        "additionalProperties": False,
    }
    grammar_item = {
        "type": "object",
        "properties": {
            "pattern": {"type": "string"}, "titleBn": {"type": "string"},
            "explanationBn": {"type": "string"}, "explanationEn": {"type": "string"},
            "examples": {"type": "array", "minItems": 2, "maxItems": 3, "items": multilingual()},
        },
        "required": ["pattern", "titleBn", "explanationBn", "explanationEn", "examples"],
        "additionalProperties": False,
    }
    line = {
        "type": "object",
        "properties": {"speaker": {"type": "string"}, "ko": {"type": "string"}, "bn": {"type": "string"}, "en": {"type": "string"}},
        "required": ["speaker", "ko", "bn", "en"],
        "additionalProperties": False,
    }
    dialogue = {
        "type": "object",
        "properties": {
            "titleBn": {"type": "string"}, "titleEn": {"type": "string"},
            "lines": {"type": "array", "minItems": 5, "maxItems": 6, "items": line},
        },
        "required": ["titleBn", "titleEn", "lines"],
        "additionalProperties": False,
    }
    pair = {
        "type": "object",
        "properties": {"left": {"type": "string"}, "right": {"type": "string"}},
        "required": ["left", "right"], "additionalProperties": False,
    }
    practice = {
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "type": {"type": "string", "enum": ["multiple-choice", "fill-blank", "matching"]},
            "questionBn": {"type": "string"}, "questionKo": {"type": "string"},
            "options": {"type": "array", "minItems": 0, "maxItems": 4, "items": {"type": "string"}},
            "pairs": {"type": "array", "minItems": 0, "maxItems": 5, "items": pair},
            "answer": {"type": "integer", "minimum": 0, "maximum": 3},
            "explanationBn": {"type": "string"},
        },
        "required": ["id", "type", "questionBn", "questionKo", "options", "pairs", "answer", "explanationBn"],
        "additionalProperties": False,
    }
    eps = {
        "type": "object",
        "properties": {
            "id": {"type": "string"}, "section": {"type": "string", "enum": ["reading", "listening"]},
            "questionBn": {"type": "string"}, "questionKo": {"type": "string"}, "passage": {"type": "string"},
            "options": {"type": "array", "minItems": 4, "maxItems": 4, "items": {"type": "string"}},
            "answer": {"type": "integer", "minimum": 0, "maximum": 3}, "explanationBn": {"type": "string"},
        },
        "required": ["id", "section", "questionBn", "questionKo", "passage", "options", "answer", "explanationBn"],
        "additionalProperties": False,
    }
    return {
        "type": "object",
        "properties": {
            "chapter": {"type": "integer", "const": meta["chapter"]},
            "slug": {"type": "string", "const": meta["slug"]},
            "title": {"type": "object", "properties": {"ko": {"type": "string", "const": meta["ko"]}, "bn": {"type": "string", "const": meta["bn"]}, "en": {"type": "string", "const": meta["en"]}}, "required": ["ko", "bn", "en"], "additionalProperties": False},
            "category": {"type": "string", "const": meta["category"]},
            "level": {"type": "string", "const": "beginner"},
            "objectives": {"type": "object", "properties": {"bn": {"type": "array", "minItems": 3, "maxItems": 4, "items": {"type": "string"}}, "en": {"type": "array", "minItems": 3, "maxItems": 4, "items": {"type": "string"}}}, "required": ["bn", "en"], "additionalProperties": False},
            "vocabulary": {"type": "array", "minItems": 18, "maxItems": 18, "items": vocab_item},
            "grammar": {"type": "array", "minItems": 2, "maxItems": 3, "items": grammar_item},
            "dialogues": {"type": "array", "minItems": 2, "maxItems": 2, "items": dialogue},
            "practice": {"type": "array", "minItems": 10, "maxItems": 10, "items": practice},
            "epsQuestions": {"type": "array", "minItems": 8, "maxItems": 8, "items": eps},
        },
        "required": ["chapter", "slug", "title", "category", "level", "objectives", "vocabulary", "grammar", "dialogues", "practice", "epsQuestions"],
        "additionalProperties": False,
    }


def validate_lesson(data: Any, expected: dict[str, Any] | None = None) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["root must be an object"]
    chapter = data.get("chapter")
    if not isinstance(chapter, int) or not 1 <= chapter <= 60:
        errors.append("chapter must be an integer from 1 to 60")
    meta = expected or META_BY_CHAPTER.get(chapter)
    if meta:
        if data.get("slug") != meta["slug"]: errors.append("slug mismatch")
        if data.get("category") != meta["category"]: errors.append("category mismatch")
        title = data.get("title", {})
        for key in ("ko", "bn", "en"):
            if title.get(key) != meta[key]: errors.append(f"title.{key} mismatch")
    if data.get("level") != "beginner": errors.append("level must be beginner")

    objectives = data.get("objectives")
    if not isinstance(objectives, dict) or any(not isinstance(objectives.get(k), list) or len(objectives[k]) < 2 for k in ("bn", "en")):
        errors.append("objectives must contain bn/en arrays")

    vocab = data.get("vocabulary")
    if not isinstance(vocab, list) or not 16 <= len(vocab) <= 22:
        errors.append("vocabulary count must be 16-22")
    else:
        seen = set()
        for i, item in enumerate(vocab):
            if not isinstance(item, dict): errors.append(f"vocabulary[{i}] must be object"); continue
            for key in ("ko", "romanization", "bn", "en", "pos"):
                if not isinstance(item.get(key), str) or not item[key].strip(): errors.append(f"vocabulary[{i}].{key} missing")
            ex = item.get("example")
            if not isinstance(ex, dict) or any(not isinstance(ex.get(k), str) or not ex[k].strip() for k in ("ko", "bn", "en")):
                errors.append(f"vocabulary[{i}].example invalid")
            ko = item.get("ko")
            if ko in seen: errors.append(f"duplicate vocabulary: {ko}")
            seen.add(ko)

    grammar = data.get("grammar")
    if not isinstance(grammar, list) or not 2 <= len(grammar) <= 4:
        errors.append("grammar count must be 2-4")
    else:
        for i, item in enumerate(grammar):
            if not isinstance(item, dict): errors.append(f"grammar[{i}] invalid"); continue
            for key in ("pattern", "titleBn", "explanationBn", "explanationEn"):
                if not isinstance(item.get(key), str) or not item[key].strip(): errors.append(f"grammar[{i}].{key} missing")
            examples = item.get("examples")
            if not isinstance(examples, list) or len(examples) < 2: errors.append(f"grammar[{i}] needs 2 examples")

    dialogues = data.get("dialogues")
    if not isinstance(dialogues, list) or len(dialogues) != 2:
        errors.append("dialogues count must be exactly 2")
    else:
        for i, item in enumerate(dialogues):
            lines = item.get("lines") if isinstance(item, dict) else None
            if not isinstance(lines, list) or not 4 <= len(lines) <= 8: errors.append(f"dialogues[{i}] must have 4-8 lines")

    practice = data.get("practice")
    if not isinstance(practice, list) or len(practice) != 10:
        errors.append("practice count must be exactly 10")
    else:
        types = [q.get("type") for q in practice if isinstance(q, dict)]
        if types.count("multiple-choice") < 4: errors.append("practice needs >=4 multiple-choice")
        if types.count("fill-blank") < 3: errors.append("practice needs >=3 fill-blank")
        if types.count("matching") < 2: errors.append("practice needs >=2 matching")
        ids = [q.get("id") for q in practice if isinstance(q, dict)]
        if len(set(ids)) != len(ids): errors.append("practice ids must be unique")
        for i, q in enumerate(practice):
            if not isinstance(q, dict): errors.append(f"practice[{i}] invalid"); continue
            qtype = q.get("type")
            if qtype == "matching":
                if not isinstance(q.get("pairs"), list) or not 4 <= len(q["pairs"]) <= 6: errors.append(f"practice[{i}] matching needs 4-6 pairs")
            else:
                options = q.get("options")
                answer = q.get("answer")
                if not isinstance(options, list) or len(options) != 4: errors.append(f"practice[{i}] needs 4 options")
                elif not isinstance(answer, int) or not 0 <= answer < len(options): errors.append(f"practice[{i}] answer out of range")

    eps = data.get("epsQuestions")
    if not isinstance(eps, list) or len(eps) != 8:
        errors.append("epsQuestions count must be exactly 8")
    else:
        sections = [q.get("section") for q in eps if isinstance(q, dict)]
        if sections.count("reading") != 5 or sections.count("listening") != 3: errors.append("EPS mix must be 5 reading and 3 listening")
        ids = [q.get("id") for q in eps if isinstance(q, dict)]
        if len(set(ids)) != len(ids): errors.append("EPS ids must be unique")
        for i, q in enumerate(eps):
            if not isinstance(q, dict): errors.append(f"epsQuestions[{i}] invalid"); continue
            options = q.get("options")
            answer = q.get("answer")
            if not isinstance(options, list) or len(options) != 4: errors.append(f"epsQuestions[{i}] needs 4 options")
            elif not isinstance(answer, int) or not 0 <= answer < 4: errors.append(f"epsQuestions[{i}] answer out of range")

    return errors


def generation_prompt(meta: dict[str, Any], retry_errors: list[str] | None = None) -> str:
    safety_note = ""
    if meta["category"] == "laws":
        safety_note = "Explain only stable beginner-level concepts and practical vocabulary; avoid inventing exact benefit amounts, deadlines, penalties, or legal guarantees. Encourage checking current official guidance where appropriate."
    elif meta["category"] == "safety":
        safety_note = "Use conservative workplace-safety language. Do not replace professional emergency procedures; emphasize reporting hazards, following signs, and contacting supervisors/emergency services."
    sensitive_note = ""
    if meta["chapter"] == 34:
        sensitive_note = "Use respectful, trauma-informed prevention language. Clearly teach consent, boundaries, reporting channels, bystander support, and zero retaliation without graphic detail."
    retry = f"\nA previous draft failed these checks; correct every item: {retry_errors}" if retry_errors else ""
    return f"""Author one complete original EasyEPS beginner lesson as JSON.

Canonical metadata:
- chapter: {meta['chapter']}
- slug: {meta['slug']}
- title.ko: {meta['ko']}
- title.bn: {meta['bn']}
- title.en: {meta['en']}
- category: {meta['category']}
- level: beginner

Audience: Bangla-speaking EPS-TOPIK learners preparing for daily and workplace communication in Korea. Bengali must be natural, clear, and learner-friendly. Korean must use standard Hangul and natural spacing. English is a concise support translation. The material must be original and must not copy any textbook passage.

Content requirements:
1. Write 3-4 parallel learning objectives in Bengali and English.
2. Write exactly 18 unique, topic-specific vocabulary items. Include Revised-Romanization-style romanization, Bengali and English meanings, part of speech, and a natural trilingual example sentence.
3. Write 2-3 useful beginner Korean grammar patterns. Each needs a Bengali title, Bengali and English explanation, and 2-3 trilingual examples.
4. Write exactly two realistic workplace/daily dialogues, each 5-6 lines with speaker, Korean, Bengali, and English.
5. Write exactly ten practice items in this order: p1-p5 multiple-choice, p6-p8 fill-blank, p9-p10 matching. Non-matching items must have four options, an answer index 0-3, and an explanation in Bengali. Matching items must have 4-5 pairs, use empty options, and set answer to 0.
6. Write exactly eight EPS-style questions in this order: e1-e5 reading and e6-e8 listening. Every item has a short Korean passage or spoken script, four Korean options, a valid answer index, Bengali instructions, Korean prompt, and Bengali explanation.
7. Distribute correct answer positions across 0-3 rather than always using the same index.
8. Keep all questions answerable from the lesson and avoid ambiguous distractors.

{safety_note}
{sensitive_note}
Return JSON only and follow the supplied JSON schema exactly.{retry}"""


def write_atomic(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False, suffix=".tmp") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temp_path = Path(handle.name)
    temp_path.replace(path)


def generate_one(client: OpenAI, model: str, meta: dict[str, Any], force: bool, retries: int) -> dict[str, Any]:
    path = LESSON_DIR / f"lesson-{meta['chapter']:02d}.json"
    if path.exists() and not force:
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
            errors = validate_lesson(existing, meta)
            if not errors:
                return {"chapter": meta["chapter"], "status": "skipped", "data": existing}
        except Exception:
            pass

    previous_errors: list[str] | None = None
    for attempt in range(1, retries + 1):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a meticulous trilingual Korean curriculum author. Produce accurate, original, schema-valid educational content."},
                    {"role": "user", "content": generation_prompt(meta, previous_errors)},
                ],
                response_format={"type": "json_schema", "json_schema": {"name": f"easy_eps_lesson_{meta['chapter']}", "strict": True, "schema": response_schema(meta)}},
                max_completion_tokens=30000,
                extra_body={"reasoning": {"effort": "minimal"}},
            )
            content = response.choices[0].message.content
            if not content:
                previous_errors = ["model returned empty content"]
                continue
            data = json.loads(content)
            previous_errors = validate_lesson(data, meta)
            if previous_errors:
                continue
            write_atomic(path, data)
            with PRINT_LOCK:
                print(f"chapter {meta['chapter']:02d}: generated ({len(data['vocabulary'])} vocab)", flush=True)
            return {"chapter": meta["chapter"], "status": "generated", "data": data}
        except Exception as exc:
            previous_errors = [f"generation error: {type(exc).__name__}: {exc}"]
            with PRINT_LOCK:
                print(f"chapter {meta['chapter']:02d}: attempt {attempt} failed: {exc}", file=sys.stderr, flush=True)
            time.sleep(min(8, attempt * 2))
    raise RuntimeError(f"chapter {meta['chapter']} failed after {retries} attempts: {previous_errors}")


def all_known_meta() -> dict[int, dict[str, Any]]:
    # Chapters 1-30 are validated structurally without canonical-title checks here;
    # chapters 31-60 use the explicit canonical metadata above.
    return META_BY_CHAPTER


def validate_all() -> tuple[list[dict[str, Any]], list[str]]:
    completed: list[dict[str, Any]] = []
    problems: list[str] = []
    for chapter in range(1, 61):
        path = LESSON_DIR / f"lesson-{chapter:02d}.json"
        if not path.exists():
            problems.append(f"chapter {chapter:02d}: file missing")
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            problems.append(f"chapter {chapter:02d}: invalid JSON: {exc}")
            continue
        errors = validate_lesson(data, all_known_meta().get(chapter))
        if errors:
            problems.append(f"chapter {chapter:02d}: " + "; ".join(errors))
            continue
        completed.append({
            "chapter": chapter,
            "file": path.name,
            "vocabulary": len(data["vocabulary"]),
            "practice": len(data["practice"]),
            "eps": len(data["epsQuestions"]),
        })
    return completed, problems


def rebuild_manifest(require_all: bool = False) -> list[str]:
    completed, problems = validate_all()
    payload = {
        "version": 1,
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "totalChapters": 60,
        "completed": completed,
    }
    write_atomic(MANIFEST, payload)
    if require_all and problems:
        return problems
    return problems


def parse_chapters(value: str) -> list[dict[str, Any]]:
    if value == "missing":
        return CHAPTERS
    numbers: set[int] = set()
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = map(int, part.split("-", 1))
            numbers.update(range(a, b + 1))
        else:
            numbers.add(int(part))
    unknown = sorted(numbers - set(META_BY_CHAPTER))
    if unknown:
        raise SystemExit(f"Generation metadata is available for chapters 31-60 only; unsupported: {unknown}")
    return [META_BY_CHAPTER[n] for n in sorted(numbers)]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["generate", "validate", "manifest"])
    parser.add_argument("--model", default="gpt-5-mini")
    parser.add_argument("--chapters", default="missing", help="missing, 31-60, or comma-separated values")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    if args.command == "validate":
        completed, problems = validate_all()
        print(json.dumps({"valid": len(completed), "problems": problems}, ensure_ascii=False, indent=2))
        return 1 if problems else 0
    if args.command == "manifest":
        problems = rebuild_manifest()
        print(json.dumps({"manifest": str(MANIFEST), "problems": problems}, ensure_ascii=False, indent=2))
        return 0

    if not os.getenv("OPENAI_API_KEY") or not os.getenv("OPENAI_API_BASE"):
        raise SystemExit("OPENAI_API_KEY and OPENAI_API_BASE are required")
    selected = parse_chapters(args.chapters)
    client = OpenAI()
    failures: list[str] = []
    with futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 8))) as pool:
        jobs = {pool.submit(generate_one, client, args.model, meta, args.force, args.retries): meta for meta in selected}
        for job in futures.as_completed(jobs):
            meta = jobs[job]
            try:
                job.result()
            except Exception as exc:
                failures.append(f"chapter {meta['chapter']:02d}: {exc}")
                with PRINT_LOCK:
                    print(failures[-1], file=sys.stderr, flush=True)
    problems = rebuild_manifest()
    if failures or problems:
        print(json.dumps({"generationFailures": failures, "validationProblems": problems}, ensure_ascii=False, indent=2), file=sys.stderr)
        return 1
    print("All 60 lessons are valid and the manifest is complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
