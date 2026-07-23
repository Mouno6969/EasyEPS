import { trpc } from "@/lib/trpc";
import { CheckCircle2, Download, Loader2, Trash2, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "easyeps-offline-lessons-v1";

type OfflineState = {
  chapters: number[];
  updatedAt: string;
};

function loadOfflineState(): OfflineState {
  if (typeof window === "undefined") return { chapters: [], updatedAt: "" };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as OfflineState | null;
    if (!parsed || !Array.isArray(parsed.chapters)) return { chapters: [], updatedAt: "" };
    return {
      chapters: parsed.chapters.filter(chapter => Number.isInteger(chapter) && chapter >= 1 && chapter <= 60),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return { chapters: [], updatedAt: "" };
  }
}

export function OfflineLessonManager({
  chapters,
  suggestedStartChapter,
}: {
  chapters: number[];
  suggestedStartChapter: number;
}) {
  const utils = trpc.useUtils();
  const [offline, setOffline] = useState<OfflineState>(loadOfflineState);
  const [downloading, setDownloading] = useState(false);
  const [completed, setCompleted] = useState(0);

  const suggested = useMemo(() => {
    const ordered = [...chapters].sort((a, b) => a - b);
    const fromNext = ordered.filter(chapter => chapter >= suggestedStartChapter);
    return [...fromNext, ...ordered.filter(chapter => chapter < suggestedStartChapter)].slice(0, 10);
  }, [chapters, suggestedStartChapter]);

  const download = async () => {
    if (!("serviceWorker" in navigator) || !("caches" in window)) {
      toast.error("এই browser-এ offline lesson cache সমর্থিত নয়");
      return;
    }
    setDownloading(true);
    setCompleted(0);
    try {
      const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      for (const chapter of suggested) {
        await utils.curriculum.get.fetch({ chapter });
        setCompleted(value => value + 1);
      }
      const worker = registration.active ?? registration.waiting ?? registration.installing;
      worker?.postMessage({ type: "CACHE_LESSON_ROUTES", routes: suggested.map(chapter => `/lesson/${chapter}`) });
      const next: OfflineState = {
        chapters: [...new Set([...offline.chapters, ...suggested])].sort((a, b) => a - b),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setOffline(next);
      toast.success(`${suggested.length}টি পাঠ offline-এর জন্য প্রস্তুত`);
    } catch {
      toast.error("কিছু পাঠ ডাউনলোড হয়নি—ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন");
    } finally {
      setDownloading(false);
    }
  };

  const clear = async () => {
    if ("caches" in window) await caches.delete("easyeps-lessons-v1");
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_OFFLINE_LESSONS" });
    localStorage.removeItem(STORAGE_KEY);
    setOffline({ chapters: [], updatedAt: "" });
    toast.success("Offline lesson cache সরানো হয়েছে");
  };

  return (
    <section className="mt-7 rounded-3xl border border-[var(--navy)]/10 bg-[var(--navy)] p-5 text-white md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--gold)] text-[var(--navy)]"><WifiOff className="size-5" /></span>
          <div>
            <h2 className="font-serif text-xl font-bold">অফলাইন পাঠ</h2>
            <p className="mt-1 text-sm leading-6 text-white/60">পরবর্তী ১০টি পাঠ ডাউনলোড করে দুর্বল সংযোগেও পড়ুন।</p>
            {offline.chapters.length > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300"><CheckCircle2 className="size-3.5" />{offline.chapters.length}টি পাঠ প্রস্তুত{offline.updatedAt ? ` · ${new Date(offline.updatedAt).toLocaleDateString("bn-BD")}` : ""}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {offline.chapters.length > 0 && <button type="button" onClick={() => void clear()} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/75 hover:bg-white/10"><Trash2 className="size-3.5" />মুছুন</button>}
          <button type="button" onClick={() => void download()} disabled={downloading || suggested.length === 0} className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-bold text-[var(--navy)] disabled:opacity-60">
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {downloading ? `${completed}/${suggested.length}` : offline.chapters.length ? "পরবর্তী ১০টি আপডেট" : "১০টি পাঠ ডাউনলোড"}
          </button>
        </div>
      </div>
    </section>
  );
}
