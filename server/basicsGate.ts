import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import * as db from "./db";

export const BASICS_REQUIRED_MESSAGE =
  "basics-required: Complete the Hangul Basics track before saving curriculum progress";

export type BasicsGateDecision =
  | { action: "allow" }
  | { action: "grandfather" }
  | { action: "block"; message: string };

/**
 * Pure decision for the curriculum write-gate. Unit-tested without DB.
 * Flag off / admin / already completed → allow.
 * Incomplete + legacy activity → grandfather once.
 * Else → block.
 */
export function decideBasicsGate(input: {
  gateEnabled: boolean;
  role: string | null | undefined;
  basicsCompleted: boolean;
  hasLegacyActivity: boolean;
}): BasicsGateDecision {
  if (!input.gateEnabled) return { action: "allow" };
  if (input.role === "admin") return { action: "allow" };
  if (input.basicsCompleted) return { action: "allow" };
  if (input.hasLegacyActivity) return { action: "grandfather" };
  return { action: "block", message: BASICS_REQUIRED_MESSAGE };
}

/**
 * Enforce Hangul Basics completion before curriculum progress/attempt writes.
 * No-op when BASICS_GATE_ENABLED is not "true". Idempotent grandfather for legacy users.
 */
export async function assertBasicsComplete(
  userId: number,
  role: string | null | undefined,
): Promise<void> {
  if (!ENV.basicsGateEnabled) return;
  if (role === "admin") return;

  const row = await db.getBasicsProgress(userId);
  if (row?.completed) return;

  const hasLegacy = await db.userHasCurriculumActivity(userId);
  const decision = decideBasicsGate({
    gateEnabled: true,
    role,
    basicsCompleted: false,
    hasLegacyActivity: hasLegacy,
  });

  if (decision.action === "allow") return;
  if (decision.action === "grandfather") {
    await db.markBasicsCompleteLegacy(userId, "legacy-migration");
    return;
  }

  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: decision.message,
  });
}
