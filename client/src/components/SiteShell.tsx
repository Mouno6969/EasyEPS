import { startLogin } from "@/const";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpenText, Bot, CalendarDays, ChevronDown, GraduationCap, LayoutDashboard, LogIn, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";

const navItems = [
  { href: "/curriculum", key: "curriculum", icon: BookOpenText },
  { href: "/mock-test", key: "mockTest", icon: GraduationCap },
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/planner", key: "planner", icon: CalendarDays },
  { href: "/tutor", key: "tutor", icon: Bot },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { locale, setLocale, t } = useLocale();
  const { user, isAuthenticated, logout } = useAuth();

  const nav = [...navItems, ...(user?.role === "admin" ? [{ href: "/admin", key: "admin" as const, icon: ShieldCheck }] : [])];

  return (
    <div className="min-h-screen bg-[var(--cream)] text-foreground">
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

          <nav className="ml-auto hidden items-center gap-1 xl:flex" aria-label="Main navigation">
            {nav.map(({ href, key, icon: Icon }) => {
              const active = location === href || (href === "/curriculum" && location.startsWith("/lesson/"));
              return (
                <Link key={href} href={href} className={`nav-link ${active ? "nav-link-active" : ""}`}>
                  <Icon className="size-4" />{t[key]}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 xl:ml-2">
            <label className="relative hidden sm:block">
              <span className="sr-only">Language</span>
              <select value={locale} onChange={event => setLocale(event.target.value as "bn" | "ko" | "en")} className="h-10 appearance-none rounded-full border border-[var(--navy)]/15 bg-white/65 pl-4 pr-9 text-sm font-semibold text-[var(--navy)] outline-none transition focus:border-[var(--gold)]">
                <option value="bn">বাংলা</option><option value="ko">한국어</option><option value="en">English</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-[var(--navy)]/50" />
            </label>

            {isAuthenticated ? (
              <div className="relative hidden sm:block">
                <button onClick={() => setUserOpen(value => !value)} className="flex h-10 items-center gap-2 rounded-full border border-[var(--navy)]/15 bg-white/65 px-3 text-sm font-semibold text-[var(--navy)]">
                  <span className="grid size-7 place-items-center rounded-full bg-[var(--gold)]/25"><UserRound className="size-4" /></span>
                  <span className="max-w-24 truncate">{user?.name || t.profile}</span><ChevronDown className="size-3.5" />
                </button>
                {userOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-[var(--navy)]/10 bg-white p-2 shadow-xl">
                    <Link href="/profile" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[var(--cream)]"><UserRound className="size-4" />{t.profile}</Link>
                    <button onClick={() => logout()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"><LogOut className="size-4" />{t.signOut}</button>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={() => startLogin()} className="hidden rounded-full bg-[var(--navy)] text-white hover:bg-[var(--navy)]/90 sm:inline-flex"><LogIn className="size-4" />{t.signIn}</Button>
            )}
            <button aria-label="Toggle menu" onClick={() => setMenuOpen(value => !value)} className="grid size-10 place-items-center rounded-full border border-[var(--navy)]/15 bg-white/65 xl:hidden">
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-[var(--navy)]/10 bg-[var(--cream)] px-4 py-4 xl:hidden">
            <nav className="mx-auto grid max-w-lg gap-1">
              {nav.map(({ href, key, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`nav-link justify-start ${location === href ? "nav-link-active" : ""}`}><Icon className="size-4" />{t[key]}</Link>)}
              <div className="mt-2 flex gap-2 border-t border-[var(--navy)]/10 pt-3 sm:hidden">
                {(["bn", "ko", "en"] as const).map(value => <button key={value} onClick={() => setLocale(value)} className={`rounded-full px-3 py-2 text-sm font-bold ${locale === value ? "bg-[var(--navy)] text-white" : "bg-white"}`}>{value === "bn" ? "বাংলা" : value === "ko" ? "한국어" : "English"}</button>)}
              </div>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="nav-link justify-start sm:hidden"><UserRound className="size-4" />{t.profile}</Link>
              {!isAuthenticated && <Button onClick={() => startLogin()} className="mt-2 rounded-full bg-[var(--navy)] text-white sm:hidden"><LogIn className="size-4" />{t.signIn}</Button>}
            </nav>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="mt-20 border-t border-[var(--navy)]/10 bg-[var(--navy)] text-white">
        <div className="container grid gap-8 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
          <div><div className="font-serif text-2xl font-bold text-[var(--gold)]">EasyEPS</div><p className="mt-3 max-w-md text-sm leading-7 text-white/70">বাংলাভাষী শিক্ষার্থীদের জন্য ৬০ অধ্যায়ের EPS-TOPIK প্রস্তুতি, কর্মক্ষেত্রের কোরিয়ান এবং স্মার্ট অনুশীলন।</p></div>
          <div><p className="font-bold text-[var(--gold)]">শেখা</p><div className="mt-3 grid gap-2 text-sm text-white/70"><Link href="/curriculum">পাঠ্যক্রম</Link><Link href="/mock-test">মক টেস্ট</Link><Link href="/tutor">এআই শিক্ষক</Link></div></div>
          <div><p className="font-bold text-[var(--gold)]">নোট</p><p className="mt-3 text-sm leading-6 text-white/65">EasyEPS একটি স্বাধীন শিক্ষাসহায়ক প্ল্যাটফর্ম; এটি HRD Korea বা EPS-এর সরকারি সেবা নয়।</p></div>
        </div>
      </footer>
    </div>
  );
}
