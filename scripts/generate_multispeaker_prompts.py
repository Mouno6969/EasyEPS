import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tmp/audio_prompts/multi"
OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("*.txt"):
    old.unlink()

created = 0
for lesson_path in sorted((ROOT / "content/lessons").glob("lesson-*.json")):
    lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
    chapter = lesson["chapter"]
    for dialogue_index, dialogue in enumerate(lesson.get("dialogues", []), start=1):
        speakers = list(dict.fromkeys(line["speaker"] for line in dialogue["lines"]))
        if len(speakers) <= 2:
            continue
        for line_index, line in enumerate(dialogue["lines"], start=1):
            speaker_position = speakers.index(line["speaker"])
            voice = ["Iapetus", "Erinome", "Algieba", "Sulafat"][speaker_position % 4]
            style = (
                "Speak in standard South Korean Korean as a natural workplace conversation turn. "
                f"Use a distinct adult voice for speaker {line['speaker']}; this is speaker position {speaker_position + 1} of {len(speakers)}. "
                "Use clear pronunciation, polite conversational pacing, and do not add narration or extra words."
            )
            text = f"{style}: {line['ko']}\n"
            name = f"lesson-{chapter:02d}-dialogue-{dialogue_index:02d}-line-{line_index:02d}.txt"
            (OUT / name).write_text(text, encoding="utf-8")
            created += 1
print(f"multi_speaker_line_prompts={created}")
