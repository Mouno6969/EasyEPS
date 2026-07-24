import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  GraduationCap,
  Headphones,
  Languages,
  ListChecks,
  MessageCircleMore,
  RefreshCcw,
  Route,
  ShieldCheck,
  Sparkles,
  SpellCheck2,
} from "lucide-react";
import { Link } from "wouter";

const learningPath = [
  {
    number: "০১",
    eyebrow: "ভিত্তি তৈরি",
    title: "হ্যাঙ্গুল চিনুন",
    text: "জামো, ধ্বনি, লেখা ও অক্ষর গঠন অনুশীলন করে কোরিয়ান পড়ার ভিত্তি তৈরি করুন।",
    href: "/basics",
    cta: "বেসিক শুরু",
    icon: SpellCheck2,
    tone: "sage",
  },
  {
    number: "০২",
    eyebrow: "বিষয়ভিত্তিক শেখা",
    title: "অধ্যায় ধরে এগোন",
    text: "শব্দ, ব্যাকরণ, সংলাপ ও বাস্তব কর্মক্ষেত্রের পরিস্থিতি একটি ধারাবাহিক পথে শিখুন।",
    href: "/curriculum",
    cta: "পাঠ্যক্রম দেখুন",
    icon: BookOpenCheck,
    tone: "gold",
  },
  {
    number: "০৩",
    eyebrow: "দুর্বলতা ঠিক করুন",
    title: "ভুল থেকে রিভিউ",
    text: "অনুশীলনের ভুল ও বাকি রিভিউ এক জায়গায় দেখে গুরুত্বপূর্ণ বিষয়গুলো আবার ঝালিয়ে নিন।",
    href: "/dashboard",
    cta: "অগ্রগতি দেখুন",
    icon: RefreshCcw,
    tone: "clay",
  },
  {
    number: "০৪",
    eyebrow: "সময় মেনে অনুশীলন",
    title: "মক টেস্ট দিন",
    text: "পরীক্ষার মতো পরিবেশে সময় ধরে প্রশ্ন সমাধান করুন, তারপর ভুলের ব্যাখ্যা পড়ুন।",
    href: "/mock-test",
    cta: "মক টেস্ট",
    icon: GraduationCap,
    tone: "navy",
  },
] as const;

const studyPlans = [
  {
    time: "১৫ মিনিট",
    title: "ব্যস্ত দিনের রুটিন",
    description: "শেখার ধারাবাহিকতা ধরে রাখার জন্য ছোট কিন্তু কার্যকর সেশন।",
    tasks: ["৫ মিনিট পুরোনো শব্দ রিভিউ", "৭ মিনিট নতুন শব্দ ও উচ্চারণ", "৩ মিনিট দ্রুত অনুশীলন"],
  },
  {
    time: "৩০ মিনিট",
    title: "দৈনিক ভারসাম্য",
    description: "নতুন শেখা, শোনা এবং মনে রাখার মধ্যে সঠিক ভারসাম্য।",
    tasks: ["১০ মিনিট নির্ধারিত রিভিউ", "১৫ মিনিট নতুন পাঠ", "৫ মিনিট জোরে বলা ও লেখা"],
    featured: true,
  },
  {
    time: "৬০ মিনিট",
    title: "গভীর প্রস্তুতি",
    description: "অধ্যায়, সংলাপ, অনুশীলন এবং ভুল বিশ্লেষণসহ পূর্ণ সেশন।",
    tasks: ["২০ মিনিট নতুন অধ্যায়", "১৫ মিনিট শোনা ও সংলাপ", "১৫ মিনিট অনুশীলন", "১০ মিনিট ভুলের খাতা"],
  },
] as const;

const lessonLoop = [
  { icon: Languages, title: "শব্দভাণ্ডার", text: "শুনুন, অর্থ বুঝুন, তারপর না দেখে উচ্চারণ করুন।" },
  { icon: Sparkles, title: "ব্যাকরণ", text: "একটি গঠন বুঝে নিজের তিনটি ছোট বাক্য বানান।" },
  { icon: Headphones, title: "সংলাপ ও শোনা", text: "প্রথমে শুধু শুনুন, পরে লেখা দেখে আবার শুনুন।" },
  { icon: ListChecks, title: "অনুশীলন", text: "উত্তর দিন এবং ভুল হলে ব্যাখ্যাটি সঙ্গে সঙ্গে পড়ুন।" },
  { icon: RefreshCcw, title: "পরীক্ষা ও রিভিউ", text: "ফলাফল দেখে দুর্বল বিষয়গুলো ড্যাশবোর্ড থেকে পুনরাবৃত্তি করুন।" },
] as const;

