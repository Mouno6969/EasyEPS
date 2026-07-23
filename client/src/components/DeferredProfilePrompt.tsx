import { Button } from "@/components/ui/button";
import { Clock3, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const KEY = "easyeps-profile-prompt-deferred-until";

function isDeferred() {
  if (typeof window === "undefined") return false;
  const until = Number(localStorage.getItem(KEY) ?? 0);
  return Number.isFinite(until) && until > Date.now();
}

export function DeferredProfilePrompt({ complete }: { complete: boolean }) {
  const [hidden, setHidden] = useState(isDeferred);
  if (complete || hidden) return null;

  const remindLater = () => {
    localStorage.setItem(KEY, String(Date.now() + 3 * 86_400_000));
    setHidden(true);
  };

  return (
    <aside className="relative mb-7 rounded-2xl border border-[var(--navy)]/12 bg-white p-4 text-sm text-[var(--navy)]">
      <button type="button" onClick={remindLater} aria-label="প্রোফাইল স্মরণ করানো বন্ধ করুন" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-[var(--navy)]/35 hover:bg-[var(--cream)]"><X className="size-4" /></button>
      <div className="flex flex-col gap-4 pr-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold-dark)]"><UserRound className="size-4.5" /></span>
          <div><p className="font-bold">প্রোফাইল পরে সম্পূর্ণ করতে পারেন</p><p className="mt-1 leading-6 text-[var(--navy)]/58">শেখা চালিয়ে যেতে এটি দরকার নেই। সার্টিফিকেট ইস্যুর আগে সঠিক নাম, ইমেইল ও শেখার স্তর দিন।</p></div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={remindLater} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-[var(--navy)]/55 hover:bg-[var(--cream)]"><Clock3 className="size-3.5" />৩ দিন পরে</button>
          <Link href="/profile/setup"><Button className="rounded-full bg-[var(--navy)] text-white">এখন সেটআপ</Button></Link>
        </div>
      </div>
    </aside>
  );
}
