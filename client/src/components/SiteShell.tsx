import { startLogin } from "@/const";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProgressRibbon } from "@/components/ProgressRibbon";
import { useLocalProfile } from "@/lib/localProfile";
import { trpc } from "@/lib/trpc";
import {
  BookOpenText,
  Bot,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Pencil,
  ShieldCheck,
  SpellCheck2,
  UserRound,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";

const navItems = [
  { href: "/basics", key: "basics", icon: SpellCheck2 },
  { href: "/curriculum", key: "curriculum", icon: BookOpenText },
  { href: "/mock-test", key: "mockTest", icon: GraduationCap },
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/planner", key: "planner", icon: CalendarDays },
  { href: "/tutor", key: "tutor", icon: Bot },
  { href: "/faq", key: "faq", icon: CircleHelp },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { locale, setLocale, t } = useLocale();
  const { user, isAuthenticated, logout } = useAuth();
  const localProfile = useLocalProfile();
  const remoteProfile = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const avatarUrl = isAuthenticated ? remoteProfile.data?.avatarUrl || "" : localProfile.avatarUrl || "";
  const displayName = isAuthenticated
    ? remoteProfile.data?.fullName || user?.name || t.profile
    : localProfile.fullName || t.profile;

  const nav = [
    ...navItems,
    ...(user?.role === "admin" ? [{ href: "/admin", key: "admin" as const, icon: ShieldCheck }] : []),
  ];
  const isActive = (href: string) =>
    location === href ||
    (href === "/curriculum" && location.startsWith("/lesson/")) ||
    (href === "/basics" && location.startsWith("/basics"));

  return (
    <div className="min-h-screen bg-[var(--cream)] text-foreground">
      <a href="#main-content" className="skip-link">
        মূল বিষয়বস্তুতে যান
      </a>

      <header className="sticky top-0 z-50 border-b border-[var(--navy)]/10 bg-[var(--cream)]/95 backdrop-blur-xl">
        <div className="container flex h-18 items-center gap-3">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5" onClick={() => setMenuOpen(false)}>
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--navy)] text-[var(--gold)] shadow-sm transition-transform group-hover:-rotate-3">
              <span className="font-serif text-xl font-bold">한</span>
            </span>
            <span>
              <span className="block font-serif text-xl font-bold leading-none tracking-tight text-[var(--navy)]">EasyEPS</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--navy)]/55 sm:block">Korea starts here</span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-0.5 xl:flex" aria-label="Main navigation">
            {nav.map(({ href, key, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`nav-link ${active ? "nav-link-active" : ""}`}
                >
                  <Icon className="size-4" />
                  {t[key]}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 xl:ml-2">
            <label className="relative hidden sm:block">
              <span className="sr-only">Language</span>
              <select
                value={locale}
                onChange={event => setLocale(event.target.value as "bn" | "ko" | "en")}
                className="h-10 appearance-none rounded-full border border-[var(--navy)]/15 bg-white/65 pl-4 pr-9 text-sm font-semibold text-[var(--navy)] outline-none transition focus:border-[var(--gold)]"
              >
                <option value="bn">বাংলা</option>
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-[var(--navy)]/50" />
            </label>

            {isAuthenticated ? (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setUserOpen(value => !value)}
                  aria-expanded={userOpen}
                  aria-haspopup="menu"
                  className="flex h-10 items-center gap-2 rounded-full border border-[var(--navy)]/15 bg-white/65 px-3 text-sm font-semibold text-[var(--navy)]"
                >
                  <Avatar className="size-7 border border-[var(--gold)]/30">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" /> : null}
                    <AvatarFallback className="bg-[var(--gold)]/25 text-[var(--navy)]">
                      <UserRound className="size-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-24 truncate">{displayName}</span>
                  <ChevronDown className="size-3.5" />
                </button>
                {userOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-[var(--navy)]/10 bg-white p-2 shadow-xl" role="menu">
                    <Link href="/profile" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[var(--cream)]">
                      <UserRound className="size-4" />
                      {t.profile}
                    </Link>
                    <Link href="/profile/setup" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[var(--cream)]">
                      <Pencil className="size-4" />
                      {locale === "en" ? "Edit profile" : locale === "ko" ? "프로필 설정" : "প্রোফাইল সেটআপ"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="size-4" />
                      {t.signOut}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={() => startLogin()} className="hidden rounded-full bg-[var(--navy)] text-white hover:bg-[var(--navy)]/90 sm:inline-flex">
                <LogIn className="size-4" />
                {t.signIn}
              </Button>
            )}
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(value => !value)}
              className="grid size-10 place-items-center rounded-full border border-[var(--navy)]/15 bg-white/65 xl:hidden"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-[var(--navy)]/10 bg-[var(--cream)] px-4 py-4 xl:hidden">
            <nav className="mx-auto grid max-w-lg gap-1" aria-label="Mobile navigation">
              {nav.map(({ href, key, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`nav-link justify-start ${active ? "nav-link-active" : ""}`}
                  >
                    <Icon className="size-4" />
                    {t[key]}
                  </Link>
                );
              })}
              <div className="mt-2 flex gap-2 border-t border-[var(--navy)]/10 pt-3 sm:hidden">
                {(["bn", "ko", "en"] as const).map(value => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setLocale(value)}
                    className={`rounded-full px-3 py-2 text-sm font-bold ${locale === value ? "bg-[var(--navy)] text-white" : "bg-white"}`}
                  >
                    {value === "bn" ? "বাংলা" : value === "ko" ? "한국어" : "English"}
                  </button>
                ))}
              </div>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="nav-link justify-start sm:hidden">
                <UserRound className="size-4" />
                {t.profile}
              </Link>
              {!isAuthenticated && (
                <Button onClick={() => startLogin()} className="mt-2 rounded-full bg-[var(--navy)] text-white sm:hidden">
                  <LogIn className="size-4" />
                  {t.signIn}
                </Button>
              )}
            </nav>
          </div>
        )}
      </header>

      <ProgressRibbon />

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>

      <footer className="mt-20 border-t border-[var(--navy)]/10 bg-[var(--navy)] text-white">
        <div className="container grid gap-10 py-12 md:grid-cols-2 xl:grid-cols-[1.25fr_.7fr_.8fr_1.25fr]">
          <div>
            <div className="font-serif text-2xl font-bold text-[var(--gold)]">EasyEPS</div>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/70">
              বাংলাভাষী শিক্ষার্থীদের জন্য ৬০ অধ্যায়ের EPS-TOPIK প্রস্তুতি, কর্মক্ষেত্রের কোরিয়ান এবং স্মার্ট অনুশীলন।
            </p>
            <p className="mt-3 text-xs text-white/45">তথ্য হালনাগাদ: ২০২৬ · স্বাধীন শিক্ষাসহায়ক</p>
          </div>
          <div>
            <p className="font-bold text-[var(--gold)]">শেখা</p>
            <div className="mt-3 grid gap-2 text-sm text-white/70">
              <Link href="/basics">বেসিক</Link>
              <Link href="/curriculum">পাঠ্যক্রম</Link>
              <Link href="/mock-test">মক টেস্ট</Link>
              <Link href="/tutor">এআই শিক্ষক</Link>
            </div>
          </div>
          <div>
            <p className="font-bold text-[var(--gold)]">সহায়তা</p>
            <div className="mt-3 grid gap-2 text-sm text-white/70">
              <Link href="/faq">প্রশ্নোত্তর</Link>
              <Link href="/planner">পড়ার পরিকল্পনা</Link>
              <Link href="/dashboard">অগ্রগতি</Link>
              <Link href="/profile">প্রোফাইল</Link>
            </div>
          </div>
          <div>
            <p className="font-bold text-[var(--gold)]">বিশ্বাসযোগ্যতা</p>
            <p className="mt-3 text-sm leading-6 text-white/65">
              EasyEPS একটি <strong className="text-white/85">স্বাধীন শিক্ষাসহায়ক</strong> প্ল্যাটফর্ম। পরীক্ষা নিবন্ধন, ফলাফল, ভিসা ও কর্মসংস্থানের জন্য সর্বদা সরকারি নির্দেশনা অনুসরণ করুন।
            </p>
            <a
              href="https://epstopik.hrdkorea.or.kr/epstopik/home/main/mainPage.do?lang=en"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--gold)] hover:text-white"
            >
              অফিসিয়াল EPS-TOPIK
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
