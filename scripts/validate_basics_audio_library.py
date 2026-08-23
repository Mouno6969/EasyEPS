#!/usr/bin/env python3
"""Validate the Basics-specific slow pronunciation audio release."""
from __future__ import annotations

import hashlib
import json
import wave
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
JOBS_PATH = ROOT / "tmp/basics_audio_jobs.json"
MODULE_DIR = ROOT / "content/basics/modules"
PUBLIC_ROOT = ROOT / "client/public"
PUBLIC_DIR = PUBLIC_ROOT / "audio/generated/basics-pronunciation-slow"
MANIFEST_PATH = ROOT / "content/audio/manifest.json"
EXPECTED_VERSION = "audio-v1-generated-basics-pronunciation"
EXPECTED_VOICE = "ko-generated-basics-slow-pronunciation-iapetus"


def iter_dicts(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_dicts(child)


def source_matches(obj: dict[str, Any], text: str) -> bool:
    return any(obj.get(key) == text for key in ("audioText", "listenText", "text"))


def find_objects(root: Any, object_id: str, text: str) -> list[dict[str, Any]]:
    return [obj for obj in iter_dicts(root) if obj.get("id") == object_id and source_matches(obj, text)]


def wav_info(path: Path) -> tuple[int, str]:
    with wave.open(str(path), "rb") as wav:
        if wav.getnchannels() != 1 or wav.getframerate() != 24000 or wav.getsampwidth() != 2:
            raise ValueError(
                f"{path}: expected mono 24000 Hz PCM16, got "
                f"channels={wav.getnchannels()}, rate={wav.getframerate()}, width={wav.getsampwidth()}"
            )
        frames = wav.getnframes()
        if frames <= 0:
            raise ValueError(f"{path}: empty WAV")
        return round(frames * 1000 / 24000), hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    jobs = json.loads(JOBS_PATH.read_text(encoding="utf-8"))
    if len(jobs) != 185 or len({job["text"] for job in jobs}) != 185:
        raise SystemExit("Expected 185 unique Basics audio jobs")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    clips = manifest.get("clips", {})
    basics_keys = {key for key in clips if key.startswith("basics-pronunciation-slow-")}
    if len(basics_keys) != 185:
        raise SystemExit(f"Expected 185 Basics manifest entries, found {len(basics_keys)}")

    modules: dict[str, Any] = {}
    refs_by_file: dict[str, list[tuple[dict[str, Any], str, str]]] = defaultdict(list)
    for job in jobs:
        for filename, step_id, object_id in job["refs"]:
            refs_by_file[filename].append((job, step_id, object_id))
    expected_refs = sum(len(job["refs"]) for job in jobs)
    checked_refs = 0
    seen_texts: set[str] = set()

    for filename, refs in refs_by_file.items():
        path = MODULE_DIR / filename
        if not path.exists():
            raise SystemExit(f"Missing Basics module {filename}")
        modules[filename] = json.loads(path.read_text(encoding="utf-8"))
        for job, step_id, object_id in refs:
            objects = find_objects(modules[filename], object_id, job["text"])
            if not objects:
                raise SystemExit(f"Missing source object {filename}:{step_id}:{object_id} for {job['text']!r}")
            expected_src = f"/audio/generated/basics-pronunciation-slow/{job['filename']}"
            for obj in objects:
                audio = obj.get("audio")
                if not isinstance(audio, dict):
                    raise SystemExit(f"No audio attached at {filename}:{step_id}:{object_id}")
                if audio.get("src") != expected_src:
                    raise SystemExit(f"Wrong audio src at {filename}:{step_id}:{object_id}")
                if audio.get("voiceId") != EXPECTED_VOICE or audio.get("audioVersion") != EXPECTED_VERSION:
                    raise SystemExit(f"Wrong generated metadata at {filename}:{step_id}:{object_id}")
                if audio.get("license") != "generated" or audio.get("reviewStatus") != "generated":
                    raise SystemExit(f"Audio is not transparently labelled generated at {filename}:{step_id}:{object_id}")
                if "not human-recorded" not in audio.get("attribution", "") or "independently transcript-reviewed" not in audio.get("attribution", ""):
                    raise SystemExit(f"Missing AI/no-independent-review attribution at {filename}:{step_id}:{object_id}")
                checked_refs += 1
            seen_texts.add(job["text"])

    if checked_refs != expected_refs:
        raise SystemExit(f"Expected {expected_refs} checked refs, found {checked_refs}")
    if len(seen_texts) != 185:
        raise SystemExit(f"Expected 185 covered source texts, found {len(seen_texts)}")

    for job in jobs:
        key = f"basics-pronunciation-slow-{job['filename'][:-4]}"
        clip = clips.get(key)
        if clip is None:
            raise SystemExit(f"Missing manifest key {key}")
        public_path = PUBLIC_ROOT / Path(clip["src"].lstrip("/"))
        duration_ms, content_hash = wav_info(public_path)
        if clip.get("durationMs") != duration_ms:
            raise SystemExit(f"Duration mismatch for {job['filename']}: manifest {clip.get('durationMs')} vs WAV {duration_ms}")
        if clip.get("contentHash") != content_hash:
            raise SystemExit(f"Hash mismatch for {job['filename']}")

    actual_files = {path.name for path in PUBLIC_DIR.glob("*.wav")}
    expected_files = {job["filename"] for job in jobs}
    if actual_files != expected_files:
        raise SystemExit(f"Public WAV set mismatch: expected {len(expected_files)}, found {len(actual_files)}")

    print(json.dumps({
        "uniqueJobs": len(jobs),
        "uniqueCoveredTexts": len(seen_texts),
        "sourceReferences": checked_refs,
        "manifestBasicsEntries": len(basics_keys),
        "publicWavFiles": len(actual_files),
        "format": "mono 24 kHz PCM16",
        "status": "ok",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

# End of file

