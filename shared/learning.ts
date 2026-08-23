import type { EpsQuestion, Lesson, PracticeQuestion, VocabularyItem } from "./lesson";

export const LEARNING_CONTENT_VERSION = "2026-08-23-v5";
export type LearningItemKind = "vocabulary" | "practice" | "eps" | "listening" | "grammar" | "dialogue";
export type ConfidenceLevel = "sure" | "uncertain" | "guessed" | "unknown";
export type MasteryStage = "new" | "learning" | "recalled" | "retained" | "transferred" | "mastered";
export type PracticeFormat = "recognition" | "recall" | "dictation" | "sentence" | "picture" | "listening" | "dialogue" | "picture-to-word" | "word-to-situation" | "short-typed" | "cloze" | "listening-to-meaning" | "polite-response";

export type ItemEvidence = {
  itemId: string;
  kind: LearningItemKind;
  chapter?: number;
  section?: "reading" | "listening";
  skillTags: string[];
  attempts: number;
  correct: number;
  firstAttemptedAt: string;
  lastAttemptedAt: string;
  lastCorrect?: boolean;
  lastConfidence?: ConfidenceLevel;
  confidenceSum: number;
  sureCount: number;
  uncertainCount: number;
  guessedCount: number;
  unknownCount: number;
  confidentCorrect: number;
  uncertainCorrect: number;
  guessedCorrect: number;
  unknownCorrect: number;
  firstAttemptCorrect?: boolean;
  firstAttemptAt?: string;
  lastResponseMs?: number;
  totalResponseMs: number;
  retentionChecks: number;
  retentionCorrect: number;
  transferChecks: number;
  transferCorrect: number;
  formatCounts: Partial<Record<PracticeFormat, number>>;
  dueDate: string;
  intervalDays: number;
  easeFactor: number;
  mastery: number;
  contentVersion?: string;
};

export type DiagnosticResult = {
  completedAt: string;
  score: number;
  total: number;
  domains: Record<"reading" | "listening" | "vocabulary" | "safety", { score: number; total: number }>;
  recommendedChapter: number;
  recommendedFocus: "foundation" | "reading" | "listening" | "balanced";
};

export type ListeningEvidence = {
  itemId: string;
  plays: number;
  normalPlays: number;
  slowPlays: number;
  firstPlayCorrect?: boolean;
  dictationAttempts: number;
  dictationCorrect: number;
  transcriptRevealed: boolean;
  transcriptDependentCount: number;
  audioSource?: "reviewed-audio" | "browser-tts";
  audioVersion?: string;
  updatedAt: string;
};

export type Milestone = {
  id: string;
  titleBn: string;
  detailBn: string;
  earnedAt: string;
};

export type AdaptiveCandidate = {
  itemId: string;
  chapter?: number;
  section?: "reading" | "listening";
  skillTags?: string[];
  question?: EpsQuestion | PracticeQuestion;
};

export type DailyVocabularyCandidate = {
  itemId: string;
  chapter: number;
  word: VocabularyItem;
  layer: "core" | "exam-transfer";
  sourceChapter?: number;
};

export type DailyVocabularyPracticeItem = DailyVocabularyCandidate & {
  practiceLayer: "extra" | "recycled";
};

export function normalizeLearningText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

export function learningItemId(kind: LearningItemKind, chapter: number | undefined, id: string) {
  return `${kind}:${chapter ?? 0}:${id}`;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + Math.max(1, Math.round(days)));
  return next.toISOString().slice(0, 10);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function confidenceValue(confidence: ConfidenceLevel) {
  return confidence === "sure" ? 1 : confidence === "uncertain" ? 0.5 : confidence === "guessed" ? 0.25 : 0;
}

export function isDue(evidence: ItemEvidence | undefined, date = todayKey()) {
  return Boolean(evidence && evidence.dueDate <= date);
}

export function masteryStage(evidence: ItemEvidence | undefined): MasteryStage {
  if (!evidence || evidence.attempts === 0) return "new";
  if (evidence.transferChecks > 0 && evidence.transferCorrect / evidence.transferChecks >= 0.8 && evidence.mastery >= 85) return "mastered";
  if (evidence.transferChecks > 0 && evidence.transferCorrect / evidence.transferChecks >= 0.6) return "transferred";
  if (evidence.retentionChecks > 0 && evidence.retentionCorrect / evidence.retentionChecks >= 0.8) return "retained";
  if (evidence.correct / evidence.attempts >= 0.8) return "recalled";
  return "learning";
}

