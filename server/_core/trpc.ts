import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { TrpcContext } from "./context";

/** First message per invalid field, e.g. { fullName: "Full name must be at least 2 characters" }. */
function zodFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    if (!(field in fieldErrors)) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}

/** Flat, human-readable summary, e.g. "fullName: Full name must be at least 2 characters; email: Enter a valid email address". */
function zodFlatMessage(error: ZodError): string {
  const parts = Object.entries(zodFieldErrors(error)).map(([field, message]) => `${field}: ${message}`);
  return parts.length > 0 ? parts.join("; ") : "Invalid input";
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const zodError = error.cause instanceof ZodError ? error.cause : null;
    return {
      ...shape,
      // Replace the raw JSON dump of Zod issues with a readable flat message
      message: zodError ? zodFlatMessage(zodError) : shape.message,
      data: {
        ...shape.data,
        // Structured per-field errors for clients (react-hook-form setError)
        zodFieldErrors: zodError ? zodFieldErrors(zodError) : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
