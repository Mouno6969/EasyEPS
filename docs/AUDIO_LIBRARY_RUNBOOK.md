# EasyEPS Natural Korean Audio Library

## Purpose

EasyEPS supports reviewed natural Korean recordings without making legacy lessons dependent on an audio CDN or a specific device. Every optional clip is attached to a dialogue line or listening question through the validated `AudioClipRef` contract in `shared/audio.ts`. When an approved clip is not present or cannot be played, the application keeps the existing Korean browser-TTS path. The interface reports the source honestly.

## Asset requirements

An approved recording must contain the exact Korean text represented by the lesson field. Do not upload a recording that translates, paraphrases, truncates, or silently changes the text. For a two-speaker dialogue, record each line as an individual clip whenever possible. The lesson line remains the canonical text and the clip is only a faithful audio representation.

Each approved clip must have a stable site-relative or HTTPS `src`, a non-empty `voiceId`, a declared `speakerRole`, a positive `durationMs`, a lowercase hexadecimal `contentHash`, a license classification, attribution where required, and an `audioVersion`. The schema rejects an approved clip that lacks duration or a content hash. `reviewStatus: "pending"` may be used during editorial preparation, but it always falls back to browser TTS.

## Voice and recording guidance

Use a consistent South Korean standard pronunciation. Male and female labels describe the assigned recording role, not a guarantee about a performer’s identity. Keep the recording dry and intelligible, with minimal room noise, no music, no promotional language, and no extra words before or after the lesson text. For exam-style passages, prefer natural conversational pacing while keeping every syllable clear. For workplace dialogues, preserve appropriate politeness and speech level.

Record each speaker separately for dialogues. Use stable `voiceId` values across a lesson collection, such as `ko-workplace-male-01` and `ko-workplace-female-01`, so the same speaker remains recognizable in line replay and full-dialogue playback. The application still maintains browser-level voice and pitch fallback for clips that are missing, blocked, or unavailable offline.

## Editorial review gate

A clip is ready for publication only after two checks:

1. **Text fidelity:** a reviewer compares the waveform against the Korean source text and verifies every word, ending, particle, number, and honorific level.
2. **Audio quality:** a reviewer confirms intelligibility, absence of clipping and long silence, natural pronunciation, acceptable volume, and correct speaker assignment.

The reviewer then computes a stable content hash, records duration, declares the license, and changes `reviewStatus` to `approved`. Never mark a placeholder, synthetic test tone, unlicensed web download, or unreviewed generated file as approved.

## Versioning

Increment `audioVersion` whenever the spoken text, speaker, recording, edit, normalization, or licensing metadata changes. Increment `libraryVersion` in `content/audio/manifest.json` when the release inventory changes. Retain old versions until any cached offline pack has expired or has been migrated. A lesson content version and audio version are independent: changing audio must not silently change the lesson’s Korean text.

## Adding a clip

Add the clip under a stable public path, calculate its hash, and attach the metadata to the corresponding lesson JSON object:

```json
{
  "speaker": "민수",
  "speakerRole": "male",
  "ko": "안전모를 착용하세요.",
  "bn": "সেফটি হেলমেট পরুন।",
  "en": "Please wear a safety helmet.",
  "audio": {
    "src": "/audio/lesson-01-dialogue-01-line-01.mp3",
    "voiceId": "ko-workplace-male-01",
    "speakerRole": "male",
    "durationMs": 2140,
    "contentHash": "0123456789abcdef0123456789abcdef",
    "license": "owned",
    "attribution": "EasyEPS recording library",
    "reviewStatus": "approved",
    "audioVersion": "audio-v1"
  }
}
```

For a full listening question, attach one approved clip to the question’s `audio` field. For a named dialogue, attach one clip per line so full-dialogue and individual-line replay use the same natural speaker audio.

## Runtime behavior

`GuidedListening` and dialogue playback call approved clips before TTS. A clip is considered usable only when it is approved and has the required metadata. If the browser blocks playback, the network fails, the file returns an error, or the clip is not approved, the application uses browser Korean TTS. Multi-speaker TTS retains speaker separation through installed Korean voices or an explicitly labeled pitch fallback.

Listening evidence records `audioSource` as either `reviewed-audio` or `browser-tts`, together with `audioVersion` when available. This allows analytics to distinguish performance on natural recordings from performance on browser-generated speech.

## Offline and accessibility requirements

All public audio files must be cacheable by the selected offline pack and must return a valid audio content type. Do not make autoplay depend on an audio clip. Playback must remain initiated by a user gesture. Every play control must have an accessible label, visible focus state, and a text transcript or script pathway. Audio must never be the only way to access essential learning content.
