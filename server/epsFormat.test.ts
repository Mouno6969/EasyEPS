import { describe, expect, it } from "vitest";
import { EPS_FORMAT_META, getEpsQuestionFormat, isPictureChoiceQuestion } from "../shared/epsFormat";

const base = {
  id: "q1",
  questionBn: "প্রশ্ন",
  questionKo: "고르십시오.",
  answer: 0,
  explanationBn: "ব্যাখ্যা",
};

describe("getEpsQuestionFormat", () => {
  it("classifies picture-choice questions (four picture options)", () => {
    const format = getEpsQuestionFormat({
      section: "listening",
      passage: "우산을 찾고 있어요.",
      imageOptions: [
        { src: "/eps-images/a.svg", altBn: "a" },
        { src: "/eps-images/b.svg", altBn: "b" },
        { src: "/eps-images/c.svg", altBn: "c" },
        { src: "/eps-images/d.svg", altBn: "d" },
      ],
      options: [],
      ...base,
    });
    expect(format).toBe("picture-choice");
    expect(isPictureChoiceQuestion({ imageOptions: [{ src: "/a.svg", altBn: "a" }] })).toBe(true);
  });

  it("classifies listening picture items", () => {
    expect(
      getEpsQuestionFormat({
        section: "listening",
        passage: "남자: 어디 가요?\n여자: 회사에 가요.",
        image: { src: "/eps-images/obj-bag.svg", altBn: "가방" },
        options: ["a", "b", "c", "d"],
        ...base,
      }),
    ).toBe("listening-picture");
  });

  it("classifies two-speaker dialogue items", () => {
    expect(
      getEpsQuestionFormat({
        section: "listening",
        passage: "남자: 안녕하세요?\n여자: 네, 안녕하세요?",
        options: ["a", "b", "c", "d"],
        ...base,
      }),
    ).toBe("listening-dialogue");
  });

  it("classifies single-question listening items", () => {
    expect(
      getEpsQuestionFormat({
        section: "listening",
        passage: "어느 나라 사람입니까?",
        options: ["a", "b", "c", "d"],
        ...base,
      }),
    ).toBe("listening-question");
  });

  it("classifies narrative listening items", () => {
    expect(
      getEpsQuestionFormat({
        section: "listening",
        passage: "라힘은 매일 아침 일곱 시에 일어납니다. 그리고 회사에 갑니다.",
        options: ["a", "b", "c", "d"],
        ...base,
      }),
    ).toBe("listening-story");
  });

  it("classifies safety-sign reading items", () => {
    expect(
      getEpsQuestionFormat({
        section: "reading",
        passage: "",
        image: { src: "/eps-images/sign-no-smoking.svg", altBn: "금연" },
        options: ["a", "b", "c", "d"],
        ...base,
      }),
    ).toBe("reading-picture");
  });

  it("classifies fill-in-the-blank reading items", () => {
    expect(
      getEpsQuestionFormat({
        section: "reading",
        passage: "저는 방글라데시 [ ___ ].",
        options: ["a", "b", "c", "d"],
        ...base,
      }),
    ).toBe("reading-blank");
  });

  it("classifies plain passage reading items", () => {
    expect(
      getEpsQuestionFormat({
        section: "reading",
        passage: "오늘 날씨가 좋습니다.",
        options: ["a", "b", "c", "d"],
        ...base,
      }),
    ).toBe("reading-passage");
  });

  it("provides Korean + Bengali instruction text for every format", () => {
    for (const meta of Object.values(EPS_FORMAT_META)) {
      expect(meta.ko.length).toBeGreaterThan(0);
      expect(meta.bn.length).toBeGreaterThan(0);
      expect(meta.shortBn.length).toBeGreaterThan(0);
    }
  });
});
