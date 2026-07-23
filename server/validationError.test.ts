import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const invalidProfileInput = {
  fullName: "x", // too short + will pass isPersonName but fail min(2)
  email: "no", // too short + invalid format
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

describe("tRPC Zod error formatting (profile.update)", () => {
  it("rejects invalid input with a BAD_REQUEST TRPCError carrying a ZodError cause", async () => {
    const caller = appRouter.createCaller(createAuthContext());

    try {
      await caller.profile.update(invalidProfileInput as never);
      expect.unreachable("profile.update should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
      expect(trpcError.cause?.name).toBe("ZodError");
    }
  });

  it("errorFormatter flattens Zod issues into a readable message and per-field map", async () => {
    const caller = appRouter.createCaller(createAuthContext());

    let caught: TRPCError | null = null;
    try {
      await caller.profile.update(invalidProfileInput as never);
    } catch (error) {
      caught = error as TRPCError;
    }
    expect(caught).not.toBeNull();

    // Run the router's error formatter exactly as the HTTP adapter would
    const formatted = appRouter._def._config.errorFormatter({
      shape: {
        message: caught!.message,
        code: -32600,
        data: { code: caught!.code, httpStatus: 400, path: "profile.update" },
      },
      error: caught!,
      type: "mutation",
      path: "profile.update",
      input: invalidProfileInput,
      ctx: undefined,
    }) as { message: string; data: { zodFieldErrors: Record<string, string> | null } };

    // Message must be a flat human-readable summary, not a raw JSON dump
    expect(formatted.message.trimStart().startsWith("[")).toBe(false);
    expect(formatted.message).toContain("fullName: Full name must be at least 2 characters");
    expect(formatted.message).toContain("email:");

    // Structured per-field errors for the client to feed into setError
    expect(formatted.data.zodFieldErrors).not.toBeNull();
    expect(formatted.data.zodFieldErrors!.fullName).toBe("Full name must be at least 2 characters");
    expect(typeof formatted.data.zodFieldErrors!.email).toBe("string");
  });

  it("errorFormatter leaves non-Zod errors untouched", () => {
    const plainError = new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not save profile. Please try again." });

    const formatted = appRouter._def._config.errorFormatter({
      shape: {
        message: plainError.message,
        code: -32603,
        data: { code: plainError.code, httpStatus: 500, path: "profile.update" },
      },
      error: plainError,
      type: "mutation",
      path: "profile.update",
      input: {},
      ctx: undefined,
    }) as { message: string; data: { zodFieldErrors: Record<string, string> | null } };

    expect(formatted.message).toBe("Could not save profile. Please try again.");
    expect(formatted.data.zodFieldErrors).toBeNull();
  });
});
