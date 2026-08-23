import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tmp/audio_prompts"
OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("*.txt"):
    old.unlink()

created = 0
flagged = []
for lesson_path in sorted((ROOT / "content/lessons").glob("lesson-*.json")):
    lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
    chapter = lesson["chapter"]
    for dialogue_index, dialogue in enumerate(lesson.get("dialogues", []), start=1):
        speakers = []
        for line in dialogue["lines"]:
            if line["speaker"] not in speakers:
                speakers.append(line["speaker"])
        if len(speakers) != 2:
            flagged.append((chapter, dialogue_index, len(speakers), speakers))
            continue
        first, second = speakers
        lines = "\n".join(f"{line['speaker']}: {line['ko']}" for line in dialogue["lines"])
        text = (
            "Speak in standard South Korean Korean as a natural workplace conversation between two distinct adult speakers. "
            f"{first} uses a clear, calm adult male voice. {second} uses a clear, warm adult female voice. "
            "Use polite conversational pacing, accurate pronunciation, and a brief pause between turns. "
            "Speak only the exact dialogue lines and do not add narration.\n"
            f"{lines}\n"
        )
        (OUT / f"lesson-{chapter:02d}-dialogue-{dialogue_index:02d}.txt").write_text(text, encoding="utf-8")
        created += 1
print(f"two_speaker_prompts={created}")
print(f"multi_speaker_dialogues={len(flagged)}")
for chapter, index, count, speakers in flagged:
    print(f"multi={chapter:02d}-{index:02d} speakers={count} names={speakers}")
