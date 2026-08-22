import { EpsQuestionImage } from "@/components/EpsQuestionImage";
import { GuidedListening } from "@/components/GuidedListening";
import { Button } from "@/components/ui/button";
import { speakKorean } from "@/lib/speakKorean";
import {
  itemReviewId,
  listDueDrillItems,
  listUpcomingReviews,
  markReviewed,
  type DrillableKind,
} from "@/lib/srs";
import { trpc } from "@/lib/trpc";
import type { ReviewCard } from "@shared/reviewCards";
import { Check, ChevronRight, Loader2, RotateCcw, Volume2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

/** One session is deliberately short — this audience studies on a phone between shifts. */
const SESSION_SIZE = 20;

const KIND_LABEL_BN: Record<DrillableKind, string> = {
  vocab: "শব্দ",
  practice: "অনুশীলন",
  eps: "পরীক্ষার প্রশ্ন",
};

function DrillIntro({ children }: { children?: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--navy)]/10 bg-[radial-gradient(circle_at_85%_20%,rgba(204,166,92,.18),transparent_28%)]">
      <div className="container flex flex-col gap-6 py-12 md:flex-row md:items-end md:justify-between md:py-16">
        <div className="max-w-3xl">
          <p className="eyebrow">স্পেসড রিপিটিশন</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-[var(--navy)] md:text-5xl">রিভিউ ড্রিল</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--navy)]/68 md:text-lg">
            যে শব্দ ও প্রশ্নে ভুল হয়েছিল শুধু সেগুলোই ফিরে আসে। সঠিক হলে পরের রিভিউ দূরে সরে যায়, ভুল হলে কালই আবার আসে।
          </p>
        </div>
        {children ? <div className="shrink-0">{children}</div> : null}
      </div>
    </section>
  );
}

