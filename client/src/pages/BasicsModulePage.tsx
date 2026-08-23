import { StrokePractice } from "@/components/basics/StrokePractice";
import { SyllableBuilder } from "@/components/basics/SyllableBuilder";
import { pushCelebration } from "@/components/CelebrationBanner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocale } from "@/contexts/LocaleContext";
import { useBasicsGate } from "@/hooks/useBasicsGate";
import {
  applyLocalBasicsModulePatch,
  setLocalBasicsCheckpointPass,
  useLocalBasics,
} from "@/lib/localProgress";
import { playAudioOrTts } from "@/lib/audioPlayback";
import { KOREAN_SPEECH_RATES, speakKorean, type KoreanSpeechRate } from "@/lib/speakKorean";
import { trpc } from "@/lib/trpc";
import type { AudioClipRef } from "@shared/audio";
import {
  BASICS_MODULE_IDS,
  emptyModuleProgress,
  isCheckpointPassing,
  isModuleComplete,
  prepareBasicsQuizDraw,
  scoreBasicsQuestions,
  uniqStrings,
  type BasicsModule,
  type BasicsModuleId,
  type BasicsModuleProgress,
  type BasicsQuizQuestion,
  type BasicsStep,
} from "@shared/basics";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Loader2,
  RotateCcw,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

const MODULE_BN: Record<BasicsModuleId, string> = {
  welcome: "হ্যাঙ্গুল পরিচিতি",
  consonants: "মৌলিক ব্যঞ্জনবর্ণ",
  vowels: "মৌলিক স্বরবর্ণ",
  syllables: "অক্ষর গঠন",
  batchim: "ব্যাচিম পরিচিতি",
  "speak-lab": "উচ্চারণ অনুশীলন",
  "write-lab": "লেখা অনুশীলন",
  checkpoint: "বেসিক পরীক্ষা",
};

function nextModuleAfter(id: BasicsModuleId): BasicsModuleId | null {
  const idx = BASICS_MODULE_IDS.indexOf(id);
  if (idx < 0 || idx >= BASICS_MODULE_IDS.length - 1) return null;
  return BASICS_MODULE_IDS[idx + 1]!;
}

function isValidModuleId(id: string): id is BasicsModuleId {
  return (BASICS_MODULE_IDS as readonly string[]).includes(id);
}

