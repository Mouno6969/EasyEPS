# EasyEPS Basics Track JSON Schema (v1)

Content under `content/basics/` is **separate** from the 60-chapter lesson schema. Runtime validation: `shared/basics.ts` (Zod). Loader: `server/basicsContent.ts`.

## Layout

```
content/basics/
  manifest.json
  SCHEMA.md
  modules/{welcome,consonants,vowels,syllables,batchim,speak-lab,write-lab,checkpoint}.json
  strokes/{id}.json
```

## Manifest

- `version: 1`, `passScore` default **0.7**
- Exactly **8** modules matching `BASICS_MODULE_IDS`

## Module root

| Field | Notes |
|---|---|
| `id` | `welcome` … `checkpoint` |
| `order` | 0–7 matching id order |
| `title` | `{ ko, bn, en }` |
| `requirements` | `requiredStepIds`, `minSpeakItems`, `minWriteItems`, `minBuilderItems`, `passRatio` |
| `steps` | explain / jamo-grid / speak / write / builder / quiz |

## Quiz

- `kind`: `multiple-choice` | `matching` | `listen-choice`
- Checkpoint: 12–16 questions; ≥3 listen-choice; ≥3 syllable; ≥2 batchim; ≥2 matching
- Non-checkpoint quiz steps: ≥3 questions

## Strokes

- `samples` authoritative for `coverageRatio`; `d` is SVG underlay only

## Pure helpers

- `composeHangul` / `decomposeHangul` — Unicode formula
- `coverageRatio` — hit fraction
- `isModuleComplete`, `scoreBasicsQuiz`, `isCheckpointPassing` (default 0.7)
