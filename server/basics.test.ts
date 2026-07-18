import { describe, expect, it } from "vitest";
import {
  BASICS_MODULE_IDS,
  basicsModuleSchema,
  getModuleQuizQuestions,
  isBasicsComplete,
  isBatchimRelatedQuestion,
  isCheckpointPassing,
  isModuleComplete,
  isSyllableRelatedQuestion,
  moduleRequirements,
  quizRatio,
  scoreBasicsQuiz,
  strokeFileSchema,
  uniqueIdCount,
  type BasicsModule,
  type BasicsModuleProgress,
} from "../shared/basics";
import { composeHangul, decomposeHangul, V1_BATCHIM, V1_CONSONANTS, V1_VOWELS } from "../shared/hangul";
import { coverageRatio, targetSamplesFromStrokeFile } from "../shared/strokeCoverage";
import {
  assertWriteStrokeReferences,
  getAllBasicsModules,
  getBasicsManifest,
  getBasicsModule,
  getStrokeFile,
} from "./basicsContent";

describe("shared/hangul compose + decompose", () => {
  it("composes CV and CVT with Unicode formula", () => {
    expect(composeHangul("ㄱ", "ㅏ")).toBe("가");
    expect(composeHangul("ㄴ", "ㅏ")).toBe("나");
    expect(composeHangul("ㄱ", "ㅏ", "ㄴ")).toBe("간");
    expect(composeHangul("ㅇ", "ㅣ", "ㄹ")).toBe("일");
  });

  it("round-trips v1 consonants × vowels without final", () => {
    for (const L of V1_CONSONANTS) {
      for (const V of V1_VOWELS) {
        const syl = composeHangul(L, V);
        const parts = decomposeHangul(syl);
        expect(parts.L).toBe(L);
        expect(parts.V).toBe(V);
        expect(parts.T).toBe("");
      }
    }
  });

  it("round-trips v1 batchim finals on 가 base", () => {
    for (const T of V1_BATCHIM) {
      const syl = composeHangul("ㄱ", "ㅏ", T);
      const parts = decomposeHangul(syl);
      expect(parts).toEqual({ L: "ㄱ", V: "ㅏ", T });
    }
  });

  it("throws on invalid initial/vowel or unknown final (not silent T=0)", () => {
    expect(() => composeHangul("x", "ㅏ")).toThrow(/Invalid jamo/);
    expect(() => composeHangul("ㄱ", "ㅏ", "ZZ")).toThrow(/Invalid jamo/);
    expect(() => composeHangul("ㄱ", "ㅏ", "NOTJAMO")).toThrow(/Invalid jamo/);
    expect(() => composeHangul("ㄱ", "ㅏ", "ㄴ ")).toThrow(/Invalid jamo/);
    // empty final is valid → CV
    expect(composeHangul("ㄱ", "ㅏ", "")).toBe("가");
  });

  it("throws on multi-character or non-Hangul decompose input", () => {
    expect(() => decomposeHangul("A")).toThrow(/Not a precomposed/);
    expect(() => decomposeHangul("간x")).toThrow(/single Hangul syllable/);
    expect(() => decomposeHangul("")).toThrow(/Empty/);
  });
});

describe("shared/strokeCoverage coverageRatio", () => {
  it("returns 0 for empty targets", () => {
    expect(coverageRatio([], [{ x: 0, y: 0 }])).toBe(0);
  });

  it("scores perfect and partial coverage against precomputed samples", () => {
    const targets = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ];
    const perfect = [
      { x: 0, y: 0 },
      { x: 10, y: 1 },
      { x: 20, y: 0 },
    ];
    expect(coverageRatio(targets, perfect, 6)).toBe(1);

    const partial = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ];
    expect(coverageRatio(targets, partial, 6)).toBeCloseTo(1 / 3);
  });

  it("loads giyeok stroke samples and scores a tracing polyline", () => {
    const stroke = getStrokeFile("giyeok");
    expect(stroke).toBeDefined();
    const parsed = strokeFileSchema.parse(stroke);
    const samples = targetSamplesFromStrokeFile(parsed);
    expect(samples.length).toBeGreaterThan(4);
    expect(coverageRatio(samples, samples, 6)).toBe(1);
    expect(coverageRatio(samples, [{ x: 500, y: 500 }], 6)).toBe(0);
  });
});

