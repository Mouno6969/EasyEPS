import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useLocalBasics, useLocalLearning, learningOverview } from "@/lib/localProgress";
import { trpc } from "@/lib/trpc";
import { isBasicsComplete } from "@shared/basics";
import { ArrowRight, BookOpenText, Bot, CheckCircle2, GraduationCap, Headphones, Sparkles, SpellCheck2, Volume2 } from "lucide-react";
import { Link } from "wouter";

const featureCards = [
  { icon: SpellCheck2, title: "হ্যাঙ্গুল বেসিক", text: "জামো, উচ্চারণ, লেখা ও অক্ষর গঠন—অধ্যায় ১-এর আগে।" },
  { icon: BookOpenText, title: "৬০টি পূর্ণাঙ্গ অধ্যায়", text: "দৈনন্দিন জীবন, কোরিয়ান সংস্কৃতি, কর্মক্ষেত্র, নিরাপত্তা ও আইন।" },
  { icon: Volume2, title: "শুনুন ও উচ্চারণ করুন", text: "প্রতিটি Korean শব্দ, উদাহরণ ও সংলাপ browser voice-এ শুনুন।" },
  { icon: GraduationCap, title: "EPS-ধাঁচের পরীক্ষা", text: "অধ্যায় পরীক্ষা এবং সময়-নিয়ন্ত্রিত পূর্ণাঙ্গ মক টেস্টে প্রস্তুতি যাচাই করুন।" },
  { icon: Bot, title: "বাংলা AI শিক্ষক", text: "কঠিন ব্যাকরণ ও কর্মক্ষেত্রের বাক্য সহজ বাংলায় বুঝে নিন।" },
];

