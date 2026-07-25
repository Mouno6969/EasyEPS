import { describe, expect, it } from "vitest";
import {
  BASICS_MODULE_IDS,
  applyBasicsModulePatch,
  basicsModuleSchema,
  basicsProgressPatchSchema,
  emptyBasicsProgress,
  getModuleQuizQuestions,
  isBasicsComplete,
  isBatchimRelatedQuestion,
  isCheckpointPassing,
  isModuleComplete,
  isSyllableRelatedQuestion,
  mergeBasicsProgress,
  moduleRequirements,
  pickBetterQuiz,
  prepareBasicsQuizDraw,
  quizRatio,
  scoreBasicsQuestions,
  scoreBasicsQuiz,
  shuffleQuestionPresentation,
  stripBasicsUnlockFields,
  strokeFileSchema,
  uniqueIdCount,
  type BasicsModule,
  type BasicsModuleProgress,
  type BasicsProgress,
} from "../shared/basics";
import { ENV } from "./_core/env";
import {
  BASICS_REQUIRED_MESSAGE,
  decideBasicsGate,
} from "./basicsGate";
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

  it("enforces checkpoint bank composition constraints on fixture", () => {
    const checkpoint = getBasicsModule("checkpoint")!;
    const questions = getModuleQuizQuestions(checkpoint);
    expect(questions.length).toBeGreaterThanOrEqual(100);
    const quiz = checkpoint.steps.find(s => s.type === "quiz");
    expect(quiz && quiz.type === "quiz" ? quiz.drawCount : undefined).toBe(25);
    expect(questions.filter(q => q.kind === "listen-choice").length).toBeGreaterThanOrEqual(20);
    expect(questions.filter(q => q.kind === "matching").length).toBeGreaterThanOrEqual(8);
    expect(questions.filter(isSyllableRelatedQuestion).length).toBeGreaterThanOrEqual(15);
    expect(questions.filter(isBatchimRelatedQuestion).length).toBeGreaterThanOrEqual(10);
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
    const speakIds = consonants.steps
      .filter(s => s.type === "speak")
      .flatMap(s => s.items.map(i => i.id));
    const writeIds = consonants.steps
      .filter(s => s.type === "write")
      .flatMap(s => s.items.map(i => i.id));
    const quizTotal = getModuleQuizQuestions(consonants).length;

    const dupSpeak: BasicsModuleProgress = {
      moduleId: "consonants",
      stepsDone: [...req.requiredStepIds],
      // same id twice — unique count 1, cannot meet minSpeakItems
      speakItemsDone: [speakIds[0]!, speakIds[0]!],
      writeItemsDone: writeIds.slice(0, req.minWriteItems),
      builderItemsDone: [],
      quizScore: quizTotal,
      quizTotal,
      updatedAt: new Date().toISOString(),
    };
    expect(uniqueIdCount(dupSpeak.speakItemsDone)).toBe(1);
    expect(isModuleComplete(consonants, dupSpeak)).toBe(false);

    dupSpeak.speakItemsDone = speakIds.slice(0, req.minSpeakItems);
    expect(uniqueIdCount(dupSpeak.speakItemsDone)).toBe(req.minSpeakItems);
    expect(isModuleComplete(consonants, dupSpeak)).toBe(true);
  });

  it("speak-lab completes with speak minima and passing quiz ratio", () => {
    const speakLab = getBasicsModule("speak-lab")!;
    expect(speakLab.steps.some(s => s.type === "quiz")).toBe(true);
    const speakIds = speakLab.steps
      .filter(s => s.type === "speak")
      .flatMap(s => s.items.map(i => i.id));
    const quizTotal = getModuleQuizQuestions(speakLab).length;
    const progress: BasicsModuleProgress = {
      moduleId: "speak-lab",
      stepsDone: [...speakLab.requirements.requiredStepIds],
      speakItemsDone: speakIds.slice(0, speakLab.requirements.minSpeakItems),
      writeItemsDone: [],
      builderItemsDone: [],
      quizScore: quizTotal,
      quizTotal,
      updatedAt: new Date().toISOString(),
    };
    expect(isModuleComplete(speakLab, progress)).toBe(true);

    // Fails when quiz ratio is below passRatio
    const failing = { ...progress, quizScore: 0 };
    expect(isModuleComplete(speakLab, failing)).toBe(false);
  });

  it("write-lab requires unique write items", () => {
    const writeLab = getBasicsModule("write-lab")!;
    const writeIds = writeLab.steps
      .filter(s => s.type === "write")
      .flatMap(s => s.items.map(i => i.id));
    const almost: BasicsModuleProgress = {
      moduleId: "write-lab",
      stepsDone: [...writeLab.requirements.requiredStepIds],
      speakItemsDone: [],
      writeItemsDone: [writeIds[0]!, writeIds[0]!, writeIds[0]!], // duplicates only
      builderItemsDone: [],
      updatedAt: new Date().toISOString(),
    };
    expect(isModuleComplete(writeLab, almost)).toBe(false);
    almost.writeItemsDone = writeIds.slice(0, writeLab.requirements.minWriteItems);
    const writeQuizTotal = getModuleQuizQuestions(writeLab).length;
    almost.quizScore = writeQuizTotal;
    almost.quizTotal = writeQuizTotal;
    expect(isModuleComplete(writeLab, almost)).toBe(true);
  });

  it("syllables requires builder minima + quiz ratio", () => {
    const syllables = getBasicsModule("syllables")!;
    const req = syllables.requirements;
    const builderIds = syllables.steps
      .filter(s => s.type === "builder")
      .flatMap(s => s.prompts.map(p => p.id));
    const quizTotal = getModuleQuizQuestions(syllables).length;
    const progress: BasicsModuleProgress = {
      moduleId: "syllables",
      stepsDone: [...req.requiredStepIds],
      speakItemsDone: [],
      writeItemsDone: [],
      builderItemsDone: [builderIds[0]!], // below minBuilderItems
      quizScore: quizTotal,
      quizTotal,
      updatedAt: new Date().toISOString(),
    };
    expect(isModuleComplete(syllables, progress)).toBe(false);
    progress.builderItemsDone = builderIds.slice(0, req.minBuilderItems);
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
    const answers: Record<string, number> = {};
    const matching: Record<string, Record<string, string>> = {};
    for (const q of questions) {
      if (q.kind === "matching") {
        matching[q.id] = Object.fromEntries(q.pairs.map((pair, i) => [String(i), pair.right]));
      } else if (q.answer != null) {
        answers[q.id] = q.answer;
      }
    }
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


describe("mergeBasicsProgress / pickBetterQuiz / strip unlock", () => {
  function mod(
    id: string,
    overrides: Partial<BasicsModuleProgress> = {},
  ): BasicsModuleProgress {
    return {
      moduleId: id,
      stepsDone: [],
      speakItemsDone: [],
      writeItemsDone: [],
      builderItemsDone: [],
      updatedAt: "2026-07-01T00:00:00.000Z",
      ...overrides,
    };
  }

  it("unions step arrays and never imports unlock from incoming", () => {
    const remote: BasicsProgress = {
      version: 1,
      modules: {
        welcome: mod("welcome", { stepsDone: ["a"], quizScore: 1, quizTotal: 3 }),
      },
    };
    const local: BasicsProgress = {
      version: 1,
      modules: {
        welcome: mod("welcome", {
          stepsDone: ["b"],
          quizScore: 2,
          quizTotal: 3,
          updatedAt: "2026-07-02T00:00:00.000Z",
        }),
        consonants: mod("consonants", { stepsDone: ["c1"] }),
      },
      checkpointPassedAt: "2026-07-02T12:00:00.000Z",
      unlockSource: "checkpoint",
    };

    const merged = mergeBasicsProgress(remote, local);
    expect(merged.checkpointPassedAt).toBeUndefined();
    expect(merged.unlockSource).toBeUndefined();
    expect(merged.modules.welcome!.stepsDone.sort()).toEqual(["a", "b"]);
    expect(merged.modules.consonants!.stepsDone).toEqual(["c1"]);
    expect(merged.modules.welcome!.quizScore).toBe(2);
    expect(merged.modules.welcome!.quizTotal).toBe(3);
  });

  it("pickBetterQuiz keeps higher ratio (5/5 over 8/10) and clamps score>total", () => {
    expect(pickBetterQuiz({ quizScore: 8, quizTotal: 10 }, { quizScore: 5, quizTotal: 5 })).toEqual({
      quizScore: 5,
      quizTotal: 5,
    });
    expect(pickBetterQuiz({ quizScore: 12, quizTotal: 10 }, { quizScore: 9, quizTotal: 10 })).toEqual({
      quizScore: 10,
      quizTotal: 10,
    });
    expect(pickBetterQuiz({ quizScore: 10 }, { quizScore: 3, quizTotal: 5 })).toEqual({
      quizScore: 3,
      quizTotal: 5,
    });
    expect(
      pickBetterQuiz(
        { quizScore: 4, quizTotal: 5, updatedAt: "2026-01-01" },
        { quizScore: 8, quizTotal: 10, updatedAt: "2026-01-02" },
      ),
    ).toEqual({ quizScore: 8, quizTotal: 10 });
  });

  it("preserves remote unlock when remote already complete", () => {
    const remote: BasicsProgress = {
      version: 1,
      modules: {},
      checkpointPassedAt: "2026-06-01T00:00:00.000Z",
      unlockSource: "legacy-migration",
    };
    const local: BasicsProgress = {
      version: 1,
      modules: { welcome: mod("welcome", { stepsDone: ["x"] }) },
      checkpointPassedAt: "spoofed",
      unlockSource: "checkpoint",
    };
    const merged = mergeBasicsProgress(remote, local);
    expect(merged.checkpointPassedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(merged.unlockSource).toBe("legacy-migration");
    expect(merged.modules.welcome!.stepsDone).toEqual(["x"]);
  });

  it("stripBasicsUnlockFields drops track unlock and module completed cache", () => {
    const stripped = stripBasicsUnlockFields({
      version: 1,
      modules: {
        welcome: mod("welcome", { completed: true, stepsDone: ["a"] }),
      },
      checkpointPassedAt: "x",
      unlockSource: "checkpoint",
    });
    expect(stripped.checkpointPassedAt).toBeUndefined();
    expect(stripped.unlockSource).toBeUndefined();
    expect(stripped.modules.welcome!.completed).toBeUndefined();
    expect(stripped.modules.welcome!.stepsDone).toEqual(["a"]);
  });

  it("applyBasicsModulePatch recomputes module completed and ignores unlock keys", () => {
    const welcome = getBasicsModule("welcome")!;
    const req = welcome.requirements;
    const next = applyBasicsModulePatch(
      undefined,
      {
        moduleId: "welcome",
        stepsDone: [...req.requiredStepIds],
        quizScore: 2,
        quizTotal: 3,
      },
      welcome,
    );
    expect(next.completed).toBe(true);
    expect(next.moduleId).toBe("welcome");
  });

  it("basicsProgressPatchSchema rejects quizScore > quizTotal", () => {
    const bad = basicsProgressPatchSchema.safeParse({
      moduleId: "welcome",
      quizScore: 5,
      quizTotal: 3,
    });
    expect(bad.success).toBe(false);
    const good = basicsProgressPatchSchema.safeParse({
      moduleId: "welcome",
      stepsDone: ["a"],
    });
    expect(good.success).toBe(true);
    if (good.success) expect(good.data.minutes).toBe(5);
  });

  it("emptyBasicsProgress is version 1 with empty modules", () => {
    expect(emptyBasicsProgress()).toEqual({ version: 1, modules: {} });
  });
});

describe("ENV.basicsGateEnabled", () => {
  it("defaults to false when BASICS_GATE_ENABLED is unset", () => {
    expect(typeof ENV.basicsGateEnabled).toBe("boolean");
    expect(ENV.basicsGateEnabled).toBe(process.env.BASICS_GATE_ENABLED === "true");
  });

  it("flag-off means assertBasicsComplete is a no-op (decideBasicsGate allow)", () => {
    // assertBasicsComplete returns early when !ENV.basicsGateEnabled; pure mirror:
    expect(
      decideBasicsGate({
        gateEnabled: false,
        role: "user",
        basicsCompleted: false,
        hasLegacyActivity: false,
      }),
    ).toEqual({ action: "allow" });
  });
});

describe("decideBasicsGate (assertBasicsComplete pure logic)", () => {
  const base = {
    role: "user" as const,
    basicsCompleted: false,
    hasLegacyActivity: false,
  };

  it("allows when gate is disabled regardless of progress", () => {
    expect(decideBasicsGate({ ...base, gateEnabled: false })).toEqual({ action: "allow" });
  });

  it("allows admins when gate is on", () => {
    expect(
      decideBasicsGate({
        gateEnabled: true,
        role: "admin",
        basicsCompleted: false,
        hasLegacyActivity: false,
      }),
    ).toEqual({ action: "allow" });
  });

  it("allows when basics already completed", () => {
    expect(
      decideBasicsGate({
        gateEnabled: true,
        role: "user",
        basicsCompleted: true,
        hasLegacyActivity: false,
      }),
    ).toEqual({ action: "allow" });
  });

  it("grandfathers users with legacy lessonProgress or attempts", () => {
    expect(
      decideBasicsGate({
        gateEnabled: true,
        role: "user",
        basicsCompleted: false,
        hasLegacyActivity: true,
      }),
    ).toEqual({ action: "grandfather" });
  });

  it("blocks incomplete users without legacy activity", () => {
    expect(decideBasicsGate({ ...base, gateEnabled: true })).toEqual({
      action: "block",
      message: BASICS_REQUIRED_MESSAGE,
    });
    expect(BASICS_REQUIRED_MESSAGE).toMatch(/Hangul Basics/i);
    expect(BASICS_REQUIRED_MESSAGE).toMatch(/basics-required/);
  });
});

describe("submitCheckpoint pure grading contract (no DB)", () => {
  it("passing score unlocks via isCheckpointPassing + scoreBasicsQuiz only", () => {
    const checkpoint = getBasicsModule("checkpoint")!;
    const questions = getModuleQuizQuestions(checkpoint);
    const answers: Record<string, number> = {};
    const matching: Record<string, Record<number, string>> = {};
    for (const q of questions) {
      if (q.kind === "matching") {
        matching[q.id] = Object.fromEntries(q.pairs.map((pair, i) => [i, pair.right]));
      } else if (q.answer != null) {
        answers[q.id] = q.answer;
      }
    }
    const graded = scoreBasicsQuiz(checkpoint, answers, matching);
    const passRatio = getBasicsManifest().passScore;
    expect(isCheckpointPassing(graded.score, graded.total, passRatio)).toBe(true);

    const failAnswers = { ...answers };
    let dropped = 0;
    for (const q of questions) {
      if (q.kind !== "matching" && q.answer != null && dropped < Math.ceil(questions.length * 0.4)) {
        failAnswers[q.id] = (q.answer + 1) % Math.max(q.options.length, 1);
        dropped += 1;
      }
    }
    const failed = scoreBasicsQuiz(checkpoint, failAnswers, matching);
    expect(isCheckpointPassing(failed.score, failed.total, passRatio)).toBe(false);
  });
});

describe("checkpoint anti-memorization draws", () => {
  it("prepareBasicsQuizDraw returns drawCount items from a large bank", () => {
    const checkpoint = getBasicsModule("checkpoint")!;
    const bank = getModuleQuizQuestions(checkpoint);
    expect(bank.length).toBeGreaterThanOrEqual(100);
    const draw = prepareBasicsQuizDraw(bank, 25);
    expect(draw).toHaveLength(25);
    const ids = new Set(draw.map(q => q.id));
    expect(ids.size).toBe(25);
  });

  it("two draws with different RNGs differ in order or membership (almost always)", () => {
    const checkpoint = getBasicsModule("checkpoint")!;
    const bank = getModuleQuizQuestions(checkpoint);
    let a = 0;
    const rngA = () => {
      a = (a * 1664525 + 1013904223) >>> 0;
      return a / 0x100000000;
    };
    let b = 1;
    const rngB = () => {
      b = (b * 1664525 + 1013904223) >>> 0;
      return b / 0x100000000;
    };
    const d1 = prepareBasicsQuizDraw(bank, 25, rngA).map(q => q.id).join(",");
    const d2 = prepareBasicsQuizDraw(bank, 25, rngB).map(q => q.id).join(",");
    expect(d1).not.toBe(d2);
  });

  it("shuffleQuestionPresentation remaps answer index to the same option text", () => {
    const checkpoint = getBasicsModule("checkpoint")!;
    const mc = getModuleQuizQuestions(checkpoint).find(q => q.kind === "multiple-choice")!;
    const correct = mc.options[mc.answer!];
    let seed = 7;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return seed / 0x100000000;
    };
    const shuffled = shuffleQuestionPresentation(mc, rng);
    expect(shuffled.options[shuffled.answer!]).toBe(correct);
    expect(new Set(shuffled.options)).toEqual(new Set(mc.options));
  });

  it("grades shuffled presentation via selectedOptions against the bank", () => {
    const checkpoint = getBasicsModule("checkpoint")!;
    const bank = getModuleQuizQuestions(checkpoint);
    const draw = prepareBasicsQuizDraw(bank, 25, () => 0.42);
    const selectedOptions: Record<string, string> = {};
    const matching: Record<string, Record<string, string>> = {};
    for (const q of draw) {
      if (q.kind === "matching") {
        matching[q.id] = Object.fromEntries(q.pairs.map(pair => [pair.left, pair.right]));
      } else if (q.answer != null) {
        // Use presented option text (what the learner clicked)
        selectedOptions[q.id] = q.options[q.answer]!;
      }
    }
    // Server grades with canonical bank + option text (not presentation indices)
    const graded = scoreBasicsQuiz(checkpoint, {}, matching, {
      questionIds: draw.map(q => q.id),
      selectedOptions,
    });
    expect(graded.total).toBe(25);
    expect(graded.score).toBe(25);

    // Presentation-local grade also perfect
    const local = scoreBasicsQuestions(draw, {}, matching, selectedOptions);
    expect(local.score).toBe(25);
  });
});
