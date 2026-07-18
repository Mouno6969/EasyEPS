import { describe, expect, it } from "vitest";
import {
  buildCertificateRecipient,
  certificateAchievementText,
  certificateRecipientSchema,
  certificateTitles,
} from "../shared/certificate";

describe("certificate recipient snapshot", () => {
  const profile = {
    fullName: "Rahim Uddin",
    email: "rahim@example.com",
    phone: "01712345678",
    nationality: "Bangladesh",
    city: "Dhaka",
    learningLevel: "beginner" as const,
    targetIndustry: "Manufacturing",
    preferredLocale: "bn" as const,
    avatarUrl: "/manus-storage/avatars/user-1.jpg",
  };

  it("builds a full recipient snapshot from profile data", () => {
    const recipient = buildCertificateRecipient(profile);
    expect(recipient.fullName).toBe("Rahim Uddin");
    expect(recipient.email).toBe("rahim@example.com");
    expect(recipient.nationality).toBe("Bangladesh");
    expect(recipient.city).toBe("Dhaka");
    expect(recipient.avatarUrl).toBe("/manus-storage/avatars/user-1.jpg");
    expect(recipient.targetIndustry).toBe("Manufacturing");
  });

  it("rejects incomplete profiles without name/email", () => {
    expect(() =>
      buildCertificateRecipient({
        fullName: "",
        email: "bad",
        nationality: "Bangladesh",
      }),
    ).toThrow();
  });

  it("accepts jpeg data-URL avatars", () => {
    const recipient = buildCertificateRecipient({
      ...profile,
      avatarUrl: "data:image/jpeg;base64,/9j/4AAQ",
    });
    expect(recipient.avatarUrl.startsWith("data:image/jpeg")).toBe(true);
  });

  it("normalizes email casing", () => {
    const recipient = buildCertificateRecipient({
      ...profile,
      email: "  Rahim@Example.COM ",
    });
    expect(recipient.email).toBe("rahim@example.com");
  });

  it("parses stored snapshots safely", () => {
    const parsed = certificateRecipientSchema.parse(profile);
    expect(parsed.fullName).toBe("Rahim Uddin");
  });
});

describe("certificate copy", () => {
  it("provides titles for both certificate kinds", () => {
    expect(certificateTitles["course-completion"].latin).toContain("Course Completion");
    expect(certificateTitles["mock-test"].latin).toContain("Mock Test");
  });

  it("includes score in mock-test achievement text", () => {
    const text = certificateAchievementText("mock-test", 92);
    expect(text.en).toContain("92%");
    expect(text.bn).toContain("92%");
  });

  it("mentions 60 chapters for course completion", () => {
    const text = certificateAchievementText("course-completion", 100);
    expect(text.en.toLowerCase()).toContain("60");
  });
});
