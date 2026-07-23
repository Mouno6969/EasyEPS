import type { LocalLearningState } from "@/lib/localProgress";
import type { ReviewItem } from "@/lib/srs";
import type { SmartMockSectionFocus } from "@shared/smartMock";

export type SmartMockFocus = {
  chapters: number[];
  section: SmartMockSectionFocus;
  reasons: string[];
};

export function deriveSmartMockFocus(
  state: LocalLearningState,
  reviews: ReviewItem[],
  section: SmartMockSectionFocus = "auto",
): SmartMockFocus {
  const weights = new Map<number, number>();
  const reasons: string[] = [];
  const addWeight = (chapter: number | undefined, weight: number) => {
    if (!chapter || chapter < 1 || chapter > 60) return;
    weights.set(chapter, (weights.get(chapter) ?? 0) + weight);
  };

  for (const review of reviews) {
    if (review.kind !== "chapter") continue;
    addWeight(review.chapter, 20 + review.lapses * 4 + Math.max(0, 75 - review.mastery));
  }
  if (reviews.some(review => review.kind === "chapter")) reasons.push("নির্ধারিত রিভিউ ও কম mastery");

  for (const progress of Object.values(state.progress)) {
    const practiceRatio = progress.practiceTotal ? (progress.practiceScore ?? 0) / progress.practiceTotal : undefined;
    const examRatio = progress.examTotal ? (progress.examScore ?? 0) / progress.examTotal : undefined;
    if (typeof practiceRatio === "number" && practiceRatio < 0.8) addWeight(progress.chapter, Math.round((0.8 - practiceRatio) * 80) + 10);
    if (typeof examRatio === "number" && examRatio < 0.8) addWeight(progress.chapter, Math.round((0.8 - examRatio) * 100) + 15);
  }
  if ([...weights.values()].some(weight => weight > 0)) reasons.push("অধ্যায় অনুশীলন ও পরীক্ষার কম স্কোর");

  for (const attempt of state.attempts.slice(0, 25)) {
    if (!attempt.chapter || attempt.total <= 0) continue;
    const ratio = attempt.score / attempt.total;
    if (ratio < 0.8) addWeight(attempt.chapter, Math.round((0.8 - ratio) * 50) + 5);
  }

  const chapters = [...weights.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 12)
    .map(([chapter]) => chapter);

  return {
    chapters,
    section,
    reasons: reasons.length ? [...new Set(reasons)] : ["সম্পূর্ণ পাঠ্যক্রম থেকে ভারসাম্যপূর্ণ প্রশ্ন"],
  };
}
