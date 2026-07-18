import { z } from "zod";
import { composeHangul } from "./hangul";
import { localizedTextSchema } from "./lesson";

/** Stable module ids used as progress keys (order 0–7). */
export const BASICS_MODULE_IDS = [
  "welcome",
  "consonants",
  "vowels",
  "syllables",
  "batchim",
  "speak-lab",
  "write-lab",
  "checkpoint",
] as const;

export type BasicsModuleId = (typeof BASICS_MODULE_IDS)[number];

export const basicsModuleIdSchema = z.enum(BASICS_MODULE_IDS);

// ---------------------------------------------------------------------------
// Progress types (client localStorage + server JSON state)
// ---------------------------------------------------------------------------

export type BasicsModuleProgress = {
  moduleId: string;
  stepsDone: string[];
  speakItemsDone: string[];
  writeItemsDone: string[];
  builderItemsDone: string[];
  quizScore?: number;
  quizTotal?: number;
  lastStepId?: string;
  updatedAt: string;
  /** Denormalized cache only; always recompute via isModuleComplete. */
  completed?: boolean;
};

export type BasicsProgress = {
  version: 1;
  modules: Record<string, BasicsModuleProgress>;
  /** Set only after trusted unlock (server submitCheckpoint / legacy / admin). */
  checkpointPassedAt?: string;
  unlockSource?: "checkpoint" | "legacy-migration" | "admin" | "flag-off";
};

export const basicsModuleProgressSchema = z.object({
  moduleId: z.string().min(1),
  stepsDone: z.array(z.string()).default([]),
  speakItemsDone: z.array(z.string()).default([]),
  writeItemsDone: z.array(z.string()).default([]),
  builderItemsDone: z.array(z.string()).default([]),
  quizScore: z.number().int().min(0).optional(),
  quizTotal: z.number().int().min(0).optional(),
  lastStepId: z.string().optional(),
  updatedAt: z.string().min(1),
  completed: z.boolean().optional(),
});

export const basicsProgressSchema = z.object({
  version: z.literal(1),
  modules: z.record(z.string(), basicsModuleProgressSchema),
  checkpointPassedAt: z.string().optional(),
  unlockSource: z.enum(["checkpoint", "legacy-migration", "admin", "flag-off"]).optional(),
});

// ---------------------------------------------------------------------------
// Module requirements
// ---------------------------------------------------------------------------

export type ModuleRequirements = {
  requiredStepIds: string[];
  minSpeakItems: number;
  minWriteItems: number;
  minBuilderItems: number;
  passRatio: number;
};

export const moduleRequirementsSchema = z.object({
  requiredStepIds: z.array(z.string().min(1)),
  minSpeakItems: z.number().int().min(0).default(0),
  minWriteItems: z.number().int().min(0).default(0),
  minBuilderItems: z.number().int().min(0).default(0),
  passRatio: z.number().min(0).max(1).default(0.7),
});

/** Content-driven requirements from a parsed module (identity helper). */
export function moduleRequirements(module: { requirements: ModuleRequirements }): ModuleRequirements {
  return module.requirements;
}

// ---------------------------------------------------------------------------
// Quiz questions
// ---------------------------------------------------------------------------

export const basicsQuizQuestionSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["multiple-choice", "matching", "listen-choice"]),
    promptBn: z.string().min(1),
    promptKo: z.string().optional().default(""),
    promptEn: z.string().optional().default(""),
    listenText: z.string().optional(),
    options: z.array(z.string()).optional().default([]),
    pairs: z
      .array(z.object({ left: z.string().min(1), right: z.string().min(1) }))
      .optional()
      .default([]),
    answer: z.number().int().optional(),
    explanationBn: z.string().min(1),
    /** Optional authoring tag for checkpoint composition checks. */
    topic: z.enum(["jamo", "syllable", "batchim", "general"]).optional().default("general"),
  })
  .superRefine((q, ctx) => {
    if (q.kind === "matching") {
      if (q.pairs.length < 2) {
        ctx.addIssue({ code: "custom", message: "matching needs ≥2 pairs", path: ["pairs"] });
      }
      return;
    }
    if (q.options.length < 2) {
      ctx.addIssue({ code: "custom", message: "needs options", path: ["options"] });
    }
    if (q.answer == null || q.answer < 0 || q.answer >= q.options.length) {
      ctx.addIssue({ code: "custom", message: "answer index out of range", path: ["answer"] });
    }
    if (q.kind === "listen-choice" && !q.listenText) {
      ctx.addIssue({
        code: "custom",
        message: "listen-choice requires listenText",
        path: ["listenText"],
      });
    }
  });

