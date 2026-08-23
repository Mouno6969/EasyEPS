import { z } from "zod";
import type { EpsQuestion, Lesson, VocabularyItem } from "./lesson";
import type { ItemEvidence } from "./learning";
import { epsQuestionImageSchema, localizedTextSchema } from "./lesson";

export const transferFormatSchema = z.enum([
  "picture-to-word",
  "word-to-situation",
  "short-typed",
  "cloze",
  "listening-to-meaning",
  "polite-response",
]);

export type TransferFormat = z.infer<typeof transferFormatSchema>;

export const transferOptionSchema = z.object({
  id: z.string().min(1),
  label: localizedTextSchema,
});

export const transferItemSchema = z
  .object({
    id: z.string().min(1),
    chapter: z.number().int().min(1).max(60),
    sourceWordKo: z.string().min(1),
    format: transferFormatSchema,
    prompt: localizedTextSchema,
    context: localizedTextSchema.optional(),
    options: z.array(transferOptionSchema).max(4).default([]),
    answerOptionId: z.string().optional(),
    acceptedAnswers: z.array(z.string().min(1)).max(8).default([]),
    explanation: localizedTextSchema,
    hintBn: z.string().min(1),
    audioText: z.string().optional(),
    image: epsQuestionImageSchema.optional(),
    skillTags: z.array(z.string().min(1)).min(1),
    contentVersion: z.string().min(1),
  })
  .superRefine((item, ctx) => {
    if (item.format === "short-typed") {
      if (item.acceptedAnswers.length === 0) ctx.addIssue({ code: "custom", message: "short-typed transfer items need accepted answers", path: ["acceptedAnswers"] });
      return;
    }
    if (!item.answerOptionId || item.options.length < 2 || !item.options.some(option => option.id === item.answerOptionId)) {
      ctx.addIssue({ code: "custom", message: "choice transfer items need a valid answer option", path: ["answerOptionId"] });
    }
  });

export type TransferItem = z.infer<typeof transferItemSchema>;

export type TransferResponse = {
  optionId?: string;
  text?: string;
  skipped?: boolean;
};

export type TransferScore = {
  correct: boolean;
  expectedAnswer: string;
  selectedAnswer: string;
};

function normalize(value: string) {
  return value.normalize("NFC").replace(/[.!?,，。！？\s]+/g, "").toLocaleLowerCase();
}

export function scoreTransferItem(item: TransferItem, response: TransferResponse): TransferScore {
  if (response.skipped) {
    return { correct: false, expectedAnswer: item.answerOptionId ?? item.acceptedAnswers[0] ?? item.sourceWordKo, selectedAnswer: "" };
  }
  if (item.format === "short-typed") {
    const selectedAnswer = response.text?.trim() ?? "";
    return {
      correct: item.acceptedAnswers.some(answer => normalize(answer) === normalize(selectedAnswer)),
      expectedAnswer: item.acceptedAnswers[0] ?? item.sourceWordKo,
      selectedAnswer,
    };
  }
  const selectedAnswer = response.optionId ?? "";
  return {
    correct: selectedAnswer === item.answerOptionId,
    expectedAnswer: item.answerOptionId ?? "",
    selectedAnswer,
  };
}

function localized(value: string): { ko: string; bn: string; en: string } {
  return { ko: value, bn: value, en: value };
}

function wordOption(word: VocabularyItem, index: number) {
  return { id: `word-${index}`, label: { ko: word.ko, bn: word.bn, en: word.en } };
}

function rotateOptions<T>(options: T[], seed: string) {
  if (options.length < 2) return options;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const offset = hash % options.length;
  return [...options.slice(offset), ...options.slice(0, offset)];
}

function distinctWords(lesson: Lesson, targetIndex: number) {
  const target = lesson.vocabulary[targetIndex];
  if (!target) return [];
  const distractors = lesson.vocabulary
    .map((word, index) => ({ word, index }))
    .filter(item => item.index !== targetIndex)
    .slice(0, 3);
  return [{ word: target, index: targetIndex }, ...distractors];
}

function choiceItem(input: Omit<TransferItem, "options" | "answerOptionId" | "acceptedAnswers"> & { options: TransferItem["options"]; answerOptionId: string }): TransferItem {
  return transferItemSchema.parse({ ...input, acceptedAnswers: [] });
}

