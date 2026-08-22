import type { LocalLearningState } from "@/lib/localProgress";
import type { ReviewItem } from "@/lib/srs";
import { summarizeItemEvidence } from "@shared/learning";

export type ReadinessBand = "foundation" | "building" | "near-ready" | "ready";

export type ReadinessComponent = {
  id: "assessment" | "coverage" | "review" | "consistency" | "retention";
  labelBn: string;
  score: number;
  weight: number;
  detailBn: string;
};

export type ReadinessPoint = {
  date: string;
  label: string;
  score: number;
};

export type ReadinessReport = {
  score: number;
  band: ReadinessBand;
  bandLabelBn: string;
  change: number;
  components: ReadinessComponent[];
  trend: ReadinessPoint[];
  insights: string[];
  targetDaysRemaining: number | null;
  metrics: {
    itemAccuracy: number;
    novelAccuracy: number;
    retentionAccuracy: number;
    listeningAccuracy: number;
    confidenceCalibration: number;
  };
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function atEndOfDay(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

function scoreAt(state: LocalLearningState, reviews: ReviewItem[], endDate: Date) {
  const end = atEndOfDay(endDate).getTime();
  const completed = Object.values(state.progress).filter(progress => {
    if (!progress.completed) return false;
    const updated = new Date(progress.updatedAt).getTime();
    return Number.isFinite(updated) ? updated <= end : true;
  }).length;
  const coverage = clamp(Math.round((completed / 60) * 100));

  const evidence = summarizeItemEvidence(state.itemEvidence);
  const attempts = state.attempts
    .filter(attempt => new Date(attempt.createdAt).getTime() <= end && attempt.total > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);
  let weightedScore = 0;
  let totalWeight = 0;
  for (const attempt of attempts) {
    const recencyIndex = attempts.indexOf(attempt);
    const recencyWeight = Math.max(0.55, 1 - recencyIndex * 0.05);
    const kindWeight = attempt.kind === "mock-test" ? 1.35 : attempt.kind === "chapter-exam" ? 1 : 0.65;
    const weight = recencyWeight * kindWeight;
    weightedScore += clamp((attempt.score / attempt.total) * 100) * weight;
    totalWeight += weight;
  }
  const assessment = totalWeight ? Math.round(weightedScore / totalWeight) : 0;

  const availableReviews = reviews.filter(review => new Date(review.lastReviewedAt).getTime() <= end);
  const review = availableReviews.length
    ? Math.round(availableReviews.reduce((sum, item) => sum + item.mastery, 0) / availableReviews.length)
    : attempts.length
      ? Math.min(60, assessment)
      : 0;

  const windowStart = new Date(endDate);
  windowStart.setUTCDate(windowStart.getUTCDate() - 13);
  const activeDays = Object.entries(state.studyDays).filter(([date, value]) => {
    const time = new Date(`${date}T12:00:00Z`).getTime();
    return time >= windowStart.getTime() && time <= end && value.minutes > 0;
  }).length;
  const consistency = clamp(Math.round((activeDays / 10) * 100));
  const retention = evidence.retentionItems > 0 ? evidence.retentionAccuracy : review;
  const score = Math.round(assessment * 0.32 + coverage * 0.18 + review * 0.15 + consistency * 0.12 + retention * 0.23);
  return { score, assessment, coverage, review, consistency, retention, completed, activeDays, attempts: attempts.length, evidence };
}

function bandFor(score: number): { band: ReadinessBand; label: string } {
  if (score >= 80) return { band: "ready", label: "পরীক্ষা-প্রস্তুত" };
  if (score >= 65) return { band: "near-ready", label: "প্রায় প্রস্তুত" };
  if (score >= 45) return { band: "building", label: "দক্ষতা তৈরি হচ্ছে" };
  return { band: "foundation", label: "ভিত্তি মজবুত করুন" };
}

export function buildReadinessReport(
  state: LocalLearningState,
  reviews: ReviewItem[],
  now = new Date(),
): ReadinessReport {
  const current = scoreAt(state, reviews, now);
  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now);
    date.setUTCHours(12, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (5 - index) * 7);
    const snapshot = scoreAt(state, reviews, date);
    return {
      date: dateKey(date),
      label: date.toLocaleDateString("bn-BD", { month: "short", day: "numeric" }),
      score: snapshot.score,
    };
  });
  const previous = trend.at(-2)?.score ?? current.score;
  const band = bandFor(current.score);
  const components: ReadinessComponent[] = [
    {
      id: "assessment",
      labelBn: "পরীক্ষার নির্ভুলতা",
      score: current.assessment,
      weight: 32,
      detailBn: current.attempts ? `সাম্প্রতিক ${current.attempts}টি ফলের weighted average` : "এখনও কোনো graded attempt নেই",
    },
    {
      id: "coverage",
      labelBn: "পাঠ্যক্রম কভারেজ",
      score: current.coverage,
      weight: 18,
      detailBn: `${current.completed}/60 অধ্যায় সম্পন্ন`,
    },
    {
      id: "review",
      labelBn: "রিভিউ mastery",
      score: current.review,
      weight: 15,
      detailBn: reviews.length ? `${reviews.length}টি scheduled item-এর mastery` : "রিভিউ ডেটা তৈরি হচ্ছে",
    },
    {
      id: "consistency",
      labelBn: "১৪ দিনের ধারাবাহিকতা",
      score: current.consistency,
      weight: 12,
      detailBn: `গত ১৪ দিনে ${current.activeDays} দিন পড়া হয়েছে`,
    },
    {
      id: "retention",
      labelBn: "Delayed retention",
      score: current.retention,
      weight: 23,
      detailBn: current.evidence.retentionAccuracy ? `${current.evidence.retentionAccuracy}% delayed review accuracy` : "Delayed review evidence তৈরি হচ্ছে",
    },
  ];

  const metricInsights = [
    current.evidence.listeningAccuracy < current.evidence.itemAccuracy - 8 ? "Listening accuracy বাড়াতে slow → normal audio progression ব্যবহার করুন।" : "Reading ও listening-এর ভারসাম্য ভালো রাখুন।",
    current.evidence.confidenceCalibration < 70 ? "উত্তর দেওয়ার আগে confidence বেছে নিন—guess করা সঠিক উত্তরও review করুন।" : "Confidence ও ফলাফলের মিল ভালো; unseen item-এ transfer অনুশীলন করুন।",
    current.evidence.retentionAccuracy > 0 && current.evidence.retentionAccuracy < 75 ? "Delayed review-তে ভুল হওয়া আইটেমগুলো আজকের প্রথম priority করুন।" : "Delayed review শক্তিশালী হলে নতুন context-এ recall বাড়ান।",
  ];
  const componentInsights = [...components]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map(component => {
      if (component.id === "assessment") return "১০–২০ প্রশ্নের smart test দিয়ে পরীক্ষার accuracy বাড়ান।";
      if (component.id === "coverage") return "প্রতিদিন অন্তত একটি lesson step শেষ করে coverage বাড়ান।";
      if (component.id === "review") return "আজ নির্ধারিত review pack শেষ করে ভুলের পুনরাবৃত্তি কমান।";
      if (component.id === "retention") return "Delayed review-তে ভুল হওয়া আইটেম আগে অনুশীলন করুন।";
      return "১৪ দিনের মধ্যে অন্তত ১০ দিন ছোট session রাখুন।";
    });
  const insights = [...componentInsights, ...metricInsights].slice(0, 4);

  let targetDaysRemaining: number | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(state.planner.targetExamDate)) {
    targetDaysRemaining = Math.max(0, Math.ceil((new Date(`${state.planner.targetExamDate}T12:00:00Z`).getTime() - now.getTime()) / 86_400_000));
  }

  return {
    score: current.score,
    band: band.band,
    bandLabelBn: band.label,
    change: current.score - previous,
    components,
    trend,
    insights,
    targetDaysRemaining,
    metrics: current.evidence,
  };
}
