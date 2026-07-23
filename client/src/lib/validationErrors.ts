import type { ProfileSetupData } from "@shared/profile";
import { ZodError } from "zod";

/** Field errors keyed by form field name, e.g. { fullName: "Full name must be at least 2 characters" }. */
export type FieldErrorMap = Record<string, string>;

type ZodIssueLike = {
  path?: (string | number)[];
  message?: string;
};

function issuesToFieldErrors(issues: ZodIssueLike[]): FieldErrorMap {
  const fieldErrors: FieldErrorMap = {};
  for (const issue of issues) {
    const field = issue.path?.[0];
    if (typeof field !== "string" || !issue.message) continue;
    // Keep only the first message per field so the UI stays concise
    if (!(field in fieldErrors)) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}

/**
 * Extract per-field messages from a client-side ZodError.
 */
export function fieldErrorsFromZodError(error: ZodError): FieldErrorMap {
  return issuesToFieldErrors(error.issues as ZodIssueLike[]);
}

/**
 * Extract per-field messages from a tRPC mutation error.
 *
 * Handles both shapes:
 * 1. `error.data.zodFieldErrors` produced by our server errorFormatter (preferred).
 * 2. A raw JSON-stringified Zod issue array in `error.message` (legacy fallback,
 *    the exact payload users used to see dumped in a toast).
 *
 * Returns null when the error is not a Zod validation error.
 */
export function fieldErrorsFromTrpcError(error: unknown): FieldErrorMap | null {
  if (!error || typeof error !== "object") return null;

  // Shape 1: structured data from the server errorFormatter
  const data = (error as { data?: { zodFieldErrors?: unknown } }).data;
  if (data?.zodFieldErrors && typeof data.zodFieldErrors === "object") {
    const entries = Object.entries(data.zodFieldErrors as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0,
    );
    if (entries.length > 0) return Object.fromEntries(entries);
  }

  // Shape 2: legacy raw JSON array of Zod issues in the message
  const message = (error as { message?: unknown }).message;
  if (typeof message === "string" && message.trimStart().startsWith("[")) {
    try {
      const parsed = JSON.parse(message) as unknown;
      if (Array.isArray(parsed)) {
        const fieldErrors = issuesToFieldErrors(parsed as ZodIssueLike[]);
        if (Object.keys(fieldErrors).length > 0) return fieldErrors;
      }
    } catch {
      // Not JSON — fall through
    }
  }

  return null;
}

/** Type guard: is this key a known profile form field? */
export function isProfileField(key: string): key is keyof ProfileSetupData {
  return [
    "fullName",
    "email",
    "phone",
    "preferredLocale",
    "nationality",
    "city",
    "learningLevel",
    "targetIndustry",
    "targetExamDate",
    "bio",
    "avatarUrl",
  ].includes(key);
}
