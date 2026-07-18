import { describe, expect, it } from "vitest";
import {
  avatarUploadSchema,
  emptyProfile,
  isProfileComplete,
  isValidAvatarUrl,
  looksLikeImage,
  profileCompleteness,
  profileSetupSchema,
} from "../shared/profile";

describe("profileSetupSchema", () => {
  const valid = {
    fullName: "Rahim Uddin",
    email: "rahim@example.com",
    phone: "01712345678",
    preferredLocale: "bn" as const,
    nationality: "Bangladesh",
    city: "Dhaka",
    learningLevel: "beginner" as const,
    targetIndustry: "Manufacturing",
    targetExamDate: "",
    bio: "EPS-TOPIK learner",
  };

  it("accepts valid complete profiles", () => {
    const result = profileSetupSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("rahim@example.com");
      expect(result.data.phone).toBe("01712345678");
    }
  });

  it("normalizes email to lowercase and trims name", () => {
    const result = profileSetupSchema.parse({
      ...valid,
      fullName: "  Rahim Uddin  ",
      email: "  Rahim@Example.COM ",
    });
    expect(result.fullName).toBe("Rahim Uddin");
    expect(result.email).toBe("rahim@example.com");
  });

  it("rejects invalid email", () => {
    const result = profileSetupSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects short names", () => {
    const result = profileSetupSchema.safeParse({ ...valid, fullName: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects names with digits", () => {
    const result = profileSetupSchema.safeParse({ ...valid, fullName: "Rahim123" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid Bangladeshi phone numbers", () => {
    const result = profileSetupSchema.safeParse({ ...valid, phone: "12345" });
    expect(result.success).toBe(false);
  });

  it("allows empty phone", () => {
    const result = profileSetupSchema.safeParse({ ...valid, phone: "" });
    expect(result.success).toBe(true);
  });

  it("accepts +880 phone format", () => {
    const result = profileSetupSchema.safeParse({ ...valid, phone: "+8801712345678" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid learning level", () => {
    const result = profileSetupSchema.safeParse({ ...valid, learningLevel: "expert" });
    expect(result.success).toBe(false);
  });

  it("rejects past exam dates far in the past", () => {
    const result = profileSetupSchema.safeParse({ ...valid, targetExamDate: "2020-01-01" });
    expect(result.success).toBe(false);
  });

  it("rejects bio over 400 characters", () => {
    const result = profileSetupSchema.safeParse({ ...valid, bio: "x".repeat(401) });
    expect(result.success).toBe(false);
  });
});

describe("profile completeness helpers", () => {
  it("reports incomplete for empty profile", () => {
    expect(isProfileComplete(emptyProfile)).toBe(false);
    const c = profileCompleteness(emptyProfile);
    expect(c.percent).toBeLessThan(100);
    expect(c.missing.length).toBeGreaterThan(0);
  });

  it("reports complete for valid profile", () => {
    const data = profileSetupSchema.parse({
      fullName: "Karim",
      email: "karim@test.com",
      phone: "",
      preferredLocale: "en",
      nationality: "Bangladesh",
      city: "",
      learningLevel: "elementary",
      targetIndustry: "",
      targetExamDate: "",
      bio: "",
    });
    expect(isProfileComplete(data)).toBe(true);
    expect(profileCompleteness(data).percent).toBe(100);
  });
});

describe("avatar validation", () => {
  it("accepts empty avatar", () => {
    expect(isValidAvatarUrl("")).toBe(true);
  });

  it("accepts storage and https URLs", () => {
    expect(isValidAvatarUrl("/manus-storage/avatars/user-1.jpg")).toBe(true);
    expect(isValidAvatarUrl("https://cdn.example.com/a.jpg")).toBe(true);
  });

  it("rejects javascript or relative paths", () => {
    expect(isValidAvatarUrl("javascript:alert(1)")).toBe(false);
    expect(isValidAvatarUrl("../evil.png")).toBe(false);
    expect(isValidAvatarUrl("http://insecure.example.com/a.jpg")).toBe(false);
  });

  it("accepts compact jpeg data URLs", () => {
    const tiny = "data:image/jpeg;base64,/9j/4AAQ";
    expect(isValidAvatarUrl(tiny)).toBe(true);
  });

  it("validates upload schema mime and encoding", () => {
    const ok = avatarUploadSchema.safeParse({
      contentType: "image/jpeg",
      dataBase64: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(40).fill(0)]).toString("base64"),
    });
    expect(ok.success).toBe(true);

    const bad = avatarUploadSchema.safeParse({
      contentType: "image/gif",
      dataBase64: "aaaa",
    });
    expect(bad.success).toBe(false);
  });

  it("checks image magic bytes", () => {
    expect(looksLikeImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]), "image/jpeg")).toBe(true);
    expect(looksLikeImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]), "image/png")).toBe(true);
    expect(looksLikeImage(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0, 0, 0, 0, 0, 0, 0, 0]), "image/jpeg")).toBe(false);
  });

  it("allows profile complete without avatar", () => {
    const data = profileSetupSchema.parse({
      fullName: "Karim",
      email: "karim@test.com",
      phone: "",
      preferredLocale: "en",
      nationality: "Bangladesh",
      city: "",
      learningLevel: "elementary",
      targetIndustry: "",
      targetExamDate: "",
      bio: "",
      avatarUrl: "",
    });
    expect(data.avatarUrl).toBe("");
    expect(isProfileComplete(data)).toBe(true);
  });
});
