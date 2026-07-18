import { useAuth } from "@/_core/hooks/useAuth";
import { getSnapshot } from "@/lib/localProgress";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const MERGED_KEY = "easyeps-guest-merged-v1";

/**
 * On first authenticated session after guest study, upload local chapter progress,
 * attempts, and study days to the server (union merge; never deletes remote).
 */
export function useGuestProgressMerge() {
  const { isAuthenticated, loading, user } = useAuth();
  const merge = trpc.progress.importGuest.useMutation();
  const utils = trpc.useUtils();
  const started = useRef(false);

  useEffect(() => {
    if (loading || !isAuthenticated || !user) {
      started.current = false;
      return;
    }
    if (started.current) return;
    if (merge.isPending) return;

    const mergeKey = `${MERGED_KEY}:${user.id}`;
    try {
      if (localStorage.getItem(mergeKey) === "1") return;
    } catch {
      // ignore
    }

    const state = getSnapshot();
    const progress = Object.values(state.progress).map(row => ({
      chapter: row.chapter,
      vocabDone: row.vocabDone,
      grammarDone: row.grammarDone,
      dialogueDone: row.dialogueDone,
      practiceScore: row.practiceScore ?? null,
      practiceTotal: row.practiceTotal ?? null,
      examScore: row.examScore ?? null,
      examTotal: row.examTotal ?? null,
      completed: row.completed,
    }));
    const attempts = state.attempts.slice(0, 30).map(item => ({
      kind: item.kind,
      chapter: item.chapter ?? null,
      score: item.score,
      total: item.total,
      durationSec: item.durationSec,
    }));
    const studyDays = Object.entries(state.studyDays).map(([date, day]) => ({
      date,
      minutes: day.minutes,
      activities: day.activities,
    }));

    if (!progress.length && !attempts.length && !studyDays.length) {
      try {
        localStorage.setItem(mergeKey, "1");
      } catch {
        // ignore
      }
      return;
    }

    started.current = true;
    merge
      .mutateAsync({ progress, attempts, studyDays })
      .then(result => {
        try {
          localStorage.setItem(mergeKey, "1");
        } catch {
          // ignore
        }
        void utils.progress.overview.invalidate();
        void utils.progress.list.invalidate();
        if (result.mergedChapters > 0 || result.importedAttempts > 0) {
          toast.success(
            `অতিথি অগ্রগতি মিশ্রিত: ${result.mergedChapters} অধ্যায়, ${result.importedAttempts} পরীক্ষা`,
          );
        }
      })
      .catch(error => {
        started.current = false;
        console.warn("[guest-merge] failed", error);
      });
  }, [isAuthenticated, loading, user, merge, utils]);
}
