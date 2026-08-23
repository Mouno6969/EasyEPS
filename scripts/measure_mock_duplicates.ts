import { getAllLessons } from "../server/content";
import { buildSmartMockQuestions, questionContentKey } from "../shared/smartMock";

const lessons = getAllLessons({ refresh: true });
const pool = lessons.flatMap(lesson =>
  lesson.epsQuestions.map(question => ({
    ...question,
    chapter: lesson.chapter,
    lessonTitle: lesson.title,
  })),
);

function run(mode: "balanced" | "smart") {
  const duplicateCounts: number[] = [];
  const imageSourceDuplicateCounts: number[] = [];
  const lengths: number[] = [];
  for (let trial = 0; trial < 20; trial += 1) {
    const selected = buildSmartMockQuestions(pool, {
      count: 40,
      mode,
      focusChapters: mode === "smart" ? [53, 54, 55, 56] : [],
    });
    const contentKeys = selected.map(question => questionContentKey(question));
    const contentUnique = new Set(contentKeys).size;
    const imageSources = selected.filter(question => question.image).map(question => question.image?.src);
    const imageSourceUnique = new Set(imageSources).size;
    duplicateCounts.push(contentKeys.length - contentUnique);
    imageSourceDuplicateCounts.push(imageSources.length - imageSourceUnique);
    lengths.push(selected.length);
  }
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  console.log(`${mode}: avg content duplicates=${average(duplicateCounts).toFixed(2)}, worst=${Math.max(...duplicateCounts)}, avg repeated image sources=${average(imageSourceDuplicateCounts).toFixed(2)}, worst image sources=${Math.max(...imageSourceDuplicateCounts)}, lengths=${Math.min(...lengths)}-${Math.max(...lengths)}`);
}

console.log(`lessons=${lessons.length} candidates=${pool.length}`);
run("balanced");
run("smart");