export default function Home() {
  const { locale, t } = useLocale();
  const state = useLocalLearning();
  const basics = useLocalBasics();
  const hangulReady = isBasicsComplete(basics);
  const overview = learningOverview(state);
  const featured = trpc.curriculum.featured.useQuery();
  const nextChapter = Math.min(60, Math.max(1, overview.completedLessons + 1));
  const title = (item: { title: { bn: string; ko: string; en: string } }) => item.title[locale];
  const primaryHref = hangulReady
    ? `/lesson/${overview.completedLessons ? nextChapter : 1}`
    : "/basics";
  const primaryLabel = hangulReady
    ? overview.completedLessons
      ? "পড়া চালিয়ে যান"
      : "বিনামূল্যে শুরু করুন"
    : t.startBasics;

  return <>
    <section className="relative overflow-hidden bg-[var(--cream)]">
      <div className="sacred-grid absolute inset-0 opacity-50" />
      <div className="absolute -right-40 -top-48 size-[40rem] rounded-full border border-[var(--gold)]/15" />
      <div className="absolute -right-20 -top-28 size-[28rem] rounded-full border border-[var(--gold)]/20" />
      <div className="container relative grid min-h-[680px] items-center gap-12 py-16 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
        <div className="max-w-3xl">
          <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-white/55 px-4 py-2"><Sparkles className="size-4" />বাংলাভাষীদের EPS-TOPIK পথচলা</p>
          <h1 className="mt-7 font-serif text-[clamp(3.2rem,8vw,6.8rem)] font-bold leading-[.9] tracking-[-.045em] text-[var(--navy)]">কোরিয়া শুরু<br /><span className="text-[var(--gold-dark)]">হোক এখানে।</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--navy)]/66 md:text-xl">কোরিয়ান ভাষা, কর্মক্ষেত্রের দক্ষতা এবং EPS-TOPIK প্রস্তুতি—সবকিছু বাংলায়, এক সুসংগঠিত শেখার যাত্রায়।</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={primaryHref}>
              <Button className="h-13 rounded-full bg-[var(--navy)] px-7 text-base text-white shadow-lg shadow-[var(--navy)]/15 hover:bg-[var(--navy)]/92">
                {primaryLabel}<ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/basics">
              <Button variant="outline" className="h-13 rounded-full border-[var(--gold)]/40 bg-[var(--gold)]/12 px-7 text-base text-[var(--navy)]">
                <SpellCheck2 className="size-4" />{t.hangulBasics}
              </Button>
            </Link>
            <Link href="/curriculum">
              <Button variant="outline" className="h-13 rounded-full border-[var(--navy)]/20 bg-white/55 px-7 text-base text-[var(--navy)]">পাঠ্যক্রম দেখুন</Button>
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[var(--navy)]/55"><span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[var(--sage)]" />Hangul Basics track</span><span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[var(--sage)]" />Guest progress saved</span><span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[var(--sage)]" />Mobile friendly</span></div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -left-8 top-16 size-24 rounded-full bg-[var(--gold)]/20 blur-2xl" /><div className="absolute -right-5 bottom-14 size-32 rounded-full bg-[var(--sage)]/20 blur-2xl" />
          <div className="relative rotate-[1.5deg] rounded-[2.4rem] border border-[var(--navy)]/10 bg-white/82 p-4 shadow-[0_35px_90px_rgba(16,37,58,.16)] backdrop-blur-xl"><div className="rounded-[1.8rem] bg-[var(--navy)] p-7 text-white"><div className="flex items-center justify-between"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[var(--gold)]">আজকের পাঠ</span><Headphones className="size-5 text-[var(--gold)]" /></div><p className="mt-8 text-sm text-white/50">CHAPTER {String(nextChapter).padStart(2, "0")}</p><p className="mt-2 font-serif text-3xl font-bold">안녕하세요!</p><p className="mt-2 text-lg text-[var(--gold)]">আনিয়ংহাসেয়ো · Hello</p><div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${Math.max(8, overview.completedLessons / 60 * 100)}%` }} /></div><div className="mt-3 flex justify-between text-xs text-white/45"><span>সম্পন্ন {overview.completedLessons}</span><span>৬০ অধ্যায়</span></div></div><div className="grid grid-cols-3 gap-3 p-4 text-center"><div className="rounded-2xl bg-[var(--cream)] p-4"><p className="font-serif text-2xl font-bold text-[var(--navy)]">{overview.streak}</p><p className="text-[11px] text-[var(--navy)]/45">দিনের স্ট্রিক</p></div><div className="rounded-2xl bg-[var(--cream)] p-4"><p className="font-serif text-2xl font-bold text-[var(--navy)]">{overview.averageScore}%</p><p className="text-[11px] text-[var(--navy)]/45">গড় স্কোর</p></div><div className="rounded-2xl bg-[var(--cream)] p-4"><p className="font-serif text-2xl font-bold text-[var(--navy)]">{overview.studyMinutes}</p><p className="text-[11px] text-[var(--navy)]/45">মিনিট</p></div></div></div>
        </div>
      </div>
    </section>

    <section className="border-y border-[var(--navy)]/8 bg-white/55"><div className="container grid divide-y divide-[var(--navy)]/8 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="p-7 text-center"><p className="font-serif text-4xl font-bold text-[var(--navy)]">60</p><p className="mt-1 text-sm font-semibold text-[var(--navy)]/50">সুনির্বাচিত অধ্যায়</p></div><div className="p-7 text-center"><p className="font-serif text-4xl font-bold text-[var(--navy)]">1,000+</p><p className="mt-1 text-sm font-semibold text-[var(--navy)]/50">কোরিয়ান শব্দ ও বাক্য</p></div><div className="p-7 text-center"><p className="font-serif text-4xl font-bold text-[var(--navy)]">480</p><p className="mt-1 text-sm font-semibold text-[var(--navy)]/50">EPS-ধাঁচের প্রশ্ন</p></div></div></section>

    <section className="container py-20 md:py-28"><div className="max-w-2xl"><p className="eyebrow">কেন EasyEPS</p><h2 className="mt-3 font-serif text-4xl font-bold tracking-tight text-[var(--navy)] md:text-5xl">শুধু মুখস্থ নয়—কাজে লাগার মতো কোরিয়ান</h2></div><div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{featureCards.map(({ icon: Icon, title: cardTitle, text }, index) => <div key={cardTitle} className="paper-card group p-6"><span className={`grid size-12 place-items-center rounded-2xl ${index % 2 ? "bg-[var(--gold)]/15 text-[var(--gold-dark)]" : "bg-[var(--sage)]/15 text-[var(--sage-dark)]"}`}><Icon className="size-5" /></span><h3 className="mt-6 font-serif text-xl font-bold text-[var(--navy)]">{cardTitle}</h3><p className="mt-3 text-sm leading-7 text-[var(--navy)]/58">{text}</p></div>)}</div></section>

    <section className="bg-[var(--navy)] py-20 text-white md:py-24"><div className="container"><div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow text-[var(--gold)]">নির্বাচিত অধ্যায়</p><h2 className="mt-3 font-serif text-4xl font-bold md:text-5xl">জীবন ও কাজের জন্য প্রস্তুত হন</h2></div><Link href="/curriculum" className="inline-flex items-center gap-2 font-bold text-[var(--gold)]">সব ৬০ অধ্যায় <ArrowRight className="size-4" /></Link></div><div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{featured.data?.map(item => <Link key={item.chapter} href={`/lesson/${item.chapter}`} className="group rounded-3xl border border-white/10 bg-white/[.055] p-6 transition hover:-translate-y-1 hover:border-[var(--gold)]/35 hover:bg-white/[.08]"><div className="flex items-center justify-between"><span className="text-sm font-bold text-[var(--gold)]">CHAPTER {String(item.chapter).padStart(2, "0")}</span><ArrowRight className="size-4 transition group-hover:translate-x-1" /></div><h3 className="mt-5 font-serif text-2xl font-bold">{title(item)}</h3><p className="mt-1 text-sm text-white/45">{item.title.ko}</p><p className="mt-6 text-xs text-white/40">{item.vocabularyCount} শব্দ · {item.practiceCount} অনুশীলন</p></Link>)}</div></div></section>

    <section className="container py-20 md:py-28"><div className="relative overflow-hidden rounded-[2.5rem] bg-[var(--gold)] p-8 md:p-14"><div className="sacred-grid absolute inset-0 opacity-20" /><div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center"><div><p className="eyebrow text-[var(--navy)]">আপনার লক্ষ্য অপেক্ষা করছে</p><h2 className="mt-3 max-w-3xl font-serif text-4xl font-bold leading-tight text-[var(--navy)] md:text-5xl">আজ একটি অধ্যায়। আগামীকাল কোরিয়ায় আরও আত্মবিশ্বাস।</h2><p className="mt-4 max-w-2xl leading-7 text-[var(--navy)]/65">নিজের গতিতে শেখা শুরু করুন। সাইন ইন না করেও অগ্রগতি এই ডিভাইসে সংরক্ষিত থাকবে।</p></div><Link href="/curriculum"><Button className="h-14 rounded-full bg-[var(--navy)] px-8 text-base text-white">এখনই শুরু করুন <ArrowRight className="size-4" /></Button></Link></div></div></section>
  </>;
}
