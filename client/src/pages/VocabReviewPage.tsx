import { Button } from "@/components/ui/button";
import { speakKorean } from "@/lib/speakKorean";
import { listDueVocab, markReviewed, vocabQueueStats, type ReviewItem } from "@/lib/srs";
import { ArrowLeft, Check, Layers3, RotateCcw, Sparkles, Volume2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const SESSION_SIZE = 20;

/**
 * Word-level recall.
 *
 * The 60-lesson corpus teaches ~1,900 headwords but 70% of them appear in exactly one
 * lesson, so without a place to meet a word again most of them are seen once and lost.
 * This is that place: the scheduler decides what is due, the learner recalls it, and the
 * answer feeds straight back into the same SM-2 ladder used by chapter reviews.
 */
export default function VocabReviewPage() {
  const [queue, setQueue] = useState<ReviewItem[]>(() => listDueVocab(SESSION_SIZE));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ knew: 0, missed: 0 });

  const stats = useMemo(() => vocabQueueStats(), [queue, index]);
  const current = queue[index];
  const finished = !current;

  function grade(knew: boolean) {
    if (!current) return;
    markReviewed(current.id, knew ? "good" : "again");
    setTally(t => ({ knew: t.knew + (knew ? 1 : 0), missed: t.missed + (knew ? 0 : 1) }));
    setRevealed(false);
    setIndex(i => i + 1);
  }

  function restart() {
    setQueue(listDueVocab(SESSION_SIZE));
    setIndex(0);
    setRevealed(false);
    setTally({ knew: 0, missed: 0 });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--navy)]/55 hover:text-[var(--navy)]">
        <ArrowLeft className="size-4" /> ড্যাশবোর্ড
      </Link>

      <header className="mt-6">
        <p className="eyebrow">শব্দ ঝালাই</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">আজকের শব্দ রিভিউ</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--navy)]/55">
          আগে শেখা শব্দ ভুলে যাওয়ার আগেই আবার সামনে আসে। যেগুলো কঠিন লাগে সেগুলো তাড়াতাড়ি ফিরে আসবে।
        </p>
      </header>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-[var(--gold)]/16 px-3 py-1.5 text-[var(--gold-dark)]">আজ বাকি {stats.due}</span>
        <span className="rounded-full bg-[var(--navy)]/8 px-3 py-1.5 text-[var(--navy)]/60">মোট {stats.total} শব্দ</span>
        {stats.weak > 0 && <span className="rounded-full bg-red-50 px-3 py-1.5 text-red-700">দুর্বল {stats.weak}</span>}
      </div>

      {finished ? (
        <section className="paper-card mt-7 p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--sage)]/18 text-[var(--sage)]">
            <Sparkles className="size-7" />
          </span>
          <h2 className="mt-5 font-serif text-2xl font-bold text-[var(--navy)]">
            {queue.length === 0 ? "আজ আর কিছু বাকি নেই" : "সেশন শেষ!"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--navy)]/55">
            {queue.length === 0
              ? "নতুন পাঠ শেষ করলে সেই শব্দগুলো এখানে জমা হবে।"
              : `${tally.knew}টি মনে ছিল, ${tally.missed}টি আবার দেখতে হবে।`}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {stats.due > 0 && (
              <Button onClick={restart} className="rounded-full bg-[var(--navy)] px-6 text-white">
                <RotateCcw className="size-4" /> আরও {Math.min(stats.due, SESSION_SIZE)}টি
              </Button>
            )}
            <Link href="/curriculum">
              <Button variant="outline" className="rounded-full px-6">পাঠে ফিরে যান</Button>
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-[var(--navy)]/8">
            <div
              className="h-full rounded-full bg-[var(--navy)] transition-all"
              style={{ width: `${(index / queue.length) * 100}%` }}
            />
          </div>

          <section className="paper-card mt-5 p-8 text-center md:p-10">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--gold-dark)]">
              {index + 1} / {queue.length}
              {current.chapter ? ` · অধ্যায় ${current.chapter}` : ""}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <p className="font-serif text-4xl font-bold text-[var(--navy)] md:text-5xl">{current.word}</p>
              <button
                onClick={() => void speakKorean(current.word ?? "")}
                aria-label="উচ্চারণ শুনুন"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--cream)] text-[var(--gold-dark)] hover:bg-[var(--gold)]/18"
              >
                <Volume2 className="size-4.5" />
              </button>
            </div>

            {revealed ? (
              <p className="mt-7 text-xl leading-8 text-[var(--navy)]/75">{current.glossBn || "—"}</p>
            ) : (
              <p className="mt-7 text-sm text-[var(--navy)]/40">মনে করার চেষ্টা করুন, তারপর অর্থ দেখুন</p>
            )}

            {revealed ? (
              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={() => grade(false)}
                  variant="outline"
                  className="rounded-full border-red-200 px-6 py-6 text-red-700 hover:bg-red-50"
                >
                  <X className="size-4" /> মনে ছিল না
                </Button>
                <Button onClick={() => grade(true)} className="rounded-full bg-[var(--sage)] px-6 py-6 text-white">
                  <Check className="size-4" /> মনে ছিল
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setRevealed(true)}
                className="mt-9 w-full rounded-full bg-[var(--navy)] px-6 py-6 text-white sm:w-auto"
              >
                <Layers3 className="size-4" /> অর্থ দেখুন
              </Button>
            )}
          </section>
        </>
      )}
    </main>
  );
}
