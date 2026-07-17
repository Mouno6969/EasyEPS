import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startLogin } from "@/const";
import { useLocale } from "@/contexts/LocaleContext";
import {
  addPlannerItem,
  learningOverview,
  removePlannerItem,
  savePlannerSettings,
  setPlannerItemDone,
  useLocalLearning,
} from "@/lib/localProgress";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Award,
  BarChart3,
  BookCheck,
  BookOpenText,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Medal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

const categories = {
  "daily-life": { bn: "দৈনন্দিন জীবন", ko: "일상생활", en: "Daily life", color: "var(--sage)" },
  culture: { bn: "কোরিয়ান সংস্কৃতি", ko: "한국 문화", en: "Korean culture", color: "var(--clay)" },
  workplace: { bn: "কর্মক্ষেত্র", ko: "직장 생활", en: "Workplace", color: "var(--navy)" },
  safety: { bn: "নিরাপত্তা", ko: "산업 안전", en: "Safety", color: "#a0483e" },
  laws: { bn: "আইন ও কর্মসংস্থান", ko: "법과 고용", en: "Laws & employment", color: "#6e5b8f" },
} as const;

type CategoryKey = keyof typeof categories;

function localTitle(title: { bn: string; ko: string; en: string }, locale: "bn" | "ko" | "en") {
  return title[locale];
}

function PageIntro({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--navy)]/10 bg-[radial-gradient(circle_at_85%_20%,rgba(204,166,92,.18),transparent_28%)]">
      <div className="container flex flex-col gap-6 py-12 md:flex-row md:items-end md:justify-between md:py-16">
        <div className="max-w-3xl"><p className="eyebrow">{eyebrow}</p><h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-[var(--navy)] md:text-5xl">{title}</h1><p className="mt-4 max-w-2xl text-base leading-8 text-[var(--navy)]/68 md:text-lg">{description}</p></div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </section>
  );
}

function LoadingPanel() {
  return <div className="container py-24 text-center"><Loader2 className="mx-auto size-7 animate-spin text-[var(--gold-dark)]" /><p className="mt-4 text-sm font-semibold text-[var(--navy)]/60">পাঠ্যক্রম লোড হচ্ছে…</p></div>;
}

function AuthInvitation({ title, description }: { title: string; description: string }) {
  return <div className="paper-card mx-auto max-w-2xl p-8 text-center md:p-12"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--gold)]/18 text-[var(--gold-dark)]"><LockKeyhole className="size-6" /></span><h2 className="mt-5 font-serif text-2xl font-bold text-[var(--navy)]">{title}</h2><p className="mx-auto mt-3 max-w-lg leading-7 text-[var(--navy)]/65">{description}</p><Button onClick={() => startLogin()} className="mt-7 rounded-full bg-[var(--navy)] px-6 text-white">সাইন ইন করুন</Button></div>;
}

