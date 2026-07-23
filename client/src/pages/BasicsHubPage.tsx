import { BasicsCtaBanner } from "@/components/basics/BasicsLockCard";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBasicsGate } from "@/hooks/useBasicsGate";
import { useLocalBasics } from "@/lib/localProgress";
import { trpc } from "@/lib/trpc";
import {
  BASICS_MODULE_IDS,
  emptyModuleProgress,
  isBasicsComplete,
  type BasicsModuleId,
} from "@shared/basics";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Loader2,
  LockKeyhole,
  Sparkles,
  Unlock,
} from "lucide-react";
import { Link } from "wouter";

function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--navy)]/10 bg-[radial-gradient(circle_at_85%_20%,rgba(204,166,92,.18),transparent_28%)]">
      <div className="container flex flex-col gap-6 py-12 md:flex-row md:items-end md:justify-between md:py-16">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-[var(--navy)] md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--navy)]/68 md:text-lg">
            {description}
          </p>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </section>
  );
}

function isModuleUnlocked(
  moduleId: BasicsModuleId,
  modules: Record<string, { completed?: boolean } | undefined>,
  moduleContentComplete: (id: string) => boolean,
  basicsComplete: boolean,
): boolean {
  if (basicsComplete) return true;
  // Placement: checkpoint always open
  if (moduleId === "checkpoint") return true;
  const order = BASICS_MODULE_IDS.indexOf(moduleId);
  if (order <= 0) return true;
  const prevId = BASICS_MODULE_IDS[order - 1]!;
  // Previous teaching module complete, or denormalized flag
  if (prevId === "checkpoint") return true;
  return moduleContentComplete(prevId) || Boolean(modules[prevId]?.completed);
}