export function masteryStageLabel(stage: MasteryStage) {
  return ({ new: "নতুন", learning: "শেখা চলছে", recalled: "মনে পড়ে", retained: "মনে আছে", transferred: "নতুন context-এ পারছেন", mastered: "দক্ষ" })[stage];
}

export function createItemEvidence(input: {
  itemId: string;
  kind: LearningItemKind;
  chapter?: number;
  section?: "reading" | "listening";
  skillTags?: string[];
  now?: string;
}): ItemEvidence {
  const now = input.now ?? new Date().toISOString();
  return {
    itemId: input.itemId,
    kind: input.kind,
    chapter: input.chapter,
    section: input.section,
    skillTags: [...new Set(input.skillTags ?? [])],
    attempts: 0,
    correct: 0,
    firstAttemptedAt: now,
    lastAttemptedAt: now,
    confidenceSum: 0,
    sureCount: 0,
    uncertainCount: 0,
    guessedCount: 0,
    unknownCount: 0,
    confidentCorrect: 0,
    uncertainCorrect: 0,
    guessedCorrect: 0,
    unknownCorrect: 0,
    totalResponseMs: 0,
    retentionChecks: 0,
    retentionCorrect: 0,
    transferChecks: 0,
    transferCorrect: 0,
    formatCounts: {},
    dueDate: todayKey(new Date(now)),
    intervalDays: 1,
    easeFactor: 2.3,
    mastery: 0,
    contentVersion: LEARNING_CONTENT_VERSION,
  };
}

export function updateItemEvidence(existing: ItemEvidence | undefined, input: {
  itemId: string;
  kind: LearningItemKind;
  chapter?: number;
  section?: "reading" | "listening";
  skillTags?: string[];
  correct: boolean;
  confidence: ConfidenceLevel;
  responseMs?: number;
  isRetentionCheck?: boolean;
  isTransferCheck?: boolean;
  format?: PracticeFormat;
  now?: string;
}) {
  const now = input.now ?? new Date().toISOString();
  const item = existing ?? createItemEvidence(input);
  const attempts = item.attempts + 1;
  const correct = item.correct + (input.correct ? 1 : 0);
  const retentionChecks = item.retentionChecks + (input.isRetentionCheck ? 1 : 0);
  const transferChecks = item.transferChecks + (input.isTransferCheck ? 1 : 0);
  const intervalDays = input.correct
    ? Math.min(180, item.attempts === 0 ? (input.confidence === "sure" ? 4 : 2) : Math.max(item.intervalDays + 1, Math.round(item.intervalDays * item.easeFactor)))
    : 1;
  const easeFactor = clamp(item.easeFactor + (input.correct ? (input.confidence === "sure" ? 0.08 : 0.02) : -0.18), 1.3, 2.8);
  const confidenceSum = item.confidenceSum + confidenceValue(input.confidence);
  const rawMastery = (correct / attempts) * 65 + (confidenceSum / attempts) * 15 + (retentionChecks ? retentionChecks && item.retentionCorrect / retentionChecks * 10 : 0) + (transferChecks ? transferChecks && item.transferCorrect / transferChecks * 10 : 0);
  const formatCounts = { ...item.formatCounts };
  if (input.format) formatCounts[input.format] = (formatCounts[input.format] ?? 0) + 1;
  return {
    ...item,
    kind: input.kind,
    chapter: input.chapter ?? item.chapter,
    section: input.section ?? item.section,
    skillTags: [...new Set([...item.skillTags, ...(input.skillTags ?? [])])],
    attempts,
    correct,
    lastAttemptedAt: now,
    lastCorrect: input.correct,
    lastConfidence: input.confidence,
    confidenceSum,
    sureCount: item.sureCount + (input.confidence === "sure" ? 1 : 0),
    uncertainCount: item.uncertainCount + (input.confidence === "uncertain" ? 1 : 0),
    guessedCount: item.guessedCount + (input.confidence === "guessed" ? 1 : 0),
    unknownCount: item.unknownCount + (input.confidence === "unknown" ? 1 : 0),
    confidentCorrect: item.confidentCorrect + (input.correct && input.confidence === "sure" ? 1 : 0),
    uncertainCorrect: item.uncertainCorrect + (input.correct && input.confidence === "uncertain" ? 1 : 0),
    guessedCorrect: item.guessedCorrect + (input.correct && input.confidence === "guessed" ? 1 : 0),
    unknownCorrect: item.unknownCorrect + (input.correct && input.confidence === "unknown" ? 1 : 0),
    firstAttemptCorrect: item.attempts === 0 ? input.correct : item.firstAttemptCorrect,
    firstAttemptAt: item.attempts === 0 ? now : item.firstAttemptAt,
    lastResponseMs: input.responseMs,
    totalResponseMs: item.totalResponseMs + Math.max(0, input.responseMs ?? 0),
    retentionChecks,
    retentionCorrect: item.retentionCorrect + (input.isRetentionCheck && input.correct ? 1 : 0),
    transferChecks,
    transferCorrect: item.transferCorrect + (input.isTransferCheck && input.correct ? 1 : 0),
    formatCounts,
    dueDate: addDays(todayKey(new Date(now)), intervalDays),
    intervalDays,
    easeFactor,
    mastery: clamp(Math.round(item.mastery * 0.4 + rawMastery * 0.6)),
    contentVersion: LEARNING_CONTENT_VERSION,
  } satisfies ItemEvidence;
}

