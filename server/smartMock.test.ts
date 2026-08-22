import { describe, expect, it } from "vitest";
import { buildSmartMockQuestions, questionContentKey, type MockQuestionCandidate } from "@shared/smartMock";

function question(overrides: Partial<MockQuestionCandidate> = {}): MockQuestionCandidate {
  return {
    id: "a",
    chapter: 1,
    section: "reading",
    questionBn: "ছবিটি কী?",
    questionKo: "이것은 무엇입니까?",
    passage: "이것은 무엇입니까?",
    options: ["사과", "지게차", "굴착기", "트랙터"],
    answer: 0,
    explanationBn: "সঠিক শব্দটি বেছে নিন।",
    lessonTitle: { ko: "수업", bn: "পাঠ", en: "Lesson" },
    ...overrides,
  };
}

describe("smart mock learning selection", () => {
  it("collapses identical content across chapters and IDs", () => {
    const first = question({ chapter: 1, id: "first" });
    const second = question({ chapter: 44, id: "broadcast-copy" });
    expect(questionContentKey(first)).toBe(questionContentKey(second));
    const selected = buildSmartMockQuestions([
      first,
      second,
      question({ chapter: 2, id: "unique-reading", passage: "다른 질문입니다.", questionKo: "다른 질문입니다." }),
      ...Array.from({ length: 4 }, (_, index) => question({ chapter: index + 3, id: `listening-${index}`, section: "listening", passage: `듣기 문장 ${index}`, questionKo: `듣기 문장 ${index}` })),
    ], { count: 10, mode: "balanced" });
    expect(selected.filter(item => questionContentKey(item) === questionContentKey(first))).toHaveLength(1);
  });

  it("prioritizes exact weak item IDs for smart mocks", () => {
    const weak = question({ chapter: 2, id: "weak" });
    const broad = question({ chapter: 3, id: "broad", passage: "새로운 문장", questionKo: "새로운 문장" });
    const listening = question({ chapter: 4, id: "listen", section: "listening", passage: "듣기 문장", questionKo: "듣기 문장" });
    const selected = buildSmartMockQuestions([
      weak,
      broad,
      listening,
      ...Array.from({ length: 12 }, (_, index) => question({ chapter: 10 + index, id: `broad-${index}`, passage: `বিস্তৃত প্রশ্ন ${index}`, questionKo: `বিস্তৃত প্রশ্ন ${index}` })),
    ], {
      count: 10,
      mode: "smart",
      focusItemIds: ["eps:2:weak"],
    });
    expect(selected.some(item => item.id === "weak")).toBe(true);
  });
});
