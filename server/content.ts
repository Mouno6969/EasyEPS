import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Lesson, LessonSummary } from "../shared/lesson";
import { lessonSchema } from "../shared/lesson";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const lessonDirectory = path.join(projectRoot, "content", "lessons");

let lessonCache: Lesson[] | null = null;

function readLessonFile(filePath: string): Lesson {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return lessonSchema.parse(raw);
}

export function getAllLessons(options?: { refresh?: boolean }): Lesson[] {
  if (lessonCache && !options?.refresh) return lessonCache;

  const files = fs
    .readdirSync(lessonDirectory)
    .filter(file => /^lesson-\d{2}\.json$/.test(file))
    .sort();

  const lessons = files.map(file => readLessonFile(path.join(lessonDirectory, file)));
  lessons.sort((a, b) => a.chapter - b.chapter);

  if (lessons.length !== 60) {
    throw new Error(`Expected 60 lesson files, found ${lessons.length}`);
  }

  lessonCache = lessons;
  return lessons;
}

export function getLesson(chapter: number): Lesson | undefined {
  return getAllLessons().find(lesson => lesson.chapter === chapter);
}

export function getLessonSummaries(): LessonSummary[] {
  return getAllLessons().map(lesson => ({
    chapter: lesson.chapter,
    slug: lesson.slug,
    title: lesson.title,
    category: lesson.category,
    level: lesson.level,
    vocabularyCount: lesson.vocabulary.length,
    practiceCount: lesson.practice.length,
    epsQuestionCount: lesson.epsQuestions.length,
  }));
}

export function replaceLesson(chapter: number, content: unknown): Lesson {
  const parsed = lessonSchema.parse(content);
  if (parsed.chapter !== chapter) {
    throw new Error("Chapter number in content does not match the requested chapter");
  }

  const filePath = path.join(lessonDirectory, `lesson-${String(chapter).padStart(2, "0")}.json`);
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
  lessonCache = null;
  return parsed;
}