export function CurriculumPage() {
  const { locale } = useLocale();
  const state = useLocalLearning();
  const { data: lessons = [], isLoading, error } = trpc.curriculum.list.useQuery();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | CategoryKey>("all");
  const filtered = useMemo(() => lessons.filter(lesson => {
    const haystack = `${lesson.chapter} ${lesson.title.bn} ${lesson.title.ko} ${lesson.title.en}`.toLowerCase();
    return (category === "all" || lesson.category === category) && haystack.includes(query.toLowerCase().trim());
  }), [lessons, query, category]);

  return <>
    <PageIntro eyebrow="৬০ অধ্যায় · শূন্য থেকে EPS-TOPIK" title="আপনার সম্পূর্ণ কোরিয়ান পাঠ্যক্রম" description="দৈনন্দিন জীবন থেকে শিল্প নিরাপত্তা ও কর্মসংস্থান আইন—প্রতিটি অধ্যায়ে শব্দভাণ্ডার, ব্যাকরণ, সংলাপ, অনুশীলন এবং EPS-ধাঁচের পরীক্ষা।" />
    <section className="container py-10">
      <div className="paper-card p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative"><Search className="absolute left-4 top-3.5 size-5 text-[var(--navy)]/40" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="অধ্যায়, বিষয় বা Korean title খুঁজুন" className="h-12 rounded-2xl border-[var(--navy)]/12 bg-[var(--cream)] pl-12" /></label>
          <div className="flex flex-wrap gap-2"><button onClick={() => setCategory("all")} className={`filter-pill ${category === "all" ? "filter-pill-active" : ""}`}>সব</button>{Object.entries(categories).map(([key, value]) => <button key={key} onClick={() => setCategory(key as CategoryKey)} className={`filter-pill ${category === key ? "filter-pill-active" : ""}`}>{value.bn}</button>)}</div>
        </div>
      </div>
      {isLoading ? <LoadingPanel /> : error ? <div className="paper-card mt-8 p-8 text-center text-red-700">পাঠ্যক্রম লোড করা যায়নি: {error.message}</div> : <>
        <div className="mb-5 mt-9 flex items-center justify-between"><p className="font-semibold text-[var(--navy)]">{filtered.length}টি অধ্যায়</p><p className="text-sm text-[var(--navy)]/55">সম্পন্ন: {Object.values(state.progress).filter(item => item.completed).length}/60</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(lesson => {
            const progress = state.progress[lesson.chapter];
            const info = categories[lesson.category as CategoryKey];
            return <Link key={lesson.chapter} href={`/lesson/${lesson.chapter}`} className="lesson-card group">
              <div className="flex items-start justify-between gap-4"><span className="chapter-number">{String(lesson.chapter).padStart(2, "0")}</span>{progress?.completed ? <span className="status-done"><Check className="size-3.5" />সম্পন্ন</span> : <span className="status-open">শুরু করুন</span>}</div>
              <div className="mt-6"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: info.color }}><span className="size-2 rounded-full" style={{ background: info.color }} />{locale === "ko" ? info.ko : locale === "en" ? info.en : info.bn}</div><h2 className="mt-3 font-serif text-2xl font-bold leading-tight text-[var(--navy)]">{localTitle(lesson.title, locale)}</h2>{locale !== "ko" && <p className="mt-1 text-base font-semibold text-[var(--navy)]/45">{lesson.title.ko}</p>}</div>
              <div className="mt-7 flex items-center justify-between border-t border-[var(--navy)]/8 pt-4 text-sm text-[var(--navy)]/55"><span>{lesson.vocabularyCount} শব্দ · {lesson.practiceCount} অনুশীলন</span><ChevronRight className="size-5 transition-transform group-hover:translate-x-1" /></div>
            </Link>;
          })}
        </div>
      </>}
    </section>
  </>;
}

