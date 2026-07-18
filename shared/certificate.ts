import { z } from "zod";
import { isValidAvatarUrl, learningLevels, preferredLocales } from "./profile";

/**
 * Frozen recipient identity written onto a certificate at issue time.
 * Certificates must not change if the learner later edits their profile.
 */
export const certificateRecipientSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().max(320),
  phone: z.string().max(20).optional().default(""),
  nationality: z.string().min(2).max(80),
  city: z.string().max(80).optional().default(""),
  learningLevel: z.enum(learningLevels).optional(),
  targetIndustry: z.string().max(120).optional().default(""),
  preferredLocale: z.enum(preferredLocales).optional(),
  avatarUrl: z
    .string()
    .max(480_000)
    .refine(value => !value || isValidAvatarUrl(value), "Invalid avatar on certificate")
    .optional()
    .default(""),
});

export type CertificateRecipient = z.infer<typeof certificateRecipientSchema>;

export const certificateKinds = ["course-completion", "mock-test"] as const;
export type CertificateKind = (typeof certificateKinds)[number];

export const certificateTitles: Record<
  CertificateKind,
  { en: string; bn: string; ko: string; latin: string }
> = {
  "course-completion": {
    en: "Certificate of Course Completion",
    bn: "কোর্স সম্পন্ন সার্টিফিকেট",
    ko: "과정 수료 증명서",
    latin: "Certificate of Course Completion",
  },
  "mock-test": {
    en: "Certificate of Mock Test Excellence",
    bn: "মক টেস্ট উৎকর্ষ সার্টিফিকেট",
    ko: "모의고사 우수 증명서",
    latin: "Certificate of Mock Test Excellence",
  },
};

export function certificateAchievementText(
  kind: CertificateKind,
  scorePercent: number | null | undefined,
): { en: string; bn: string } {
  if (kind === "mock-test") {
    const score = scorePercent ?? 0;
    return {
      en: `for demonstrating EPS-TOPIK examination readiness with a verified mock test score of ${score}%, reflecting diligent study of Korean language for employment.`,
      bn: `যাচাইকৃত মক টেস্টে ${score}% স্কোর অর্জন করে EPS-TOPIK প্রস্তুতিতে দক্ষতা প্রদর্শনের জন্য।`,
    };
  }
  return {
    en: "for successfully completing the full 60-chapter EasyEPS Korean language curriculum for EPS-TOPIK preparation, covering daily life, workplace communication, safety, and employment fundamentals.",
    bn: "দৈনন্দিন জীবন, কর্মক্ষেত্র, নিরাপত্তা ও কর্মসংস্থান বিষয়ক ৬০ অধ্যায়ের সম্পূর্ণ EasyEPS কোরিয়ান পাঠ্যক্রম সফলভাবে সম্পন্ন করার জন্য।",
  };
}

/** Build a printable recipient snapshot from a learner profile row/object. */
export function buildCertificateRecipient(profile: {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  city?: string | null;
  learningLevel?: string | null;
  targetIndustry?: string | null;
  preferredLocale?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
}): CertificateRecipient {
  return certificateRecipientSchema.parse({
    fullName: (profile.fullName || profile.name || "").trim(),
    email: (profile.email || "").trim().toLowerCase(),
    phone: (profile.phone || "").trim(),
    nationality: (profile.nationality || "").trim(),
    city: (profile.city || "").trim(),
    learningLevel: profile.learningLevel || undefined,
    targetIndustry: (profile.targetIndustry || "").trim(),
    preferredLocale: profile.preferredLocale || undefined,
    avatarUrl: (profile.avatarUrl || "").trim(),
  });
}