function buildVocabularyItems(lesson: Lesson, word: VocabularyItem, wordIndex: number): TransferItem[] {
  const rawOptions = distinctWords(lesson, wordIndex).map(item => wordOption(item.word, item.index));
  const targetOptionId = `word-${wordIndex}`;
  const options = rotateOptions(rawOptions, `${word.ko}:choices`);
  const cloze = word.example.ko.includes(word.ko) ? word.example.ko.replaceAll(word.ko, "_____ ").replace(/\s+$/, "") : `_____ — ${word.example.ko}`;
  const situation = { ko: word.example.ko, bn: word.example.bn, en: word.example.en };
  const explanation = { ko: word.example.ko, bn: `${word.bn} শব্দটি এই বাক্যে কেন মানায় তা লক্ষ্য করুন।`, en: `Notice why ${word.en} fits this sentence.` };
  const items: TransferItem[] = [
    choiceItem({
      id: `transfer:${lesson.chapter}:word-to-situation:${wordIndex}`,
      chapter: lesson.chapter,
      sourceWordKo: word.ko,
      format: "word-to-situation",
      prompt: { ko: "상황에 맞는 단어를 고르세요.", bn: "এই পরিস্থিতির সাথে মানানসই শব্দটি বেছে নিন।", en: "Choose the word that fits this situation." },
      context: situation,
      options,
      answerOptionId: targetOptionId,
      explanation,
      hintBn: "পুরো Korean বাক্যটি পড়ে পরিস্থিতির অর্থ ধরুন; শুধু আলাদা শব্দ দেখে অনুমান করবেন না।",
      skillTags: ["transfer", "vocabulary", "context"],
      contentVersion: lesson.contentVersion,
    }),
    choiceItem({
      id: `transfer:${lesson.chapter}:cloze:${wordIndex}`,
      chapter: lesson.chapter,
      sourceWordKo: word.ko,
      format: "cloze",
      prompt: { ko: "빈칸에 알맞은 단어를 고르세요.", bn: "শূন্যস্থানে সঠিক শব্দটি বসান।", en: "Choose the word that completes the blank." },
      context: { ko: cloze, bn: word.example.bn, en: word.example.en },
      options,
      answerOptionId: targetOptionId,
      explanation,
      hintBn: "বাক্যের ক্রিয়া, 조사 এবং সামগ্রিক অর্থ দেখে শব্দটি বসান।",
      skillTags: ["transfer", "vocabulary", "cloze"],
      contentVersion: lesson.contentVersion,
    }),
    {
      id: `transfer:${lesson.chapter}:short-typed:${wordIndex}`,
      chapter: lesson.chapter,
      sourceWordKo: word.ko,
      format: "short-typed",
      prompt: { ko: "뜻을 보고 한국어 단어를 입력하세요.", bn: "অর্থ দেখে Korean শব্দটি লিখুন।", en: "Type the Korean word from its meaning." },
      context: { ko: word.en, bn: word.bn, en: word.en },
      options: [],
      acceptedAnswers: [word.ko],
      explanation,
      hintBn: `ইঙ্গিত: ${word.romanization}`,
      skillTags: ["transfer", "vocabulary", "recall"],
      contentVersion: lesson.contentVersion,
    },
    choiceItem({
      id: `transfer:${lesson.chapter}:listening-to-meaning:${wordIndex}`,
      chapter: lesson.chapter,
      sourceWordKo: word.ko,
      format: "listening-to-meaning",
      prompt: { ko: "문장을 듣고 알맞은 뜻을 고르세요.", bn: "বাক্যটি শুনে সঠিক অর্থটি বেছে নিন।", en: "Listen and choose the correct meaning." },
      context: { ko: word.example.ko, bn: "শোনার পর অর্থটি মনে করে উত্তর দিন।", en: "Recall the meaning after listening." },
      options: options.map(option => ({ ...option, label: { ko: option.label.ko, bn: option.label.bn, en: option.label.en } })),
      answerOptionId: targetOptionId,
      explanation,
      hintBn: "প্রথমবার script না দেখে শুনুন; তথ্য না ধরলে ধীরে আবার শুনে তারপর উত্তর দিন।",
      audioText: word.example.ko,
      skillTags: ["transfer", "vocabulary", "listening"],
      contentVersion: lesson.contentVersion,
    }),
    choiceItem({
      id: `transfer:${lesson.chapter}:polite-response:${wordIndex}`,
      chapter: lesson.chapter,
      sourceWordKo: word.ko,
      format: "polite-response",
      prompt: { ko: "가장 알맞은 공손한 응답을 고르세요.", bn: "সবচেয়ে উপযুক্ত ভদ্র উত্তরটি বেছে নিন।", en: "Choose the most appropriate polite response." },
      context: { ko: `${word.example.ko} — 동료가 이렇게 말했습니다.`, bn: `${word.example.bn} — সহকর্মী এই কথা বলেছেন।`, en: `${word.example.en} — A coworker said this.` },
      options: rotateOptions([
        { id: "polite-confirm", label: { ko: "네, 확인하겠습니다.", bn: "জি, আমি পরীক্ষা করে দেখব।", en: "Yes, I will check it." } },
        { id: "polite-greeting", label: { ko: "안녕히 주무세요.", bn: "শুভরাত্রি।", en: "Good night." } },
        { id: "polite-refuse", label: { ko: "싫어요.", bn: "আমি চাই না।", en: "I do not want to." } },
        { id: "polite-thanks", label: { ko: "맛있게 드세요.", bn: "ভালো করে খান।", en: "Enjoy your meal." } },
      ], word.ko),
      answerOptionId: "polite-confirm",
      explanation: { ko: "네, 확인하겠습니다.", bn: "কাজের নির্দেশে ভদ্রভাবে সম্মতি জানাতে ‘네, 확인하겠습니다’ উপযুক্ত।", en: "‘네, 확인하겠습니다’ is the appropriate polite agreement to a work instruction." },
      hintBn: "কর্মক্ষেত্রের নির্দেশের জবাবে ভদ্র সম্মতি ও ভবিষ্যৎ কাজের কথা বলুন।",
      skillTags: ["transfer", "workplace", "politeness"],
      contentVersion: lesson.contentVersion,
    }),
  ];
  return items;
}