export function DashboardPage() {
  const state = useLocalLearning();
  const overview = learningOverview(state);
  const { isAuthenticated } = useAuth();
  const server = trpc.progress.overview.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const metrics = server.data ? {
    completedLessons: Math.max(overview.completedLessons, server.data.completedLessons),
    averageScore: server.data.averageScore || overview.averageScore,
    streak: Math.max(overview.streak, server.data.streak),
    studyMinutes: Math.max(overview.studyMinutes, server.data.studyMinutes),
  } : overview;
  const nextChapter = Math.min(60, Math.max(1, Object.values(state.progress).filter(item => item.completed).length + 1));
  const recent = state.attempts.slice(0, 6);
  const studyDays = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); const key = date.toISOString().slice(0, 10); return { key, label: date.toLocaleDateString("bn-BD", { weekday: "short" }), minutes: state.studyDays[key]?.minutes ?? 0 }; });
  const maxMinutes = Math.max(30, ...studyDays.map(day => day.minutes));

  return <>
    <PageIntro eyebrow="আপনার শেখার যাত্রা" title="অগ্রগতি এক নজরে" description="ছোট ছোট নিয়মিত পদক্ষেপই আপনাকে EPS-TOPIK লক্ষ্যের কাছে নিয়ে যাবে।" actions={<Link href={`/lesson/${nextChapter}`}><Button className="rounded-full bg-[var(--navy)] px-6 text-white">পরবর্তী অধ্যায় <ChevronRight className="size-4" /></Button></Link>} />
    <div className="container py-10">
      {!isAuthenticated && <div className="mb-7 flex flex-col gap-3 rounded-2xl border border-[var(--gold)]/35 bg-[var(--gold)]/10 p-4 text-sm text-[var(--navy)] md:flex-row md:items-center md:justify-between"><span><strong>অতিথি মোড:</strong> অগ্রগতি এই ডিভাইসে সংরক্ষিত। সাইন ইন করলে একাধিক ডিভাইসে সিঙ্ক হবে।</span><Button onClick={() => startLogin()} variant="outline" className="rounded-full border-[var(--navy)]/20">সাইন ইন</Button></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "সম্পন্ন অধ্যায়", value: `${metrics.completedLessons}/60`, icon: BookCheck, tone: "sage" }, { label: "গড় স্কোর", value: `${metrics.averageScore}%`, icon: TrendingUp, tone: "gold" }, { label: "বর্তমান স্ট্রিক", value: `${metrics.streak} দিন`, icon: Flame, tone: "clay" }, { label: "মোট অধ্যয়ন", value: `${metrics.studyMinutes} মিনিট`, icon: Clock3, tone: "navy" }].map(({ label, value, icon: Icon, tone }) => <div key={label} className="metric-card"><span className={`metric-icon metric-${tone}`}><Icon className="size-5" /></span><p className="mt-5 text-sm font-semibold text-[var(--navy)]/55">{label}</p><p className="mt-1 font-serif text-3xl font-bold text-[var(--navy)]">{value}</p></div>)}
      </div>
      <div className="mt-7 grid gap-7 lg:grid-cols-[1.25fr_.75fr]">
        <section className="paper-card p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">গত ৭ দিন</p><h2 className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">অধ্যয়নের ধারাবাহিকতা</h2></div><BarChart3 className="size-6 text-[var(--gold-dark)]" /></div><div className="mt-8 flex h-56 items-end gap-3">{studyDays.map(day => <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold text-[var(--navy)]/45">{day.minutes || ""}</span><div className="w-full max-w-14 rounded-t-xl bg-[var(--sage)] transition-all" style={{ height: `${Math.max(5, day.minutes / maxMinutes * 100)}%` }} /><span className="text-xs font-semibold text-[var(--navy)]/55">{day.label}</span></div>)}</div></section>
        <section className="paper-card p-6"><p className="eyebrow">এখনই করুন</p><h2 className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">আজকের সুপারিশ</h2><div className="mt-6 rounded-2xl bg-[var(--navy)] p-5 text-white"><span className="text-xs font-bold uppercase tracking-wider text-[var(--gold)]">অধ্যায় {nextChapter}</span><p className="mt-2 text-lg font-bold">২০ মিনিট নতুন পাঠ</p><p className="mt-2 text-sm leading-6 text-white/65">শব্দভাণ্ডার পড়ুন, দুটি সংলাপ শুনুন এবং অনুশীলন সম্পন্ন করুন।</p><Link href={`/lesson/${nextChapter}`} className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[var(--gold)]">শুরু করুন <ChevronRight className="size-4" /></Link></div></section>
      </div>
      <section className="paper-card mt-7 overflow-hidden"><div className="border-b border-[var(--navy)]/8 p-6"><h2 className="font-serif text-2xl font-bold text-[var(--navy)]">সাম্প্রতিক ফলাফল</h2></div>{recent.length ? <div className="divide-y divide-[var(--navy)]/8">{recent.map(item => <div key={item.id} className="flex items-center justify-between gap-4 p-5"><div><p className="font-bold text-[var(--navy)]">{item.kind === "mock-test" ? "পূর্ণাঙ্গ মক টেস্ট" : item.kind === "chapter-exam" ? `অধ্যায় ${item.chapter} পরীক্ষা` : `অধ্যায় ${item.chapter} অনুশীলন`}</p><p className="mt-1 text-xs text-[var(--navy)]/45">{new Date(item.createdAt).toLocaleString("bn-BD")}</p></div><span className="score-ring">{Math.round(item.score / item.total * 100)}%</span></div>)}</div> : <div className="p-8 text-center text-[var(--navy)]/50">এখনও কোনো পরীক্ষা দেওয়া হয়নি।</div>}</section>
    </div>
  </>;
}

