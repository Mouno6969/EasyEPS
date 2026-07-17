import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "bn" | "ko" | "en";

const copy = {
  bn: {
    home: "হোম", curriculum: "পাঠ্যক্রম", mockTest: "মক টেস্ট", dashboard: "অগ্রগতি", planner: "পড়ার পরিকল্পনা",
    tutor: "এআই শিক্ষক", profile: "প্রোফাইল", admin: "অ্যাডমিন", signIn: "সাইন ইন", signOut: "সাইন আউট",
    startLearning: "শেখা শুরু করুন", continueLearning: "পড়া চালিয়ে যান", allChapters: "সব অধ্যায়", search: "অধ্যায় খুঁজুন",
    loading: "লোড হচ্ছে…", retry: "আবার চেষ্টা করুন", guest: "অতিথি শিক্ষার্থী", korean: "কোরিয়ান", bangla: "বাংলা", english: "ইংরেজি",
  },
  ko: {
    home: "홈", curriculum: "교육과정", mockTest: "모의고사", dashboard: "학습 현황", planner: "학습 계획",
    tutor: "AI 선생님", profile: "프로필", admin: "관리자", signIn: "로그인", signOut: "로그아웃",
    startLearning: "학습 시작", continueLearning: "계속 학습", allChapters: "전체 단원", search: "단원 검색",
    loading: "불러오는 중…", retry: "다시 시도", guest: "게스트 학습자", korean: "한국어", bangla: "বাংলা", english: "English",
  },
  en: {
    home: "Home", curriculum: "Curriculum", mockTest: "Mock Test", dashboard: "Progress", planner: "Study Plan",
    tutor: "AI Tutor", profile: "Profile", admin: "Admin", signIn: "Sign in", signOut: "Sign out",
    startLearning: "Start learning", continueLearning: "Continue learning", allChapters: "All chapters", search: "Search chapters",
    loading: "Loading…", retry: "Try again", guest: "Guest learner", korean: "Korean", bangla: "Bangla", english: "English",
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