export default function BasicsModulePage() {
  const [, params] = useRoute("/basics/:moduleId");
  const moduleIdRaw = params?.moduleId ?? "welcome";
  const moduleId = isValidModuleId(moduleIdRaw) ? moduleIdRaw : null;

  const { locale, t } = useLocale();
  const { isAuthenticated } = useAuth();
  const gate = useBasicsGate();
  const localBasics = useLocalBasics();

  const moduleQuery = trpc.basics.getModule.useQuery(
    { id: moduleId! },
    { enabled: Boolean(moduleId), retry: false },
  );
  const saveRemote = trpc.basics.saveProgress.useMutation();
  const submitCheckpoint = trpc.basics.submitCheckpoint.useMutation();
  const utils = trpc.useUtils();

  const module = moduleQuery.data;
  const [stepIndex, setStepIndex] = useState(0);
  const [listenCounts, setListenCounts] = useState<Record<string, number>>({});
  const [basicRate, setBasicRate] = useState<KoreanSpeechRate>(KOREAN_SPEECH_RATES.slow);
  const celebratedRef = useRef<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStepIndex(0);
    setListenCounts({});
    celebratedRef.current = null;
  }, [moduleId]);

  const progress: BasicsModuleProgress = useMemo(() => {
    if (!moduleId) return emptyModuleProgress("welcome");
    return localBasics.modules[moduleId] ?? emptyModuleProgress(moduleId);
  }, [localBasics, moduleId]);

  // Celebrate teaching-module completion once per session (non-checkpoint).
  useEffect(() => {
    if (!module || !moduleId || moduleId === "checkpoint") return;
    if (!isModuleComplete(module, progress)) return;
    const key = `easyeps-celeb-mod-${moduleId}`;
    if (celebratedRef.current === moduleId) return;
    try {
      if (sessionStorage.getItem(key) === "1") {
        celebratedRef.current = moduleId;
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      // ignore
    }
    celebratedRef.current = moduleId;
    const next = nextModuleAfter(moduleId);
    if (!next) return;
    pushCelebration({
      title: "মডিউল সম্পন্ন!",
      body: `${MODULE_BN[moduleId]} শেষ হয়েছে। পরের ধাপে এগোন।`,
      href: `/basics/${next}`,
      cta: `পরবর্তী: ${MODULE_BN[next]}`,
    });
  }, [module, moduleId, progress]);

  const persist = (
    patch: Partial<
      Pick<
        BasicsModuleProgress,
        | "stepsDone"
        | "speakItemsDone"
        | "writeItemsDone"
        | "builderItemsDone"
        | "readItemsDone"
        | "quizScore"
        | "quizTotal"
        | "lastStepId"
      >
    >,
    minutes = 3,
  ) => {
    if (!moduleId || !module) return;
    const nextPatch = {
      moduleId,
      stepsDone: patch.stepsDone ?? progress.stepsDone,
      speakItemsDone: patch.speakItemsDone ?? progress.speakItemsDone,
      writeItemsDone: patch.writeItemsDone ?? progress.writeItemsDone,
      builderItemsDone: patch.builderItemsDone ?? progress.builderItemsDone,
      readItemsDone: patch.readItemsDone ?? progress.readItemsDone ?? [],
      quizScore: patch.quizScore ?? progress.quizScore,
      quizTotal: patch.quizTotal ?? progress.quizTotal,
      lastStepId: patch.lastStepId ?? progress.lastStepId,
    };
    applyLocalBasicsModulePatch(nextPatch, module, minutes);
    if (isAuthenticated) {
      saveRemote.mutate({ ...nextPatch, minutes });
    }
  };

  const markStepDone = (stepId: string) => {
    const stepsDone = uniqStrings([...progress.stepsDone, stepId]);
    persist({ stepsDone, lastStepId: stepId });
  };

  if (!moduleId) {
    return (
      <div className="container py-28 text-center">
        <h1 className="font-serif text-3xl font-bold text-[var(--navy)]">Module not found</h1>
        <Link href="/basics" className="mt-5 inline-flex font-bold text-[var(--gold-dark)]">
          Back to Basics
        </Link>
      </div>
    );
  }

  if (moduleQuery.isLoading) {
    return (
      <div className="container py-32 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-[var(--gold-dark)]" />
        <p className="mt-4 font-semibold text-[var(--navy)]/55">{t.loading}</p>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="container py-28 text-center">
        <h1 className="font-serif text-3xl font-bold text-[var(--navy)]">Module not found</h1>
        <Link href="/basics" className="mt-5 inline-flex font-bold text-[var(--gold-dark)]">
          Back to Basics
        </Link>
      </div>
    );
  }

  const title = module.title[locale];
  const steps = module.steps;
  const step = steps[stepIndex];
  const complete = isModuleComplete(module, progress) || (module.id === "checkpoint" && Boolean(localBasics.checkpointPassedAt));

  return (
    <>
      <section className="bg-[var(--navy)] text-white">
        <div className="sacred-grid-dark">
          <div className="container py-10 md:py-12">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/basics"
                className="inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-[var(--gold)]"
              >
                <ArrowLeft className="size-4" /> Basics
              </Link>
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-[var(--gold)]">
                {complete ? "সম্পন্ন" : `MODULE ${String(module.order + 1).padStart(2, "0")}`}
              </span>
            </div>
            <div className="mt-8 max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--gold)]">
                ~{module.estimatedMinutes} min
              </p>
              <h1 className="mt-3 font-serif text-4xl font-bold leading-tight md:text-5xl">{title}</h1>
              {locale !== "ko" && (
                <p className="mt-2 text-xl font-semibold text-white/45">{module.title.ko}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-[7.25rem] z-30 overflow-x-auto border-b border-[var(--navy)]/10 bg-[var(--cream)]/95 backdrop-blur-xl">
        <div className="container flex min-w-max gap-1 py-2">
          {steps.map((s, i) => {
            const done = progress.stepsDone.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIndex(i)}
                className={`lesson-tab ${stepIndex === i ? "lesson-tab-active" : ""}`}
              >
                {done ? <Check className="size-3.5" /> : null}
                {stepLabel(s, locale)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="container py-8 md:py-12">
        {step && (
          <StepRenderer
            module={module}
            step={step}
            progress={progress}
            locale={locale}
            listenCounts={listenCounts}
            setListenCounts={setListenCounts}
            basicRate={basicRate}
            onRateChange={setBasicRate}
            markStepDone={markStepDone}
            persist={persist}
            isAuthenticated={isAuthenticated}
            submitCheckpoint={submitCheckpoint}
            onCheckpointResult={async result => {
              if (result.passed) {
                if (!isAuthenticated) {
                  setLocalBasicsCheckpointPass(result.score, result.total);
                }
                toast.success(
                  locale === "en"
                    ? `Passed! ${result.score}/${result.total}`
                    : `পাস! ${result.score}/${result.total}`,
                );
                pushCelebration({
                  title: "হ্যাঙ্গুল প্রস্তুত!",
                  body: "চেকপয়েন্ট পাস—এখন ৬০ অধ্যায়ের পাঠ্যক্রমে শব্দ শিখুন।",
                  href: "/curriculum",
                  cta: "পাঠ্যক্রম খুলুন",
                });
                void utils.basics.gateStatus.invalidate();
                void utils.basics.get.invalidate();
                gate.refresh();
              } else {
                toast.error(
                  locale === "en"
                    ? `Score ${result.score}/${result.total} — try again`
                    : `স্কোর ${result.score}/${result.total} — আবার চেষ্টা করুন`,
                );
              }
            }}
          />
        )}

        <div className="mt-8 flex items-center justify-between border-t border-[var(--navy)]/10 pt-6">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex(i => Math.max(0, i - 1))}
          >
            <ChevronLeft className="size-4" /> Prev
          </Button>
          <p className="text-sm font-semibold text-[var(--navy)]/50">
            {stepIndex + 1} / {steps.length}
          </p>
          <Button
            type="button"
            className="rounded-full bg-[var(--navy)] text-white"
            disabled={stepIndex >= steps.length - 1}
            onClick={() => {
              if (step) markStepDone(step.id);
              setStepIndex(i => Math.min(steps.length - 1, i + 1));
            }}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

function BasicsRateToggle({ rate, onChange }: { rate: KoreanSpeechRate; onChange: (rate: KoreanSpeechRate) => void }) {
  return <span className="inline-flex overflow-hidden rounded-full border border-[var(--navy)]/12 bg-white p-0.5 text-xs font-bold">
    <button type="button" onClick={() => onChange(KOREAN_SPEECH_RATES.slow)} aria-pressed={rate === KOREAN_SPEECH_RATES.slow} className={`rounded-full px-2.5 py-1.5 ${rate === KOREAN_SPEECH_RATES.slow ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]/55"}`}>ধীর 0.6×</button>
    <button type="button" onClick={() => onChange(KOREAN_SPEECH_RATES.normal)} aria-pressed={rate === KOREAN_SPEECH_RATES.normal} className={`rounded-full px-2.5 py-1.5 ${rate === KOREAN_SPEECH_RATES.normal ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]/55"}`}>সাধারণ 1×</button>
  </span>;
}

function stepLabel(step: BasicsStep, locale: "bn" | "ko" | "en"): string {
  const map: Record<BasicsStep["type"], { bn: string; ko: string; en: string }> = {
    explain: { bn: "ব্যাখ্যা", ko: "설명", en: "Explain" },
    "jamo-grid": { bn: "জামো", ko: "자모", en: "Jamo" },
    speak: { bn: "বলুন", ko: "말하기", en: "Speak" },
    write: { bn: "লিখুন", ko: "쓰기", en: "Write" },
    builder: { bn: "গঠন", ko: "조합", en: "Builder" },
    read: { bn: "পড়ুন", ko: "읽기", en: "Read" },
    quiz: { bn: "কুইজ", ko: "퀴즈", en: "Quiz" },
  };
  return map[step.type][locale];
}

function StepRenderer({
  module,
  step,
  progress,
  locale,
  listenCounts,
  setListenCounts,
  markStepDone,
  persist,
  isAuthenticated,
  submitCheckpoint,
  onCheckpointResult,
  basicRate,
  onRateChange,
}: {
  module: BasicsModule;
  step: BasicsStep;
  progress: BasicsModuleProgress;
  locale: "bn" | "ko" | "en";
  listenCounts: Record<string, number>;
  setListenCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  markStepDone: (id: string) => void;
  persist: (
    patch: Partial<
      Pick<
        BasicsModuleProgress,
        | "stepsDone"
        | "speakItemsDone"
        | "writeItemsDone"
        | "builderItemsDone"
        | "readItemsDone"
        | "quizScore"
        | "quizTotal"
        | "lastStepId"
      >
    >,
    minutes?: number,
  ) => void;
  isAuthenticated: boolean;
  submitCheckpoint: ReturnType<typeof trpc.basics.submitCheckpoint.useMutation>;
  onCheckpointResult: (result: {
    score: number;
    total: number;
    passed: boolean;
  }) => void | Promise<void>;
  basicRate: KoreanSpeechRate;
  onRateChange: (rate: KoreanSpeechRate) => void;
}) {

  if (step.type === "explain") {
    const body = step.body[locale] ?? step.body.bn;
    const title = step.title?.[locale] ?? step.title?.bn;
    return (
      <section className="paper-card p-6 md:p-8">
        <p className="eyebrow">Explain</p>
        <h2 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">
          {title || module.title[locale]}
        </h2>
        <div className="mt-7 space-y-4">
          {body.map((para, i) => (
            <p key={i} className="leading-8 text-[var(--navy)]/75">
              {para}
            </p>
          ))}
        </div>
        <Button
          type="button"
          className={`mt-8 rounded-full px-6 ${
            progress.stepsDone.includes(step.id)
              ? "bg-[var(--sage)] text-white"
              : "bg-[var(--navy)] text-white"
          }`}
          onClick={() => markStepDone(step.id)}
        >
          {progress.stepsDone.includes(step.id) ? (
            <>
              <Check className="size-4" /> Done
            </>
          ) : (
            "Mark complete"
          )}
        </Button>
      </section>
    );
  }

  if (step.type === "jamo-grid") {
    return (
      <section className="paper-card p-6 md:p-8">
        <p className="eyebrow">Jamo chart</p>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">
          {locale === "en" ? "Letters" : locale === "ko" ? "자모" : "অক্ষর"}
        </h2><p className="mt-2 text-sm font-semibold text-[var(--navy)]/50">AI pronunciation reference · ধীরে শুনে অক্ষর বলুন</p></div><BasicsRateToggle rate={basicRate} onChange={onRateChange} /></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {step.items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-2xl border border-[var(--navy)]/8 bg-white p-4"
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-[var(--cream)] font-serif text-3xl font-bold text-[var(--navy)]">
                {item.char}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[var(--navy)]">{item.romanization}</p>
                <p className="text-sm text-[var(--navy)]/55">
                  {locale === "en" ? item.en : item.bn}
                </p>
                {"shapeMnemonicBn" in item && item.shapeMnemonicBn && locale !== "en" ? (
                  <p className="mt-1 text-xs leading-5 text-[var(--gold-dark)]">
                    💡 {item.shapeMnemonicBn}
                  </p>
                ) : null}
                {"shapeMnemonicBn" in item && item.shapeMnemonicBn && locale === "en" ? (
                  <p className="mt-1 text-xs leading-5 text-[var(--gold-dark)]">
                    💡 {item.shapeMnemonicBn}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void playAudioOrTts({ text: item.char, audio: item.audio, options: { rate: basicRate } })}
                className="grid size-10 place-items-center rounded-full bg-[var(--gold)]/14 text-[var(--gold-dark)]"
                aria-label="Play"
              >
                <Volume2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          className={`mt-8 rounded-full px-6 ${
            progress.stepsDone.includes(step.id)
              ? "bg-[var(--sage)] text-white"
              : "bg-[var(--navy)] text-white"
          }`}
          onClick={() => markStepDone(step.id)}
        >
          Mark complete
        </Button>
      </section>
    );
  }

  if (step.type === "speak") {
    const minListens = step.minListens ?? 1;
    return (
      <section className="paper-card p-6 md:p-8">
        <p className="eyebrow">Speak lab</p>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">
          {locale === "en" ? "Listen & repeat" : "শুনুন ও বলুন"}
        </h2><p className="mt-2 text-sm font-semibold text-[var(--navy)]/50">AI pronunciation reference · আগে ধীরে শুনুন, তারপর বলুন</p></div><BasicsRateToggle rate={basicRate} onChange={onRateChange} /></div>
        <p className="mt-3 rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold leading-6 text-[var(--navy)]/80">
          জোরে বলুন · অন্তত {minListens} বার শুনুন
        </p>
        <div className="mt-7 space-y-3">
          {step.items.map(item => {
            const count = listenCounts[item.id] ?? 0;
            const done = progress.speakItemsDone.includes(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 rounded-2xl border p-4 sm:p-5 ${
                  done ? "border-[var(--sage)]/30 bg-[var(--sage)]/10" : "border-[var(--navy)]/8 bg-white"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-3xl font-bold text-[var(--navy)] sm:text-4xl">{item.text}</p>
                  <p className="mt-1 text-sm text-[var(--navy)]/50">
                    {item.romanization} · {locale === "en" ? item.en : item.bn}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--navy)]/40">
                    শোনা হয়েছে {count}/{minListens}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void playAudioOrTts({ text: item.text, audio: item.audio, options: { rate: basicRate } });
                    setListenCounts(prev => {
                      const nextCount = (prev[item.id] ?? 0) + 1;
                      const next = { ...prev, [item.id]: nextCount };
                      if (nextCount >= minListens && !progress.speakItemsDone.includes(item.id)) {
                        const speakItemsDone = uniqStrings([...progress.speakItemsDone, item.id]);
                        persist({ speakItemsDone, lastStepId: step.id });
                      }
                      return next;
                    });
                  }}
                  className="grid size-16 shrink-0 place-items-center rounded-full bg-[var(--navy)] text-[var(--gold)] shadow-md transition hover:scale-105 sm:size-[4.5rem]"
                  aria-label="Play Korean audio"
                >
                  <Volume2 className="size-7 sm:size-8" />
                </button>
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          className="mt-8 rounded-full bg-[var(--navy)] px-6 text-white"
          onClick={() => markStepDone(step.id)}
        >
          Mark step done
        </Button>
      </section>
    );
  }

  if (step.type === "write") {
    const skipAfter = step.skipAfterFailures ?? 2;
    return (
      <section className="paper-card p-6 md:p-8">
        <p className="eyebrow">Write lab</p>
        <h2 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">
          {locale === "en" ? "Stroke practice" : "স্ট্রোক অনুশীলন"}
        </h2>
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          {step.items.map(item => (
            <StrokePractice
              key={item.id}
              strokeId={item.strokeId}
              char={item.char}
              minCoverage={item.minCoverage ?? 0.55}
              skipAfterFailures={skipAfter}
              done={progress.writeItemsDone.includes(item.id)}
              onComplete={() => {
                if (progress.writeItemsDone.includes(item.id)) return;
                const writeItemsDone = uniqStrings([...progress.writeItemsDone, item.id]);
                persist({ writeItemsDone, lastStepId: step.id });
              }}
            />
          ))}
        </div>
        <Button
          type="button"
          className="mt-8 rounded-full bg-[var(--navy)] px-6 text-white"
          onClick={() => markStepDone(step.id)}
        >
          Mark step done
        </Button>
      </section>
    );
  }

  if (step.type === "builder") {
    return (
      <section className="paper-card p-6 md:p-8">
        <SyllableBuilder
          prompts={step.prompts}
          doneIds={progress.builderItemsDone}
          onPromptCorrect={id => {
            const builderItemsDone = uniqStrings([...progress.builderItemsDone, id]);
            persist({ builderItemsDone, lastStepId: step.id });
          }}
        />
        <Button
          type="button"
          className="mt-8 rounded-full bg-[var(--navy)] px-6 text-white"
          onClick={() => markStepDone(step.id)}
        >
          Mark step done
        </Button>
      </section>
    );
  }

  if (step.type === "read") {
    return (
      <ReadWordPractice
        stepId={step.id}
        items={step.items}
        locale={locale}
        doneIds={progress.readItemsDone ?? []}
        onItemCorrect={id => {
          const readItemsDone = uniqStrings([...(progress.readItemsDone ?? []), id]);
          persist({ readItemsDone, lastStepId: step.id });
        }}
                onMarkStep={() => markStepDone(step.id)}
        basicRate={basicRate}
        onRateChange={onRateChange}
      />
    );
  }
  if (step.type === "quiz") {

    const drawCount =
      step.drawCount ?? (module.id === "checkpoint" ? 25 : undefined);
    return (
      <BasicsQuizRunner
        module={module}
        stepId={step.id}
        bank={step.questions}
        drawCount={drawCount}
        progress={progress}
        locale={locale}
        isCheckpoint={module.id === "checkpoint"}
        isAuthenticated={isAuthenticated}
        submitCheckpoint={submitCheckpoint}
        basicRate={basicRate}
        onLocalScored={(score, total) => {
          persist(
            {
              quizScore: score,
              quizTotal: total,
              stepsDone: uniqStrings([...progress.stepsDone, step.id]),
              lastStepId: step.id,
            },
            5,
          );
        }}
        onCheckpointResult={onCheckpointResult}
      />
    );
  }

  return null;
}

function BasicsQuizRunner({
  module,
  stepId,
  bank,
  drawCount,
  progress,
  locale,
  isCheckpoint,
  isAuthenticated,
  submitCheckpoint,
  onLocalScored,
  onCheckpointResult,
  basicRate,
}: {
  module: BasicsModule;
  stepId: string;
  bank: BasicsQuizQuestion[];
  drawCount?: number;
  progress: BasicsModuleProgress;
  locale: "bn" | "ko" | "en";
  isCheckpoint: boolean;
  isAuthenticated: boolean;
  submitCheckpoint: ReturnType<typeof trpc.basics.submitCheckpoint.useMutation>;
  onLocalScored: (score: number, total: number) => void;
  onCheckpointResult: (result: {
    score: number;
    total: number;
    passed: boolean;
  }) => void | Promise<void>;
  basicRate: KoreanSpeechRate;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [matching, setMatching] = useState<Record<string, Record<string, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [quizStarted, setQuizStarted] = useState(!isCheckpoint);
  const [result, setResult] = useState<{ score: number; total: number; correctIds: string[] } | null>(
    null,
  );
  const [startedAt, setStartedAt] = useState(Date.now());
  // Empty until start/retry draws a fresh paper (new items + shuffled options).
  const [questions, setQuestions] = useState<BasicsQuizQuestion[]>([]);

  const passRatio = module.requirements.passRatio ?? 0.7;
  const passPercent = Math.round(passRatio * 100);
  const displayCount = drawCount ?? bank.length;

  const drawFreshPaper = () => {
    const next = prepareBasicsQuizDraw(bank, drawCount);
    setQuestions(next);
    setAnswers({});
    setMatching({});
    setSubmitted(false);
    setResult(null);
    setStartedAt(Date.now());
    return next;
  };

  // Non-checkpoint quizzes auto-start with a shuffled draw on first paint.
  useEffect(() => {
    if (!isCheckpoint && questions.length === 0 && bank.length > 0) {
      drawFreshPaper();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only seed once per bank/step
  }, [isCheckpoint, bank, drawCount, stepId]);

  if (isCheckpoint && !quizStarted) {
    return (
      <section className="paper-card p-6 md:p-10">
        <p className="eyebrow">Checkpoint</p>
        <h2 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">
          {locale === "en" ? "Basics Check" : "বেসিক পরীক্ষা"}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--navy)]/70">
          {locale === "en"
            ? `Each attempt draws ${displayCount} fresh questions from a ${bank.length}+ bank and shuffles answer positions. You need about ${passPercent}% to unlock the 60-chapter path.`
            : `প্রতিবার ${bank.length}+ ব্যাংক থেকে ${displayCount}টি নতুন প্রশ্ন ও এলোমেলো অপশন অর্ডার আসবে। ৬০ অধ্যায় খুলতে প্রায় ${passPercent}% স্কোর লাগবে।`}
        </p>
        <ul className="mt-6 space-y-2 text-sm font-semibold text-[var(--navy)]/75">
          <li className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-dark)]">
              1
            </span>
            প্রশ্ন: {displayCount} (ব্যাংক {bank.length}+ · প্রতিবার নতুন)
          </li>
          <li className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-dark)]">
              2
            </span>
            অপশন অর্ডার প্রতিবার শাফল হয় (পজিশন মুখস্থ কাজ করবে না)
          </li>
          <li className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-dark)]">
              3
            </span>
            পাস: {passPercent}% · ~{module.estimatedMinutes} মিনিট
          </li>
        </ul>
        {typeof progress.quizScore === "number" && (
          <p className="mt-4 text-sm text-[var(--sage-dark)]">
            সর্বশেষ: {progress.quizScore}/{progress.quizTotal}
          </p>
        )}
        <Button
          type="button"
          className="mt-8 rounded-full bg-[var(--navy)] px-8 text-white"
          onClick={() => {
            drawFreshPaper();
            setQuizStarted(true);
          }}
        >
          শুরু করুন
        </Button>
        <Link href="/basics" className="mt-4 block text-sm font-bold text-[var(--navy)]/50 underline">
          মডিউলে ফিরে যান
        </Link>
      </section>
    );
  }

  const buildSubmissionPayload = () => {
    const questionIds = questions.map(q => q.id);
    const selectedOptions: Record<string, string> = {};
    for (const q of questions) {
      if (q.kind === "matching") continue;
      const idx = answers[q.id];
      if (idx != null && q.options[idx] != null) {
        selectedOptions[q.id] = q.options[idx]!;
      }
    }
    // Matching: left → right (shuffle-safe for server grading against bank)
    const matchingByLeft: Record<string, Record<string, string>> = {};
    for (const q of questions) {
      if (q.kind !== "matching") continue;
      const sel = matching[q.id] ?? {};
      const map: Record<string, string> = {};
      q.pairs.forEach((pair, index) => {
        const value = sel[String(index)] ?? sel[pair.left];
        if (value) map[pair.left] = value;
      });
      matchingByLeft[q.id] = map;
    }
    return { questionIds, selectedOptions, matchingByLeft };
  };

  const submit = async () => {
    const { questionIds, selectedOptions, matchingByLeft } = buildSubmissionPayload();
    if (isCheckpoint && isAuthenticated) {
      try {
        const remote = await submitCheckpoint.mutateAsync({
          answers,
          selectedOptions,
          matching: matchingByLeft,
          questionIds,
          durationSec: Math.round((Date.now() - startedAt) / 1000),
        });
        setResult({
          score: remote.score,
          total: remote.total,
          correctIds: remote.correctIds,
        });
        setSubmitted(true);
        onLocalScored(remote.score, remote.total);
        await onCheckpointResult({
          score: remote.score,
          total: remote.total,
          passed: remote.passed,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Submit failed");
      }
      return;
    }

    // Local grade against the *presented* paper (options already remapped).
    const local = scoreBasicsQuestions(questions, answers, matching, selectedOptions);
    setResult(local);
    setSubmitted(true);
    onLocalScored(local.score, local.total);

    if (isCheckpoint) {
      const passed = isCheckpointPassing(local.score, local.total, module.requirements.passRatio);
      await onCheckpointResult({ score: local.score, total: local.total, passed });
    }
  };

  const reset = () => {
    // Checkpoint: return to start screen so every retry is an explicit new paper.
    if (isCheckpoint) {
      setQuizStarted(false);
      setQuestions([]);
      setAnswers({});
      setMatching({});
      setSubmitted(false);
      setResult(null);
      return;
    }
    drawFreshPaper();
  };

  return (
    <section className="paper-card overflow-hidden">
      <div className="border-b border-[var(--navy)]/8 p-6">
        <p className="eyebrow">{isCheckpoint ? "Checkpoint" : "Quiz"}</p>
        <h2 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">
          {isCheckpoint
            ? locale === "en"
              ? "Basics Check"
              : "বেসিক পরীক্ষা"
            : locale === "en"
              ? "Check yourself"
              : "নিজেকে যাচাই করুন"}
        </h2>
        {typeof progress.quizScore === "number" && !submitted && (
          <p className="mt-2 text-sm text-[var(--sage-dark)]">
            Last: {progress.quizScore}/{progress.quizTotal}
          </p>
        )}
      </div>
      <div className="divide-y divide-[var(--navy)]/8">
        {questions.map((q, qi) => {
          const prompt =
            locale === "en" ? q.promptEn || q.promptBn : locale === "ko" ? q.promptKo || q.promptBn : q.promptBn;
          const chosen = answers[q.id];
          const isMatching = q.kind === "matching";
          const correct =
            result != null &&
            (isMatching
              ? q.pairs.every((pair, index) => matching[q.id]?.[String(index)] === pair.right)
              : chosen === q.answer);

          return (
            <article key={q.id} className="p-6 md:p-8">
              <div className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--navy)] font-serif font-bold text-white">
                  {qi + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-7 text-[var(--navy)]">{prompt}</p>
                  {q.kind === "listen-choice" && q.listenText && (
                    <button
                      type="button"
                      onClick={() => void playAudioOrTts({ text: q.listenText!, audio: q.audio, options: { rate: basicRate } })}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/15 px-4 py-2 text-sm font-bold text-[var(--gold-dark)]"
                    >
                      <Headphones className="size-4" /> Listen
                    </button>
                  )}
                  {isMatching ? (
                    <div className="mt-5 grid gap-3">
                      {q.pairs.map((pair, pairIndex) => (
                        <div key={`${pair.left}-${pairIndex}`} className="grid gap-2 sm:grid-cols-2 sm:items-center">
                          <div className="rounded-xl bg-[var(--cream)] px-4 py-3 font-bold text-[var(--navy)]">
                            {pair.left}
                          </div>
                          <select
                            disabled={submitted}
                            value={matching[q.id]?.[String(pairIndex)] ?? ""}
                            onChange={e =>
                              setMatching(prev => ({
                                ...prev,
                                [q.id]: { ...(prev[q.id] ?? {}), [String(pairIndex)]: e.target.value },
                              }))
                            }
                            className="h-12 rounded-xl border border-[var(--navy)]/12 bg-white px-3"
                          >
                            <option value="">—</option>
                            {[...q.pairs]
                              .map(p => p.right)
                              .sort((a, b) => a.localeCompare(b))
                              .map(opt => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      {(q.options ?? []).map((option, optionIndex) => {
                        const selected = chosen === optionIndex;
                        const revealCorrect = submitted && optionIndex === q.answer;
                        const revealWrong = submitted && selected && optionIndex !== q.answer;
                        return (
                          <button
                            key={`${option}-${optionIndex}`}
                            type="button"
                            disabled={submitted}
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: optionIndex }))}
                            className={`answer-option ${selected ? "answer-selected" : ""} ${
                              revealCorrect ? "answer-correct" : ""
                            } ${revealWrong ? "answer-wrong" : ""}`}
                          >
                            <span>{String.fromCharCode(65 + optionIndex)}</span>
                            <span>{option}</span>
                            {revealCorrect && <Check className="ml-auto size-4" />}
                            {revealWrong && <X className="ml-auto size-4" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {submitted && (
                    <div
                      className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${
                        correct ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                      }`}
                    >
                      <strong>{correct ? "সঠিক।" : "সঠিক উত্তর দেখুন।"}</strong> {q.explanationBn}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex flex-col gap-4 border-t border-[var(--navy)]/8 bg-[var(--cream)] p-6 sm:flex-row sm:items-center sm:justify-between">
        {submitted && result ? (
          <>
            <div>
              <p className="font-serif text-3xl font-bold text-[var(--navy)]">
                Score {result.score}/{result.total}
              </p>
              <p className="text-sm text-[var(--navy)]/50">
                {Math.round((result.score / Math.max(1, result.total)) * 100)}%
              </p>
            </div>
            <Button type="button" onClick={reset} variant="outline" className="rounded-full">
              <RotateCcw className="size-4" /> Retry
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-[var(--navy)]/50">
              Answered {Object.keys(answers).length + Object.keys(matching).length}/{questions.length}
            </p>
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={submitCheckpoint.isPending}
              className="rounded-full bg-[var(--navy)] px-7 text-white"
            >
              {submitCheckpoint.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit
            </Button>
          </>
        )}
      </div>
      {/* silence unused */}
      <span className="hidden">{stepId}</span>
    </section>
  );
}

/** Whole-word reading: see Hangul → choose meaning (forces decoding words, not jamo meta-knowledge). */
function ReadWordPractice({
  stepId,
  items,
  locale,
  doneIds,
  onItemCorrect,
  onMarkStep,
  basicRate,
  onRateChange,
}: {
  stepId: string;
  items: Array<{
    id: string;
    text: string;
    romanization?: string;
    audioText?: string;
    bn: string;
    en: string;
    distractorsBn: string[];
    audio?: AudioClipRef;
  }>;
  locale: "bn" | "ko" | "en";
  doneIds: string[];
  onItemCorrect: (id: string) => void;
  onMarkStep: () => void;
  basicRate: KoreanSpeechRate;
  onRateChange: (rate: KoreanSpeechRate) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"ok" | "bad" | null>(null);
  const item = items[Math.min(index, items.length - 1)]!;

  const choices = useMemo(() => {
    const pool = [item.bn, ...item.distractorsBn].filter(Boolean);
    const unique = [...new Set(pool)];
    // stable-ish shuffle per item id
    let seed = 0;
    for (let i = 0; i < item.id.length; i += 1) seed = (seed + item.id.charCodeAt(i) * (i + 1)) % 997;
    const arr = [...unique];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      const t = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = t;
    }
    return arr.slice(0, 4);
  }, [item.id, item.bn, item.distractorsBn]);

  const goNext = () => {
    setPicked(null);
    setFeedback(null);
    setIndex(value => Math.min(items.length - 1, value + 1));
  };

  const allDone = items.every(it => doneIds.includes(it.id));

  return (
    <section className="paper-card overflow-hidden">
      <div className="border-b border-[var(--navy)]/8 p-6 md:p-8">
        <p className="eyebrow">Reading lab · পুরো শব্দ পড়ুন</p>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">
          {locale === "en" ? "Read the whole word" : "পুরো শব্দ পড়ে অর্থ বলুন"}
        </h2><p className="mt-2 text-sm font-semibold text-[var(--navy)]/50">AI pronunciation reference · ধীরে শুনে পুরো শব্দ বলুন</p></div><BasicsRateToggle rate={basicRate} onChange={onRateChange} /></div>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--navy)]/65">
          {locale === "en"
            ? "Do not spell letter-by-letter only — read the block as one word, then pick the meaning."
            : "শুধু অক্ষর আলাদা করে নয় — পুরো ব্লক এক শব্দ হিসেবে পড়ুন, তারপর অর্থ বেছে নিন।"}
        </p>
        <p className="mt-2 text-xs font-semibold text-[var(--navy)]/45">
          {index + 1}/{items.length} · সম্পন্ন {doneIds.filter(id => items.some(it => it.id === id)).length}
        </p>
      </div>
      <div className="p-6 md:p-10">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-serif text-6xl font-bold tracking-tight text-[var(--navy)] md:text-7xl">{item.text}</p>
          <button
            type="button"
            onClick={() => void playAudioOrTts({ text: item.text, audio: item.audio, options: { rate: basicRate } })}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/15 px-4 py-2 text-sm font-bold text-[var(--gold-dark)]"
          >
            <Volume2 className="size-4" /> শুনুন (পরে)
          </button>
          <p className="mt-6 text-sm font-bold text-[var(--navy)]/55">
            {locale === "en" ? "What does this word mean?" : "এই শব্দের অর্থ কী?"}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {choices.map(choice => {
              const selected = picked === choice;
              const isCorrect = choice === item.bn;
              const reveal = feedback != null;
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={feedback === "ok"}
                  onClick={() => {
                    setPicked(choice);
                    if (choice === item.bn) {
                      setFeedback("ok");
                      onItemCorrect(item.id);
                    } else {
                      setFeedback("bad");
                    }
                  }}
                  className={`answer-option min-h-14 ${selected ? "answer-selected" : ""} ${
                    reveal && isCorrect ? "answer-correct" : ""
                  } ${reveal && selected && !isCorrect ? "answer-wrong" : ""}`}
                >
                  <span>{choice}</span>
                </button>
              );
            })}
          </div>
          {feedback === "ok" && (
            <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              সঠিক — {item.text} = {item.bn}
              {item.en ? ` (${item.en})` : ""}
            </p>
          )}
          {feedback === "bad" && (
            <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              আবার চেষ্টা করুন — পুরো শব্দটি আবার পড়ুন।
            </p>
          )}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={index === 0}
              onClick={() => {
                setIndex(value => Math.max(0, value - 1));
                setPicked(null);
                setFeedback(null);
              }}
              className="rounded-full"
            >
              <ChevronLeft className="size-4" /> আগের
            </Button>
            <Button
              type="button"
              disabled={feedback !== "ok" && !doneIds.includes(item.id)}
              onClick={goNext}
              className="rounded-full bg-[var(--navy)] text-white"
            >
              পরের শব্দ <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--navy)]/8 bg-[var(--cream)] p-6">
        <Button
          type="button"
          disabled={!allDone}
          onClick={onMarkStep}
          className={`rounded-full px-6 ${allDone ? "bg-[var(--navy)] text-white" : "bg-[var(--navy)]/20 text-[var(--navy)]/40"}`}
        >
          {allDone ? "পড়া ধাপ সম্পন্ন" : "সব শব্দ পড়ে অর্থ মিলিয়ে সম্পন্ন করুন"}
        </Button>
        <span className="hidden">{stepId}</span>
      </div>
    </section>
  );
}