export function PlannerPage() {
  const state = useLocalLearning();
  const { isAuthenticated } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [chapter, setChapter] = useState(1);
  const [kind, setKind] = useState<"lesson" | "practice" | "exam" | "review">("lesson");
  const addRemote = trpc.planner.add.useMutation();
  const doneRemote = trpc.planner.setDone.useMutation();
  const removeRemote = trpc.planner.remove.useMutation();
  const saveRemote = trpc.planner.saveSettings.useMutation();
  const sorted = [...state.planner.items].sort((a, b) => a.date.localeCompare(b.date));
  const add = () => { addPlannerItem({ date, chapter, kind }); if (isAuthenticated) addRemote.mutate({ date, chapter, kind }); toast.success("পরিকল্পনায় যোগ হয়েছে"); };

  return <>
    <PageIntro eyebrow="নিয়মিত অধ্যয়ন" title="আপনার পড়ার পরিকল্পনা" description="পরীক্ষার তারিখ, দৈনিক লক্ষ্য এবং অধ্যায়ভিত্তিক কাজ সাজিয়ে একটি বাস্তবসম্মত রুটিন তৈরি করুন।" />
    <div className="container grid gap-7 py-10 lg:grid-cols-[.8fr_1.2fr]">
      <section className="paper-card p-6"><div className="flex items-center gap-3"><span className="metric-icon metric-gold"><Target className="size-5" /></span><div><p className="eyebrow">দৈনিক লক্ষ্য</p><h2 className="font-serif text-2xl font-bold text-[var(--navy)]">নিজের গতি ঠিক করুন</h2></div></div><div className="mt-7 grid gap-5"><label className="field-label">প্রতিদিন কত মিনিট?<Input type="number" min={5} max={240} value={state.planner.dailyGoalMinutes} onChange={event => savePlannerSettings({ dailyGoalMinutes: Number(event.target.value) })} className="mt-2 h-11 rounded-xl" /></label><label className="field-label">প্রতিদিন কত অধ্যায়?<Input type="number" min={1} max={10} value={state.planner.dailyGoalLessons} onChange={event => savePlannerSettings({ dailyGoalLessons: Number(event.target.value) })} className="mt-2 h-11 rounded-xl" /></label><label className="field-label">লক্ষ্য পরীক্ষার তারিখ<Input type="date" value={state.planner.targetExamDate} onChange={event => savePlannerSettings({ targetExamDate: event.target.value })} className="mt-2 h-11 rounded-xl" /></label><label className="field-label">স্মরণ করানোর সময়<Input type="time" value={state.planner.reminderTime} onChange={event => savePlannerSettings({ reminderTime: event.target.value })} className="mt-2 h-11 rounded-xl" /></label><Button onClick={() => { if (isAuthenticated) saveRemote.mutate({ dailyGoalMinutes: state.planner.dailyGoalMinutes, dailyGoalLessons: state.planner.dailyGoalLessons, reminderTime: state.planner.reminderTime || null, targetExamDate: state.planner.targetExamDate || null }); toast.success("লক্ষ্য সংরক্ষিত হয়েছে"); }} className="rounded-full bg-[var(--navy)] text-white">লক্ষ্য সংরক্ষণ করুন</Button></div></section>
      <section className="paper-card p-6"><div className="flex items-center gap-3"><span className="metric-icon metric-sage"><CalendarDays className="size-5" /></span><div><p className="eyebrow">অধ্যয়ন সূচি</p><h2 className="font-serif text-2xl font-bold text-[var(--navy)]">কাজ যোগ করুন</h2></div></div><div className="mt-6 grid gap-3 rounded-2xl bg-[var(--cream)] p-4 md:grid-cols-[1fr_110px_1fr_auto]"><Input type="date" value={date} onChange={event => setDate(event.target.value)} className="h-11 rounded-xl bg-white" /><Input type="number" min={1} max={60} value={chapter} onChange={event => setChapter(Number(event.target.value))} className="h-11 rounded-xl bg-white" /><select value={kind} onChange={event => setKind(event.target.value as typeof kind)} className="h-11 rounded-xl border bg-white px-3 text-sm font-semibold"><option value="lesson">নতুন পাঠ</option><option value="practice">অনুশীলন</option><option value="exam">পরীক্ষা</option><option value="review">পুনরালোচনা</option></select><Button onClick={add} className="h-11 rounded-xl bg-[var(--navy)] text-white"><Plus className="size-4" /></Button></div><div className="mt-5 space-y-3">{sorted.length ? sorted.map(item => <div key={item.id} className={`flex items-center gap-4 rounded-2xl border p-4 ${item.done ? "bg-[var(--sage)]/15 opacity-65" : "bg-white"}`}><button onClick={() => { setPlannerItemDone(item.id, !item.done); if (isAuthenticated && /^\d+$/.test(item.id)) doneRemote.mutate({ id: Number(item.id), done: !item.done }); }} className={`grid size-8 shrink-0 place-items-center rounded-full border ${item.done ? "border-[var(--sage)] bg-[var(--sage)] text-white" : "border-[var(--navy)]/20"}`}>{item.done && <Check className="size-4" />}</button><div className="min-w-0 flex-1"><p className={`font-bold text-[var(--navy)] ${item.done ? "line-through" : ""}`}>অধ্যায় {item.chapter} · {item.kind === "lesson" ? "নতুন পাঠ" : item.kind === "practice" ? "অনুশীলন" : item.kind === "exam" ? "পরীক্ষা" : "পুনরালোচনা"}</p><p className="mt-1 text-xs text-[var(--navy)]/48">{new Date(`${item.date}T00:00:00`).toLocaleDateString("bn-BD", { dateStyle: "long" })}</p></div><button aria-label="Remove" onClick={() => { removePlannerItem(item.id); if (isAuthenticated && /^\d+$/.test(item.id)) removeRemote.mutate({ id: Number(item.id) }); }} className="grid size-9 place-items-center rounded-full text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button></div>) : <div className="py-10 text-center text-[var(--navy)]/45">এখনও কোনো কাজ যোগ করা হয়নি।</div>}</div></section>
    </div>
  </>;
}

export function TutorPage() {
  const { isAuthenticated } = useAuth();
  const [chapter, setChapter] = useState<number | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const mutation = trpc.tutor.chat.useMutation({ onSuccess: result => setMessages(previous => [...previous, { role: "assistant", content: result.content }]), onError: error => toast.error(error.message) });
  const send = (content: string) => { const next = [...messages, { role: "user" as const, content }]; setMessages(next); mutation.mutate({ chapter, messages: next.slice(-12).map(item => ({ role: item.role as "user" | "assistant", content: item.content })) }); };
  return <><PageIntro eyebrow="বাংলায় বুঝুন, কোরিয়ানে বলুন" title="আপনার ব্যক্তিগত EasyEPS শিক্ষক" description="ব্যাকরণ, শব্দের ব্যবহার, কর্মক্ষেত্রের সংলাপ বা প্রস্তুতির কৌশল—প্রশ্ন করুন বাংলায়।" />
    <div className="container py-10">{!isAuthenticated ? <AuthInvitation title="এআই শিক্ষক ব্যবহার করতে সাইন ইন করুন" description="সাইন ইন করলে নিরাপদভাবে প্রশ্ন করতে পারবেন এবং অধ্যায়ভিত্তিক ব্যাখ্যা পাবেন।" /> : <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><aside className="paper-card h-fit p-5"><p className="text-sm font-bold text-[var(--navy)]">অধ্যায়ের প্রসঙ্গ</p><p className="mt-2 text-sm leading-6 text-[var(--navy)]/55">একটি অধ্যায় বেছে নিলে শিক্ষক সেই পাঠের শব্দ ও ব্যাকরণ অনুযায়ী উত্তর দেবেন।</p><select value={chapter ?? ""} onChange={event => setChapter(event.target.value ? Number(event.target.value) : undefined)} className="mt-4 h-11 w-full rounded-xl border bg-white px-3 text-sm"><option value="">সাধারণ প্রশ্ন</option>{Array.from({ length: 60 }, (_, index) => <option key={index + 1} value={index + 1}>অধ্যায় {index + 1}</option>)}</select><div className="mt-5 rounded-2xl bg-[var(--gold)]/12 p-4 text-xs leading-6 text-[var(--navy)]/60"><strong>মনে রাখুন:</strong> আইন, ভিসা, স্বাস্থ্য বা জরুরি নিরাপত্তার বিষয়ে সর্বশেষ সরকারি নির্দেশনা অনুসরণ করুন।</div></aside><AIChatBox messages={messages} onSendMessage={send} isLoading={mutation.isPending} height="650px" className="overflow-hidden rounded-3xl border-[var(--navy)]/10" emptyStateMessage="কী শিখতে চান? বাংলায় প্রশ্ন করুন।" placeholder="যেমন: -아/어서 সহজভাবে বুঝিয়ে দিন" suggestedPrompts={["আজকের জন্য ২০ মিনিটের পড়ার পরিকল্পনা বানান", "কর্মক্ষেত্রে দরকারি ১০টি ভদ্র বাক্য শেখান", "EPS-TOPIK reading কীভাবে দ্রুত সমাধান করব?", "-(으)세요 ব্যাকরণটি বাংলায় বুঝিয়ে দিন"]} /></div>}</div></>;
}

export function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const state = useLocalLearning();
  const overview = learningOverview(state);
  const certificates = trpc.certificates.mine.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const issue = trpc.certificates.issue.useMutation({ onSuccess: () => { certificates.refetch(); toast.success("সার্টিফিকেট তৈরি হয়েছে"); }, onError: error => toast.error(error.message) });
  const badges = [{ id: "first-step", title: "প্রথম পদক্ষেপ", earned: overview.completedLessons >= 1, icon: Sparkles }, { id: "ten-lessons", title: "দশ অধ্যায়", earned: overview.completedLessons >= 10, icon: BookCheck }, { id: "halfway", title: "অর্ধেক পথ", earned: overview.completedLessons >= 30, icon: Medal }, { id: "perfect", title: "নিখুঁত স্কোর", earned: state.attempts.some(item => item.score === item.total), icon: Award }, { id: "ready", title: "মক টেস্ট প্রস্তুত", earned: state.attempts.some(item => item.kind === "mock-test" && item.score / item.total >= .8), icon: GraduationCap }, { id: "master", title: "পাঠ্যক্রম মাস্টার", earned: overview.completedLessons >= 60, icon: ShieldCheck }];
  return <><PageIntro eyebrow="শিক্ষার্থী পরিচিতি" title={isAuthenticated ? (user?.name || "আমার প্রোফাইল") : "অতিথি শিক্ষার্থী"} description="আপনার অর্জন, ব্যাজ, পরীক্ষার ফলাফল এবং সার্টিফিকেট এক জায়গায়।" />
    <div className="container py-10">{!isAuthenticated && <div className="mb-7 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-5 text-sm leading-7 text-[var(--navy)]"><strong>এই ডিভাইসের প্রোফাইল দেখছেন।</strong> ক্লাউড সিঙ্ক ও সার্টিফিকেটের জন্য সাইন ইন করুন। <button onClick={() => startLogin()} className="ml-1 font-bold underline">সাইন ইন</button></div>}<div className="grid gap-7 lg:grid-cols-[.7fr_1.3fr]"><section className="paper-card p-7 text-center"><span className="mx-auto grid size-24 place-items-center rounded-full bg-[var(--navy)] text-[var(--gold)]"><UserRound className="size-10" /></span><h2 className="mt-5 font-serif text-2xl font-bold text-[var(--navy)]">{user?.name || "EasyEPS Learner"}</h2><p className="mt-1 text-sm text-[var(--navy)]/50">{user?.email || "স্থানীয় শিক্ষার্থী প্রোফাইল"}</p><div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[var(--cream)] p-4"><p className="font-serif text-2xl font-bold">{overview.completedLessons}</p><p className="text-xs text-[var(--navy)]/50">অধ্যায়</p></div><div className="rounded-2xl bg-[var(--cream)] p-4"><p className="font-serif text-2xl font-bold">{overview.averageScore}%</p><p className="text-xs text-[var(--navy)]/50">গড় স্কোর</p></div></div></section><section className="paper-card p-7"><p className="eyebrow">অর্জন</p><h2 className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">আপনার ব্যাজ</h2><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{badges.map(({ id, title, earned, icon: Icon }) => <div key={id} className={`rounded-2xl border p-4 text-center ${earned ? "border-[var(--gold)]/30 bg-[var(--gold)]/10" : "border-[var(--navy)]/8 bg-[var(--cream)] opacity-45 grayscale"}`}><span className="mx-auto grid size-11 place-items-center rounded-full bg-white text-[var(--gold-dark)]"><Icon className="size-5" /></span><p className="mt-3 text-sm font-bold text-[var(--navy)]">{title}</p></div>)}</div></section></div>
      <section className="paper-card mt-7 p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">যোগ্যতার স্বীকৃতি</p><h2 className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">সার্টিফিকেট</h2></div>{isAuthenticated && <div className="flex flex-wrap gap-2"><Button onClick={() => issue.mutate({ kind: "mock-test" })} variant="outline" className="rounded-full">মক টেস্ট সার্টিফিকেট</Button><Button onClick={() => issue.mutate({ kind: "course-completion" })} className="rounded-full bg-[var(--navy)] text-white">কোর্স সার্টিফিকেট</Button></div>}</div><div className="mt-6 grid gap-4 sm:grid-cols-2">{certificates.data?.length ? certificates.data.map(certificate => <Link key={certificate.id} href={`/certificate/${certificate.code}`} className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/8 p-5"><Award className="size-6 text-[var(--gold-dark)]" /><p className="mt-3 font-bold text-[var(--navy)]">{certificate.kind === "mock-test" ? "Mock Test Excellence" : "Course Completion"}</p><p className="mt-1 text-xs text-[var(--navy)]/50">{certificate.code}</p></Link>) : <div className="col-span-full rounded-2xl bg-[var(--cream)] p-8 text-center text-[var(--navy)]/45">যোগ্যতা পূরণ করলে আপনার সার্টিফিকেট এখানে দেখা যাবে।</div>}</div></section>
    </div>
  </>;
}

