import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getAllLessons } from "../server/content";
import { audioLibraryManifestSchema, audioClipRefSchema, type AudioClipRef } from "../shared/audio";

const manifestPath = resolve("content/audio/manifest.json");
const publicRoot = resolve("client/public");
const manifestResult = audioLibraryManifestSchema.safeParse(JSON.parse(readFileSync(manifestPath, "utf8")));
if (!manifestResult.success) {
  console.error(manifestResult.error.issues);
  process.exit(1);
}
const manifest = manifestResult.data;
const lessons = getAllLessons();
const manifestEntries = Object.entries(manifest.clips);
const manifestClips = new Map(manifestEntries.map(([key, clip]) => [clip.src, { key, clip }]));
const references: Array<{ src: string; location: string; clip: AudioClipRef }> = [];
const invalid: string[] = [];
const warnings: string[] = [];

for (const lesson of lessons) {
  lesson.dialogues.forEach((dialogue, dialogueIndex) => {
    if (dialogue.audio) references.push({ src: dialogue.audio.src, location: `lesson-${lesson.chapter}/dialogue-${dialogueIndex + 1}/full`, clip: dialogue.audio });
    dialogue.lines.forEach((line, lineIndex) => {
      if (line.audio) references.push({ src: line.audio.src, location: `lesson-${lesson.chapter}/dialogue-${dialogueIndex + 1}/line-${lineIndex + 1}`, clip: line.audio });
      if (line.pronunciationAudio) references.push({ src: line.pronunciationAudio.src, location: `lesson-${lesson.chapter}/dialogue-${dialogueIndex + 1}/line-${lineIndex + 1}/pronunciation`, clip: line.pronunciationAudio });
    });
  });
  lesson.epsQuestions.forEach((question, questionIndex) => {
    if (question.audio) references.push({ src: question.audio.src, location: `lesson-${lesson.chapter}/eps-${questionIndex + 1}`, clip: question.audio });
  });
}

function localPathForSrc(src: string): string | undefined {
  if (!src.startsWith("/audio/")) return undefined;
  return resolve(publicRoot, `.${src}`);
}

function inspectWav(buffer: Buffer): { channels: number; sampleRate: number; bitsPerSample: number; dataBytes: number; durationMs: number } | undefined {
  if (buffer.length < 12 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") return undefined;
  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataBytes = 0;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;
    const chunkDataEnd = Math.min(buffer.length, chunkDataStart + chunkSize);
    if (chunkId === "fmt " && chunkDataStart + 16 <= chunkDataEnd) {
      const audioFormat = buffer.readUInt16LE(chunkDataStart);
      channels = buffer.readUInt16LE(chunkDataStart + 2);
      sampleRate = buffer.readUInt32LE(chunkDataStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkDataStart + 14);
      if (audioFormat !== 1) return undefined;
    }
    if (chunkId === "data") dataBytes += chunkSize;
    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }
  if (!channels || !sampleRate || !bitsPerSample || !dataBytes) return undefined;
  return { channels, sampleRate, bitsPerSample, dataBytes, durationMs: Math.round((dataBytes / (sampleRate * channels * (bitsPerSample / 8))) * 1000) };
}

function validateClip(clip: AudioClipRef, location: string): void {
  const parsed = audioClipRefSchema.safeParse(clip);
  if (!parsed.success) invalid.push(`${location}: ${parsed.error.issues.map(issue => issue.message).join(", ")}`);
  if (clip.reviewStatus === "pending") return;
  const path = localPathForSrc(clip.src);
  if (!path) {
    warnings.push(`${location}: external or data URI cannot be locally binary-audited (${clip.src})`);
    return;
  }
  if (!existsSync(path)) {
    invalid.push(`${location}: public audio file is missing (${path})`);
    return;
  }
  const bytes = readFileSync(path);
  const wav = inspectWav(bytes);
  if (!wav) {
    invalid.push(`${location}: file is not a valid PCM WAV`);
    return;
  }
  if (wav.channels !== 1 || wav.bitsPerSample !== 16) invalid.push(`${location}: expected mono PCM16, found channels=${wav.channels}, bits=${wav.bitsPerSample}`);
  if (wav.sampleRate !== 24000) invalid.push(`${location}: expected 24000Hz, found ${wav.sampleRate}Hz`);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (clip.contentHash?.toLowerCase() !== hash) invalid.push(`${location}: SHA-256 mismatch; metadata=${clip.contentHash}, actual=${hash}`);
  if (clip.durationMs !== wav.durationMs) invalid.push(`${location}: duration mismatch; metadata=${clip.durationMs}, actual=${wav.durationMs}`);
}