export type BasicsQuizQuestion = z.infer<typeof basicsQuizQuestionSchema>;

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const jamoItemSchema = z.object({
  id: z.string().min(1),
  char: z.string().min(1),
  romanization: z.string().min(1),
  audioText: z.string().min(1),
  bn: z.string().min(1),
  en: z.string().min(1),
  ko: z.string().optional(),
});

const speakItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  romanization: z.string().min(1),
  audioText: z.string().min(1),
  bn: z.string().min(1),
  en: z.string().min(1),
});

const writeItemSchema = z.object({
  id: z.string().min(1),
  char: z.string().min(1),
  strokeId: z.string().min(1),
  minCoverage: z.number().min(0).max(1).optional(),
});

const builderPromptSchema = z
  .object({
    id: z.string().min(1),
    initial: z.string().min(1),
    vowel: z.string().min(1),
    final: z.string().optional().default(""),
    answer: z.string().min(1),
    bn: z.string().optional().default(""),
    en: z.string().optional().default(""),
  })
  .superRefine((prompt, ctx) => {
    try {
      const composed = composeHangul(prompt.initial, prompt.vowel, prompt.final ?? "");
      if (composed !== prompt.answer) {
        ctx.addIssue({
          code: "custom",
          message: `builder answer ${prompt.answer} !== compose(${prompt.initial}+${prompt.vowel}+${prompt.final ?? ""})=${composed}`,
          path: ["answer"],
        });
      }
    } catch (err) {
      ctx.addIssue({
        code: "custom",
        message: err instanceof Error ? err.message : "invalid jamo",
        path: ["initial"],
      });
    }
  });

const explainStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal("explain"),
  title: localizedTextSchema.optional(),
  body: z.object({
    bn: z.array(z.string().min(1)).min(1),
    en: z.array(z.string().min(1)).min(1).optional(),
    ko: z.array(z.string().min(1)).min(1).optional(),
  }),
});

const jamoGridStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal("jamo-grid"),
  items: z.array(jamoItemSchema).min(1),
});

const speakStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal("speak"),
  minListens: z.number().int().min(1).default(1),
  items: z.array(speakItemSchema).min(1),
  fallbackQuizIds: z.array(z.string()).optional().default([]),
});

const writeStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal("write"),
  items: z.array(writeItemSchema).min(1),
  skipAfterFailures: z.number().int().min(0).optional().default(2),
});

const builderStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal("builder"),
  prompts: z.array(builderPromptSchema).min(1),
});

const quizStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal("quiz"),
  questions: z.array(basicsQuizQuestionSchema).min(1),
});

export const basicsStepSchema = z.discriminatedUnion("type", [
  explainStepSchema,
  jamoGridStepSchema,
  speakStepSchema,
  writeStepSchema,
  builderStepSchema,
  quizStepSchema,
]);

export type BasicsStep = z.infer<typeof basicsStepSchema>;

// ---------------------------------------------------------------------------
// Module + manifest
// ---------------------------------------------------------------------------

const PRECOMPOSED_HANGUL = /[\uAC00-\uD7A3]/;

export function isSyllableRelatedQuestion(q: BasicsQuizQuestion): boolean {
  if (q.topic === "syllable") return true;
  if (q.kind === "matching") {
    return q.pairs.some(p => PRECOMPOSED_HANGUL.test(p.left) || PRECOMPOSED_HANGUL.test(p.right));
  }
  const hay = [q.promptBn, q.promptKo ?? "", q.promptEn ?? "", ...q.options].join(" ");
  return PRECOMPOSED_HANGUL.test(hay);
}

