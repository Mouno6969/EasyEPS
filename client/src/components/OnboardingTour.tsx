import { Button } from "@/components/ui/button";
import { BookOpenText, GraduationCap, SpellCheck2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

const KEY = "easyeps-onboarding-v1";

const steps = [
  {
    icon: SpellCheck2,
    title: "১ · শুনুন · বলুন · লিখুন",
    text: "প্রথমে জামো শিখুন—শুনুন, জোরে বলুন, লিখে অনুশীলন করুন। অধ্যায় ১-এর আগে বেসিক শেষ করুন।",
    href: "/basics",
    cta: "বেসিক শুরু",
    image: "/basics/module-icon.jpg",
  },
  {
    icon: BookOpenText,
    title: "২ · প্রথম পাঠ",
    text: "বেসিক শেষে ৬০ অধ্যায়ে শব্দ ও সংলাপ শিখুন।",
    href: "/curriculum",
    cta: "পাঠ্যক্রম",
  },
  {
    icon: GraduationCap,
    title: "৩ · মক টেস্ট",
    text: "প্রস্তুতি যাচাই করতে EPS-ধাঁচের মক টেস্ট দিন।",
    href: "/mock-test",
    cta: "মক টেস্ট",
  },
] as const;

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "done") return;
      const timer = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(timer);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setImgFailed(false);
  }, [step]);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "done");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open) return null;
  const current = steps[step]!;
  const Icon = current.icon;
  const image = "image" in current ? current.image : undefined;
  const showImage = Boolean(image) && !imgFailed;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[var(--navy)]/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="w-full max-w-md rounded-3xl border border-[var(--navy)]/10 bg-[var(--cream)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          {showImage ? (
            <span className="size-14 overflow-hidden rounded-2xl border border-[var(--gold)]/25 shadow-sm">
              <img
                src={image}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setImgFailed(true)}
              />
            </span>
          ) : (
            <span className="grid size-12 place-items-center rounded-2xl bg-[var(--navy)] text-[var(--gold)]">
              <Icon className="size-6" />
            </span>
          )}
          <button type="button" onClick={dismiss} className="grid size-9 place-items-center rounded-full text-[var(--navy)]/50 hover:bg-white" aria-label="Close tour">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-dark)]">
          EasyEPS · {step + 1}/{steps.length}
        </p>
        <h2 id="onboarding-title" className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">
          {current.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--navy)]/65">{current.text}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={current.href} onClick={dismiss}>
            <Button className="rounded-full bg-[var(--navy)] text-white">{current.cta}</Button>
          </Link>
          {step < steps.length - 1 ? (
            <Button type="button" variant="outline" className="rounded-full border-[var(--navy)]/15" onClick={() => setStep(s => s + 1)}>
              পরের ধাপ
            </Button>
          ) : (
            <Button type="button" variant="outline" className="rounded-full border-[var(--navy)]/15" onClick={dismiss}>
              শেষ
            </Button>
          )}
          <button type="button" onClick={dismiss} className="ml-auto text-xs font-bold text-[var(--navy)]/45 underline">
            এড়িয়ে যান
          </button>
        </div>
      </div>
    </div>
  );
}
