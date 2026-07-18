import {
  emptyProfile,
  isProfileComplete,
  profileCompleteness,
  profileSetupSchema,
  type ProfileSetupData,
  type UserProfile,
} from "@shared/profile";
import { useSyncExternalStore } from "react";

const KEY = "easyeps-profile-v1";

let cachedRaw = "";
let cached: ProfileSetupData = emptyProfile;
const listeners = new Set<() => void>();

function parse(raw: string | null): ProfileSetupData {
  if (!raw) return { ...emptyProfile };
  try {
    const parsed = profileSetupSchema.partial().safeParse(JSON.parse(raw));
    if (!parsed.success) return { ...emptyProfile };
    return { ...emptyProfile, ...parsed.data };
  } catch {
    return { ...emptyProfile };
  }
}

function getSnapshot() {
  const raw = localStorage.getItem(KEY) ?? "";
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function emit() {
  listeners.forEach(listener => listener());
}

export function getLocalProfile(): ProfileSetupData {
  return getSnapshot();
}

export function getLocalUserProfile(): UserProfile {
  const data = getSnapshot();
  const complete = isProfileComplete(data);
  return {
    ...data,
    isComplete: complete,
    completedAt: complete ? new Date().toISOString() : null,
    updatedAt: localStorage.getItem(`${KEY}:updated`) || null,
  };
}

/**
 * Validate and persist guest profile. Throws ZodError on invalid data.
 * Preserves an existing avatar when the new payload omits one.
 */
export function saveLocalProfile(input: unknown): UserProfile {
  const previous = getSnapshot();
  const parsed = profileSetupSchema.parse(input);
  const data = {
    ...parsed,
    avatarUrl: parsed.avatarUrl || previous.avatarUrl || "",
  };
  const raw = JSON.stringify(data);
  localStorage.setItem(KEY, raw);
  localStorage.setItem(`${KEY}:updated`, new Date().toISOString());
  cachedRaw = raw;
  cached = data;
  emit();
  return getLocalUserProfile();
}

/** Save only the avatar (guest). Pass empty string to remove. */
export function saveLocalAvatar(avatarUrl: string): UserProfile {
  const previous = getSnapshot();
  return saveLocalProfile({ ...previous, avatarUrl });
}

export function clearLocalProfile() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(`${KEY}:updated`);
  cachedRaw = "";
  cached = { ...emptyProfile };
  emit();
}

export function useLocalProfile(): UserProfile & { completeness: ReturnType<typeof profileCompleteness> } {
  const data = useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot,
    () => emptyProfile,
  );
  const complete = isProfileComplete(data);
  return {
    ...data,
    isComplete: complete,
    completedAt: complete ? localStorage.getItem(`${KEY}:updated`) : null,
    updatedAt: localStorage.getItem(`${KEY}:updated`),
    completeness: profileCompleteness(data),
  };
}
