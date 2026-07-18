import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";

const STORAGE_KEY = "easyeps-celebration-v1";
export const CELEBRATION_EVENT = "easyeps:celebration";

export type CelebrationPayload = {
  title: string;
  body: string;
  href: string;
  cta: string;
};

function readStored(): CelebrationPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CelebrationPayload;
    if (!parsed?.title || !parsed?.href) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(payload: CelebrationPayload | null) {
  try {
    if (!payload) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

/** Push a one-shot celebration banner (sessionStorage + custom event). */
export function pushCelebration(payload: CelebrationPayload) {
  writeStored(payload);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CELEBRATION_EVENT, { detail: payload }));
  }
}

export function CelebrationHost() {
  const [payload, setPayload] = useState<CelebrationPayload | null>(null);

  useEffect(() => {
    setPayload(readStored());
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<CelebrationPayload>).detail;
      if (detail?.title && detail?.href) setPayload(detail);
    };
    window.addEventListener(CELEBRATION_EVENT, onCustom);
    return () => window.removeEventListener(CELEBRATION_EVENT, onCustom);
  }, []);

  const dismiss = useCallback(() => {
    writeStored(null);
    setPayload(null);
  }, []);

  if (!payload) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] flex justify-center p-4 sm:bottom-6 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex w-full max-w-lg gap-4 overflow-hidden rounded-3xl border border-[var(--navy)]/10 bg-[var(--cream)] p-4 shadow-[0_20px_60px_rgba(16,37,58,.22)] sm:p-5">
        <div className="hidden size-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--gold)]/25 sm:block">
          <img
            src="/basics/celebration.png"
            alt=""
            className="h-full w-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-dark)]">
            অভিনন্দন
          </p>
          <h3 className="mt-1 font-serif text-xl font-bold text-[var(--navy)]">{payload.title}</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--navy)]/65">{payload.body}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href={payload.href} onClick={dismiss}>
              <Button className="rounded-full bg-[var(--navy)] text-white hover:bg-[var(--navy)]/90">
                {payload.cta}
              </Button>
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-bold text-[var(--navy)]/45 underline"
            >
              পরে দেখব
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-[var(--navy)]/40 hover:bg-white hover:text-[var(--navy)]"
          aria-label="Close celebration"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
