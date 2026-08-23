import hashlib
import json
import re
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS = ROOT / "content/lessons"
AUDIO_DIR = ROOT / "client/public/audio/generated/full-dialogues"
MANIFEST_PATH = ROOT / "content/audio/manifest.json"

pattern = re.compile(r"lesson-(\d{2})-dialogue-(\d{2})\.wav$")
manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
manifest.setdefault("clips", {})
attached = 0
for path in sorted(AUDIO_DIR.glob("lesson-*-dialogue-*.wav")):
    match = pattern.fullmatch(path.name)
    if not match:
        raise ValueError(f"unexpected audio filename: {path.name}")
    chapter, dialogue_index = map(int, match.groups())
    lesson_path = LESSONS / f"lesson-{chapter:02d}.json"
    if not lesson_path.exists():
        raise FileNotFoundError(lesson_path)
    lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
    if dialogue_index > len(lesson["dialogues"]):
        raise ValueError(f"dialogue {dialogue_index} missing from lesson {chapter}")
    dialogue = lesson["dialogues"][dialogue_index - 1]
    speakers = list(dict.fromkeys(line["speaker"] for line in dialogue["lines"]))
    if len(speakers) < 2:
        raise ValueError(f"{path.name} requires at least two authored speakers")
    with wave.open(str(path), "rb") as audio:
        if audio.getnchannels() != 1 or audio.getsampwidth() != 2:
            raise ValueError(f"{path.name} must be mono PCM16 WAV")
        if audio.getframerate() <= 0:
            raise ValueError(f"{path.name} has an invalid sample rate")
        duration_ms = round(audio.getnframes() / audio.getframerate() * 1000)
    content_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    voice_id = (
        "ko-generated-duo-iapetus-erinome"
        if len(speakers) == 2
        else "ko-generated-multivoice-distinct-speakers"
    )
    clip = {
        "src": f"/audio/generated/full-dialogues/{path.name}",
        "voiceId": voice_id,
        "speakerRole": "other",
        "durationMs": duration_ms,
        "contentHash": content_hash,
        "license": "generated",
        "attribution": (
            "AI-generated EasyEPS dialogue; generated with prebuilt Korean voice models; "
            f"{len(speakers)} distinct synthetic speaker voices; not human-recorded or independently transcript-reviewed"
        ),
        "reviewStatus": "generated",
        "audioVersion": "audio-v1-generated-dialogues",
    }
    dialogue["audio"] = clip
    lesson["contentVersion"] = lesson.get("contentVersion", "2026-08-23-v5")
    lesson_path.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest["clips"][f"lesson-{chapter:02d}-dialogue-{dialogue_index:02d}-full"] = clip
    attached += 1
manifest["libraryVersion"] = "audio-v1-generated-dialogues"
manifest_path_text = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
MANIFEST_PATH.write_text(manifest_path_text, encoding="utf-8")
print(f"attached_full_dialogues={attached}")
print(f"manifest_clips={len(manifest['clips'])}")
