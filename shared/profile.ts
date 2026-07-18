import { z } from "zod";

/** Learning level for EPS-TOPIK beginners. */
export const learningLevels = ["beginner", "elementary", "intermediate"] as const;
export type LearningLevel = (typeof learningLevels)[number];

export const preferredLocales = ["bn", "ko", "en"] as const;
export type PreferredLocale = (typeof preferredLocales)[number];

/** Allowed MIME types for profile picture upload. */
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number];

/** Max original file size before client compression (2 MB). */
export const AVATAR_MAX_FILE_BYTES = 2 * 1024 * 1024;
/** Max base64 payload size accepted by the server (~280 KB binary). */
export const AVATAR_MAX_BASE64_CHARS = 400_000;
/** Max stored data-URL length (guest / fallback). */
export const AVATAR_MAX_DATA_URL_CHARS = 480_000;
/** Display size after client resize. */
export const AVATAR_DISPLAY_SIZE = 400;

export function isValidAvatarUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/manus-storage/") && value.length <= 512) return true;
  if (/^https:\/\/[^\s]+$/i.test(value) && value.length <= 512) return true;
  if (
    (value.startsWith("data:image/jpeg;base64,") ||
      value.startsWith("data:image/png;base64,") ||
      value.startsWith("data:image/webp;base64,")) &&
    value.length <= AVATAR_MAX_DATA_URL_CHARS
  ) {
    return true;
  }
  return false;
}

/** Letters (Latin, Bangla, Korean Hangul), combining marks, spaces, and common name punctuation. */
function isPersonName(value: string): boolean {
  if (!value) return false;
  // Reject digits and most symbols while allowing multilingual scripts
  return /^[^\d_!@#$%^&*+=<>{}[\]|\\/:;,"`~?]+$/u.test(value) && /[\p{L}\p{M}]/u.test(value);
}

const phonePattern = /^(\+?8801[3-9]\d{8}|01[3-9]\d{8}|\+[1-9]\d{7,14})$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

/**
 * Profile setup payload. Required fields must be present and valid before save.
 * Optional fields are validated only when non-empty.
 */
export const profileSetupSchema = z.object({
  fullName: z.preprocess(
    trimString,
    z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(80, "Full name must be at most 80 characters")
      .refine(isPersonName, "Full name may only contain letters, spaces, and . ' -"),
  ),
  email: z.preprocess(
    trimString,
    z
      .string()
      .min(5, "Email is required")
      .max(320, "Email is too long")
      .email("Enter a valid email address")
      .transform(value => value.toLowerCase()),
  ),
  phone: z.preprocess(
    value => {
      if (value === null || value === undefined) return "";
      if (typeof value === "string") return value.trim().replace(/[\s()-]/g, "");
      return value;
    },
    z
      .string()
      .max(20, "Phone number is too long")
      .refine(value => value === "" || phonePattern.test(value), {
        message: "Enter a valid phone (e.g. 01712345678 or +8801712345678)",
      }),
  ),
  preferredLocale: z.enum(preferredLocales, {
    message: "Select a preferred language",
  }),
  nationality: z.preprocess(
    trimString,
    z
      .string()
      .min(2, "Nationality is required")
      .max(80, "Nationality is too long")
      .refine(isPersonName, "Nationality may only contain letters and spaces"),
  ),
  city: z.preprocess(
    value => (typeof value === "string" ? value.trim() : value),
    z
      .string()
      .max(80, "City is too long")
      .refine(value => value === "" || isPersonName(value), {
        message: "City may only contain letters, spaces, and . ' -",
      })
      .default(""),
  ),
  learningLevel: z.enum(learningLevels, {
    message: "Select your Korean learning level",
  }),
  targetIndustry: z.preprocess(
    value => (typeof value === "string" ? value.trim() : value),
    z.string().max(120, "Target industry is too long").default(""),
  ),
  targetExamDate: z.preprocess(
    value => (typeof value === "string" ? value.trim() : value),
    z
      .string()
      .refine(value => value === "" || datePattern.test(value), {
        message: "Use a valid date (YYYY-MM-DD)",
      })
      .refine(
        value => {
          if (!value) return true;
          const date = new Date(`${value}T00:00:00Z`);
          if (Number.isNaN(date.getTime())) return false;
          const min = new Date();
          min.setUTCHours(0, 0, 0, 0);
          const max = new Date(min);
          max.setUTCFullYear(max.getUTCFullYear() + 5);
          return date >= min && date <= max;
        },
        { message: "Exam date must be today or within the next 5 years" },
      )
      .default(""),
  ),
  bio: z.preprocess(
    value => (typeof value === "string" ? value.trim() : value),
    z.string().max(400, "Bio must be at most 400 characters").default(""),
  ),
  /** Optional profile picture URL (storage path, https, or compressed data URL). */
  avatarUrl: z.preprocess(
    value => (typeof value === "string" ? value.trim() : value ?? ""),
    z
      .string()
      .max(AVATAR_MAX_DATA_URL_CHARS, "Profile picture is too large")
      .refine(isValidAvatarUrl, {
        message: "Profile picture must be a valid image URL or compressed image",
      })
      .default(""),
  ),
});

export type ProfileSetupInput = z.input<typeof profileSetupSchema>;
export type ProfileSetupData = z.output<typeof profileSetupSchema>;

export type UserProfile = ProfileSetupData & {
  isComplete: boolean;
  completedAt: string | null;
  updatedAt: string | null;
};

export const emptyProfile: ProfileSetupData = {
  fullName: "",
  email: "",
  phone: "",
  preferredLocale: "bn",
  nationality: "Bangladesh",
  city: "",
  learningLevel: "beginner",
  targetIndustry: "",
  targetExamDate: "",
  bio: "",
  avatarUrl: "",
};

/** Server-side avatar upload body (base64 without data: prefix). */
export const avatarUploadSchema = z.object({
  contentType: z.enum(AVATAR_MIME_TYPES),
  dataBase64: z
    .string()
    .min(32, "Image data is required")
    .max(AVATAR_MAX_BASE64_CHARS, "Image is too large — use a smaller photo")
    .refine(value => /^[A-Za-z0-9+/=\s]+$/.test(value), "Invalid image encoding"),
});

export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;

/** Strip data-URL prefix if present and return pure base64. */
export function stripDataUrlBase64(value: string): { contentType: AvatarMimeType | null; base64: string } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i.exec(value.trim());
  if (match) {
    return {
      contentType: match[1]!.toLowerCase() as AvatarMimeType,
      base64: match[2]!.replace(/\s/g, ""),
    };
  }
  return { contentType: null, base64: value.replace(/\s/g, "") };
}