const readinessItems = [
  "হ্যাঙ্গুল পড়া ও মৌলিক উচ্চারণে স্বচ্ছন্দ",
  "শব্দ, ব্যাকরণ ও সংলাপ নিয়মিত রিভিউ করা হয়েছে",
  "সহায়তা ছাড়া সময় ধরে মক টেস্ট দেওয়ার অভ্যাস হয়েছে",
  "ভুল উত্তরের কারণ লিখে বা বলে ব্যাখ্যা করতে পারেন",
  "পরীক্ষার তারিখ ও নিবন্ধন সরকারি উৎস থেকে যাচাই করেছেন",
] as const;

export function LearningRoadmapSection() {
  return (
    <section className="container py-20 md:py-28" aria-labelledby="learning-roadmap-title">
      <div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
        <div>
          <p className="eyebrow">আপনার শেখার পথ</p>
          <h2 id="learning-roadmap-title" className="mt-3 font-serif text-4xl font-bold tracking-tight text-[var(--navy)] md:text-5xl">
            কোথা থেকে শুরু, এরপর কী?
          </h2>
        </div>
        <p className="max-w-2xl text-base leading-8 text-[var(--navy)]/62 lg:justify-self-end">
          এলোমেলোভাবে পড়ার বদলে এই চারটি ধাপ অনুসরণ করুন। আগে বর্ণমালা, তারপর বিষয়ভিত্তিক পাঠ, নিয়মিত রিভিউ এবং শেষে সময় মেনে মক টেস্ট।
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {learningPath.map(({ number, eyebrow, title, text, href, cta, icon: Icon, tone }) => (
          <article key={number} className="learning-path-card group">
            <div className="flex items-start justify-between gap-4">
              <span className={`metric-icon metric-${tone}`}>
                <Icon className="size-5" />
              </span>
              <span className="font-serif text-4xl font-bold text-[var(--navy)]/10">{number}</span>
            </div>
            <p className="mt-7 text-[11px] font-extrabold uppercase tracking-[.15em] text-[var(--gold-dark)]">{eyebrow}</p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">{title}</h3>
            <p className="mt-3 flex-1 text-sm leading-7 text-[var(--navy)]/58">{text}</p>
            <Link href={href} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--navy)]">
              {cta}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function StudyMethodSection() {
  return (
    <section className="border-y border-[var(--navy)]/8 bg-[var(--cream-deep)]/55 py-20 md:py-28" aria-labelledby="study-routine-title">
      <div className="container">
        <div className="max-w-3xl">
          <p className="eyebrow">বাস্তবসম্মত রুটিন</p>
          <h2 id="study-routine-title" className="mt-3 font-serif text-4xl font-bold tracking-tight text-[var(--navy)] md:text-5xl">
            যতটুকু সময় আছে, ততটুকুই ভালোভাবে ব্যবহার করুন
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--navy)]/62">
            প্রতিদিন একই সময় পাওয়া যায় না। আজকের সময় অনুযায়ী একটি রুটিন বেছে নিন—কম সময়েও রিভিউ বাদ দেবেন না।
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {studyPlans.map(plan => (
            <article key={plan.time} className={`study-plan-card ${"featured" in plan && plan.featured ? "study-plan-featured" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--navy)]/7 px-3 py-1.5 text-sm font-extrabold text-[var(--navy)]">
                  <Clock3 className="size-4" />
                  {plan.time}
                </span>
                {"featured" in plan && plan.featured ? <span className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[var(--gold-dark)]">প্রস্তাবিত</span> : null}
              </div>
              <h3 className="mt-5 font-serif text-2xl font-bold text-[var(--navy)]">{plan.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--navy)]/55">{plan.description}</p>
              <ul className="mt-6 space-y-3">
                {plan.tasks.map(task => (
                  <li key={task} className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--navy)]/72">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--sage-dark)]" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-6 rounded-[2rem] bg-[var(--navy)] p-6 text-white shadow-[0_24px_70px_rgba(16,37,58,.16)] md:p-9 lg:grid-cols-[.72fr_1.28fr]">
          <div className="max-w-md">
            <span className="grid size-12 place-items-center rounded-2xl bg-[var(--gold)]/15 text-[var(--gold)]">
              <Route className="size-6" />
            </span>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[.16em] text-[var(--gold)]">প্রতি অধ্যায়ে একই ছন্দ</p>
            <h3 className="mt-3 font-serif text-3xl font-bold">একটি পাঠ কীভাবে পড়বেন</h3>
            <p className="mt-4 text-sm leading-7 text-white/62">
              শুধু পড়ে শেষ করবেন না। দেখুন, শুনুন, বলুন, উত্তর দিন এবং ভুলটি আবার অনুশীলন করুন।
            </p>
            <Link href="/curriculum">
              <Button className="mt-7 rounded-full bg-[var(--gold)] px-6 text-[var(--navy)] hover:bg-[var(--gold)]/90">
                একটি অধ্যায় বেছে নিন
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {lessonLoop.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className={`rounded-2xl border border-white/9 bg-white/[.055] p-4 ${index === lessonLoop.length - 1 ? "sm:col-span-2" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/8 text-[var(--gold)]">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-bold">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/55">{text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function ReadinessResourcesSection() {
  return (
    <section className="container py-20 md:py-28" aria-labelledby="readiness-title">
      <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
        <article className="paper-card p-6 md:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow">নিজেকে যাচাই করুন</p>
              <h2 id="readiness-title" className="mt-3 font-serif text-3xl font-bold text-[var(--navy)] md:text-4xl">প্রস্তুতির চেকলিস্ট</h2>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--sage)]/15 text-[var(--sage-dark)]">
              <ClipboardCheck className="size-6" />
            </span>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--navy)]/58">
            এটি কোনো অফিসিয়াল যোগ্যতা নির্ধারণ নয়। আপনার দৈনিক প্রস্তুতি আরও সুশৃঙ্খল করতে এই তালিকাটি ব্যবহার করুন।
          </p>
          <ul className="mt-6 grid gap-3">
            {readinessItems.map(item => (
              <li key={item} className="flex items-start gap-3 rounded-2xl bg-[var(--cream)] px-4 py-3.5 text-sm font-semibold leading-6 text-[var(--navy)]/72">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--sage-dark)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/mock-test">
              <Button className="rounded-full bg-[var(--navy)] text-white">মক টেস্ট দিন</Button>
            </Link>
            <Link href="/planner">
              <Button variant="outline" className="rounded-full border-[var(--navy)]/15 bg-white">
                <CalendarClock className="size-4" />
                পড়ার পরিকল্পনা
              </Button>
            </Link>
          </div>
        </article>

        <aside className="relative overflow-hidden rounded-[2rem] bg-[var(--gold)] p-6 text-[var(--navy)] md:p-9" aria-labelledby="official-resources-title">
          <div className="sacred-grid absolute inset-0 opacity-20" />
          <div className="relative">
            <span className="grid size-12 place-items-center rounded-2xl bg-[var(--navy)] text-[var(--gold)]">
              <ShieldCheck className="size-6" />
            </span>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[.16em] text-[var(--navy)]/55">সরকারি তথ্যের জন্য</p>
            <h2 id="official-resources-title" className="mt-3 font-serif text-3xl font-bold md:text-4xl">সঠিক উৎসটি বুকমার্ক করুন</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--navy)]/68">
              EasyEPS প্রস্তুতিতে সহায়তা করে, কিন্তু পরীক্ষার সময়সূচি, নিবন্ধন, ফলাফল, ভিসা বা চাকরির সিদ্ধান্ত দেয় না। এসব তথ্য সরকারি সাইটে যাচাই করুন।
            </p>
            <div className="mt-7 grid gap-3">
              <a
                href="https://epstopik.hrdkorea.or.kr/epstopik/home/main/mainPage.do?lang=en"
                target="_blank"
                rel="noreferrer"
                className="official-resource-link"
              >
                <span>
                  <strong>HRD Korea EPS-TOPIK</strong>
                  <small>নোটিশ, সময়সূচি, ফলাফল ও পরীক্ষার তথ্য</small>
                </span>
                <ExternalLink className="size-4 shrink-0" />
              </a>
              <a
                href="https://epstopik.hrdkorea.or.kr/epstopik/book/self/ebookIndex.do?lang=en"
                target="_blank"
                rel="noreferrer"
                className="official-resource-link"
              >
                <span>
                  <strong>অফিসিয়াল স্বশিক্ষা বই</strong>
                  <small>বাংলাদেশি শিক্ষার্থীদের বইসহ শেখার উপকরণ</small>
                </span>
                <ExternalLink className="size-4 shrink-0" />
              </a>
              <a href="https://www.eps.go.kr" target="_blank" rel="noreferrer" className="official-resource-link">
                <span>
                  <strong>Employment Permit System</strong>
                  <small>সরকারি EPS সেবা ও কর্মী তথ্য</small>
                </span>
                <ExternalLink className="size-4 shrink-0" />
              </a>
            </div>
            <Link href="/faq" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold">
              আরও সাধারণ প্রশ্ন দেখুন
              <MessageCircleMore className="size-4" />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