describe("content loader + schema fixtures", () => {
  it("loads manifest with 8 modules and passScore 0.7", () => {
    const manifest = getBasicsManifest();
    expect(manifest.version).toBe(1);
    expect(manifest.passScore).toBe(0.7);
    expect(manifest.modules).toHaveLength(8);
    expect(manifest.modules.map(m => m.id).sort()).toEqual([...BASICS_MODULE_IDS].sort());
  });

  it("loads and validates all 8 module fixtures", () => {
    const modules = getAllBasicsModules();
    expect(modules).toHaveLength(8);
    for (const id of BASICS_MODULE_IDS) {
      const mod = getBasicsModule(id);
      expect(mod).toBeDefined();
      expect(basicsModuleSchema.parse(mod).id).toBe(id);
    }
  });

  it("enforces checkpoint composition constraints on fixture", () => {
    const checkpoint = getBasicsModule("checkpoint")!;
    const questions = getModuleQuizQuestions(checkpoint);
    expect(questions.length).toBeGreaterThanOrEqual(12);
    expect(questions.length).toBeLessThanOrEqual(16);
    expect(questions.filter(q => q.kind === "listen-choice").length).toBeGreaterThanOrEqual(3);
    expect(questions.filter(q => q.kind === "matching").length).toBeGreaterThanOrEqual(2);
    expect(questions.filter(isSyllableRelatedQuestion).length).toBeGreaterThanOrEqual(3);
    expect(questions.filter(isBatchimRelatedQuestion).length).toBeGreaterThanOrEqual(2);
  });

  it("rejects under-composed checkpoint fixtures", () => {
    const checkpoint = structuredClone(getBasicsModule("checkpoint")!);
    const quiz = checkpoint.steps.find(s => s.type === "quiz");
    if (!quiz || quiz.type !== "quiz") throw new Error("expected quiz step");
    // Only 2 MC questions — fails 12–16 and composition minima
    quiz.questions = quiz.questions.slice(0, 2).map(q => ({
      ...q,
      kind: "multiple-choice" as const,
      topic: "jamo" as const,
    }));
    expect(() => basicsModuleSchema.parse(checkpoint)).toThrow();
  });

  it("validates every builder prompt answer via composeHangul", () => {
    for (const mod of getAllBasicsModules()) {
      for (const step of mod.steps) {
        if (step.type !== "builder") continue;
        for (const prompt of step.prompts) {
          expect(composeHangul(prompt.initial, prompt.vowel, prompt.final ?? "")).toBe(
            prompt.answer,
          );
        }
      }
    }
  });

  it("rejects builder prompts with invalid final that would have silent-mapped to CV", () => {
    const bad = {
      id: "syllables",
      order: 3,
      title: { bn: "s", ko: "s", en: "s" },
      estimatedMinutes: 5,
      requirements: {
        requiredStepIds: ["b1"],
        minSpeakItems: 0,
        minWriteItems: 0,
        minBuilderItems: 1,
        passRatio: 0.7,
      },
      steps: [
        {
          id: "b1",
          type: "builder",
          prompts: [
            {
              id: "p1",
              initial: "ㄱ",
              vowel: "ㅏ",
              final: "NOTJAMO",
              answer: "가",
            },
          ],
        },
      ],
    };
    expect(() => basicsModuleSchema.parse(bad)).toThrow();
  });

  it("rejects unachievable minSpeakItems and duplicate speak item ids", () => {
    const unachievable = {
      id: "speak-lab",
      order: 5,
      title: { bn: "s", ko: "s", en: "s" },
      estimatedMinutes: 5,
      requirements: {
        requiredStepIds: ["sp"],
        minSpeakItems: 99,
        minWriteItems: 0,
        minBuilderItems: 0,
        passRatio: 0.7,
      },
      steps: [
        {
          id: "sp",
          type: "speak",
          minListens: 1,
          items: [
            {
              id: "a",
              text: "가",
              romanization: "ga",
              audioText: "가",
              bn: "가",
              en: "ga",
            },
          ],
        },
      ],
    };
    expect(() => basicsModuleSchema.parse(unachievable)).toThrow(/minSpeakItems/);

    const dup = {
      ...unachievable,
      requirements: { ...unachievable.requirements, minSpeakItems: 1 },
      steps: [
        {
          id: "sp",
          type: "speak",
          minListens: 1,
          items: [
            {
              id: "same",
              text: "가",
              romanization: "ga",
              audioText: "가",
              bn: "가",
              en: "ga",
            },
            {
              id: "same",
              text: "나",
              romanization: "na",
              audioText: "나",
              bn: "나",
              en: "na",
            },
          ],
        },
      ],
    };
    expect(() => basicsModuleSchema.parse(dup)).toThrow(/Duplicate speak item/);
  });

  it("assertWriteStrokeReferences fails on unknown strokeId", () => {
    const consonants = structuredClone(getBasicsModule("consonants")!);
    const write = consonants.steps.find(s => s.type === "write");
    if (!write || write.type !== "write") throw new Error("expected write step");
    write.items[0]!.strokeId = "does-not-exist";
    expect(() => assertWriteStrokeReferences([consonants])).toThrow(/does-not-exist/);
  });
});

