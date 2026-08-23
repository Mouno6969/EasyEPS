import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "content/audio/manifest.json").read_text(encoding="utf-8"))
clips = manifest["clips"]
slow = [
    (key, clip) for key, clip in clips.items()
    if key.endswith("-pronunciation-slow")
]
if len(slow) != 12:
    raise SystemExit(f"expected 12 slow pronunciation clips, found {len(slow)}")
shorter = []
for key, clip in slow:
    normal_key = key.removesuffix("-pronunciation-slow")
    normal = clips.get(normal_key)
    if not normal:
        raise SystemExit(f"missing normal counterpart for {key}: {normal_key}")
    if clip["reviewStatus"] != "generated" or clip["license"] != "generated":
        raise SystemExit(f"unexpected status for {key}")
    if clip["durationMs"] <= normal["durationMs"]:
        shorter.append((key, normal["durationMs"], clip["durationMs"]))
print(f"slow_pronunciation_clips={len(slow)}")
print(f"slow_longer_than_normal={len(slow) - len(shorter)}")
print(f"slow_not_longer={len(shorter)}")
for key, normal_ms, slow_ms in shorter:
    print(f"not_longer={key} normal_ms={normal_ms} slow_ms={slow_ms}")
if shorter:
    raise SystemExit(1)
