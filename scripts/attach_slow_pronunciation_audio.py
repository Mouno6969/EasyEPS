import hashlib
import json
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSON_PATH = ROOT / "content/lessons/lesson-01.json"
MANIFEST_PATH = ROOT / "content/audio/manifest.json"
AUDIO_DIR = ROOT / "client/public/audio/generated/pronunciation-slow"

CLIPS = [
    ("lesson-01-dialogue-01-line-01-rahim.wav", 0, 0, "male", "ko-generated-male-iapetus-slow-pronunciation"),
    ("lesson-01-dialogue-01-line-02-minsu.wav", 0, 1, "female", "ko-generated-female-erinome-slow-pronunciation"),
    ("lesson-01-dialogue-01-line-03-rahim.wav", 0, 2, "male", "ko-generated-male-iapetus-slow-pronunciation"),
    ("lesson-01-dialogue-01-line-04-minsu.wav", 0, 3, "female", "ko-generated-female-erinome-slow-pronunciation"),
    ("lesson-01-dialogue-02-line-01-susan.wav", 1, 0, "female", "ko-generated-female-erinome-slow-pronunciation"),
    ("lesson-01-dialogue-02-line-02-rahim.wav", 1, 1, "male", "ko-generated-male-iapetus-slow-pronunciation"),
    ("lesson-01-dialogue-02-line-03-susan.wav", 1, 2, "female", "ko-generated-female-erinome-slow-pronunciation"),
    ("lesson-01-dialogue-02-line-04-rahim.wav", 1, 3, "male", "ko-generated-male-iapetus-slow-pronunciation"),
    ("lesson-01-dialogue-03-line-01-tuan.wav", 2, 0, "female", "ko-generated-female-erinome-slow-pronunciation"),
    ("lesson-01-dialogue-03-line-02-rahim.wav", 2, 1, "male", "ko-generated-male-iapetus-slow-pronunciation"),
    ("lesson-01-dialogue-03-line-03-tuan.wav", 2, 2, "female", "ko-generated-female-erinome-slow-pronunciation"),
    ("lesson-01-dialogue-03-line-04-rahim.wav", 2, 3, "male", "ko-generated-male-iapetus-slow-pronunciation"),
]

lesson = json.loads(LESSON_PATH.read_text(encoding="utf-8"))
manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
manifest.setdefault("clips", {})

for filename, dialogue_index, line_index, role, voice_id in CLIPS:
    path = AUDIO_DIR / filename
    if not path.exists():
        raise FileNotFoundError(path)
    with wave.open(str(path), "rb") as audio:
        if audio.getnchannels() != 1 or audio.getsampwidth() != 2:
            raise ValueError(f"{filename} must be mono PCM16 WAV")
        duration_ms = round(audio.getnframes() / audio.getframerate() * 1000)
    clip = {
        "src": f"/audio/generated/pronunciation-slow/{filename}",
        "voiceId": voice_id,
        "speakerRole": role,
        "durationMs": duration_ms,
        "contentHash": hashlib.sha256(path.read_bytes()).hexdigest(),
        "license": "generated",
        "attribution": "AI-generated EasyEPS pronunciation reference; deliberately slow Korean beginner delivery; not human-recorded or independently transcript-reviewed",
        "reviewStatus": "generated",
        "audioVersion": "audio-v1-generated-slow-pronunciation",
    }
    line = lesson["dialogues"][dialogue_index]["lines"][line_index]
    line["pronunciationAudio"] = clip
    manifest["clips"][f"lesson-01-dialogue-{dialogue_index + 1:02d}-line-{line_index + 1:02d}-pronunciation-slow"] = clip

lesson["contentVersion"] = "2026-08-23-v5"
manifest["libraryVersion"] = "audio-v1-generated-dialogues-pronunciation"
LESSON_PATH.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"attached_slow_pronunciation={len(CLIPS)}")
print(f"manifest_clips={len(manifest['clips'])}")