describe("isModuleComplete / quizRatio / isCheckpointPassing", () => {
  const welcome = getBasicsModule("welcome")!;

  function baseProgress(overrides: Partial<BasicsModuleProgress> = {}): BasicsModuleProgress {
    return {
      moduleId: welcome.id,
      stepsDone: [],
      speakItemsDone: [],
      writeItemsDone: [],
      builderItemsDone: [],
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  it("returns false without progress", () => {
    expect(isModuleComplete(welcome, undefined)).toBe(false);
  });

  it("requires required steps and quiz ratio ≥ passRatio", () => {
    const req = moduleRequirements(welcome);
    // 0.66 so 2/3 ≈ 0.666… passes (design intent: 2-of-3)
    expect(req.passRatio).toBe(0.66);

    const incomplete = baseProgress({
      stepsDone: [...req.requiredStepIds],
      quizScore: 1,
      quizTotal: 3,
    });
    expect(quizRatio(incomplete)).toBeCloseTo(1 / 3);
    expect(isModuleComplete(welcome, incomplete)).toBe(false);

    const complete = baseProgress({
      stepsDone: [...req.requiredStepIds],
      quizScore: 2,
      quizTotal: 3,
    });
    expect(isModuleComplete(welcome, complete)).toBe(true);
  });

  it("enforces speak/write minima with unique ids (duplicate done-ids do not count twice)", () => {
    const consonants = getBasicsModule("consonants")!;
    const req = consonants.requirements;
    const dupSpeak: BasicsModuleProgress = {
      moduleId: "consonants",
      stepsDone: [...req.requiredStepIds],
      speakItemsDone: ["c-s-g", "c-s-g"], // length 2 but unique 1
      writeItemsDone: ["c-w-g", "c-w-n"],
      builderItemsDone: [],
      quizScore: 3,
      quizTotal: 3,
      updatedAt: new Date().toISOString(),
    };
    expect(uniqueIdCount(dupSpeak.speakItemsDone)).toBe(1);
    expect(isModuleComplete(consonants, dupSpeak)).toBe(false);

    dupSpeak.speakItemsDone = ["c-s-g", "c-s-n"];
    expect(isModuleComplete(consonants, dupSpeak)).toBe(true);
  });

  it("speak-lab completes without quiz when speak minima met", () => {
    const speakLab = getBasicsModule("speak-lab")!;
    expect(speakLab.steps.some(s => s.type === "quiz")).toBe(false);
    const progress: BasicsModuleProgress = {
      moduleId: "speak-lab",
      stepsDone: ["sp-lab"],
      speakItemsDone: ["sp-1", "sp-2", "sp-3"],
      writeItemsDone: [],
      builderItemsDone: [],
      updatedAt: new Date().toISOString(),
    };
    expect(isModuleComplete(speakLab, progress)).toBe(true);
  });

  it("write-lab requires unique write items", () => {
    const writeLab = getBasicsModule("write-lab")!;
    const almost: BasicsModuleProgress = {
      moduleId: "write-lab",
      stepsDone: ["wr-lab"],
      speakItemsDone: [],
      writeItemsDone: ["wr-g", "wr-g", "wr-g"], // duplicates only
      builderItemsDone: [],
      updatedAt: new Date().toISOString(),
    };
    expect(isModuleComplete(writeLab, almost)).toBe(false);
    almost.writeItemsDone = ["wr-g", "wr-n", "wr-a"];
    expect(isModuleComplete(writeLab, almost)).toBe(true);
  });

  it("syllables requires builder minima + quiz ratio", () => {
    const syllables = getBasicsModule("syllables")!;
    const req = syllables.requirements;
    const progress: BasicsModuleProgress = {
      moduleId: "syllables",
      stepsDone: [...req.requiredStepIds],
      speakItemsDone: [],
      writeItemsDone: [],
      builderItemsDone: ["sy-p1"], // need minBuilderItems 2
      quizScore: 3,
      quizTotal: 3,
      updatedAt: new Date().toISOString(),
    };
    expect(isModuleComplete(syllables, progress)).toBe(false);
    progress.builderItemsDone = ["sy-p1", "sy-p2"];
    expect(isModuleComplete(syllables, progress)).toBe(true);
  });

  it("never marks checkpoint complete via isModuleComplete (unlock is isBasicsComplete)", () => {
    const checkpoint = getBasicsModule("checkpoint")!;
    const progress: BasicsModuleProgress = {
      moduleId: "checkpoint",
      stepsDone: ["cp-quiz"],
      speakItemsDone: [],
      writeItemsDone: [],
      builderItemsDone: [],
      quizScore: 13,
      quizTotal: 13,
      updatedAt: new Date().toISOString(),
      completed: true,
    };
    expect(isModuleComplete(checkpoint, progress)).toBe(false);
    expect(
      isBasicsComplete({
        version: 1,
        modules: { checkpoint: progress },
        checkpointPassedAt: "2026-07-17T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("isCheckpointPassing uses score/total ratio (not raw score) and clamps score", () => {
    expect(isCheckpointPassing(12, 16, 0.7)).toBe(true);
    expect(isCheckpointPassing(11, 16, 0.7)).toBe(false);
    expect(isCheckpointPassing(7, 10, 0.7)).toBe(true);
    expect(isCheckpointPassing(0, 0, 0.7)).toBe(false);
    expect(isCheckpointPassing(5, 0, 0.7)).toBe(false);
    // score > total clamps to 1.0 ratio → pass
    expect(isCheckpointPassing(20, 10, 0.7)).toBe(true);
    expect(quizRatio({ moduleId: "x", stepsDone: [], speakItemsDone: [], writeItemsDone: [], builderItemsDone: [], quizScore: 12, quizTotal: 10, updatedAt: "" })).toBe(1);
  });

  it("isBasicsComplete only trusts checkpointPassedAt", () => {
    expect(isBasicsComplete({ version: 1, modules: {} })).toBe(false);
    expect(
      isBasicsComplete({
        version: 1,
        modules: {},
        checkpointPassedAt: "2026-07-17T00:00:00.000Z",
      }),
    ).toBe(true);
  });
});

describe("scoreBasicsQuiz", () => {
  it("grades MC, listen-choice, and matching on checkpoint", () => {
    const checkpoint = getBasicsModule("checkpoint")!;
    const questions = getModuleQuizQuestions(checkpoint);

    const answers: Record<string, number> = {};
    const matching: Record<string, Record<number, string>> = {};
    for (const q of questions) {
      if (q.kind === "matching") {
        matching[q.id] = Object.fromEntries(q.pairs.map((pair, index) => [index, pair.right]));
      } else if (q.answer != null) {
        answers[q.id] = q.answer;
      }
    }

    const perfect = scoreBasicsQuiz(checkpoint, answers, matching);
    expect(perfect.total).toBe(questions.length);
    expect(perfect.score).toBe(questions.length);
    expect(perfect.correctIds).toHaveLength(questions.length);
    expect(isCheckpointPassing(perfect.score, perfect.total, 0.7)).toBe(true);

    const firstMc = questions.find(q => q.kind === "multiple-choice")!;
    const wrongAnswers = { ...answers, [firstMc.id]: (firstMc.answer! + 1) % firstMc.options.length };
    const partial = scoreBasicsQuiz(checkpoint, wrongAnswers, matching);
    expect(partial.score).toBe(questions.length - 1);

    const firstMatch = questions.find(q => q.kind === "matching")!;
    const badMatching = {
      ...matching,
      [firstMatch.id]: { 0: "WRONG" },
    };
    const matchFail = scoreBasicsQuiz(checkpoint, answers, badMatching);
    expect(matchFail.score).toBe(questions.length - 1);
  });

  it("accepts string keys in matching selections (JSON-safe)", () => {
    const module = getBasicsModule("consonants")!;
    const questions = getModuleQuizQuestions(module);
    const matchQ = questions.find(q => q.kind === "matching")!;
    const answers: Record<string, number> = {};
    for (const q of questions) {
      if (q.kind !== "matching" && q.answer != null) answers[q.id] = q.answer;
    }
    const matching = {
      [matchQ.id]: Object.fromEntries(matchQ.pairs.map((pair, i) => [String(i), pair.right])),
    };
    const result = scoreBasicsQuiz(module, answers, matching);
    expect(result.score).toBe(questions.length);
  });
});

describe("moduleRequirements helper", () => {
  it("returns the module requirements object", () => {
    const mod = getBasicsModule("welcome") as BasicsModule;
    expect(moduleRequirements(mod)).toEqual(mod.requirements);
  });
});
