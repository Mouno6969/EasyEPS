import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { PASSWORD_MIN_LENGTH } from "@shared/const";

type Mode = "signin" | "signup";

const copy = {
  bn: {
    signInTitle: "সাইন ইন করুন",
    signUpTitle: "নতুন অ্যাকাউন্ট খুলুন",
    signInLead: "আপনার অগ্রগতি সব ডিভাইসে সংরক্ষণ করুন।",
    signUpLead: "বিনামূল্যে অ্যাকাউন্ট খুলে শেখা শুরু করুন।",
    name: "পুরো নাম",
    email: "ইমেইল",
    password: "পাসওয়ার্ড",
    signIn: "সাইন ইন",
    signUp: "অ্যাকাউন্ট তৈরি করুন",
    noAccount: "অ্যাকাউন্ট নেই?",
    haveAccount: "আগে থেকেই অ্যাকাউন্ট আছে?",
    createOne: "নতুন খুলুন",
    signInInstead: "সাইন ইন করুন",
    welcome: "স্বাগতম",
    guestNote: "সাইন ইন ছাড়াও আপনি সব পাঠ পড়তে পারেন — সাইন ইন করলে অগ্রগতি সেভ থাকে।",
  },
  ko: {
    signInTitle: "로그인",
    signUpTitle: "회원가입",
    signInLead: "모든 기기에서 학습 진도를 저장하세요.",
    signUpLead: "무료 계정을 만들고 학습을 시작하세요.",
    name: "이름",
    email: "이메일",
    password: "비밀번호",
    signIn: "로그인",
    signUp: "계정 만들기",
    noAccount: "계정이 없으신가요?",
    haveAccount: "이미 계정이 있으신가요?",
    createOne: "가입하기",
    signInInstead: "로그인",
    welcome: "환영합니다",
    guestNote: "로그인하지 않아도 모든 수업을 볼 수 있습니다. 로그인하면 진도가 저장됩니다.",
  },
  en: {
    signInTitle: "Sign in",
    signUpTitle: "Create your account",
    signInLead: "Keep your progress saved across every device.",
    signUpLead: "Create a free account and start learning.",
    name: "Full name",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signUp: "Create account",
    noAccount: "No account yet?",
    haveAccount: "Already have an account?",
    createOne: "Create one",
    signInInstead: "Sign in",
    welcome: "Welcome",
    guestNote: "You can read every lesson without signing in — signing in just saves your progress.",
  },
} as const;

export default function AuthPage({ mode = "signin" }: { mode?: Mode }) {
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const t = copy[locale] ?? copy.bn;
  const isSignUp = mode === "signup";
  const [formError, setFormError] = useState<string | null>(null);

  const schema = isSignUp
    ? z.object({
        fullName: z.string().trim().min(2, locale === "en" ? "Enter your name" : "নাম লিখুন"),
        email: z.string().trim().email(locale === "en" ? "Enter a valid email" : "সঠিক ইমেইল দিন"),
        password: z
          .string()
          .min(
            PASSWORD_MIN_LENGTH,
            locale === "en"
              ? `At least ${PASSWORD_MIN_LENGTH} characters`
              : `কমপক্ষে ${PASSWORD_MIN_LENGTH} অক্ষর`,
          ),
      })
    : z.object({
        email: z.string().trim().email(locale === "en" ? "Enter a valid email" : "সঠিক ইমেইল দিন"),
        password: z.string().min(1, locale === "en" ? "Enter your password" : "পাসওয়ার্ড দিন"),
      });

  type FormValues = { fullName?: string; email: string; password: string };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as never),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onDone = async (name: string | null) => {
    // Refetch so every `useAuth` consumer sees the session immediately; the
    // guest-progress merge hook keys off this becoming non-null.
    await utils.auth.me.invalidate();
    toast.success(`${t.welcome}${name ? `, ${name}` : ""}!`);
    navigate("/dashboard");
  };

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: user => onDone(user?.name ?? null),
    onError: error => setFormError(error.message),
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: user => onDone(user?.name ?? null),
    onError: error => setFormError(error.message),
  });

  const pending = registerMutation.isPending || loginMutation.isPending;

  const onSubmit = form.handleSubmit(values => {
    setFormError(null);
    if (isSignUp) {
      registerMutation.mutate({
        fullName: values.fullName ?? "",
        email: values.email,
        password: values.password,
      });
    } else {
      loginMutation.mutate({ email: values.email, password: values.password });
    }
  });

  return (
    <div className="container flex justify-center py-12">
      <section className="paper-card w-full max-w-md overflow-hidden">
        <div className="bg-[var(--navy)] p-8 text-center text-white">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--gold)] text-[var(--navy)]">
            {isSignUp ? <UserPlus className="size-6" /> : <LogIn className="size-6" />}
          </span>
          <h1 className="mt-5 font-serif text-3xl font-bold">
            {isSignUp ? t.signUpTitle : t.signInTitle}
          </h1>
          <p className="mt-2 text-sm text-white/65">{isSignUp ? t.signUpLead : t.signInLead}</p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-5 p-8" noValidate>
          {isSignUp && (
            <div className="grid gap-2">
              <Label htmlFor="fullName">{t.name}</Label>
              <Input id="fullName" autoComplete="name" {...form.register("fullName")} />
              {form.formState.errors.fullName && (
                <p className="text-sm font-semibold text-red-700">
                  {form.formState.errors.fullName.message}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm font-semibold text-red-700">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">{t.password}</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm font-semibold text-red-700">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {formError}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-full bg-[var(--navy)] text-white hover:bg-[var(--navy)]/90"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isSignUp ? t.signUp : t.signIn}
          </Button>

          <p className="text-center text-sm text-[var(--navy)]/70">
            {isSignUp ? t.haveAccount : t.noAccount}{" "}
            <Link
              href={isSignUp ? "/signin" : "/signup"}
              className="font-bold text-[var(--gold-dark)] underline-offset-4 hover:underline"
            >
              {isSignUp ? t.signInInstead : t.createOne}
            </Link>
          </p>

          <p className="border-t border-[var(--navy)]/10 pt-4 text-center text-xs text-[var(--navy)]/50">
            {t.guestNote}
          </p>
        </form>
      </section>
    </div>
  );
}
