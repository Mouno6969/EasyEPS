import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAllLessons } from "../server/content";
import { audioLibraryManifestSchema, audioClipRefSchema } from "../shared/audio";

const manifestPath = resolve("content/audio/manifest.json");
const manifestResult = audioLibraryManifestSchema.safeParse(JSON.parse(readFileSync(manifestPath, "utf8")));
if (!manifestResult.success) {
  console.error(manifestResult.error.issues);
  process.exit(1);
}
const manifest = manifestResult.data;
const manifestClips = new Map(Object.values(manifest.clips).map(clip => [clip.src, clip]));
const references: Array<{ src: string; location: string }> = [];
const invalid: string[] = [];
for (const lesson of getAllLessons()) {
  lesson.dialogues.forEach((dialogue, dialogueIndex) => dialogue.lines.forEach((line, lineIndex) => {
    if (line.audio) references.push({ src: line.audio.src, location: `lesson-${lesson.chapter}/dialogue-${dialogueIndex + 1}/line-${lineIndex + 1}` });
  }));
  lesson.epsQuestions.forEach((question, questionIndex) => {
    if (question.audio) references.push({ src: question.audio.src, location: `lesson-${lesson.chapter}/eps-${questionIndex + 1}` });
  });
}
for (const reference of references) {
  const lessonClip = getAllLessons().flatMap(lesson => [...lesson.dialogues.flatMap(dialogue => dialogue.lines.map(line => line.audio)), ...lesson.epsQuestions.map(question => question.audio)]).find(clip => clip?.src === reference.src);
  const parsed = audioClipRefSchema.safeParse(lessonClip);
  if (!parsed.success) invalid.push(`${reference.location}: ${parsed.error.issues.map(issue => issue.message).join(", ")}`);
  if (lessonClip?.reviewStatus === "approved" && !manifestClips.has(reference.src)) invalid.push(`${reference.location}: approved clip is missing from manifest`);
}
const approved = references.filter(reference => manifestClips.get(reference.src)?.reviewStatus === "approved").length;
const sourceCounts = new Map<string, number>();
for (const reference of references) sourceCounts.set(reference.src, (sourceCounts.get(reference.src) ?? 0) + 1);
for (const [src, count] of sourceCounts) if (count > 1) invalid.push(`duplicate clip source used ${count} times: ${src}`);
console.log(`manifest_version=${manifest.libraryVersion}`);
console.log(`lesson_audio_references=${references.length}`);
console.log(`approved_references=${approved}`);
console.log(`browser_tts_fallback_coverage=${references.length === 0 ? "100%" : `${Math.round((1 - approved / references.length) * 100)}%`}`);
console.log(`issues=${invalid.length}`);
if (invalid.length) {
  console.error(invalid.join("\n"));
  process.exit(1);
}
