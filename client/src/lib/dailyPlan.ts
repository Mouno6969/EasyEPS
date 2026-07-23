import type { LocalLearningState, LocalPlannerItem } from "@/lib/localProgress";
import { hrefForReview, type ReviewItem } from "@/lib/srs";

export type DailyPlanTask = {
  id: string;
  kind: "basics" | "lesson" | "practice" | "exam" | "review";
  titleBn: string;
  detailBn: string;
  href: string;
  minutes: number;
  done: boolean;
  source: "planner" | "review" | "recommended";
};

export type DailyPlan = {
  date: string;
  goalMinutes: number;
  studiedMinutes: number;
  plannedMinutes: number;
  progressPercent: number;
  remainingMinutes: number;
  goalMet: boolean;
  tasks: DailyPlanTask[];
};

const MINUTES_BY_KIND: Record<LocalPlannerItem["kind"], number> = {
  lesson: 20,
  practice: 10,
  exam: 15,
  review: 10,
};

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function plannerTask(item: LocalPlannerItem): DailyPlanTask {
  const kind = item.kind;
  const title =
    kind === "lesson"
      ? `অধ্যায় ${item.chapter} · নতুন পাঠ`
      : kind === "practice"
        ? `অধ্যায় ${item.chapter} · অনুশীলন`
        : kind === "exam"
          ? `অধ্যায় ${item.chapter} · পরীক্ষা`
          : `অধ্যায় ${item.chapter} · রিভিউ`;
  return {
    id: `planner-${item.id}`,
    kind,
    titleBn: title,
    detailBn: item.done ? "আজকের পরিকল্পনা থেকে সম্পন্ন" : "আপনার পড়ার পরিকল্পনায় নির্ধারিত",
    href: `/lesson/${item.chapter}`,
    minutes: MINUTES_BY_KIND[kind],
    done: item.done,
    source: "planner",
  };
}

export function buildDailyPlan(input: {
  state: LocalLearningState;
  dueReviews: ReviewItem[];
  hangulReady: boolean;
  nextChapter: number;
  date?: string;
}): DailyPlan {
  const date = input.date ?? todayKey();
  const goalMinutes = Math.max(5, input.state.planner.dailyGoalMinutes || 30);
  const studiedMinutes = input.state.studyDays[date]?.minutes ?? 0;
  const tasks: DailyPlanTask[] = input.state.planner.items
    .filter(item => item.date === date)
    .sort((a, b) => Number(a.done) - Number(b.done))
    .map(plannerTask);
  const chapterIds = new Set(tasks.map(task => `${task.kind}-${task.href}`));

  for (const review of input.dueReviews.slice(0, 3)) {
    const href = hrefForReview(review);
    const key = `review-${href}`;
    if (chapterIds.has(key)) continue;
    tasks.push({
      id: `review-${review.id}`,
      kind: "review",
      titleBn: review.labelBn,
      detailBn: `আজ নির্ধারিত · দক্ষতা ${review.mastery}% · ${review.intervalDays} দিনের ধাপ`,
      href,
      minutes: review.kind === "mock" ? 15 : 7,
      done: false,
      source: "review",
    });
    chapterIds.add(key);
  }

  const plannedBeforeRecommendation = tasks.filter(task => !task.done).reduce((sum, task) => sum + task.minutes, 0);
  if (plannedBeforeRecommendation < Math.max(10, goalMinutes - studiedMinutes)) {
    tasks.push(
      input.hangulReady
        ? {
            id: `recommended-chapter-${input.nextChapter}`,
            kind: "lesson",
            titleBn: `অধ্যায় ${input.nextChapter} · পরবর্তী পাঠ`,
            detailBn: "শব্দভাণ্ডার, সংলাপ ও অনুশীলনের পরবর্তী ধাপ",
            href: `/lesson/${input.nextChapter}`,
            minutes: 20,
            done: false,
            source: "recommended",
          }
        : {
            id: "recommended-basics",
            kind: "basics",
            titleBn: "হ্যাঙ্গুল বেসিক সম্পূর্ণ করুন",
            detailBn: "অক্ষর, সিলেবল ও উচ্চারণের ভিত্তি মজবুত করুন",
            href: "/basics",
            minutes: 15,
            done: false,
            source: "recommended",
          },
    );
  }

  const plannedMinutes = tasks.filter(task => !task.done).reduce((sum, task) => sum + task.minutes, 0);
  const progressPercent = Math.min(100, Math.round((studiedMinutes / goalMinutes) * 100));
  return {
    date,
    goalMinutes,
    studiedMinutes,
    plannedMinutes,
    progressPercent,
    remainingMinutes: Math.max(0, goalMinutes - studiedMinutes),
    goalMet: studiedMinutes >= goalMinutes,
    tasks: tasks.slice(0, 6),
  };
}
