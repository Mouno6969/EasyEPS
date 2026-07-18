import { useAuth } from "@/_core/hooks/useAuth";
import {
  getLocalBasicsProgress,
  localBasicsCompleted,
  mirrorRemoteBasicsUnlock,
  useLocalBasics,
} from "@/lib/localProgress";
import { trpc } from "@/lib/trpc";
import { isBasicsComplete, stripBasicsUnlockFields } from "@shared/basics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type BasicsGateState = {
  loading: boolean;
  gateEnabled: boolean;
  completed: boolean;
  bypass: boolean;
  remoteCompleted: boolean | null;
  localCompleted: boolean;
  refresh: () => void;
};

/**
 * Client gate for Hangul Basics.
 * When gateEnabled is false, completed is always true (hub still voluntary).
 * Guests use local checkpointPassedAt; signed-in users use remote completed.
 */
export function useBasicsGate(): BasicsGateState {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const localBasics = useLocalBasics();
  const localCompleted = isBasicsComplete(localBasics);

  const gateQuery = trpc.basics.gateStatus.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });

  const remoteGet = trpc.basics.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    staleTime: 30_000,
  });

  const importMutation = trpc.basics.importProgress.useMutation();
  const utils = trpc.useUtils();

  const [importSettled, setImportSettled] = useState(!isAuthenticated);
  const importStarted = useRef(false);

  // Reset import flag when auth identity changes
  useEffect(() => {
    if (!isAuthenticated) {
      importStarted.current = false;
      setImportSettled(true);
      return;
    }
    setImportSettled(false);
    importStarted.current = false;
  }, [isAuthenticated]);

  // Import-on-login: merge local modules when remote incomplete (never unlock).
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    if (importStarted.current) return;
    if (remoteGet.isLoading || remoteGet.isError) {
      if (remoteGet.isError) setImportSettled(true);
      return;
    }
    if (!remoteGet.data) return;

    importStarted.current = true;
    const remote = remoteGet.data;
    const local = getLocalBasicsProgress();

    if (remote.completed) {
      mirrorRemoteBasicsUnlock({
        completed: true,
        completedAt: remote.completedAt,
        unlockSource: remote.unlockSource,
        progress: remote.progress,
      });
      setImportSettled(true);
      return;
    }

    const hasLocalModules = Object.keys(local.modules ?? {}).length > 0;
    if (!hasLocalModules && !local.checkpointPassedAt) {
      setImportSettled(true);
      return;
    }

    const payload = stripBasicsUnlockFields(local);
    // Keep checkpointPassedAt only as a hint for needsCheckpointRetake toast
    importMutation.mutate(
      {
        version: 1,
        modules: payload.modules,
        checkpointPassedAt: local.checkpointPassedAt,
      },
      {
        onSuccess: result => {
          if (result.progress) {
            mirrorRemoteBasicsUnlock({
              completed: result.completed,
              progress: result.progress,
            });
          }
          if (result.needsCheckpointRetake) {
            toast.message("লগইনের পর Basics চেকপয়েন্ট আবার দিন", {
              description: "সাইন-ইন অ্যাকাউন্টে আনলক করতে চেকপয়েন্ট পাস করুন।",
            });
          }
          void utils.basics.gateStatus.invalidate();
          void utils.basics.get.invalidate();
        },
        onSettled: () => setImportSettled(true),
        onError: () => setImportSettled(true),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- import once per session
  }, [isAuthenticated, authLoading, remoteGet.isLoading, remoteGet.isError, remoteGet.data]);

  const gateEnabled = gateQuery.data?.gateEnabled ?? false;
  const bypass = Boolean(gateQuery.data?.bypass);
  const remoteCompleted =
    gateQuery.data?.completed === undefined
      ? null
      : (gateQuery.data.completed as boolean | null);

  const completed = useMemo(() => {
    if (!gateEnabled) return true;
    if (bypass) return true;
    if (isAuthenticated) {
      if (remoteCompleted === true) return true;
      if (remoteCompleted === false) return false;
      // null / unknown while loading — treat as not complete for write gates
      return false;
    }
    return localCompleted;
  }, [gateEnabled, bypass, isAuthenticated, remoteCompleted, localCompleted]);

  const loading = useMemo(() => {
    if (authLoading) return true;
    if (gateQuery.isLoading) return true;
    if (isAuthenticated && !importSettled) return true;
    if (isAuthenticated && remoteGet.isLoading) return true;
    return false;
  }, [authLoading, gateQuery.isLoading, isAuthenticated, importSettled, remoteGet.isLoading]);

  const refresh = useCallback(() => {
    void gateQuery.refetch();
    if (isAuthenticated) void remoteGet.refetch();
  }, [gateQuery, remoteGet, isAuthenticated]);

  return {
    loading,
    gateEnabled,
    completed,
    bypass,
    remoteCompleted: isAuthenticated ? remoteCompleted : null,
    localCompleted: localBasicsCompleted() || localCompleted,
    refresh,
  };
}

/** Soft: show CTA when not hangul-ready; hard block only when gateEnabled && !completed. */
export function useBasicsCtaVisible(): boolean {
  const basics = useLocalBasics();
  const gate = useBasicsGate();
  // Always show voluntary CTA when local checkpoint not passed (even if gate off)
  if (!isBasicsComplete(basics) && !gate.remoteCompleted) return true;
  if (gate.gateEnabled && !gate.completed) return true;
  return false;
}
