import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
lessons = [json.loads(path.read_text(encoding="utf-8")) for path in sorted((ROOT / "content/lessons").glob("lesson-*.json"))]
manifest = json.loads((ROOT / "content/audio/manifest.json").read_text(encoding="utf-8"))

named_dialogues = 0
named_lines = 0
listening_questions = 0
full_dialogue_expected = 0
full_dialogue_attached = 0
line_audio_attached = 0
listening_attached = 0
speaker_counts = Counter()
line_counts = Counter()
dialogue_speaker_counts = Counter()
missing_full = []
missing_listening = []

for lesson in lessons:
    for dialogue_index, dialogue in enumerate(lesson.get("dialogues", []), start=1):
        named_dialogues += 1
        line_counts[len(dialogue.get("lines", []))] += 1
        dialogue_speaker_counts[len({line.get("speaker", "unknown") for line in dialogue.get("lines", [])})] += 1
        if lesson["chapter"] > 1:
            full_dialogue_expected += 1
            if dialogue.get("audio"):
                full_dialogue_attached += 1
            else:
                missing_full.append(f"{lesson['chapter']:02d}-{dialogue_index:02d}")
        for line_index, line in enumerate(dialogue.get("lines", []), start=1):
            named_lines += 1
            speaker_counts[line.get("speaker", "unknown")] += 1
            if line.get("audio"):
                line_audio_attached += 1
    for question_index, question in enumerate(lesson.get("epsQuestions", []), start=1):
        if question.get("section") == "listening":
            listening_questions += 1
            if question.get("audio"):
                listening_attached += 1
            else:
                missing_listening.append(f"{lesson['chapter']:02d}-eps-{question_index:02d}")

manifest_generated = sum(1 for clip in manifest.get("clips", {}).values() if clip.get("reviewStatus") == "generated")
manifest_approved = sum(1 for clip in manifest.get("clips", {}).values() if clip.get("reviewStatus") == "approved")
print(f"lessons={len(lessons)}")
print(f"dialogues={named_dialogues}")
print(f"dialogue_lines={named_lines}")
print(f"listening_questions={listening_questions}")
print(f"full_dialogue_expected_excluding_lesson_1={full_dialogue_expected}")
print(f"full_dialogue_attached={full_dialogue_attached}")
print(f"full_dialogue_missing={len(missing_full)}")
print(f"lesson_1_line_audio_attached={line_audio_attached}")
print(f"listening_audio_attached={listening_attached}")
print(f"listening_audio_missing={len(missing_listening)}")
print(f"manifest_clips={len(manifest.get('clips', {}))}")
print(f"manifest_generated={manifest_generated}")
print(f"manifest_approved={manifest_approved}")
print(f"dialogue_line_count_distribution={dict(sorted(line_counts.items()))}")
print(f"dialogue_speaker_count_distribution={dict(sorted(dialogue_speaker_counts.items()))}")
print(f"unique_speakers={len(speaker_counts)}")
print(f"speaker_line_counts={dict(speaker_counts.most_common())}")
if missing_full:
    print(f"missing_full_dialogue_ids={','.join(missing_full)}")
if missing_listening:
    print(f"missing_listening_ids_sample={','.join(missing_listening[:20])}")