export function rankAdaptiveCandidates<T extends AdaptiveCandidate>(candidates: T[], evidence: Record<string, ItemEvidence> | undefined, options: { limit: number; chapter?: number; section?: "reading" | "listening"; now?: Date }) {
  const today = todayKey(options.now);
  const scored = candidates.map((candidate, index) => {
    const item = evidence?.[candidate.itemId];
    const uncertainty = item?.attempts ? 1 - item.confidenceSum / item.attempts : 1;
    const dueBoost = isDue(item, today) ? 70 : 0;
    const unseenBoost = item ? 0 : 35;
    const weakBoost = item ? Math.max(0, 35 - item.mastery * 0.35) : 20;
    const chapterBoost = options.chapter && candidate.chapter === options.chapter ? 12 : 0;
    const sectionBoost = options.section && candidate.section === options.section ? 10 : 0;
    const repetitionPenalty = item && item.lastAttemptedAt.slice(0, 10) === today ? 18 : 0;
    return { candidate, score: dueBoost + unseenBoost + weakBoost + uncertainty * 18 + chapterBoost + sectionBoost - repetitionPenalty + ((candidate.itemId.length + index) % 17) / 100 };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, options.limit).map(item => item.candidate);
}

function dailySeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildDailyVocabularySelection(candidates: DailyVocabularyCandidate[], evidence: Record<string, ItemEvidence> | undefined, options: { limit: number; date?: string }): DailyVocabularyPracticeItem[] {
  const limit = Math.max(4, Math.min(20, Math.round(options.limit)));
  const date = options.date ?? todayKey();
  const selected: DailyVocabularyPracticeItem[] = [];
  const seen = new Set<string>();
  const order = (items: DailyVocabularyCandidate[]) => [...items].sort((a, b) => dailySeed(`${date}:${a.itemId}`).localeCompare(dailySeed(`${date}:${b.itemId}`)));
  const add = (items: DailyVocabularyCandidate[], practiceLayer: "extra" | "recycled") => {
    for (const item of items) {
      if (seen.has(item.itemId) || selected.length >= limit) continue;
      seen.add(item.itemId);
      selected.push({ ...item, practiceLayer });
    }
  };
  const due = order(candidates.filter(candidate => isDue(evidence?.[candidate.itemId], date)));
  add(rankAdaptiveCandidates(due, evidence, { limit, now: new Date(`${date}T12:00:00Z`) }), "recycled");
  const extras = order(candidates.filter(candidate => !seen.has(candidate.itemId) && candidate.layer === "exam-transfer"));
  add(rankAdaptiveCandidates(extras, evidence, { limit, now: new Date(`${date}T12:00:00Z`) }), "extra");
  const core = order(candidates.filter(candidate => !seen.has(candidate.itemId) && candidate.layer === "core"));
  add(rankAdaptiveCandidates(core, evidence, { limit, now: new Date(`${date}T12:00:00Z`) }), "recycled");
  return selected;
}

export function diagnosticRecommendation(input: { score: number; total: number; listeningScore: number; listeningTotal: number; readingScore: number; readingTotal: number }) {
  const ratio = input.total ? input.score / input.total : 0;
  const listeningRatio = input.listeningTotal ? input.listeningScore / input.listeningTotal : ratio;
  const readingRatio = input.readingTotal ? input.readingScore / input.readingTotal : ratio;
  const recommendedChapter = ratio < 0.45 ? 1 : ratio < 0.65 ? 12 : ratio < 0.8 ? 30 : 45;
  const recommendedFocus = listeningRatio + 0.1 < readingRatio ? "listening" : ratio < 0.55 ? "foundation" : Math.abs(listeningRatio - readingRatio) < 0.12 ? "balanced" : "reading";
  return { recommendedChapter, recommendedFocus } as const;
}

export function questionSkillTags(question: EpsQuestion | PracticeQuestion) {
  const text = `${question.questionBn} ${question.questionKo} ${"passage" in question ? question.passage : ""}`;
  const tags = new Set<string>();
  if ("section" in question) tags.add(question.section);
  if (question.image) tags.add("visual");
  if (/안전|표지|보호|위험|금지|조심/.test(text)) tags.add("safety");
  if (/시간|날짜|몇|얼마|숫자|번호/.test(text)) tags.add("numbers-time");
  if (/조사|문법|어미|동사|은\/는|이\/가|을\/를/.test(text)) tags.add("grammar");
  return [...tags];
}

export type MistakeDiagnosis = { category: "listening" | "grammar" | "numbers-time" | "safety" | "vocabulary" | "reading"; titleBn: string; detailBn: string; nextStepBn: string };

export function diagnoseMistake(question: EpsQuestion | PracticeQuestion): MistakeDiagnosis {
  const text = `${question.questionBn} ${question.questionKo} ${"passage" in question ? question.passage : ""} ${question.explanationBn}`;
  if ("section" in question && question.section === "listening") return { category: "listening", titleBn: "শোনার তথ্য ধরতে আরও এক ধাপ", detailBn: "ব্যক্তি, স্থান, সংখ্যা বা সময়ের তথ্যটি পুরোপুরি ধরতে পারেননি।", nextStepBn: "প্রথমে ধীর গতিতে শুনুন, তারপর script না দেখে সাধারণ গতিতে উত্তর দিন।" };
  if (/조사|은\/는|이\/가|을\/를|에|에서|으로|부터|까지|어미|동사|문법/.test(text)) return { category: "grammar", titleBn: "বাক্যের গঠন আলাদা করে দেখুন", detailBn: "শব্দের অর্থের পাশাপাশি 조사 বা ক্রিয়ার শেষাংশ গুরুত্বপূর্ণ।", nextStepBn: "সঠিক বাক্যটি জোরে পড়ে 조사/ক্রিয়ার শেষাংশ চিহ্নিত করুন।" };
  if (/숫자|번호|시간|날짜|얼마|몇|시/.test(text)) return { category: "numbers-time", titleBn: "সংখ্যা ও সময়ের recall অনুশীলন করুন", detailBn: "Korean সংখ্যা, সময় বা পরিমাণ দ্রুত চিনতে আরও অনুশীলন দরকার।", nextStepBn: "সঠিক সংখ্যাটি দেখে বলুন, আড়াল করুন, তারপর আবার মনে করে বলুন।" };
  if (/안전|표지|보호|위험|금지|조심|안전모|장갑/.test(text)) return { category: "safety", titleBn: "নিরাপত্তা-চিহ্নের অর্থ মিলিয়ে নিন", detailBn: "চিহ্ন, কাজ এবং নিষেধ—এই তিনটির সম্পর্ক একসাথে বুঝতে হয়।", nextStepBn: "চিহ্নটি কী করতে বলছে বা কী নিষেধ করছে—এক বাক্যে বলুন।" };
  if (question.image) return { category: "vocabulary", titleBn: "শব্দটি context-এ ফিরিয়ে নিন", detailBn: "কাছাকাছি অর্থের বিকল্পগুলোর মধ্যে ছবির লক্ষ্যবস্তু আলাদা করে চিনুন।", nextStepBn: "সঠিক শব্দ দিয়ে ছোট Korean বাক্য বলুন এবং পরে ছবিটি না দেখে recall করুন।" };
  return { category: "reading", titleBn: "প্রথমে মূল তথ্য খুঁজুন", detailBn: "কে, কোথায়, কখন এবং কী ঘটেছে—এই তথ্যগুলো আগে চিহ্নিত করুন।", nextStepBn: "passage-এর keyword লিখে তারপর বিকল্পের সাথে মিলিয়ে দেখুন।" };
}

export function summarizeItemEvidence(evidence: Record<string, ItemEvidence> | undefined) {
  const items = Object.values(evidence ?? {});
  const attempted = items.filter(item => item.attempts > 0);
  const retention = items.filter(item => item.retentionChecks > 0);
  const transfer = items.filter(item => item.transferChecks > 0);
  const listening = items.filter(item => item.section === "listening" && item.attempts > 0);
  const attempts = attempted.reduce((sum, item) => sum + item.attempts, 0);
  const predicted = attempts ? attempted.reduce((sum, item) => sum + item.confidenceSum, 0) / attempts : 0;
  const observed = attempts ? attempted.reduce((sum, item) => sum + item.correct, 0) / attempts : 0;
  return {
    itemCount: attempted.length,
    itemAccuracy: attempted.length ? Math.round(attempted.reduce((sum, item) => sum + item.correct / item.attempts, 0) / attempted.length * 100) : 0,
    firstExposureAccuracy: attempted.length ? Math.round(attempted.filter(item => item.firstAttemptCorrect).length / attempted.length * 100) : 0,
    retentionItems: retention.length,
    retentionAccuracy: retention.length ? Math.round(retention.reduce((sum, item) => sum + item.retentionCorrect / item.retentionChecks, 0) / retention.length * 100) : 0,
    transferItems: transfer.length,
    transferAccuracy: transfer.length ? Math.round(transfer.reduce((sum, item) => sum + item.transferCorrect / item.transferChecks, 0) / transfer.length * 100) : 0,
    listeningItems: listening.length,
    listeningAccuracy: listening.length ? Math.round(listening.reduce((sum, item) => sum + item.correct / item.attempts, 0) / listening.length * 100) : 0,
    confidenceCalibration: attempts ? Math.round(clamp(1 - Math.abs(predicted - observed)) * 100) : 0,
  };
}

export function evaluateMilestones(input: { current: Milestone[]; completedLessons: number; itemCount: number; retainedItems: number; transferItems: number; diagnosticCompleted: boolean; listeningItems: number; streak: number; totalAttempts: number; now?: string }) {
  const earned = new Map(input.current.map(item => [item.id, item]));
  const now = input.now ?? new Date().toISOString();
  const add = (id: string, titleBn: string, detailBn: string) => { if (!earned.has(id)) earned.set(id, { id, titleBn, detailBn, earnedAt: now }); };
  if (input.diagnosticCompleted) add("diagnostic", "নিজের স্তর আবিষ্কার", "Diagnostic শেষ করে ব্যক্তিগত শেখার পথ তৈরি করেছেন।");
  if (input.itemCount >= 10) add("first-10-items", "প্রথম ১০টি দক্ষতা", "১০টি শেখার আইটেমে প্রমাণ সংগ্রহ করেছেন।");
  if (input.retainedItems >= 10) add("retention-10", "মনে রাখার শক্তি", "১০টি আইটেম delayed review-তে ধরে রেখেছেন।");
  if (input.transferItems >= 10) add("transfer-10", "নতুন context-এ পারদর্শী", "১০টি unseen transfer item সমাধান করেছেন।");
  if (input.listeningItems >= 10) add("listening-10", "শ্রবণযাত্রী", "১০টি listening আইটেমে অনুশীলন করেছেন।");
  if (input.completedLessons >= 1) add("first-lesson", "প্রথম অধ্যায় সম্পন্ন", "শেখার যাত্রার প্রথম অধ্যায় শেষ করেছেন।");
  if (input.completedLessons >= 10) add("ten-lessons", "দশ অধ্যায়ের ভিত্তি", "১০টি অধ্যায় সম্পন্ন করেছেন।");
  if (input.streak >= 7) add("seven-day-streak", "সাত দিনের ধারাবাহিকতা", "টানা সাত দিন পড়াশোনা করেছেন।");
  if (input.totalAttempts >= 25) add("practice-25", "নিয়মিত অনুশীলন", "২৫টি graded practice session সম্পন্ন করেছেন।");
  return [...earned.values()].sort((a, b) => a.earnedAt.localeCompare(b.earnedAt));
}

export type LessonLike = Pick<Lesson, "chapter" | "epsQuestions">;
