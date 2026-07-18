import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { LockKeyhole } from "lucide-react";
import { Link } from "wouter";

type BasicsLockCardProps = {
  title?: string;
  description?: string;
  /** When true, emphasize hard gate (writes blocked). Soft banner otherwise. */
  hard?: boolean;
  className?: string;
};

/**
 * Paper-card invite to complete Hangul Basics before chapter practice/exam writes.
 * Matches LearningPages AuthInvitation visual language.
 */
export function BasicsLockCard({ title, description, hard = true, className = "" }: BasicsLockCardProps) {
  const { locale, t } = useLocale();

  const defaultTitle =
    title ??
    (locale === "en"
      ? "Complete Hangul Basics first"
      : locale === "ko"
        ? "먼저 한글 기초를 완료하세요"
        : "প্রথমে হ্যাঙ্গুল বেসিক সম্পন্ন করুন");

  const defaultDescription =
    description ??
    (locale === "en"
      ? hard
        ? "Chapter practice and exams unlock after you pass the Basics checkpoint."
        : "We recommend finishing Hangul Basics before chapter practice."
      : locale === "ko"
        ? hard
          ? "기초 확인을 통과하면 단원 연습·시험을 저장할 수 있습니다."
          : "단원 연습 전에 한글 기초를 마치는 것을 권장합니다."
        : hard
          ? "বেসিক চেকপয়েন্ট পাস করলে অধ্যায় অনুশীলন ও পরীক্ষা সংরক্ষণ করা যাবে।"
          : "অধ্যায় অনুশীলনের আগে হ্যাঙ্গুল বেসিক শেষ করার পরামর্শ দিই।");

  return (
    <div className={`paper-card mx-auto max-w-2xl p-8 text-center md:p-12 ${className}`}>
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--gold)]/18 text-[var(--gold-dark)]">
        <LockKeyhole className="size-6" />
      </span>
      <h2 className="mt-5 font-serif text-2xl font-bold text-[var(--navy)]">{defaultTitle}</h2>
      <p className="mx-auto mt-3 max-w-lg leading-7 text-[var(--navy)]/65">{defaultDescription}</p>
      <Link href="/basics">
        <Button className="mt-7 rounded-full bg-[var(--navy)] px-6 text-white">
          {t.startBasics}
        </Button>
      </Link>
    </div>
  );
}

/** Soft banner for Home/Curriculum/Mock when Basics incomplete (voluntary or soft gate). */
export function BasicsCtaBanner({ className = "" }: { className?: string }) {
  const { locale, t } = useLocale();
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-[var(--gold)]/35 bg-[var(--gold)]/10 p-4 text-sm text-[var(--navy)] md:flex-row md:items-center md:justify-between ${className}`}
    >
      <span>
        <strong>{t.hangulBasics}:</strong>{" "}
        {locale === "en"
          ? "Learn the Korean alphabet before Chapter 1."
          : locale === "ko"
            ? "1과 전에 한글을 익혀 보세요."
            : "অধ্যায় ১-এর আগে কোরিয়ান বর্ণমালা শিখুন।"}
      </span>
      <Link href="/basics">
        <Button className="rounded-full bg-[var(--navy)] text-white">
          {t.startBasics}
        </Button>
      </Link>
    </div>
  );
}