for (const [key, entry] of manifestEntries) validateClip(entry, `manifest/${key}`);
for (const reference of references) {
  validateClip(reference.clip, reference.location);
  const manifestEntry = manifestClips.get(reference.src);
  if (!manifestEntry) invalid.push(`${reference.location}: clip is missing from manifest`);
  else {
    if (JSON.stringify(manifestEntry.clip) !== JSON.stringify(reference.clip)) invalid.push(`${reference.location}: lesson metadata differs from manifest metadata`);
  }
}

const referencedSrcs = new Set(references.map(reference => reference.src));
for (const [src, { key }] of manifestClips) if (!referencedSrcs.has(src)) invalid.push(`manifest/${key}: stale or unreferenced manifest clip ${src}`);
const duplicateManifestSources = new Map<string, string[]>();
for (const [key, clip] of manifestEntries) duplicateManifestSources.set(clip.src, [...(duplicateManifestSources.get(clip.src) ?? []), key]);
for (const [src, keys] of duplicateManifestSources) if (keys.length > 1) invalid.push(`manifest: duplicate source ${src} appears under ${keys.join(", ")}`);

const fullDialogueExpected = lessons.flatMap(lesson => lesson.chapter === 1 ? [] : lesson.dialogues.map((dialogue, index) => ({ chapter: lesson.chapter, index: index + 1, audio: dialogue.audio })));
const missingFullDialogues = fullDialogueExpected.filter(item => !item.audio);
const listeningExpected = lessons.flatMap(lesson => lesson.epsQuestions.filter(question => question.section === "listening").map((question, index) => ({ chapter: lesson.chapter, index: index + 1, audio: question.audio })));
const missingListening = listeningExpected.filter(item => !item.audio);
if (missingListening.length) warnings.push(`listening generated-audio coverage is ${listeningExpected.length - missingListening.length}/${listeningExpected.length}; browser TTS remains the documented fallback`);
if (missingFullDialogues.length) invalid.push(`missing full-dialogue audio references: ${missingFullDialogues.map(item => `${item.chapter.toString().padStart(2, "0")}-${item.index.toString().padStart(2, "0")}`).join(", ")}`);

const statusCounts = new Map<string, number>();
for (const [, clip] of manifestEntries) statusCounts.set(clip.reviewStatus, (statusCounts.get(clip.reviewStatus) ?? 0) + 1);
const generatedFullDialogues = fullDialogueExpected.filter(item => item.audio?.reviewStatus === "generated").length;
const attachedListening = listeningExpected.length - missingListening.length;
console.log(`manifest_version=${manifest.libraryVersion}`);
console.log(`manifest_clips=${manifestEntries.length}`);
console.log(`lesson_audio_references=${references.length}`);
console.log(`status_counts=${JSON.stringify(Object.fromEntries(statusCounts))}`);
console.log(`full_dialogue_coverage=${generatedFullDialogues}/${fullDialogueExpected.length}`);
console.log(`listening_audio_coverage=${attachedListening}/${listeningExpected.length}`);
console.log(`warnings=${warnings.length}`);
console.log(`issues=${invalid.length}`);
for (const warning of warnings) console.warn(`WARNING ${warning}`);
if (invalid.length) {
  console.error(invalid.join("\n"));
  process.exit(1);
}
