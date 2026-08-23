# EasyEPS Natural Korean Audio Library

## Purpose

EasyEPS supports optional natural Korean audio without making lessons dependent on an audio CDN or a specific device. Audio is attached through the validated `AudioClipRef` contract in `shared/audio.ts`. The application prefers a usable attached recording and falls back to Korean browser TTS when a file is absent, blocked, unavailable offline, or fails to play. The interface reports the source honestly.

The current shipped generated release contains **one full-dialogue WAV for every one of the 180 authored dialogues across all 60 lessons**, plus **12 individual lesson-1 dialogue-line WAVs**. The full-dialogue recordings are intended for natural full-conversation replay. Individual line replay uses the lesson-1 line clips where present and otherwise retains speaker-aware browser TTS and pitch fallback. EPS listening-question passages are not represented as attached generated clips in this release; they continue to use their authored passage with the existing dialogue/browser-TTS fallback.

## Asset status and attribution

The `reviewStatus` field distinguishes editorial state and must never be inferred from the fact that a file exists.

| Status | Meaning | Runtime behavior |
| --- | --- | --- |
| `pending` | Prepared or proposed asset that has not passed publication checks | Never preferred; browser TTS fallback |
| `generated` | AI-generated asset with file metadata and source-text prompting, but without independent human transcript and audio-quality approval | Usable and visibly attributable as generated AI audio |
| `approved` | Human-reviewed recording that passed text-fidelity and audio-quality review | Usable as reviewed audio |

All generated dialogue clips are labelled with `license: "generated"`, `reviewStatus: "generated"`, and attribution stating that they were generated with prebuilt Korean voice models. They are **not human-recorded**, and they must not be described as independently transcript-reviewed. Independent speech-to-text verification was unavailable during this release because the transcription service reported exhausted credits; WAV structure, source-text prompting, hashes, durations, and attachment metadata were checked instead.

Male and female descriptions in generation prompts describe stable synthetic voice assignments for the two-speaker role positions, not the identity or sex of a real performer. Multi-speaker recordings use distinct synthetic voices and the generic `speakerRole: "other"` metadata because the current contract does not encode a complete per-turn voice map.

## Asset requirements

An attached recording must be generated from the exact Korean source represented by the lesson field. Do not upload a recording that translates, paraphrases, truncates, or silently changes the text. Full-dialogue recordings preserve the authored line order. The lesson text remains canonical, and the audio is only a representation of that text.

Every non-pending clip must have a stable site-relative or HTTPS `src`, a non-empty `voiceId`, a declared `speakerRole`, a positive `durationMs`, a lowercase hexadecimal `contentHash`, a license classification, attribution where required, and an `audioVersion`. The schema rejects a non-pending clip that lacks duration or a content hash.

Generated public WAV files are checked as mono PCM16 audio. The attachment script computes SHA-256 and duration metadata from the canonical public file and writes the same clip reference into the lesson object and `content/audio/manifest.json`. The manifest must never be rebuilt by a script that clears existing clips; attachment scripts must merge into the existing inventory.

## Voice and recording guidance

Use standard South Korean pronunciation, polite conversational pacing, and clear intelligibility. Keep the recording dry, without music, promotional language, narration, or words not present in the authored script. For two-speaker dialogue, retain a stable distinction between the first and second speaker. For three- and four-speaker dialogue, generate each authored turn with a stable distinct synthetic voice and concatenate turns in authored order. Do not describe role-position voice assignments as real speaker identities.

The current generated dialogue convention uses `Iapetus` for the first two-speaker voice position and `Erinome` for the second. Multi-speaker assembly additionally uses stable distinct voices such as `Algieba` and `Sulafat` for later positions. This is a technical voice assignment, not a claim about a human performer.

## Editorial review gate

A generated clip is not automatically an approved clip. Before changing `reviewStatus` to `approved`, a human reviewer must compare the waveform against the Korean source and verify every word, ending, particle, number, and honorific level. The reviewer must also check intelligibility, clipping, long silence, pronunciation, volume, and speaker assignment. Only after those checks may the reviewer compute or confirm the hash, duration, license, attribution, and approval status.

Never mark a placeholder, synthetic test tone, unlicensed download, or unreviewed generated file as `approved`. For this release, generated assets remain `generated` even when WAV metadata and source-text attachment checks pass.

## Versioning

Increment `audioVersion` whenever the spoken text, speaker assignment, recording, edit, normalization, or licensing metadata changes. Increment `libraryVersion` in `content/audio/manifest.json` when the release inventory changes. A lesson content version and audio version are independent: changing audio must not silently change the lesson’s Korean text.

## Adding a clip

Add the file under a stable public path, calculate its SHA-256 hash and duration, and attach the metadata to the corresponding lesson JSON object. A generated example is:

```json
{
  "audio": {
    "src": "/audio/generated/full-dialogues/lesson-44-dialogue-01.wav",
    "voiceId": "ko-generated-multivoice-distinct-speakers",
    "speakerRole": "other",
    "durationMs": 12100,
    "contentHash": "0123456789abcdef0123456789abcdef",
    "license": "generated",
    "attribution": "AI-generated EasyEPS dialogue; generated with prebuilt Korean voice models; 3 distinct synthetic speaker voices; not human-recorded or independently transcript-reviewed",
    "reviewStatus": "generated",
    "audioVersion": "audio-v1-generated-dialogues"
  }
}
```

For a full listening question, attach one generated clip to the question’s `audio` field only when the exact passage has actually been rendered, validated, and attached. Do not attach a dialogue recording to an unrelated listening question merely to increase coverage. Until listening clips are generated and attached, preserve the authored passage and browser fallback.

## Runtime behavior

`GuidedListening` and dialogue playback prefer a usable attached clip. Generated clips report `generated-audio`; human-reviewed clips report `reviewed-audio`; browser fallback reports `browser-tts` or the explicitly documented pitch fallback. If an attached file fails, the application continues with Korean browser TTS. Full-dialogue replay prefers the dialogue-level recording before falling back to line-by-line speaker-aware playback. Individual line replay remains line-specific where a line clip exists and otherwise uses browser TTS.

Listening evidence records its audio source so analytics can distinguish generated recordings, reviewed recordings, and browser speech. A generated source must not be interpreted as human review or transcript verification.

## Offline and accessibility requirements

All public audio files must be cacheable by the selected offline pack and must return a valid audio content type. Playback must remain initiated by a user gesture. Every play control must have an accessible label, visible focus state, and a text transcript or script pathway. Audio must never be the only way to access essential learning content. The service worker uses same-origin `/audio/` caching after first playback; this release does not prefetch the complete generated library into an offline pack.
