import hashlib
import json
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSON_PATH = ROOT / "content/lessons/lesson-01.json"
MANIFEST_PATH = ROOT / "content/audio/manifest.json"
PUBLIC_AUDIO = ROOT / "client/public/audio/generated"

CLIPS = [
    ("lesson-01-dialogue-01-line-01-rahim.wav", 0, 0, "라힘", "male", "ko-generated-male-iapetus"),
    ("lesson-01-dialogue-01-line-02-minsu.wav", 0, 1, "민수", "female", "ko-generated-female-erinome"),
    ("lesson-01-dialogue-01-line-03-rahim.wav", 0, 2, "라힘", "male", "ko-generated-male-iapetus"),
    ("lesson-01-dialogue-01-line-04-minsu.wav", 0, 3, "민수", "female", "ko-generated-female-erinome"),
    ("lesson-01-dialogue-02-line-01-susan.wav", 1, 0, "수잔", "female", "ko-generated-female-erinome"),
    ("lesson-01-dialogue-02-line-02-rahim.wav", 1, 1, "라힘", "male", "ko-generated-male-iapetus"),
    ("lesson-01-dialogue-02-line-03-susan.wav", 1, 2, "수잔", "female", "ko-generated-female-erinome"),
    ("lesson-01-dialogue-02-line-04-rahim.wav", 1, 3, "라힘", "male", "ko-generated-male-iapetus"),
    ("lesson-01-dialogue-03-line-01-tuan.wav", 2, 0, "투안", "female", "ko-generated-female-erinome"),
    ("lesson-01-dialogue-03-line-02-rahim.wav", 2, 1, "라힘", "male", "ko-generated-male-iapetus"),
    ("lesson-01-dialogue-03-line-03-tuan.wav", 2, 2, "투안", "female", "ko-generated-female-erinome"),
    ("lesson-01-dialogue-03-line-04-rahim.wav", 2, 3, "라힘", "male", "ko-generated-male-iapetus"),
]

lesson = json.loads(LESSON_PATH.read_text(encoding="utf-8"))
manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
manifest["clips"] = {}

for filename, dialogue_index, line_index, expected_speaker, role, voice_id in CLIPS:
    path = PUBLIC_AUDIO / filename
    if not path.exists():
        raise FileNotFoundError(path)
    line = lesson["dialogues"][dialogue_index]["lines"][line_index]
    if line["speaker"] != expected_speaker:
        raise ValueError(f"speaker mismatch for {filename}: {line['speaker']} != {expected_speaker}")
    with wave.open(str(path), "rb") as audio:
        duration_ms = round(audio.getnframes() / audio.getframerate() * 1000)
        if audio.getnchannels() != 1 or audio.getsampwidth() != 2:
            raise ValueError(f"{filename} must be mono PCM16 WAV")
    content_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    clip_id = f"lesson-01-dialogue-{dialogue_index + 1:02d}-line-{line_index + 1:02d}"
    clip = {
        "src": f"/audio/generated/{filename}",
        "voiceId": voice_id,
        "speakerRole": role,
        "durationMs": duration_ms,
        "contentHash": content_hash,
        "license": "generated",
        "attribution": "AI-generated EasyEPS sample; generated with a prebuilt Korean voice model",
        "reviewStatus": "approved",
        "audioVersion": "audio-v1-generated-sample",
    }
    line["audio"] = clip
    manifest["clips"][clip_id] = clip

lesson["contentVersion"] = "2026-08-23-v5"
manifest["libraryVersion"] = "audio-v1-generated-sample"
manifest["generatedAt"] = "2026-08-23T00:00:00.000Z"
LESSON_PATH.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"attached={len(CLIPS)}")
print(f"manifest_clips={len(manifest['clips'])}")
