import type { EpsQuestion, PracticeQuestion } from "./lesson";
import { isDialoguePassage } from "./dialogue";

/**
 * EPS-TOPIK question-format taxonomy — mirrors the official exam's item types
 * so every question can show the same instruction banner learners will see on
 * the real CBT (Korean instruction, Bengali gloss underneath).
 *
 * Reading section (읽기) item types on the real exam:
 *   • 그림/표지판 보고 답 고르기  — picture & safety-sign questions
 *   • (   )에 알맞은 것 고르기    — fill-in-the-blank vocabulary/grammar
 *   • 다음을 읽고 내용 일치 고르기 — passage comprehension
 * Listening section (듣기) item types:
 *   • 그림 보고 듣고 답 고르기    — picture + audio
 *   • 질문 듣고 답 고르기         — question → answer
 *   • 대화 듣고 답 고르기         — two-speaker dialogue
 *   • 이야기 듣고 답 고르기       — narrative
 */

export type EpsQuestionFormat =
  | "picture-choice"
  | "listening-picture"
  | "listening-question"
  | "listening-dialogue"
  | "listening-story"
  | "reading-picture"
  | "reading-blank"
  | "reading-passage";

export const EPS_FORMAT_META: Record<EpsQuestionFormat, { ko: string; bn: string; shortBn: string }> = {
  "picture-choice": {
    ko: "그림을 보고 알맞은 것을 고르십시오.",
    bn: "চারটি ছবির মধ্যে সঠিক ছবিটি বাছাই করুন।",
    shortBn: "ছবি বাছাই",
  },
  "listening-picture": {
    ko: "그림을 보면서 대화를 듣고 알맞은 답을 고르십시오.",
    bn: "ছবিটি দেখে অডিও মনোযোগ দিয়ে শুনুন ও সঠিক উত্তর বাছাই করুন।",
    shortBn: "ছবি + শ্রবণ",
  },
  "listening-question": {
    ko: "질문을 잘 듣고 알맞은 답을 고르십시오.",
    bn: "প্রশ্নটি মনোযোগ দিয়ে শুনে সঠিক উত্তরটি বাছাই করুন।",
    shortBn: "প্রশ্ন শ্রবণ",
  },
  "listening-dialogue": {
    ko: "대화를 잘 듣고 알맞은 답을 고르십시오.",
    bn: "পুরুষ (남자) ও মহিলা (여자) কণ্ঠের সংলাপ শুনে সঠিক উত্তর বাছাই করুন।",
    shortBn: "সংলাপ শ্রবণ",
  },
  "listening-story": {
    ko: "이야기를 잘 듣고 알맞은 답을 고르십시오.",
    bn: "বর্ণনাটি মনোযোগ দিয়ে শুনে সঠিক উত্তর বাছাই করুন।",
    shortBn: "বর্ণনা শ্রবণ",
  },
  "reading-picture": {
    ko: "그림이나 표지판을 보고 알맞은 것을 고르십시오.",
    bn: "ছবি বা নিরাপত্তা চিহ্নটি দেখে সঠিক উত্তর বাছাই করুন।",
    shortBn: "ছবি/চিহ্ন পাঠ",
  },
  "reading-blank": {
    ko: "(   )에 알맞은 것을 고르십시오.",
    bn: "বন্ধনীর শূন্যস্থানের জন্য সঠিক শব্দ বা প্রকাশ বাছাই করুন।",
    shortBn: "শূন্যস্থান",
  },
  "reading-passage": {
    ko: "다음을 읽고 알맞은 것을 고르십시오.",
    bn: "লেখাটি পড়ে সঠিক উত্তর বাছাই করুন।",
    shortBn: "পাঠ বোঝা",
  },
};

const BLANK_PATTERN = /_{2,}|\(\s*\)|\(\s*___\s*\)|\[ ___ \]|빈칸/;

/**
 * Classify a question into the official exam format it resembles.
 * Works from existing content fields — no content migration required.
 */
export function getEpsQuestionFormat(
  question: Pick<EpsQuestion, "section" | "passage" | "image" | "imageOptions" | "options">,
): EpsQuestionFormat {
  // Picture-choice: the four options themselves are pictures (real exam's
  // dominant "그림 보고" item on both sections).
  if (question.imageOptions && question.imageOptions.length > 0) {
    return "picture-choice";
  }

  if (question.section === "listening") {
    if (question.image) return "listening-picture";
    const passage = (question.passage ?? "").trim();
    if (isDialoguePassage(passage)) return "listening-dialogue";
    if (passage.endsWith("?") || passage.endsWith("?") || /[\?]$/.test(passage)) {
      return "listening-question";
    }
    return "listening-story";
  }

  if (question.image) return "reading-picture";
  if (BLANK_PATTERN.test(question.passage ?? "") || question.options.some(option => BLANK_PATTERN.test(option))) {
    return "reading-blank";
  }
  return "reading-passage";
}

/** True when the question's answer choices are pictures instead of text. */
export function isPictureChoiceQuestion(
  question: Pick<EpsQuestion | PracticeQuestion, "imageOptions">,
): boolean {
  return Array.isArray(question.imageOptions) && question.imageOptions.length > 0;
}