export function CertificatePage() {
  const [, params] = useRoute("/certificate/:code");
  const code = params?.code ?? "";
  const query = trpc.certificates.verify.useQuery({ code }, { enabled: code.length >= 6, retry: false });
  return <div className="container py-14"><div className="mx-auto max-w-4xl rounded-[2rem] border-8 border-double border-[var(--gold)] bg-white p-7 text-center shadow-xl md:p-14"><div className="mx-auto grid size-20 place-items-center rounded-full bg-[var(--navy)] text-[var(--gold)]"><GraduationCap className="size-9" /></div><p className="mt-6 font-serif text-2xl font-bold text-[var(--navy)]">EasyEPS</p><p className="mt-2 text-sm font-bold uppercase tracking-[.25em] text-[var(--gold-dark)]">Certificate of Achievement</p>{query.isLoading ? <Loader2 className="mx-auto mt-10 size-6 animate-spin" /> : query.data ? <><p className="mt-10 text-sm text-[var(--navy)]/55">This certificate is proudly presented to</p><h1 className="mt-3 font-serif text-4xl font-bold text-[var(--navy)] md:text-5xl">{query.data.learnerName}</h1><p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[var(--navy)]/65">for {query.data.kind === "mock-test" ? `demonstrating EPS-TOPIK readiness with a score of ${query.data.scorePercent}%` : "successfully completing the 60-chapter EasyEPS learning curriculum"}.</p><div className="mt-10 grid gap-4 border-t border-[var(--navy)]/10 pt-6 text-sm sm:grid-cols-2"><div><p className="text-[var(--navy)]/40">Certificate code</p><p className="mt-1 font-bold text-[var(--navy)]">{query.data.code}</p></div><div><p className="text-[var(--navy)]/40">Issue date</p><p className="mt-1 font-bold text-[var(--navy)]">{new Date(query.data.issuedAt).toLocaleDateString()}</p></div></div><Button onClick={() => window.print()} className="mt-8 rounded-full bg-[var(--navy)] px-7 text-white print:hidden">প্রিন্ট করুন</Button></> : <div className="mt-10 rounded-2xl bg-red-50 p-8 text-red-700"><ShieldCheck className="mx-auto size-7" /><p className="mt-3 font-bold">সার্টিফিকেট পাওয়া যায়নি</p><p className="mt-2 text-sm">কোডটি সঠিক কিনা যাচাই করুন।</p></div>}</div></div>;
}

export function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const stats = trpc.admin.stats.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const users = trpc.admin.users.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const setRole = trpc.admin.setRole.useMutation({ onSuccess: () => { users.refetch(); toast.success("ভূমিকা আপডেট হয়েছে"); }, onError: error => toast.error(error.message) });
  if (!isAuthenticated) return <div className="container py-24"><AuthInvitation title="অ্যাডমিন এলাকায় সাইন ইন প্রয়োজন" description="শুধু অনুমোদিত প্রশাসক এই অংশে প্রবেশ করতে পারেন।" /></div>;
  if (user?.role !== "admin") return <div className="container py-24"><div className="paper-card mx-auto max-w-xl p-10 text-center"><ShieldCheck className="mx-auto size-10 text-red-600" /><h1 className="mt-5 font-serif text-3xl font-bold text-[var(--navy)]">প্রবেশাধিকার নেই</h1><p className="mt-3 text-[var(--navy)]/60">এই পৃষ্ঠা শুধু EasyEPS প্রশাসকের জন্য।</p></div></div>;
  return <><PageIntro eyebrow="Owner-only control center" title="EasyEPS প্রশাসন" description="পাঠ্যক্রম, শিক্ষার্থী এবং প্ল্যাটফর্মের ব্যবহার পর্যবেক্ষণ করুন।" />
    <div className="container py-10"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{ label: "পাঠ", value: stats.data?.lessons ?? 60, icon: BookOpenText }, { label: "শিক্ষার্থী", value: stats.data?.users ?? 0, icon: UserRound }, { label: "পরীক্ষা", value: stats.data?.attempts ?? 0, icon: GraduationCap }, { label: "সম্পন্ন পাঠ", value: stats.data?.completedLessons ?? 0, icon: BookCheck }].map(({ label, value, icon: Icon }) => <div key={label} className="metric-card"><span className="metric-icon metric-gold"><Icon className="size-5" /></span><p className="mt-5 text-sm text-[var(--navy)]/50">{label}</p><p className="font-serif text-3xl font-bold text-[var(--navy)]">{value}</p></div>)}</div><section className="paper-card mt-7 overflow-hidden"><div className="border-b border-[var(--navy)]/8 p-6"><h2 className="font-serif text-2xl font-bold text-[var(--navy)]">ব্যবহারকারী ব্যবস্থাপনা</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[var(--cream)] text-xs uppercase tracking-wider text-[var(--navy)]/50"><tr><th className="px-6 py-4">নাম</th><th className="px-6 py-4">ইমেইল</th><th className="px-6 py-4">শেষ সাইন ইন</th><th className="px-6 py-4">ভূমিকা</th></tr></thead><tbody className="divide-y divide-[var(--navy)]/8">{users.data?.map(account => <tr key={account.id}><td className="px-6 py-4 font-bold text-[var(--navy)]">{account.name || "Unnamed"}</td><td className="px-6 py-4 text-[var(--navy)]/60">{account.email || "—"}</td><td className="px-6 py-4 text-[var(--navy)]/60">{account.lastSignedIn ? new Date(account.lastSignedIn).toLocaleDateString() : "—"}</td><td className="px-6 py-4"><select value={account.role} onChange={event => setRole.mutate({ userId: account.id, role: event.target.value as "user" | "admin" })} className="rounded-full border bg-white px-3 py-1.5 font-semibold"><option value="user">User</option><option value="admin">Admin</option></select></td></tr>)}</tbody></table></div></section></div>
  </>;
}