/** Light magic-byte check so we reject non-image payloads. */
export function looksLikeImage(buffer: Uint8Array, contentType: AvatarMimeType): boolean {
  if (buffer.length < 12) return false;
  if (contentType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  // webp: RIFF....WEBP
  const riff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  const webp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  return riff && webp;
}

export function extensionForMime(contentType: AvatarMimeType): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

/** Fields required for a “complete” profile (all schema-required ones). */
export const PROFILE_REQUIRED_FIELDS = [
  "fullName",
  "email",
  "preferredLocale",
  "nationality",
  "learningLevel",
] as const satisfies readonly (keyof ProfileSetupData)[];

export function isProfileComplete(profile: Partial<ProfileSetupData> | null | undefined): boolean {
  if (!profile) return false;
  const result = profileSetupSchema.safeParse(profile);
  return result.success;
}

export function profileCompleteness(profile: Partial<ProfileSetupData> | null | undefined): {
  percent: number;
  filled: number;
  total: number;
  missing: string[];
} {
  const total = PROFILE_REQUIRED_FIELDS.length;
  if (!profile) {
    return { percent: 0, filled: 0, total, missing: [...PROFILE_REQUIRED_FIELDS] };
  }
  const missing: string[] = [];
  let filled = 0;
  for (const field of PROFILE_REQUIRED_FIELDS) {
    const value = profile[field];
    const ok =
      field === "preferredLocale"
        ? preferredLocales.includes(value as PreferredLocale)
        : field === "learningLevel"
          ? learningLevels.includes(value as LearningLevel)
          : typeof value === "string" && value.trim().length > 0;
    if (ok) filled += 1;
    else missing.push(field);
  }
  // Bonus: if full schema validates, force 100%
  if (isProfileComplete(profile)) {
    return { percent: 100, filled: total, total, missing: [] };
  }
  return {
    percent: Math.round((filled / total) * 100),
    filled,
    total,
    missing,
  };
}

export const learningLevelLabels: Record<LearningLevel, { bn: string; ko: string; en: string }> = {
  beginner: { bn: "শুরুর ধাপ", ko: "초급", en: "Beginner" },
  elementary: { bn: "প্রাথমিক", ko: "초중급", en: "Elementary" },
  intermediate: { bn: "মাঝারি", ko: "중급", en: "Intermediate" },
};

export const localeLabels: Record<PreferredLocale, { bn: string; ko: string; en: string }> = {
  bn: { bn: "বাংলা", ko: "벵골어", en: "Bangla" },
  ko: { bn: "কোরিয়ান", ko: "한국어", en: "Korean" },
  en: { bn: "ইংরেজি", ko: "영어", en: "English" },
};
