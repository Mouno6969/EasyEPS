import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "bn" | "ko" | "en";

const copy = {
  bn: {
    home: "হোম",
    basics: "বেসিক",
    hangulBasics: "হ্যাঙ্গুল বেসিক",
    startBasics: "বেসিক শুরু করুন",
    completeBasicsFirst: "প্রথমে হ্যাঙ্গুল বেসিক সম্পন্ন করুন",
    curriculum: "পাঠ্যক্রম",
    mockTest: "মক টেস্ট",
    dashboard: "অগ্রগতি",
    planner: "পড়ার পরিকল্পনা",
    tutor: "এআই শিক্ষক",
    profile: "প্রোফাইল",
    admin: "অ্যাডমিন",
    signIn: "সাইন ইন",
    signOut: "সাইন আউট",
    startLearning: "শেখা শুরু করুন",
    continueLearning: "পড়া চালিয়ে যান",
    allChapters: "সব অধ্যায়",
    search: "অধ্যায় খুঁজুন",
    loading: "লোড হচ্ছে…",
    retry: "আবার চেষ্টা করুন",
    guest: "অতিথি শিক্ষার্থী",
    korean: "কোরিয়ান",
    bangla: "বাংলা",
    english: "ইংরেজি",
    hangulReady: "হ্যাঙ্গুল প্রস্তুত",
    faq: "প্রশ্নোত্তর",
    shareProgress: "অগ্রগতি শেয়ার",
    skip: "এড়িয়ে যান",
    next: "পরেরটি",
    emptyState: "এখনও কিছু নেই",
    errorGeneric: "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।",
  },
  ko: {
    home: "홈",
    basics: "기초",
    hangulBasics: "한글 기초",
    startBasics: "기초 시작",
    completeBasicsFirst: "먼저 한글 기초를 완료하세요",
    curriculum: "교육과정",
    mockTest: "모의고사",
    dashboard: "학습 현황",
    planner: "학습 계획",
    tutor: "AI 선생님",
    profile: "프로필",
    admin: "관리자",
    signIn: "로그인",
    signOut: "로그아웃",
    startLearning: "학습 시작",
    continueLearning: "계속 학습",
    allChapters: "전체 단원",
    search: "단원 검색",
    loading: "불러오는 중…",
    retry: "다시 시도",
    guest: "게스트 학습자",
    korean: "한국어",
    bangla: "বাংলা",
    english: "English",
    hangulReady: "한글 준비 완료",
    faq: "FAQ",
    shareProgress: "공유",
    skip: "건너뛰기",
    next: "다음",
    emptyState: "아직 항목이 없습니다",
    errorGeneric: "문제가 발생했습니다. 다시 시도하세요.",
  },
  en: {
    home: "Home",
    basics: "Basics",
    hangulBasics: "Hangul Basics",
    startBasics: "Start Basics",
    completeBasicsFirst: "Complete Hangul Basics first",
    curriculum: "Curriculum",
    mockTest: "Mock Test",
    dashboard: "Progress",
    planner: "Study Plan",
    tutor: "AI Tutor",
    profile: "Profile",
    admin: "Admin",
    signIn: "Sign in",
    signOut: "Sign out",
    startLearning: "Start learning",
    continueLearning: "Continue learning",
    allChapters: "All chapters",
    search: "Search chapters",
    loading: "Loading…",
    retry: "Try again",
    guest: "Guest learner",
    korean: "Korean",
    bangla: "Bangla",
    english: "English",
    hangulReady: "Hangul ready",
    faq: "FAQ",
    shareProgress: "Share progress",
    skip: "Skip",
    next: "Next",
    emptyState: "Nothing here yet",
    errorGeneric: "Something went wrong. Please try again.",
  },
} as const;

type Copy = typeof copy.bn;
const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void; t: Copy } | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem("easyeps-locale");
    return saved === "ko" || saved === "en" || saved === "bn" ? saved : "bn";
  });
  useEffect(() => {
    localStorage.setItem("easyeps-locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t: copy[locale] as Copy }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used within LocaleProvider");
  return value;
}