function buildPictureItem(lesson: Lesson, question: EpsQuestion): TransferItem {
  const options = question.options.map((value, index) => ({ id: `option-${index}`, label: localized(value) }));
  return choiceItem({
    id: `transfer:${lesson.chapter}:picture-to-word:${question.id}`,
    chapter: lesson.chapter,
    sourceWordKo: question.options[question.answer] ?? question.id,
    format: "picture-to-word",
    prompt: { ko: "그림을 보고 알맞은 단어를 고르세요.", bn: "ছবিটি দেখে সঠিক শব্দটি বেছে নিন।", en: "Look at the picture and choose the correct word." },
    context: { ko: question.questionKo, bn: question.questionBn, en: question.questionBn },
    options,
    answerOptionId: `option-${question.answer}`,
    explanation: { ko: question.explanationBn, bn: question.explanationBn, en: question.explanationBn },
    hintBn: "ছবির লক্ষ্যবস্তু, কাজ বা চিহ্নটি আগে বর্ণনা করুন; তারপর Korean বিকল্প মিলিয়ে নিন।",
    image: question.image,
    skillTags: ["transfer", "visual", "vocabulary"],
    contentVersion: lesson.contentVersion,
  });
}

export function buildTransferItems(lessons: Lesson[]): TransferItem[] {
  const items: TransferItem[] = [];
  for (const lesson of lessons) {
    lesson.vocabulary.slice(0, 5).forEach((word, index) => items.push(...buildVocabularyItems(lesson, word, index)));
    const picture = lesson.epsQuestions.find(question => question.image);
    if (picture?.image) items.push(buildPictureItem(lesson, picture));
  }
  return items.map(item => transferItemSchema.parse(item));
}

export function selectTransferItems(items: TransferItem[], evidence: Record<string, ItemEvidence> | undefined, options: { limit: number; date?: string }) {
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const limit = Math.max(6, Math.min(24, Math.round(options.limit)));
  const hash = (value: string) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
    return result >>> 0;
  };
  const score = (item: TransferItem) => {
    const current = evidence?.[item.id];
    const due = current && current.dueDate <= date ? 100 : 0;
    const unseen = current ? 0 : 35;
    const weakness = current ? Math.max(0, 30 - current.mastery * 0.3) : 10;
    const recentlySeen = current?.lastAttemptedAt.slice(0, 10) === date ? -35 : 0;
    return due + unseen + weakness + recentlySeen;
  };
  const ranked = [...items].sort((a, b) => score(b) - score(a) || hash(`${date}:${a.id}`) - hash(`${date}:${b.id}`));
  const selected: TransferItem[] = [];
  const used = new Set<string>();
  const formats: TransferFormat[] = ["picture-to-word", "word-to-situation", "short-typed", "cloze", "listening-to-meaning", "polite-response"];
  for (const format of formats) {
    const candidate = ranked.find(item => item.format === format && !used.has(item.sourceWordKo));
    if (candidate) { selected.push(candidate); used.add(candidate.sourceWordKo); }
  }
  for (const item of ranked) {
    if (selected.length >= limit) break;
    if (selected.some(candidate => candidate.id === item.id)) continue;
    selected.push(item);
  }
  return selected.slice(0, limit);
}

export function transferFormatLabel(format: TransferFormat) {
  return {
    "picture-to-word": "ছবি → শব্দ",
    "word-to-situation": "শব্দ → পরিস্থিতি",
    "short-typed": "নিজে লিখুন",
    cloze: "শূন্যস্থান",
    "listening-to-meaning": "শুনে অর্থ",
    "polite-response": "ভদ্র উত্তর",
  }[format];
}