export default function ReviewDrillPage() {
  // The queue is snapshotted once per session: answering an item reschedules it, and re-reading
  // storage mid-session would pull the just-answered card back into view.
  const [sessionKey, setSessionKey] = useState(0);
  const dueItems = useMemo(() => listDueDrillItems(SESSION_SIZE), [sessionKey]);
  const refs = useMemo(
    () =>
      dueItems
        .filter(item => item.itemId && item.chapter)
        .map(item => ({
          kind: item.kind as DrillableKind,
          chapter: item.chapter as number,
          itemId: item.itemId as string,
        })),
    [dueItems],
  );

  const cardsQuery = trpc.curriculum.reviewItems.useQuery(
    { refs },
    { enabled: refs.length > 0, retry: false, refetchOnWindowFocus: false },
  );
  const cards = cardsQuery.data ?? [];

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | undefined>(undefined);
  const [results, setResults] = useState<Array<{ card: ReviewCard; correct: boolean }>>([]);

  const card = cards[index];
  const finished = cards.length > 0 && index >= cards.length;
  const correctCount = results.filter(result => result.correct).length;

  const answer = (optionIndex: number) => {
    if (!card || chosen !== undefined) return;
    setChosen(optionIndex);
    const correct = optionIndex === card.answer;
    // "again" resets the interval to one day; "good" expands it. A binary outcome never earns
    // "easy", which would push the next sighting out four days on a single lucky guess.
    markReviewed(itemReviewId({ kind: card.kind, chapter: card.chapter, itemId: card.itemId }), correct ? "good" : "again");
    setResults(previous => [...previous, { card, correct }]);
  };

  const next = () => {
    setChosen(undefined);
    setIndex(value => value + 1);
  };

  const restart = () => {
    setIndex(0);
    setChosen(undefined);
    setResults([]);
    setSessionKey(value => value + 1);
  };

  if (!refs.length) {
    const upcoming = listUpcomingReviews(1)[0];
    return (
      <>
        <DrillIntro />
        <div className="container py-14">
          <div className="paper-card mx-auto max-w-2xl p-8 text-center">
            <p className="font-serif text-2xl font-bold text-[var(--navy)]">আজ কোনো আইটেম বাকি নেই</p>
            <p className="mt-3 text-sm leading-7 text-[var(--navy)]/60">
              অনুশীলন, অধ্যায় পরীক্ষা বা মক টেস্টে যে শব্দ ও প্রশ্নে ভুল হবে সেগুলো এখানে জমা হবে। শব্দভাণ্ডার সম্পন্ন করলেও নতুন শব্দ যোগ হয়।
              {upcoming ? ` পরবর্তী নির্ধারিত রিভিউ: ${upcoming.dueDate}।` : ""}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/curriculum">
                <Button className="rounded-full bg-[var(--navy)] px-6 text-white">পাঠ্যক্রমে যান <ChevronRight className="size-4" /></Button>
              </Link>
              <Link href="/mock-test">
                <Button variant="outline" className="rounded-full border-[var(--navy)]/20">মক টেস্ট</Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (cardsQuery.isLoading) {
    return (
      <>
        <DrillIntro />
        <div className="container py-24 text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-[var(--gold-dark)]" />
          <p className="mt-4 text-sm font-semibold text-[var(--navy)]/60">রিভিউ আইটেম প্রস্তুত হচ্ছে…</p>
        </div>
      </>
    );
  }

  if (cardsQuery.isError || !cards.length) {
    return (
      <>
        <DrillIntro />
        <div className="container py-14">
          <div className="paper-card mx-auto max-w-2xl p-8 text-center">
            <p className="font-serif text-2xl font-bold text-[var(--navy)]">রিভিউ আইটেম লোড করা যায়নি</p>
            <p className="mt-3 text-sm leading-7 text-[var(--navy)]/60">
              ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।
            </p>
            <Button onClick={restart} className="mt-6 rounded-full bg-[var(--navy)] px-6 text-white">
              <RotateCcw className="size-4" />আবার চেষ্টা
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (finished) {
    return (
      <>
        <DrillIntro />
        <div className="container py-14">
          <div className="paper-card mx-auto max-w-2xl p-8">
            <p className="eyebrow text-center">সেশন শেষ</p>
            <p className="mt-3 text-center font-serif text-4xl font-bold text-[var(--navy)]">
              {correctCount}/{results.length}
            </p>
            <p className="mt-2 text-center text-sm text-[var(--navy)]/55">
              সঠিক আইটেমগুলোর পরবর্তী রিভিউ দূরে সরেছে; ভুলগুলো আগামীকাল আবার আসবে।
            </p>
            <ul className="mt-7 grid gap-2">
              {results.map(({ card: item, correct }) => (
                <li
                  key={`${item.kind}-${item.chapter}-${item.itemId}`}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${correct ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}
                >
                  {correct ? <Check className="size-4 shrink-0" /> : <X className="size-4 shrink-0" />}
                  <span className="truncate">{item.labelBn}</span>
                  <Link href={`/lesson/${item.chapter}`} className="ml-auto shrink-0 text-xs font-bold underline">
                    অধ্যায় {item.chapter}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button onClick={restart} className="rounded-full bg-[var(--navy)] px-6 text-white">
                <RotateCcw className="size-4" />আরও রিভিউ
              </Button>
              <Link href="/dashboard">
                <Button variant="outline" className="rounded-full border-[var(--navy)]/20">ড্যাশবোর্ড</Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!card) return null;

  const isListening = card.section === "listening";
  const spoken = card.kind === "vocab" ? card.promptKo : card.promptKo || card.passage;

  return (
    <>
      <DrillIntro>
        <span className="inline-flex rounded-full bg-[var(--navy)] px-4 py-2 text-sm font-bold text-white">
          {index + 1}/{cards.length}
        </span>
      </DrillIntro>
      <div className="container py-10">
        <div className="mx-auto max-w-3xl">
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[var(--navy)] transition-all" style={{ width: `${(index / cards.length) * 100}%` }} />
          </div>

          <article className="paper-card mt-6 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-[var(--gold)]/18 px-3 py-1 text-[var(--gold-dark)]">{KIND_LABEL_BN[card.kind]}</span>
              <span className="rounded-full bg-[var(--cream)] px-3 py-1 text-[var(--navy)]/55">অধ্যায় {card.chapter}</span>
            </div>

            <p className="mt-5 font-bold leading-7 text-[var(--navy)]">{card.promptBn}</p>
            {card.kind === "vocab" ? (
              <div className="mt-4 flex items-center justify-center gap-4 rounded-2xl bg-[var(--cream)] py-8">
                <p className="font-serif text-5xl font-bold text-[var(--navy)]">{card.promptKo}</p>
                <button
                  type="button"
                  onClick={() => void speakKorean(card.promptKo)}
                  aria-label="শব্দটি শুনুন"
                  className="grid size-11 place-items-center rounded-full bg-white text-[var(--gold-dark)]"
                >
                  <Volume2 className="size-5" />
                </button>
              </div>
            ) : card.promptKo ? (
              <p className="mt-3 text-lg font-semibold text-[var(--navy)]">{card.promptKo}</p>
            ) : null}

            {card.image ? <EpsQuestionImage image={card.image} /> : null}

            {card.passage && card.kind !== "vocab" ? (
              isListening && chosen === undefined ? (
                <div className="mt-4">
                  <GuidedListening text={card.passage} compact label="শুনতে চাপুন · script লুকানো" />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-[var(--cream)] p-4 font-semibold leading-7 text-[var(--navy)]">{card.passage}</div>
              )
            ) : null}

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {card.options.map((option, optionIndex) => {
                const selected = chosen === optionIndex;
                const revealCorrect = chosen !== undefined && optionIndex === card.answer;
                const revealWrong = selected && optionIndex !== card.answer;
                return (
                  <button
                    key={`${option}-${optionIndex}`}
                    disabled={chosen !== undefined}
                    onClick={() => answer(optionIndex)}
                    className={`answer-option ${selected ? "answer-selected" : ""} ${revealCorrect ? "answer-correct" : ""} ${revealWrong ? "answer-wrong" : ""}`}
                  >
                    <span>{String.fromCharCode(65 + optionIndex)}</span>
                    <span>{option}</span>
                    {revealCorrect && <Check className="ml-auto size-4" />}
                    {revealWrong && <X className="ml-auto size-4" />}
                  </button>
                );
              })}
            </div>

            {chosen !== undefined ? (
              <>
                <div
                  className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${chosen === card.answer ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
                >
                  <strong>{chosen === card.answer ? "সঠিক।" : "সঠিক উত্তর দেখুন।"}</strong> {card.explanationBn}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  {spoken ? (
                    <button
                      type="button"
                      onClick={() => void speakKorean(spoken)}
                      className="inline-flex items-center gap-2 text-sm font-bold text-[var(--gold-dark)]"
                    >
                      <Volume2 className="size-4" />কোরিয়ান শুনুন
                    </button>
                  ) : (
                    <span />
                  )}
                  <Button onClick={next} className="rounded-full bg-[var(--navy)] px-6 text-white">
                    {index === cards.length - 1 ? "ফলাফল দেখুন" : "পরেরটি"}
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </>
            ) : null}
          </article>

          <p className="mt-5 text-center text-xs text-[var(--navy)]/45">
            সঠিক উত্তরে পরবর্তী রিভিউ দূরে সরে যায়, ভুল হলে আগামীকাল আবার আসে।
          </p>
        </div>
      </div>
    </>
  );
}
