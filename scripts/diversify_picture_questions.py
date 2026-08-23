"""Diversify repeated picture-question variants in the authored lesson corpus.

The first picture-question pass reused a small bank verbatim. This migration keeps
its target image and instructional intent, but gives each repeated item a
chapter/target-specific option set (and listening passage where applicable), so
questions remain meaningful while no longer being byte-for-byte broadcasts.
"""
import hashlib
import json
from collections import defaultdict
from pathlib import Path

LESSONS_DIR = Path("content/lessons")

OBJECT_BANK = ["볼펜", "가위", "안경", "가방", "우산", "시계", "휴대전화", "열쇠", "컵", "책", "지갑", "신발"]
VEHICLE_BANK = ["지게차", "굴착기", "트랙터", "경운기", "버스", "택시", "자전거", "오토바이", "화물차", "자동차", "기차", "배"]
ACTION_BANK = [
    "책을 읽고 있습니다.", "밥을 먹고 있습니다.", "친구를 만나고 있습니다.", "피아노를 치고 있습니다.",
    "전화를 하고 있습니다.", "청소를 하고 있습니다.", "운동을 하고 있습니다.", "요리를 하고 있습니다.",
    "버스를 타고 있습니다.", "잠을 자고 있습니다.", "사진을 찍고 있습니다.", "일을 하고 있습니다.",
]
SIGN_BANK = [
    "전기가 흐르니까 조심하세요.", "떨어질 수 있으니까 조심하세요.", "바닥이 미끄러우니까 조심하세요.",
    "불이 붙을 수 있으니까 조심하세요.", "안전모를 반드시 쓰세요.", "담배를 피우면 안 됩니다.",
    "이곳에 들어가면 안 됩니다.", "비상구를 이용하세요.", "보호 장갑을 착용하세요.",
    "귀마개를 착용하세요.", "물이 있을 수 있으니까 조심하세요.", "이 길로 통행하면 안 됩니다.",
]
TOOL_BANK = ["토치", "펜치", "쇠톱", "망치", "드라이버", "렌치", "삽", "줄자", "보호 장갑", "안전모", "귀마개", "사다리"]
WEAR_BANK = ["반사 조끼", "작업복", "보호 장갑", "안전모", "안전화", "귀마개", "보호 안경", "방진 마스크", "안전벨트", "우비", "앞치마", "장화"]
TIME_BANK = ["오전 일곱 시", "오전 여덟 시", "오전 아홉 시", "오전 열 시", "오전 열한 시", "오후 한 시", "오후 두 시", "오후 세 시", "오후 네 시", "오후 다섯 시", "저녁 여섯 시", "밤 열 시"]
PLACE_BANK = ["문구점에서 샀어요.", "병원에서 샀어요.", "시장에서 샀어요.", "도서관에서 샀어요.", "은행에서 샀어요.", "우체국에서 샀어요.", "편의점에서 샀어요.", "식당에서 샀어요.", "약국에서 샀어요.", "공원에서 샀어요."]


def normalize(value):
    return " ".join(str(value or "").split()).strip()