export default function BasicsHubPage() {
  const { locale, t } = useLocale();
  const { isAuthenticated } = useAuth();
  const localBasics = useLocalBasics();
  const gate = useBasicsGate();
  const listQuery = trpc.basics.listModules.useQuery();
  const remoteGet = trpc.basics.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Prefer remote modules when auth has progress; fall back to local
  const modulesMap =
    remoteGet.data?.progress?.modules && Object.keys(remoteGet.data.progress.modules).length
      ? { ...localBasics.modules, ...remoteGet.data.progress.modules }
      : localBasics.modules;

  const hangulReady =
    isBasicsComplete(localBasics) || Boolean(remoteGet.data?.completed) || (gate.completed && gate.gateEnabled === false && isBasicsComplete(localBasics));

  const titleOf = (title: { bn: string; ko: string; en: string }) => title[locale];

  // Without full module content we only use denormalized completed flags for unlock chain
  const moduleContentComplete = (id: string) => Boolean(modulesMap[id]?.completed);

  const summaries = listQuery.data?.modules ?? [];

  return (
    <>
      <PageIntro
        eyebrow={t.hangulBasics ?? (locale === "en" ? "Pre–Chapter 1" : locale === "ko" ? "1과 이전" : "অধ্যায় ১-এর আগে")}
        title={t.basics ?? (locale === "en" ? "Hangul Basics" : locale === "ko" ? "한글 기초" : "হ্যাঙ্গুল বেসিক")}
        description={
          locale === "en"
            ? "Learn Korean letters (jamo), speaking, writing, and syllable building—then pass a short checkpoint (70%) to unlock the 60-chapter path."
            : locale === "ko"
              ? "자모, 발음, 쓰기, 음절 만들기를 익히고 기초 확인(70%)을 통과하면 60과 학습이 열립니다."
              : "জামো, উচ্চারণ, লেখা ও অক্ষর গঠন শিখে ছোট চেকপয়েন্ট পাস করুন (৭০%)—তারপর ৬০ অধ্যায়ের পথ খুলবে।"
        }
        actions={
          hangulReady ? (
            <Link href="/curriculum">
              <Button className="rounded-full bg-[var(--sage)] px-6 text-white">
                {locale === "en" ? "Go to curriculum" : locale === "ko" ? "교육과정으로" : "পাঠ্যক্রমে যান"}{" "}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/basics/welcome">
              <Button className="rounded-full bg-[var(--navy)] px-6 text-white">
                {t.startBasics ?? (locale === "en" ? "Start Basics" : "বেসিক শুরু")}{" "}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          )
        }
      />

      <div className="container py-10">
        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-[var(--navy)]/10 bg-[var(--navy)] text-white">
          <div className="sacred-grid-dark absolute inset-0 opacity-40" />
          <div className="relative grid gap-6 p-6 md:grid-cols-[1.1fr_.9fr] md:p-10">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-[var(--gold)]">
                <Sparkles className="size-3.5" /> 8 modules · ~90–150 min
              </p>
              <h2 className="mt-5 font-serif text-3xl font-bold md:text-4xl">
                {locale === "en"
                  ? "Read Hangul with confidence"
                  : locale === "ko"
                    ? "한글로 자신 있게"
                    : "আত্মবিশ্বাসের সাথে হ্যাঙ্গুল পড়ুন"}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/65">
                {locale === "en"
                  ? "Already know Hangul? Take the checkpoint. Fail? Redo modules and try again. Pass needs about 70%."
                  : locale === "ko"
                    ? "이미 한글을 알면 체크포인트로 가세요. 실패하면 모듈을 다시 보고 재도전하세요. 통과 기준 약 70%."
                    : "ইতিমধ্যে হ্যাঙ্গুল জানেন? চেকপয়েন্ট দিন। ফেল করলে মডিউল রিভিউ করে আবার চেষ্টা করুন। পাস করতে প্রায় ৭০% লাগবে।"}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/basics/checkpoint">
                  <Button className="rounded-full bg-[var(--gold)] px-5 text-[var(--navy)] hover:bg-[var(--gold)]/90">
                    <Unlock className="size-4" />
                    {locale === "en"
                      ? "I already know Hangul"
                      : locale === "ko"
                        ? "한글을 이미 압니다"
                        : "আমি ইতিমধ্যে হ্যাঙ্গুল জানি"}
                  </Button>
                </Link>
                {hangulReady && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--sage)]/25 px-4 py-2 text-sm font-bold text-[var(--sage)]">
                    <Check className="size-4" /> Hangul ready
                  </span>
                )}
              </div>
            </div>
            <div className="relative min-h-[180px] overflow-hidden rounded-[1.5rem] border border-white/10">
              <img
                src="/basics/hub-hero.jpg"
                alt=""
                className="h-full w-full object-cover opacity-90"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <video
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 data-[ready=true]:opacity-50"
                src="/manus-storage/hub-hero_5743ccfc.mp4"
                muted
                playsInline
                loop
                autoPlay
                poster="/basics/hub-hero.jpg"
                onCanPlay={e => {
                  (e.currentTarget as HTMLVideoElement).dataset.ready = "true";
                }}
                onError={e => {
                  (e.currentTarget as HTMLVideoElement).style.display = "none";
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--navy)]/50 to-transparent" />
            </div>
          </div>
        </div>

        {/* Placement clarity */}
        <div className="mb-8 rounded-3xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-5 md:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-dark)]">
            {locale === "en" ? "Placement" : locale === "ko" ? "배치" : "প্লেসমেন্ট"}
          </p>
          <h3 className="mt-2 font-serif text-xl font-bold text-[var(--navy)]">
            {locale === "en"
              ? "“I already know Hangul” → checkpoint"
              : locale === "ko"
                ? "“한글을 이미 압니다” → 체크포인트"
                : "“আমি ইতিমধ্যে হ্যাঙ্গুল জানি” → চেকপয়েন্ট"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--navy)]/70">
            {locale === "en"
              ? "Skip teaching modules only if you can pass the short check. Score below 70%? Review the modules, then retake. Passing unlocks the 60-chapter curriculum."
              : locale === "ko"
                ? "기초 확인을 통과할 수 있을 때만 모듈을 건너뛰세요. 70% 미만이면 모듈을 복습한 뒤 다시 보세요. 통과하면 60과가 열립니다."
                : "চেকপয়েন্ট পাস করতে পারলেই মডিউল এড়িয়ে যান। ৭০%-এর নিচে হলে মডিউল রিভিউ করে আবার দিন। পাস করলে ৬০ অধ্যায়ের পাঠ্যক্রম খুলবে।"}
          </p>
          <p className="mt-3 text-sm font-bold text-[var(--navy)]">
            {locale === "en" ? "Pass score: 70%" : locale === "ko" ? "통과 점수: 70%" : "পাস স্কোর: ৭০%"}
          </p>
        </div>

        {!hangulReady && <BasicsCtaBanner className="mb-8" />}

        {listQuery.isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto size-7 animate-spin text-[var(--gold-dark)]" />
            <p className="mt-4 text-sm font-semibold text-[var(--navy)]/60">{t.loading}</p>
          </div>
        ) : listQuery.error ? (
          <div className="paper-card p-8 text-center text-red-700">
            {listQuery.error.message}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaries.map(mod => {
              const id = mod.id as BasicsModuleId;
              const progress = modulesMap[id] ?? emptyModuleProgress(id);
              // Without full content, use denormalized completed or quiz score
              const done =
                Boolean(progress.completed) ||
                (id === "checkpoint" && isBasicsComplete(localBasics));
              const unlocked = isModuleUnlocked(
                id,
                modulesMap,
                moduleContentComplete,
                hangulReady,
              );
              const locked = !unlocked && !done;

              const cardInner = (
                <div
                  className={`paper-card group relative h-full overflow-hidden p-0 transition ${
                    locked ? "opacity-70" : "hover:-translate-y-0.5 hover:border-[var(--gold)]/35"
                  }`}
                >
                  <div className="relative h-28 overflow-hidden bg-[var(--navy)]/5">
                    <img
                      src="/basics/module-icon.jpg"
                      alt=""
                      className="h-full w-full object-cover opacity-90 transition group-hover:scale-[1.03]"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--cream)] via-transparent to-transparent" />
                  </div>
                  <div className="p-5 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="chapter-number">{String(mod.order + 1).padStart(2, "0")}</span>
                      {done ? (
                        <span className="status-done">
                          <Check className="size-3.5" />
                          {locale === "en" ? "Done" : "সম্পন্ন"}
                        </span>
                      ) : locked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--navy)]/8 px-2.5 py-1 text-[11px] font-bold text-[var(--navy)]/45">
                          <LockKeyhole className="size-3" />
                        </span>
                      ) : (
                        <span className="status-open">{locale === "en" ? "Open" : "খোলা"}</span>
                      )}
                    </div>
                    <h2 className="mt-4 font-serif text-xl font-bold leading-tight text-[var(--navy)]">
                      {titleOf(mod.title)}
                    </h2>
                    {locale !== "ko" && (
                      <p className="mt-1 text-sm font-semibold text-[var(--navy)]/45">{mod.title.ko}</p>
                    )}
                    <div className="mt-6 flex items-center justify-between border-t border-[var(--navy)]/8 pt-3 text-xs text-[var(--navy)]/55">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3.5" /> ~{mod.estimatedMinutes} min
                      </span>
                      <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              );

              if (locked) {
                return (
                  <div key={mod.id} className="cursor-not-allowed" title="Complete previous module first">
                    {cardInner}
                  </div>
                );
              }

              return (
                <Link key={mod.id} href={`/basics/${mod.id}`}>
                  {cardInner}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
