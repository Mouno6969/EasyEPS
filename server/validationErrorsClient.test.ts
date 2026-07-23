import { describe, expect, it } from "vitest";
import {
  fieldErrorsFromTrpcError,
  fieldErrorsFromZodError,
  isProfileField,
} from "../client/src/lib/validationErrors";
import { profileSetupSchema } from "../shared/profile";

describe("fieldErrorsFromZodError", () => {
  it("maps the first issue per field", () => {
    const result = profileSetupSchema.safeParse({
      fullName: "x",
      email: "no",
      phone: "",
      preferredLocale: "bn",
      nationality: "Bangladesh",
      city: "",
      learningLevel: "beginner",
      targetIndustry: "",
      targetExamDate: "",
      bio: "",
      avatarUrl: "",
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const fieldErrors = fieldErrorsFromZodError(result.error);
    expect(fieldErrors.fullName).toBe("Full name must be at least 2 characters");
    expect(typeof fieldErrors.email).toBe("string");
    expect(fieldErrors.email!.startsWith("[")).toBe(false);
  });
});

describe("fieldErrorsFromTrpcError", () => {
  it("reads structured zodFieldErrors from the error data (errorFormatter shape)", () => {
    const error = {
      message: "fullName: Full name must be at least 2 characters",
      data: { zodFieldErrors: { fullName: "Full name must be at least 2 characters" } },
    };
    expect(fieldErrorsFromTrpcError(error)).toEqual({
      fullName: "Full name must be at least 2 characters",
    });
  });

  it("parses a legacy raw JSON issue array in error.message", () => {
    const rawDump = JSON.stringify([
      { origin: "string", code: "too_small", minimum: 2, inclusive: true, path: ["fullName"], message: "Full name must be at least 2 characters" },
      { origin: "string", code: "invalid_format", format: "email", path: ["email"], message: "Enter a valid email address" },
    ]);
    const fieldErrors = fieldErrorsFromTrpcError({ message: rawDump });
    expect(fieldErrors).toEqual({
      fullName: "Full name must be at least 2 characters",
      email: "Enter a valid email address",
    });
  });

  it("returns null for non-validation errors", () => {
    expect(fieldErrorsFromTrpcError({ message: "Could not save profile. Please try again." })).toBeNull();
    expect(fieldErrorsFromTrpcError(null)).toBeNull();
    expect(fieldErrorsFromTrpcError(new Error("network down"))).toBeNull();
  });
});

describe("isProfileField", () => {
  it("accepts known profile fields and rejects unknown keys", () => {
    expect(isProfileField("fullName")).toBe(true);
    expect(isProfileField("email")).toBe(true);
    expect(isProfileField("unknownField")).toBe(false);
  });
});
