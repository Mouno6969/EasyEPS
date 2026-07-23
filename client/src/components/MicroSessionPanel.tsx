import { hrefForReview, type ReviewItem } from "@/lib/srs";
import { BookOpenText, BrainCircuit, ChevronRight, Clock3, RotateCcw } from "lucide-react";
import { Link } from "wouter";

export function MicroSessionPanel({
  nextChapter,
  hangulReady,
  dueReviews,
}: {
  nextChapter: number;
  hangulReady: boolean;
  dueReviews: ReviewItem[];
}) {
  const review = dueReviews[0];
  const sessions = [
    {
      id: "five-minute",
      minutes: 5,
      title: hangulReady ? `অধ্যায় ${nextChapter} · শব্দ ঝালাই` : "হ্যাঙ্গুল ঝালাই",
      detail: "একটি ছোট flashcard ও উচ্চারণ সেশন",
      href: hangulReady ? `/lesson/${nextChapter}` : "/basics",
      icon: BookOpenText,
    },
    {
      id: "review",
      minutes: 7,
      title: review?.labelBn ?? "দুর্বল জায়গা রিভিউ",
      detail: review ? `আজ নির্ধারিত · mastery ${review.mastery}%` : "নতুন ভুল জমলে এখানে ব্যক্তিগত রিভিউ আসবে",
      href: review ? hrefForReview(review) : hangulReady ? `/lesson/${nextChapter}` : "/basics",
      icon: RotateCcw,
    },
    {
      id: "smart-test",
      minutes: 12,
      title: "১০ প্রশ্নের স্মার্ট টেস্ট",
      detail: "দুর্বল অধ্যায়কে অগ্রাধিকার দিয়ে দ্রুত পরীক্ষা",
      href: "/mock-test?count=10&mode=smart",
      icon: BrainCircuit,
    },
  ];

  return (
    <section className="paper-card mt-7 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">সময় কম?</p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">মাইক্রো সেশন</h2>
          <p className="mt-1 text-sm text-[var(--navy)]/52">৫–১২ মিনিটের একটিমাত্র স্পষ্ট কাজ বেছে নিন।</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/14 px-3 py-1.5 text-xs font-bold text-[var(--gold-dark)]"><Clock3 className="size-3.5" />আজই করা যায়</span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {sessions.map(({ id, minutes, title, detail, href, icon: Icon }) => (
          <Link key={id} href={href} className="group rounded-2xl border border-[var(--navy)]/10 bg-[var(--cream)] p-4 transition hover:border-[var(--gold)]/45 hover:bg-white">
            <div className="flex items-center justify-between gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-white text-[var(--gold-dark)]"><Icon className="size-4.5" /></span>
              <span className="text-xs font-bold text-[var(--navy)]/45">{minutes} মিনিট</span>
            </div>
            <h3 className="mt-4 font-bold text-[var(--navy)]">{title}</h3>
            <p className="mt-2 text-xs leading-5 text-[var(--navy)]/50">{detail}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[var(--gold-dark)]">শুরু করুন <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