def content_key(q):
    payload = json.dumps({
        "passage": normalize(q.get("passage")),
        "options": sorted(normalize(option) for option in q.get("options", [])),
    }, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def seed_for(*values):
    raw = "|".join(str(value) for value in values).encode("utf-8")
    return int.from_bytes(hashlib.sha256(raw).digest()[:8], "big")


def target_option(q):
    return q["options"][q["answer"]]


def target_word(value):
    return normalize(value).removesuffix("입니다.").strip()


def rotate_options(target, bank, seed, suffix=""):
    target = normalize(target)
    if suffix and target and not target.endswith(suffix):
        target += suffix
    normalized_bank = []
    for value in bank:
        value = normalize(value)
        if suffix and not value.endswith(suffix):
            value += suffix
        if value not in normalized_bank:
            normalized_bank.append(value)
    if target not in normalized_bank:
        normalized_bank.insert(0, target)
    distractors = [value for value in normalized_bank if value != target]
    start = seed % len(distractors)
    selected = [distractors[(start + offset) % len(distractors)] for offset in range(min(3, len(distractors)))]
    options = [target, *selected]
    target_index = seed % 4
    options[0], options[target_index] = options[target_index], options[0]
    return options, target_index


def classify(q):
    src = q.get("image", {}).get("src", "")
    section = q.get("section")
    basename = src.rsplit("/", 1)[-1]
    if section == "listening" and basename == "obj-pen.svg":
        return "place"
    if section == "listening" and basename == "tool-vest.svg":
        return "wear-listening"
    if section == "listening" and "/sign-" in src:
        return "sign-listening"
    if src.startswith("/eps-images/obj-") and basename in {"obj-pen.svg", "obj-scissors.svg", "obj-glasses.svg", "obj-bag.svg"}:
        return "object"
    if src.startswith("/eps-images/obj-") and src.rsplit("/", 1)[-1] in {"obj-forklift.svg", "obj-excavator.svg", "obj-tractor.svg", "obj-tiller.svg"}:
        return "vehicle"
    if src.startswith("/eps-images/action-"):
        return "action"
    if "/sign-" in src and section == "reading":
        return "sign"
    if src.rsplit("/", 1)[-1] in {"tool-pliers.svg", "tool-hammer.svg"}:
        return "tool"
    if src.rsplit("/", 1)[-1] in {"tool-vest.svg", "tool-uniform.svg"}:
        return "wear"
    if src.rsplit("/", 1)[-1] == "item-clock.svg":
        return "time"
    if src.rsplit("/", 1)[-1] == "obj-pen.svg" and section == "listening":
        return "place"
    return None


def repair_picture_option_format(q):
    if not q.get("image"):
        return
    kind = classify(q)
    original_target = target_option(q)
    seed = seed_for(q.get("id"), q.get("image", {}).get("src"), "format")
    if kind == "object":
        q["options"], q["answer"] = rotate_options(target_word(original_target), OBJECT_BANK, seed, "입니다.")
    elif kind == "vehicle":
        q["options"], q["answer"] = rotate_options(target_word(original_target), VEHICLE_BANK, seed, "입니다.")
    elif kind == "time":
        q["options"], q["answer"] = rotate_options(target_word(original_target), TIME_BANK, seed, "입니다.")


def make_unique_with_lesson_vocabulary(q, lesson, seen, variant):
    if content_key(q) not in seen:
        seen.add(content_key(q))
        return False
    original_options = list(q.get("options", []))
    answer_index = q["answer"]
    target = original_options[answer_index]
    suffix = "입니다." if all(normalize(option).endswith("입니다.") for option in original_options) else ""
    vocabulary = [normalize(item.get("ko")) for item in lesson.get("vocabulary", [])]
    vocabulary = [item + suffix if suffix and not item.endswith(suffix) else item for item in vocabulary]
    vocabulary = [item for item in vocabulary if item and item != target and item not in original_options]
    start = seed_for(lesson["chapter"], q.get("id"), variant) % max(1, len(vocabulary))
    for offset in range(len(vocabulary)):
        candidate = vocabulary[(start + offset) % len(vocabulary)]
        options = list(original_options)
        replace_index = next((index for index in range(4) if index != answer_index), None)
        if replace_index is None:
            return False
        options[replace_index] = candidate
        q["options"] = options
        key = content_key(q)
        if key not in seen:
            seen.add(key)
            return True
    q["options"] = original_options
    return False


def diversify(q, chapter, variant):
    kind = classify(q)
    if kind is None:
        return False
    original_target = target_option(q)
    seed = seed_for(chapter, q.get("id"), q.get("image", {}).get("src"), variant)
    if kind == "object":
        options, answer = rotate_options(target_word(original_target), OBJECT_BANK, seed, "입니다.")
    elif kind == "vehicle":
        options, answer = rotate_options(target_word(original_target), VEHICLE_BANK, seed, "입니다.")
    elif kind == "action":
        options, answer = rotate_options(original_target, ACTION_BANK, seed)
    elif kind == "sign":
        options, answer = rotate_options(original_target, SIGN_BANK, seed)
    elif kind == "tool":
        options, answer = rotate_options(target_word(original_target), TOOL_BANK, seed)
    elif kind in {"wear", "wear-listening"}:
        options, answer = rotate_options(target_word(original_target), WEAR_BANK, seed)
    elif kind == "time":
        target = target_word(original_target)
        options, answer = rotate_options(target, TIME_BANK, seed, "입니다.")
    elif kind == "place":
        options, answer = rotate_options(original_target, PLACE_BANK, seed)
    elif kind == "sign-listening":
        options, answer = rotate_options(original_target, SIGN_BANK, seed)
    else:
        return False
    q["options"] = options
    q["answer"] = answer
    if q["section"] == "listening":
        title = q.get("_lesson_title", {}).get("ko", "이 수업")
        if kind == "time":
            q["passage"] = f"남: {title}에서 일은 몇 시에 시작해요? / 여: {target_word(original_target)}에 시작합니다."
        elif kind == "place":
            q["passage"] = f"남: {title}에서 이 물건을 어디에서 샀어요? / 여: {original_target}"
        elif kind == "sign-listening":
            q["passage"] = f"남: {title}의 표지판이 무슨 뜻이에요? / 여: {original_target}"
        elif kind == "wear-listening":
            q["passage"] = f"남: {title}에서 어두운 곳에서 무엇을 입어요? / 여: {target_word(original_target)}을 입어야 해요."
    return True


def main():
    lessons = []
    for path in sorted(LESSONS_DIR.glob("lesson-*.json")):
        lesson = json.loads(path.read_text())
        for question in lesson.get("epsQuestions", []):
            if question.get("image"):
                repair_picture_option_format(question)
                question["_lesson_title"] = lesson.get("title", {})
        lessons.append((path, lesson))

    groups = defaultdict(list)
    for path, lesson in lessons:
        for question in lesson.get("epsQuestions", []):
            if question.get("image"):
                groups[content_key(question)].append((path, lesson, question))

    changed = 0
    for group_index, items in enumerate(groups.values()):
        if len(items) < 2:
            continue
        for variant, (path, lesson, question) in enumerate(items):
            if diversify(question, lesson["chapter"], variant):
                changed += 1

    # Resolve collisions introduced by different variant banks using lesson-specific
    # vocabulary as distractors. This keeps each picture item tied to its lesson.
    seen = set()
    collision_changes = 0
    for path, lesson in lessons:
        for question in lesson.get("epsQuestions", []):
            if question.get("image") and make_unique_with_lesson_vocabulary(question, lesson, seen, collision_changes):
                collision_changes += 1
            question.pop("_lesson_title", None)
        path.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n")

    remaining = defaultdict(list)
    for path, lesson in lessons:
        for question in lesson.get("epsQuestions", []):
            if question.get("image"):
                remaining[content_key(question)].append((lesson["chapter"], question["id"]))

    repeated = sorted(((len(items), items) for items in remaining.values() if len(items) > 1), reverse=True)
    print(f"Diversified repeated image questions: {changed}")
    print(f"Resolved post-variant collisions: {collision_changes}")
    print(f"Remaining repeated image-content groups: {len(repeated)}")
    for count, items in repeated[:10]:
        print(count, items[:8])


if __name__ == "__main__":
    main()