export function isBatchimRelatedQuestion(q: BasicsQuizQuestion): boolean {
  if (q.topic === "batchim") return true;
  const hay = `${q.promptBn} ${q.promptKo ?? ""} ${q.promptEn ?? ""} ${q.explanationBn}`.toLowerCase();
  return /받침|batchim|ব্যাচিম|ব্যাচ্চিম/.test(hay);
}

function trackUniqueIds(
  ids: Iterable<string>,
  seen: Set<string>,
  ctx: z.RefinementCtx,
  label: string,
): void {
  for (const id of ids) {
    if (seen.has(id)) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate ${label} id ${id}`,
        path: ["steps"],
      });
    }
    seen.add(id);
  }
}

function countStepItems(module: { steps: BasicsStep[] }): {
  speak: number;
  write: number;
  builder: number;
} {
  let speak = 0;
  let write = 0;
  let builder = 0;
  for (const step of module.steps) {
    if (step.type === "speak") speak += step.items.length;
    else if (step.type === "write") write += step.items.length;
    else if (step.type === "builder") builder += step.prompts.length;
  }
  return { speak, write, builder };
}

export const basicsModuleSchema = z
  .object({
    id: basicsModuleIdSchema,
    order: z.number().int().min(0).max(7),
    title: localizedTextSchema,
    description: localizedTextSchema.optional(),
    estimatedMinutes: z.number().int().min(1),
    requirements: moduleRequirementsSchema,
    steps: z.array(basicsStepSchema).min(1),
  })
  .superRefine((module, ctx) => {
    const stepIds = new Set<string>();
    for (const step of module.steps) {
      if (stepIds.has(step.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate step id ${step.id}`,
          path: ["steps"],
        });
      }
      stepIds.add(step.id);
    }

    for (const requiredId of module.requirements.requiredStepIds) {
      if (!stepIds.has(requiredId)) {
        ctx.addIssue({
          code: "custom",
          message: `requiredStepId ${requiredId} not found in steps`,
          path: ["requirements", "requiredStepIds"],
        });
      }
    }

    // Unique item ids per category (progress is keyed by these ids).
    const jamoIds = new Set<string>();
    const speakIds = new Set<string>();
    const writeIds = new Set<string>();
    const builderIds = new Set<string>();
    for (const step of module.steps) {
      if (step.type === "jamo-grid") {
        trackUniqueIds(
          step.items.map(i => i.id),
          jamoIds,
          ctx,
          "jamo-grid item",
        );
      } else if (step.type === "speak") {
        trackUniqueIds(
          step.items.map(i => i.id),
          speakIds,
          ctx,
          "speak item",
        );
      } else if (step.type === "write") {
        trackUniqueIds(
          step.items.map(i => i.id),
          writeIds,
          ctx,
          "write item",
        );
      } else if (step.type === "builder") {
        trackUniqueIds(
          step.prompts.map(p => p.id),
          builderIds,
          ctx,
          "builder prompt",
        );
      }
    }

    // Requirements must be achievable from content.
    const available = countStepItems(module);
    if (module.requirements.minSpeakItems > available.speak) {
      ctx.addIssue({
        code: "custom",
        message: `minSpeakItems ${module.requirements.minSpeakItems} > available speak items ${available.speak}`,
        path: ["requirements", "minSpeakItems"],
      });
    }
    if (module.requirements.minWriteItems > available.write) {
      ctx.addIssue({
        code: "custom",
        message: `minWriteItems ${module.requirements.minWriteItems} > available write items ${available.write}`,
        path: ["requirements", "minWriteItems"],
      });
    }
    if (module.requirements.minBuilderItems > available.builder) {
      ctx.addIssue({
        code: "custom",
        message: `minBuilderItems ${module.requirements.minBuilderItems} > available builder prompts ${available.builder}`,
        path: ["requirements", "minBuilderItems"],
      });
    }

    const quizSteps = module.steps.filter(s => s.type === "quiz");
    const allQuestions = quizSteps.flatMap(s => s.questions);
    const questionIds = new Set<string>();
    for (const q of allQuestions) {
      if (questionIds.has(q.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate quiz question id ${q.id}`,
          path: ["steps"],
        });
      }
      questionIds.add(q.id);
    }

    if (module.id === "checkpoint") {
      if (allQuestions.length < 12 || allQuestions.length > 16) {
        ctx.addIssue({
          code: "custom",
          message: `checkpoint needs 12–16 questions, got ${allQuestions.length}`,
          path: ["steps"],
        });
      }
      const listen = allQuestions.filter(q => q.kind === "listen-choice").length;
      const matching = allQuestions.filter(q => q.kind === "matching").length;
      const syllable = allQuestions.filter(isSyllableRelatedQuestion).length;
      const batchim = allQuestions.filter(isBatchimRelatedQuestion).length;
      if (listen < 3) {
        ctx.addIssue({
          code: "custom",
          message: `checkpoint needs ≥3 listen-choice, got ${listen}`,
          path: ["steps"],
        });
      }
      if (matching < 2) {
        ctx.addIssue({
          code: "custom",
          message: `checkpoint needs ≥2 matching, got ${matching}`,
          path: ["steps"],
        });
      }
      if (syllable < 3) {
        ctx.addIssue({
          code: "custom",
          message: `checkpoint needs ≥3 syllable-related questions, got ${syllable}`,
          path: ["steps"],
        });
      }
      if (batchim < 2) {
        ctx.addIssue({
          code: "custom",
          message: `checkpoint needs ≥2 batchim questions, got ${batchim}`,
          path: ["steps"],
        });
      }
    } else if (quizSteps.length > 0) {
      for (const step of quizSteps) {
        if (step.questions.length < 3) {
          ctx.addIssue({
            code: "custom",
            message: `non-checkpoint quiz step ${step.id} needs ≥3 questions`,
            path: ["steps"],
          });
        }
      }
    }

    const expectedOrder = BASICS_MODULE_IDS.indexOf(module.id);
    if (expectedOrder >= 0 && module.order !== expectedOrder) {
      ctx.addIssue({
        code: "custom",
        message: `module ${module.id} should have order ${expectedOrder}`,
        path: ["order"],
      });
    }
  });

export type BasicsModule = z.infer<typeof basicsModuleSchema>;

export type BasicsModuleSummary = {
  id: BasicsModuleId;
  order: number;
  title: z.infer<typeof localizedTextSchema>;
  estimatedMinutes: number;
  stepCount: number;
  hasQuiz: boolean;
};

export const basicsManifestModuleSchema = z.object({
  id: basicsModuleIdSchema,
  order: z.number().int().min(0).max(7),
  title: localizedTextSchema,
  estimatedMinutes: z.number().int().min(1),
});

export const basicsManifestSchema = z
  .object({
    version: z.literal(1),
    passScore: z.number().min(0).max(1).default(0.7),
    modules: z.array(basicsManifestModuleSchema).length(8),
  })
  .superRefine((manifest, ctx) => {
    const ids = manifest.modules.map(m => m.id);
    for (const id of BASICS_MODULE_IDS) {
      if (!ids.includes(id)) {
        ctx.addIssue({
          code: "custom",
          message: `manifest missing module ${id}`,
          path: ["modules"],
        });
      }
    }
    const seen = new Set<string>();
    for (const m of manifest.modules) {
      if (seen.has(m.id)) {
        ctx.addIssue({
          code: "custom",
          message: `duplicate manifest module ${m.id}`,
          path: ["modules"],
        });
      }
      seen.add(m.id);
    }
  });

export type BasicsManifest = z.infer<typeof basicsManifestSchema>;

/** Stroke JSON for write practice (precomputed samples; d is SVG underlay only). */
export const strokeFileSchema = z.object({
  id: z.string().min(1),
  char: z.string().min(1),
  viewBox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  strokes: z
    .array(
      z.object({
        order: z.number().int().min(1),
        d: z.string().min(1),
        samples: z.array(z.object({ x: z.number(), y: z.number() })).min(1),
      }),
    )
    .min(1),
});

export type StrokeFile = z.infer<typeof strokeFileSchema>;

// ---------------------------------------------------------------------------
// Pure progress / scoring helpers
// ---------------------------------------------------------------------------

/** Distinct non-empty ids (progress arrays may accidentally double-push). */
export function uniqueIdCount(ids: readonly string[]): number {
  return new Set(ids).size;
}

/**
 * Quiz score/total ratio. Clamps score to total so score > total cannot exceed 1.
 * Returns null when total/score are missing or total ≤ 0.
 */
export function quizRatio(p: BasicsModuleProgress): number | null {
  if (p.quizTotal == null || p.quizTotal <= 0 || p.quizScore == null) return null;
  const score = Math.min(p.quizScore, p.quizTotal);
  return score / p.quizTotal;
}

/**
 * Teaching-module completion from client-reported progress.
 *
 * **Not for curriculum unlock.** Checkpoint / gate unlock uses
 * `isBasicsComplete` (`checkpointPassedAt` only) after trusted grading.
 * This function always returns `false` for `module.id === "checkpoint"`.
 *
 * Speak/write/builder minima use **unique** item ids (Set size), not raw
 * array length, so duplicate done-ids cannot satisfy minima.
 */
export function isModuleComplete(
  module: BasicsModule,
  progress: BasicsModuleProgress | undefined,
): boolean {
  if (!progress) return false;
  // Capstone unlock is server/local trusted only — never via teaching completion.
  if (module.id === "checkpoint") return false;

  const req = module.requirements;
  const stepsOk = req.requiredStepIds.every(id => progress.stepsDone.includes(id));
  const speakOk = uniqueIdCount(progress.speakItemsDone) >= req.minSpeakItems;
  const writeOk = uniqueIdCount(progress.writeItemsDone) >= req.minWriteItems;
  const builderOk = uniqueIdCount(progress.builderItemsDone) >= req.minBuilderItems;
  const hasQuiz = module.steps.some(s => s.type === "quiz");
  const ratio = quizRatio(progress);
  const quizOk = !hasQuiz || (ratio != null && ratio >= req.passRatio);
  return stepsOk && speakOk && writeOk && builderOk && quizOk;
}

/**
 * Curriculum unlock — only after trusted checkpoint pass / grandfather / admin / flag-off.
 * NEVER use `isModuleComplete(checkpoint, …)` or raw score without total.
 */
export function isBasicsComplete(progress: BasicsProgress): boolean {
  return Boolean(progress.checkpointPassedAt);
}

/** Pass when total > 0 and clamped score/total ≥ passRatio (default 0.7). */
export function isCheckpointPassing(score: number, total: number, passRatio = 0.7): boolean {
  if (total <= 0) return false;
  const clamped = Math.min(score, total);
  return clamped / total >= passRatio;
}

export function getModuleQuizQuestions(module: BasicsModule): BasicsQuizQuestion[] {
  return module.steps.filter(s => s.type === "quiz").flatMap(s => s.questions);
}

function matchingSelection(
  selections: Record<string, string> | Record<number, string> | undefined,
  index: number,
): string | undefined {
  if (!selections) return undefined;
  const asRecord = selections as Record<string | number, string>;
  return asRecord[index] ?? asRecord[String(index)];
}

function isBasicsMatchingCorrect(
  question: BasicsQuizQuestion,
  selections: Record<string, string> | Record<number, string> | undefined,
): boolean {
  if (question.kind !== "matching") return false;
  if (!selections) return false;
  return question.pairs.every((pair, index) => matchingSelection(selections, index) === pair.right);
}

/**
 * Grade all quiz questions on a module.
 * matching: all pairs correct → 1 point; MC/listen-choice: answer index match → 1 point.
 */
export function scoreBasicsQuiz(
  module: BasicsModule,
  answers: Record<string, number>,
  matching: Record<string, Record<string, string> | Record<number, string>> = {},
): { score: number; total: number; correctIds: string[] } {
  const questions = getModuleQuizQuestions(module);
  const correctIds: string[] = [];
  for (const question of questions) {
    const ok =
      question.kind === "matching"
        ? isBasicsMatchingCorrect(question, matching[question.id])
        : answers[question.id] === question.answer;
    if (ok) correctIds.push(question.id);
  }
  return { score: correctIds.length, total: questions.length, correctIds };
}
