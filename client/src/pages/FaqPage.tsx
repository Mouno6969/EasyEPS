import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  BookOpenText,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  GraduationCap,
  Headphones,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const categories = {
  start: { label: "শুরু ও পড়ার পদ্ধতি", icon: BookOpenText },
  progress: { label: "অগ্রগতি ও অ্যাকাউন্ট", icon: UserRound },
  test: { label: "পরীক্ষা ও সার্টিফিকেট", icon: GraduationCap },
  tech: { label: "অডিও ও প্রযুক্তি", icon: Headphones },
  official: { label: "সরকারি তথ্য ও সীমা", icon: ShieldCheck },
} as const;

type Category = keyof typeof categories;

const faqs: ReadonlyArray<{ category: Category; q: string; a: string }> = [
  {
    category: "start",
    q: "EasyEPS-এ শেখা শুরু করতে কী লাগবে?",
    a: "কোনো পূর্বজ্ঞান বা অ্যাকাউন্ট বাধ্যতামূলক নয়। একদম নতুন হলে হ্যাঙ্গুল বেসিকে জামো, উচ্চারণ, লেখা ও অক্ষর গঠন শেষ করুন। এরপর ৬০ অধ্যায়ের পাঠ্যক্রমে শব্দ, ব্যাকরণ, সংলাপ, অনুশীলন ও অধ্যায় পরীক্ষা অনুসরণ করুন।",
  },
  {
    category: "start",
    q: "আমি আগে থেকেই হ্যাঙ্গুল পড়তে পারি—কোথা থেকে শুরু করব?",
    a: "বেসিক ট্র্যাক দ্রুত দেখে দুর্বল অংশগুলো ঠিক করুন, তারপর পাঠ্যক্রমের অধ্যায় ১ থেকে শুরু করুন। পরিচিত বিষয় হলে অধ্যায়ের অনুশীলন বা পরীক্ষা দিয়ে নিজের অবস্থান যাচাই করে পরের অধ্যায়ে যেতে পারেন।",
  },
  {
    category: "start",
    q: "প্রতিদিন কতক্ষণ পড়া ভালো?",
    a: "যে সময় নিয়মিত রাখা সম্ভব, সেটিই সেরা। ১৫ মিনিটে পুরোনো শব্দ ও একটি ছোট অনুশীলন, ৩০ মিনিটে রিভিউসহ নতুন পাঠ, আর ৬০ মিনিটে অধ্যায়, শোনা, অনুশীলন ও ভুল বিশ্লেষণ করুন। পড়ার পরিকল্পনা পাতায় নিজের দৈনিক লক্ষ্য সেট করতে পারেন।",
  },
  {
    category: "start",
    q: "একটি অধ্যায় কীভাবে পড়ব?",
    a: "প্রথমে শব্দ শুনে জোরে বলুন, তারপর ব্যাকরণের উদাহরণ দিয়ে নিজের বাক্য বানান। সংলাপ প্রথমবার লেখা না দেখে শুনুন, অনুশীলন শেষ করুন, এবং ভুল উত্তরের ব্যাখ্যা পড়ে রিভিউ তালিকায় ফিরে আসুন।",
  },
  {
    category: "progress",
    q: "অ্যাকাউন্ট ছাড়া কি অগ্রগতি সংরক্ষিত থাকে?",
    a: "হ্যাঁ। অতিথি অবস্থায় অগ্রগতি এই ব্রাউজার ও ডিভাইসের স্থানীয় সংরক্ষণে থাকে। ব্রাউজারের ডেটা মুছে ফেললে বা অন্য ডিভাইসে গেলে সেই স্থানীয় অগ্রগতি পাওয়া নাও যেতে পারে। স্থায়ী সিঙ্কের জন্য সাইন ইন করুন।",
  },
  {
    category: "progress",
    q: "অতিথি অগ্রগতি সাইন ইনের পর থাকবে?",
    a: "সাইন ইন করলে এই ডিভাইসের অধ্যায় অগ্রগতি, পরীক্ষা ও পড়ার সময় অ্যাকাউন্টের তথ্যের সঙ্গে মেশানো হয়। একই আইটেমে ভালো বা বেশি সম্পূর্ণ অগ্রগতি অগ্রাধিকার পায়।",
  },
  {
    category: "progress",
    q: "একাধিক ডিভাইসে পড়তে পারব?",
    a: "সাইন ইন করা থাকলে সমর্থিত অগ্রগতি অ্যাকাউন্টে সংরক্ষিত হয় এবং অন্য ডিভাইসে পাওয়া যায়। অতিথি অগ্রগতি শুধু বর্তমান ব্রাউজারেই থাকে। নতুন ডিভাইসে পড়ার আগে সাইন ইন নিশ্চিত করুন।",
  },
  {
    category: "progress",
    q: "পড়ার পরিকল্পনার রিমাইন্ডার কি ফোনে নোটিফিকেশন পাঠায়?",
    a: "বর্তমান পরিকল্পনা পাতায় লক্ষ্য, পরীক্ষার তারিখ, পছন্দের সময় ও অধ্যায়ভিত্তিক কাজ সাজানো যায়। সময়টি আপনার রুটিনের রেফারেন্স; ব্রাউজার বা ফোনে নিশ্চিত পুশ নোটিফিকেশন ধরে নেবেন না।",
  },
  {
    category: "test",
    q: "মক টেস্টের স্কোর কি অফিসিয়াল ফলাফল?",
    a: "না। EasyEPS-এর মক টেস্ট শেখা ও প্রস্তুতি যাচাইয়ের অনুশীলনমাত্র। এটি HRD Korea-এর অফিসিয়াল পরীক্ষা, যোগ্যতা বা ফলাফলের বিকল্প নয়। অফিসিয়াল ফলাফল সংশ্লিষ্ট সরকারি সাইটে যাচাই করুন।",
  },
  {
    category: "test",
    q: "মক টেস্ট কীভাবে সবচেয়ে ভালোভাবে ব্যবহার করব?",
    a: "প্রথমবার সহায়তা ছাড়া সময় মেনে টেস্ট দিন। জমা দেওয়ার পর শুধু স্কোর নয়, কোন ধরনের প্রশ্নে ভুল হচ্ছে তা লিখে রাখুন। দুর্বল শব্দ ও বিষয় রিভিউ করে কয়েক দিন পর নতুন প্রশ্নসেট বা আরেকটি মক টেস্ট দিন।",
  },
  {
    category: "test",
    q: "EasyEPS সার্টিফিকেট কীভাবে পাব?",
    a: "প্রোফাইলে সঠিক নাম, ইমেইল ও ছবি সম্পূর্ণ করুন। প্ল্যাটফর্মে দেখানো শেখার যোগ্যতা পূরণ হলে প্রোফাইল থেকে EasyEPS শেখার সার্টিফিকেট ইস্যু করা যায়। এটি EasyEPS-এর অর্জনপত্র—সরকারি EPS-TOPIK সনদ নয়।",
  },
  {
    category: "tech",
    q: "Listening অনুশীলনে script আগে দেখা যায় না কেন?",
    a: "পরীক্ষার মতো মনোযোগ দিয়ে শোনার অভ্যাস গড়তে জমা দেওয়ার আগে script লুকানো থাকে। উত্তর দেওয়ার পর লিখিত অংশ ও ব্যাখ্যা দেখে আবার শুনুন এবং যে শব্দগুলো ধরতে পারেননি সেগুলো নোট করুন।",
  },
  {
    category: "tech",
    q: "কোরিয়ান অডিও না বাজলে কী করব?",
    a: "ডিভাইসের ভলিউম ও silent mode পরীক্ষা করুন, Chrome/Edge/Safari-এর হালনাগাদ সংস্করণ ব্যবহার করুন এবং ব্রাউজারে অডিও অনুমতি দিন। কণ্ঠ ব্রাউজারের speech service-এর উপর নির্ভর করে, তাই ডিভাইসভেদে উচ্চারণ বা কণ্ঠ আলাদা হতে পারে।",
  },
  {
    category: "tech",
    q: "এআই শিক্ষককে কী ধরনের প্রশ্ন করা উচিত?",
    a: "কোনো ব্যাকরণ সহজ বাংলায় বোঝানো, শব্দের ব্যবহার তুলনা, একটি বাক্য সংশোধন বা কর্মক্ষেত্রের সংলাপ অনুশীলনের মতো প্রশ্ন করুন। এআই উত্তর ভুল হতে পারে—অফিসিয়াল নীতি, আইন, ভিসা, স্বাস্থ্য বা চাকরির সিদ্ধান্তের জন্য এটি ব্যবহার করবেন না।",
  },
  {
    category: "official",
    q: "EasyEPS কি সরকারি EPS-TOPIK ওয়েবসাইট?",
    a: "না। EasyEPS একটি স্বাধীন শিক্ষাসহায়ক প্ল্যাটফর্ম। এটি HRD Korea, EPS বা কোনো সরকারি সংস্থার অফিসিয়াল সেবা নয়। পরীক্ষার তারিখ, নিবন্ধন, ফলাফল ও নীতির জন্য সর্বদা সরকারি উৎস অনুসরণ করুন।",
  },
  {
    category: "official",
    q: "অফিসিয়াল বই ও নোটিশ কোথায় পাব?",
    a: "HRD Korea EPS-TOPIK সাইটে পরীক্ষার নোটিশ, সময়সূচি, ফলাফল, ওপেন টেস্ট এবং স্বশিক্ষা উপকরণ রয়েছে। এই পাতার সরকারি রিসোর্স অংশ থেকে EPS-TOPIK হোম, বাংলাদেশি শিক্ষার্থীদের স্বশিক্ষা বই এবং Employment Permit System-এ যেতে পারেন।",
  },
  {
    category: "official",
    q: "ভিসা, চাকরি বা আইনি পরামর্শ কি EasyEPS দেয়?",
    a: "না। EasyEPS ভাষা, কর্মক্ষেত্রের যোগাযোগ ও পরীক্ষা প্রস্তুতিতে সহায়তা করে। ভিসা, নিয়োগ, চুক্তি, স্বাস্থ্য, নিরাপত্তা বা আইনি সিদ্ধান্তের জন্য সংশ্লিষ্ট সরকারি দপ্তর, অনুমোদিত প্রতিষ্ঠান বা যোগ্য পেশাজীবীর নির্দেশনা নিন।",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<string | null>(faqs[0]?.q ?? null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("bn");
    return faqs.filter(item => {
      const categoryMatches = category === "all" || item.category === category;
      const textMatches = !needle || `${item.q} ${item.a}`.toLocaleLowerCase("bn").includes(needle);
      return categoryMatches && textMatches;
    });
  }, [category, query]);

  return (
    <>
      <section className="border-b border-[var(--navy)]/10 bg-[radial-gradient(circle_at_85%_20%,rgba(204,166,92,.18),transparent_28%)]">
        <div className="container grid gap-8 py-12 md:py-16 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="eyebrow">শেখার সহায়তা</p>
            <h1 className="mt-3 font-serif text-4xl font-bold text-[var(--navy)] md:text-5xl">প্রশ্নোত্তর ও ব্যবহার নির্দেশিকা</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--navy)]/68 md:text-lg">
              কোথা থেকে শুরু করবেন, কীভাবে পড়বেন, অগ্রগতি কোথায় থাকে এবং অফিসিয়াল তথ্য কোথায় পাবেন—সহজ বাংলায় উত্তর খুঁজুন।
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--navy)]/10 bg-white/65 px-4 py-3 text-sm font-semibold text-[var(--navy)]/65">
            <CircleHelp className="size-5 text-[var(--gold-dark)]" />
            {faqs.length}টি সাধারণ প্রশ্ন
          </div>
        </div>
      </section>

      <div className="container py-10">
        <div className="paper-card p-4 md:p-5">
          <label className="relative block">
            <span className="sr-only">প্রশ্ন খুঁজুন</span>
            <Search className="absolute left-4 top-3.5 size-5 text-[var(--navy)]/40" />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="যেমন: মক টেস্ট, অডিও, অগ্রগতি বা সার্টিফিকেট"
              className="h-12 rounded-2xl border-[var(--navy)]/12 bg-[var(--cream)] pl-12"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="প্রশ্নের বিভাগ">
            <button
              type="button"
              onClick={() => setCategory("all")}
              aria-pressed={category === "all"}
              className={`filter-pill ${category === "all" ? "filter-pill-active" : ""}`}
            >
              সব প্রশ্ন
            </button>
            {Object.entries(categories).map(([key, value]) => {
              const Icon = value.icon;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setCategory(key as Category)}
                  aria-pressed={category === key}
                  className={`filter-pill inline-flex items-center gap-1.5 ${category === key ? "filter-pill-active" : ""}`}
                >
                  <Icon className="size-3.5" />
                  {value.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_310px] lg:items-start">
          <section aria-live="polite">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-[var(--navy)]/60">{filtered.length}টি উত্তর পাওয়া গেছে</p>
              {(query || category !== "all") && (
                <button type="button" onClick={() => { setQuery(""); setCategory("all"); }} className="text-sm font-bold text-[var(--gold-dark)] underline">
                  ফিল্টার মুছুন
                </button>
              )}
            </div>
            {filtered.length ? (
              <div className="space-y-3">
                {filtered.map(item => {
                  const isOpen = open === item.q;
                  const panelId = `faq-${faqs.indexOf(item)}`;
                  return (
                    <article key={item.q} className="paper-card overflow-hidden">
                      <button
                        type="button"
                        id={`${panelId}-trigger`}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left"
                        onClick={() => setOpen(isOpen ? null : item.q)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                      >
                        <span>
                          <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[.14em] text-[var(--gold-dark)]">
                            {categories[item.category].label}
                          </span>
                          <span className="font-bold leading-6 text-[var(--navy)]">{item.q}</span>
                        </span>
                        <ChevronDown className={`size-5 shrink-0 text-[var(--navy)]/40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen ? (
                        <div
                          id={panelId}
                          role="region"
                          aria-labelledby={`${panelId}-trigger`}
                          className="border-t border-[var(--navy)]/8 px-5 pb-5 pt-4 text-sm leading-7 text-[var(--navy)]/70"
                        >
                          {item.a}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="paper-card px-6 py-14 text-center">
                <CircleHelp className="mx-auto size-8 text-[var(--gold-dark)]" />
                <h2 className="mt-4 font-serif text-2xl font-bold text-[var(--navy)]">এই শব্দে কোনো উত্তর পাওয়া যায়নি</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--navy)]/55">অন্য একটি ছোট শব্দ লিখুন অথবা সব প্রশ্নে ফিরে যান।</p>
                <Button onClick={() => { setQuery(""); setCategory("all"); }} variant="outline" className="mt-5 rounded-full border-[var(--navy)]/15">
                  সব প্রশ্ন দেখুন
                </Button>
              </div>
            )}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-28">
            <div className="rounded-3xl bg-[var(--navy)] p-6 text-white">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--gold)]">দ্রুত শুরু</p>
              <h2 className="mt-3 font-serif text-2xl font-bold">আজই প্রথম ধাপ নিন</h2>
              <p className="mt-3 text-sm leading-7 text-white/62">একদম নতুন হলে হ্যাঙ্গুল বেসিক, আর বর্ণমালা জানা থাকলে পাঠ্যক্রম থেকে শুরু করুন।</p>
              <div className="mt-6 grid gap-2">
                <Link href="/basics">
                  <Button className="w-full justify-between rounded-full bg-[var(--gold)] text-[var(--navy)] hover:bg-[var(--gold)]/90">
                    হ্যাঙ্গুল বেসিক
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/curriculum" className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white/75 hover:bg-white/8 hover:text-white">
                  পাঠ্যক্রম দেখুন
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            <div className="paper-card p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--sage)]/15 text-[var(--sage-dark)]"><ShieldCheck className="size-5" /></span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[var(--gold-dark)]">সরকারি উৎস</p>
                  <h2 className="mt-1 font-serif text-xl font-bold text-[var(--navy)]">যাচাই করে সিদ্ধান্ত নিন</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--navy)]/58">নোটিশ, নিবন্ধন, ফলাফল ও নীতির জন্য নিচের সরকারি সাইট ব্যবহার করুন।</p>
              <div className="mt-5 grid gap-3 text-sm font-bold text-[var(--navy)]">
                <a href="https://epstopik.hrdkorea.or.kr/epstopik/home/main/mainPage.do?lang=en" target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl bg-[var(--cream)] px-3 py-2.5">
                  EPS-TOPIK
                  <ExternalLink className="size-3.5" />
                </a>
                <a href="https://epstopik.hrdkorea.or.kr/epstopik/book/self/ebookIndex.do?lang=en" target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl bg-[var(--cream)] px-3 py-2.5">
                  স্বশিক্ষা বই
                  <ExternalLink className="size-3.5" />
                </a>
                <a href="https://www.eps.go.kr" target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl bg-[var(--cream)] px-3 py-2.5">
                  Employment Permit System
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
