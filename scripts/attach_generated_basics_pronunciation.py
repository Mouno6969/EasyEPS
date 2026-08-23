#!/usr/bin/env python3
"""Attach generated slow Korean pronunciation clips to canonical Basics content.

The script is merge-safe: it never resets existing manifest clips, and it attaches
one content-addressed clip to every exact Korean source-text occurrence listed in
``tmp/basics_audio_jobs.json``.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import wave
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
JOBS_PATH = ROOT / "tmp/basics_audio_jobs.json"
MODULE_DIR = ROOT / "content/basics/modules"
STAGING_DIR = ROOT / "content/audio/basics-pronunciation"
PUBLIC_DIR = ROOT / "client/public/audio/generated/basics-pronunciation-slow"
MANIFEST_PATH = ROOT / "content/audio/manifest.json"

VOICE_ID = "ko-generated-basics-slow-pronunciation-iapetus"
AUDIO_VERSION = "audio-v1-generated-basics-pronunciation"
ATTRIBUTION = (
    "AI-generated EasyEPS pronunciation reference; deliberately slow Korean beginner delivery; "
    "not human-recorded or independently transcript-reviewed"
)


def inspect_wav(path: Path) -> tuple[int, str]:
    with wave.open(str(path), "rb") as wav:
        channels = wav.getnchannels()
        sample_rate = wav.getframerate()
        sample_width = wav.getsampwidth()
        frames = wav.getnframes()
        if channels != 1 or sample_rate != 24000 or sample_width != 2:
            raise ValueError(
                f"{path.name}: expected mono 24 kHz PCM16, got "
                f"channels={channels}, rate={sample_rate}, width={sample_width}"
            )
        duration_ms = round(frames * 1000 / sample_rate)
        if duration_ms <= 0:
            raise ValueError(f"{path.name}: empty audio")
        return duration_ms, hashlib.sha256(path.read_bytes()).hexdigest()


def iter_dicts(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_dicts(child)


def object_has_source(obj: dict[str, Any], text: str) -> bool:
    return any(obj.get(key) == text for key in ("audioText", "listenText", "text"))


def find_matching_id(root: Any, object_id: str, text: str) -> list[dict[str, Any]]:
    return [
        obj
        for obj in iter_dicts(root)
        if obj.get("id") == object_id and object_has_source(obj, text)
    ]


def main() -> None:
    jobs = json.loads(JOBS_PATH.read_text(encoding="utf-8"))
    if not isinstance(jobs, list) or len(jobs) != 185:
        raise SystemExit(f"Expected exactly 185 Basics jobs, found {len(jobs) if isinstance(jobs, list) else 'invalid'}")
    if len({job["text"] for job in jobs}) != len(jobs):
        raise SystemExit("Jobs must contain one entry per unique Korean source text")

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict) or not isinstance(manifest.get("clips"), dict):
        raise SystemExit("Invalid audio manifest shape")

    clips_by_text: dict[str, dict[str, Any]] = {}
    missing: list[str] = []
    files_copied = 0
    for job in jobs:
        staged = STAGING_DIR / job["filename"]
        destination = PUBLIC_DIR / job["filename"]
        source = staged if staged.exists() else destination
        if not source.exists():
            missing.append(f"{job['filename']} ({job['text']})")
            continue
        if source.resolve() != destination.resolve():
            shutil.copy2(source, destination)
            files_copied += 1
        duration_ms, content_hash = inspect_wav(destination)
        clips_by_text[job["text"]] = {
            "src": f"/audio/generated/basics-pronunciation-slow/{job['filename']}",
            "voiceId": VOICE_ID,
            "speakerRole": "narrator",
            "durationMs": duration_ms,
            "contentHash": content_hash,
            "license": "generated",
            "attribution": ATTRIBUTION,
            "reviewStatus": "generated",
            "audioVersion": AUDIO_VERSION,
        }
    if missing:
        raise SystemExit("Missing generated Basics audio jobs:\n" + "\n".join(missing))

    refs_by_file: dict[str, list[tuple[dict[str, Any], dict[str, Any]]]] = defaultdict(list)
    for job in jobs:
        for ref in job["refs"]:
            filename, step_id, object_id = ref
            refs_by_file[filename].append((job, {"stepId": step_id, "objectId": object_id}))

    attached_refs = 0
    content_errors: list[str] = []
    for filename, file_refs in refs_by_file.items():
        module_path = MODULE_DIR / filename
        if not module_path.exists():
            content_errors.append(f"missing module file: {filename}")
            continue
        module = json.loads(module_path.read_text(encoding="utf-8"))
        for job, ref in file_refs:
            matches = find_matching_id(module, ref["objectId"], job["text"])
            if not matches:
                content_errors.append(
                    f"{filename}:{ref['stepId']}:{ref['objectId']}: source text {job['text']!r} not found"
                )
                continue
            for obj in matches:
                obj["audio"] = clips_by_text[job["text"]]
                attached_refs += 1
        module_path.write_text(json.dumps(module, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    expected_refs = sum(len(job["refs"]) for job in jobs)
    if content_errors:
        raise SystemExit("Basics content attachment errors:\n" + "\n".join(content_errors))
    if attached_refs != expected_refs:
        raise SystemExit(f"Expected {expected_refs} attached Basics refs, attached {attached_refs}")

    for job in jobs:
        key = f"basics-pronunciation-slow-{job['filename'][:-4]}"
        clip = clips_by_text[job["text"]]
        existing = manifest["clips"].get(key)
        if existing is not None and existing != clip:
            raise SystemExit(f"Manifest key collision with different metadata: {key}")
        manifest["clips"][key] = clip
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({
        "jobs": len(jobs),
        "uniqueTexts": len(clips_by_text),
        "expectedReferences": expected_refs,
        "attachedReferences": attached_refs,
        "filesCopied": files_copied,
        "manifestEntriesAddedOrKept": len(jobs),
        "publicDir": str(PUBLIC_DIR),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

# End of file

