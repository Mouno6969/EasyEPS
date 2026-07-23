import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { useLocale } from "@/contexts/LocaleContext";
import { prepareAvatarFile } from "@/lib/avatarImage";
import { saveLocalAvatar, saveLocalProfile, useLocalProfile } from "@/lib/localProfile";
import { learningOverview, useLocalLearning } from "@/lib/localProgress";
import { trpc } from "@/lib/trpc";
import {
  fieldErrorsFromTrpcError,
  fieldErrorsFromZodError,
  isProfileField,
  type FieldErrorMap,
} from "@/lib/validationErrors";
import {
  emptyProfile,
  learningLevelLabels,
  learningLevels,
  localeLabels,
  preferredLocales,
  profileCompleteness,
  profileSetupSchema,
  type LearningLevel,
  type PreferredLocale,
  type ProfileSetupData,
} from "@shared/profile";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Award,
  BookCheck,
  BookOpenText,
  Camera,
  Check,
  ChevronRight,
  GraduationCap,
  ImagePlus,
  Loader2,
  Medal,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link, useLocation, useSearch } from "wouter";
import { z } from "zod";

type FormValues = z.input<typeof profileSetupSchema>;

const fieldLabels: Record<Exclude<keyof ProfileSetupData, "avatarUrl">, { bn: string; en: string; ko: string }> = {
  fullName: { bn: "পূর্ণ নাম *", en: "Full name *", ko: "이름 *" },
  email: { bn: "ইমেইল *", en: "Email *", ko: "이메일 *" },
  phone: { bn: "মোবাইল নম্বর", en: "Mobile number", ko: "휴대폰 번호" },
  preferredLocale: { bn: "পছন্দের ভাষা *", en: "Preferred language *", ko: "선호 언어 *" },
  nationality: { bn: "জাতীয়তা *", en: "Nationality *", ko: "국적 *" },
  city: { bn: "শহর / জেলা", en: "City / district", ko: "도시 / 지역" },
  learningLevel: { bn: "কোরিয়ান দক্ষতা *", en: "Korean level *", ko: "한국어 수준 *" },
  targetIndustry: { bn: "কাজের খাত (ঐচ্ছিক)", en: "Target industry (optional)", ko: "희망 업종 (선택)" },
  targetExamDate: { bn: "লক্ষ্য পরীক্ষার তারিখ", en: "Target exam date", ko: "목표 시험일" },
  bio: { bn: "নিজের সম্পর্কে (ঐচ্ছিক)", en: "About you (optional)", ko: "소개 (선택)" },
};

const placeholders: Partial<Record<keyof ProfileSetupData, { bn: string; en: string; ko: string }>> = {
  fullName: { bn: "যেমন: রহিম উদ্দিন", en: "e.g. Rahim Uddin", ko: "예: 라힘 우딘" },
  email: { bn: "name@example.com", en: "name@example.com", ko: "name@example.com" },
  phone: { bn: "01712345678", en: "01712345678 or +8801712345678", ko: "01712345678" },
  nationality: { bn: "Bangladesh", en: "Bangladesh", ko: "방글라데시" },
  city: { bn: "ঢাকা", en: "Dhaka", ko: "다카" },
  targetIndustry: { bn: "যেমন: Manufacturing, Construction", en: "e.g. Manufacturing", ko: "예: 제조업" },
  bio: {
    bn: "কেন কোরিয়ায় কাজ করতে চান বা কী শিখছেন…",
    en: "Why you are preparing for EPS-TOPIK…",
    ko: "EPS-TOPIK 준비 목표를 적어 주세요…",
  },
};

function labelOf(key: Exclude<keyof ProfileSetupData, "avatarUrl">, locale: "bn" | "ko" | "en") {
  return fieldLabels[key][locale];
}

function placeholderOf(key: keyof ProfileSetupData, locale: "bn" | "ko" | "en") {
  return placeholders[key]?.[locale] ?? "";
}

function ProfileAvatar({
  src,
  name,
  sizeClass = "size-20",
}: {
  src?: string | null;
  name?: string;
  sizeClass?: string;
}) {
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <Avatar className={`${sizeClass} border-2 border-[var(--gold)]/40 shadow-sm`}>
      {src ? <AvatarImage src={src} alt={name || "Profile"} className="object-cover" /> : null}
      <AvatarFallback className="bg-[var(--navy)] font-serif text-lg font-bold text-[var(--gold)]">
        {initials || <UserRound className="size-8" />}
      </AvatarFallback>
    </Avatar>
  );
}

function AvatarPicker({
  avatarUrl,
  name,
  isAuthenticated,
  onChanged,
}: {
  avatarUrl: string;
  name?: string;
  isAuthenticated: boolean;
  onChanged: (url: string) => void;
}) {
  const { locale } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(avatarUrl);
  const utils = trpc.useUtils();

  useEffect(() => {
    setPreview(avatarUrl);
  }, [avatarUrl]);

  const setRemote = trpc.profile.setAvatar.useMutation({
    onSuccess: async data => {
      await utils.profile.get.invalidate();
      onChanged(data.avatarUrl || "");
      setPreview(data.avatarUrl || "");
      toast.success(
        locale === "en" ? "Profile picture updated" : locale === "ko" ? "프로필 사진이 저장되었습니다" : "প্রোফাইল ছবি আপডেট হয়েছে",
      );
    },
    onError: error => toast.error(error.message),
  });

  const removeRemote = trpc.profile.removeAvatar.useMutation({
    onSuccess: async () => {
      await utils.profile.get.invalidate();
      onChanged("");
      setPreview("");
      toast.success(locale === "en" ? "Profile picture removed" : "প্রোফাইল ছবি সরানো হয়েছে");
    },
    onError: error => toast.error(error.message),
  });

  const pick = () => inputRef.current?.click();

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const prepared = await prepareAvatarFile(file);
      setPreview(prepared.dataUrl);

      if (isAuthenticated) {
        await setRemote.mutateAsync({
          contentType: prepared.contentType,
          dataBase64: prepared.dataBase64,
        });
      } else {
        saveLocalAvatar(prepared.dataUrl);
        onChanged(prepared.dataUrl);
        toast.success(
          locale === "en"
            ? "Profile picture saved on this device"
            : "এই ডিভাইসে প্রোফাইল ছবি সংরক্ষিত হয়েছে",
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : locale === "en" ? "Invalid image" : "অবৈধ ছবি");
      setPreview(avatarUrl);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      if (isAuthenticated) {
        await removeRemote.mutateAsync();
      } else {
        saveLocalAvatar("");
        onChanged("");
        setPreview("");
        toast.success(locale === "en" ? "Profile picture removed" : "প্রোফাইল ছবি সরানো হয়েছে");
      }
    } finally {
      setBusy(false);
    }
  };

  const working = busy || setRemote.isPending || removeRemote.isPending;

  return (
    <div className="rounded-2xl border border-[var(--navy)]/10 bg-[var(--cream)]/60 p-5 md:col-span-2">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <ProfileAvatar src={preview} name={name} sizeClass="size-24" />
          <button
            type="button"
            onClick={pick}
            disabled={working}
            aria-label={locale === "en" ? "Change profile picture" : "প্রোফাইল ছবি পরিবর্তন"}
            className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full border border-white bg-[var(--navy)] text-white shadow-md transition hover:bg-[var(--navy)]/90 disabled:opacity-60"
          >
            {working ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{locale === "en" ? "Profile picture" : "প্রোফাইল ছবি"}</p>
          <h3 className="mt-1 font-serif text-xl font-bold text-[var(--navy)]">
            {locale === "en" ? "Set your photo" : locale === "ko" ? "사진 설정" : "আপনার ছবি সেট করুন"}
          </h3>
          <p className="mt-1.5 text-sm leading-6 text-[var(--navy)]/60">
            {locale === "en"
              ? "JPEG, PNG or WebP · max 2 MB · square crop applied automatically."
              : "JPEG, PNG বা WebP · সর্বোচ্চ ২ MB · স্বয়ংক্রিয় স্কোয়ার ক্রপ।"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={pick} disabled={working} className="rounded-full bg-[var(--navy)] text-white">
              <ImagePlus className="size-4" />
              {preview
                ? locale === "en"
                  ? "Change photo"
                  : "ছবি পরিবর্তন"
                : locale === "en"
                  ? "Upload photo"
                  : "ছবি আপলোড"}
            </Button>
            {preview ? (
              <Button
                type="button"
                variant="outline"
                onClick={remove}
                disabled={working}
                className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="size-4" />
                {locale === "en" ? "Remove" : "সরান"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onFile}
      />
    </div>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--navy)]/10 bg-[radial-gradient(circle_at_85%_20%,rgba(204,166,92,.18),transparent_28%)]">
      <div className="container flex flex-col gap-6 py-12 md:flex-row md:items-end md:justify-between md:py-16">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-[var(--navy)] md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--navy)]/68 md:text-lg">{description}</p>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-semibold text-red-600" role="alert">{message}</p>;
}

function CompletenessBar({ percent }: { percent: number }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs font-bold text-[var(--navy)]/55">
        <span>প্রোফাইল সম্পূর্ণতা</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--cream-deep)]">
        <div
          className="h-full rounded-full bg-[var(--sage)] transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

function ProfileSetupForm({
  defaults,
  onSaved,
  onCancel,
  isAuthenticated,
}: {
  defaults: FormValues;
  onSaved: (data: ProfileSetupData) => void;
  onCancel?: () => void;
  isAuthenticated: boolean;
}) {
  const { locale } = useLocale();
  const utils = trpc.useUtils();
  const [avatarUrl, setAvatarUrl] = useState(String(defaults.avatarUrl ?? ""));

  useEffect(() => {
    setAvatarUrl(String(defaults.avatarUrl ?? ""));
  }, [defaults.avatarUrl]);

  /** Concise trilingual summary shown instead of raw validation payloads. */
  const fixFieldsMessage =
    locale === "en"
      ? "Please fix the highlighted fields"
      : locale === "ko"
        ? "표시된 항목을 수정해 주세요"
        : "চিহ্নিত ঘরগুলো ঠিক করুন";

  /** Funnel any field-error map into react-hook-form so each field highlights with its own message. */
  const applyFieldErrors = (fieldErrors: FieldErrorMap) => {
    let applied = false;
    let focused = false;
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (!isProfileField(field) || field === "avatarUrl") continue;
      form.setError(field, { type: "server", message }, { shouldFocus: !focused });
      focused = true;
      applied = true;
    }
    return applied;
  };

  const updateRemote = trpc.profile.update.useMutation({
    onSuccess: async data => {
      await utils.profile.get.invalidate();
      await utils.auth.me.invalidate();
      onSaved({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        preferredLocale: data.preferredLocale,
        nationality: data.nationality,
        city: data.city,
        learningLevel: data.learningLevel,
        targetIndustry: data.targetIndustry,
        targetExamDate: data.targetExamDate,
        bio: data.bio,
        avatarUrl: data.avatarUrl || avatarUrl,
      });
      toast.success(locale === "en" ? "Profile saved" : locale === "ko" ? "프로필이 저장되었습니다" : "প্রোফাইল সংরক্ষিত হয়েছে");
    },
    onError: error => {
      // Zod validation error from the server → per-field highlights + concise toast
      const fieldErrors = fieldErrorsFromTrpcError(error);
      if (fieldErrors && applyFieldErrors(fieldErrors)) {
        toast.error(fixFieldsMessage);
        return;
      }
      toast.error(error.message);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: { ...emptyProfile, ...defaults },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    form.reset({ ...emptyProfile, ...defaults });
  }, [defaults, form]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = form;

  const bioValue = watch("bio") ?? "";
  const fullNameValue = watch("fullName") ?? "";

  const onSubmit = handleSubmit(
    async values => {
      // Server + client both enforce the same schema
      const parsed = profileSetupSchema.safeParse({ ...values, avatarUrl });
      if (!parsed.success) {
        // Same setError funnel as the server path so invalid fields highlight consistently
        applyFieldErrors(fieldErrorsFromZodError(parsed.error));
        toast.error(fixFieldsMessage);
        return;
      }

      if (isAuthenticated) {
        await updateRemote.mutateAsync(parsed.data);
        return;
      }

      try {
        const saved = saveLocalProfile(parsed.data);
        onSaved(parsed.data);
        toast.success(
          locale === "en"
            ? "Profile saved on this device"
            : locale === "ko"
              ? "이 기기에 프로필이 저장되었습니다"
              : "এই ডিভাইসে প্রোফাইল সংরক্ষিত হয়েছে",
        );
        void saved;
      } catch {
        toast.error(locale === "en" ? "Invalid profile data" : "অবৈধ প্রোফাইল তথ্য");
      }
    },
    // zodResolver already set per-field errors; surface the concise summary toast
    () => toast.error(fixFieldsMessage),
  );

  const selectClass =
    "mt-2 h-11 w-full rounded-xl border border-[var(--navy)]/15 bg-white px-3 text-sm font-semibold text-[var(--navy)] outline-none focus:border-[var(--gold)]";
  const inputClass = (hasError: boolean) =>
    `mt-2 h-11 rounded-xl bg-white ${hasError ? "border-red-400 focus-visible:ring-red-300" : "border-[var(--navy)]/12"}`;

  return (
    <form onSubmit={onSubmit} noValidate className="paper-card p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{locale === "en" ? "Required fields marked *" : "আবশ্যক ঘর * দিয়ে চিহ্নিত"}</p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">
            {locale === "en" ? "Set up your profile" : locale === "ko" ? "프로필 설정" : "প্রোফাইল সেটআপ"}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--navy)]/60">
            {locale === "en"
              ? "Enter valid details and optionally add a profile picture."
              : "সঠিক তথ্য দিন এবং ইচ্ছামতো প্রোফাইল ছবি যোগ করুন।"}
          </p>
        </div>
        {!isAuthenticated && (
          <span className="rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-bold text-[var(--gold-dark)]">
            {locale === "en" ? "Guest · device only" : "অতিথি · শুধু এই ডিভাইস"}
          </span>
        )}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <AvatarPicker
          avatarUrl={avatarUrl}
          name={String(fullNameValue || defaults.fullName || "")}
          isAuthenticated={isAuthenticated}
          onChanged={setAvatarUrl}
        />

        <label className="field-label">
          {labelOf("fullName", locale)}
          <Input
            {...register("fullName")}
            autoComplete="name"
            placeholder={placeholderOf("fullName", locale)}
            className={inputClass(!!errors.fullName)}
            aria-invalid={!!errors.fullName}
          />
          <FieldError message={errors.fullName?.message} />
        </label>

        <label className="field-label">
          {labelOf("email", locale)}
          <Input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder={placeholderOf("email", locale)}
            className={inputClass(!!errors.email)}
            aria-invalid={!!errors.email}
          />
          <FieldError message={errors.email?.message} />
        </label>

        <label className="field-label">
          {labelOf("phone", locale)}
          <Input
            {...register("phone")}
            type="tel"
            autoComplete="tel"
            placeholder={placeholderOf("phone", locale)}
            className={inputClass(!!errors.phone)}
            aria-invalid={!!errors.phone}
          />
          <FieldError message={errors.phone?.message} />
        </label>

        <label className="field-label">
          {labelOf("preferredLocale", locale)}
          <select {...register("preferredLocale")} className={selectClass} aria-invalid={!!errors.preferredLocale}>
            {preferredLocales.map(value => (
              <option key={value} value={value}>
                {localeLabels[value][locale]}
              </option>
            ))}
          </select>
          <FieldError message={errors.preferredLocale?.message} />
        </label>

        <label className="field-label">
          {labelOf("nationality", locale)}
          <Input
            {...register("nationality")}
            placeholder={placeholderOf("nationality", locale)}
            className={inputClass(!!errors.nationality)}
            aria-invalid={!!errors.nationality}
          />
          <FieldError message={errors.nationality?.message} />
        </label>

        <label className="field-label">
          {labelOf("city", locale)}
          <Input
            {...register("city")}
            placeholder={placeholderOf("city", locale)}
            className={inputClass(!!errors.city)}
            aria-invalid={!!errors.city}
          />
          <FieldError message={errors.city?.message} />
        </label>

        <label className="field-label">
          {labelOf("learningLevel", locale)}
          <select {...register("learningLevel")} className={selectClass} aria-invalid={!!errors.learningLevel}>
            {learningLevels.map(value => (
              <option key={value} value={value}>
                {learningLevelLabels[value][locale]}
              </option>
            ))}
          </select>
          <FieldError message={errors.learningLevel?.message} />
        </label>

        <label className="field-label">
          {labelOf("targetIndustry", locale)}
          <Input
            {...register("targetIndustry")}
            placeholder={placeholderOf("targetIndustry", locale)}
            className={inputClass(!!errors.targetIndustry)}
            aria-invalid={!!errors.targetIndustry}
          />
          <FieldError message={errors.targetIndustry?.message} />
        </label>

        <label className="field-label md:col-span-2">
          {labelOf("targetExamDate", locale)}
          <Input
            {...register("targetExamDate")}
            type="date"
            className={inputClass(!!errors.targetExamDate)}
            aria-invalid={!!errors.targetExamDate}
          />
          <FieldError message={errors.targetExamDate?.message} />
        </label>

        <label className="field-label md:col-span-2">
          <span className="flex items-center justify-between gap-3">
            <span>{labelOf("bio", locale)}</span>
            <span className="text-[11px] font-semibold text-[var(--navy)]/40">{String(bioValue).length}/400</span>
          </span>
          <Textarea
            {...register("bio")}
            rows={4}
            maxLength={400}
            placeholder={placeholderOf("bio", locale)}
            className={`mt-2 rounded-xl bg-white ${errors.bio ? "border-red-400" : "border-[var(--navy)]/12"}`}
            aria-invalid={!!errors.bio}
          />
          <FieldError message={errors.bio?.message} />
        </label>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[var(--navy)]/45">
          {locale === "en"
            ? "Invalid data cannot be saved. Required fields must pass validation."
            : "অবৈধ তথ্য সংরক্ষণ হবে না। আবশ্যক ঘরগুলো যাচাই পাস করতে হবে।"}
        </p>
        <div className="flex flex-wrap gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="rounded-full border-[var(--navy)]/15">
              {locale === "en" ? "Cancel" : "বাতিল"}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || updateRemote.isPending}
            className="rounded-full bg-[var(--navy)] px-6 text-white"
          >
            {(isSubmitting || updateRemote.isPending) && <Loader2 className="size-4 animate-spin" />}
            <Save className="size-4" />
            {locale === "en" ? "Save profile" : locale === "ko" ? "프로필 저장" : "প্রোফাইল সংরক্ষণ"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ProfileDashboard({
  profile,
  onEdit,
  isAuthenticated,
  onAvatarChanged,
}: {
  profile: ProfileSetupData & { isComplete: boolean; updatedAt?: string | null };
  onEdit: () => void;
  isAuthenticated: boolean;
  onAvatarChanged?: (url: string) => void;
}) {
  const { locale } = useLocale();
  const state = useLocalLearning();
  const overview = learningOverview(state);
  const certificates = trpc.certificates.mine.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const issue = trpc.certificates.issue.useMutation({
    onSuccess: () => {
      certificates.refetch();
      toast.success("সার্টিফিকেট তৈরি হয়েছে");
    },
    onError: error => toast.error(error.message),
  });

  const completeness = profileCompleteness(profile);
  const level = learningLevelLabels[profile.learningLevel as LearningLevel]?.[locale] ?? profile.learningLevel;
  const lang = localeLabels[profile.preferredLocale as PreferredLocale]?.[locale] ?? profile.preferredLocale;

  const hangulReady = Boolean(state.basics?.checkpointPassedAt);

  const badges = [
    {
      id: "hangul-ready",
      title: locale === "en" ? "Hangul ready" : locale === "ko" ? "한글 준비" : "হ্যাঙ্গুল প্রস্তুত",
      earned: hangulReady,
      icon: BookOpenText,
    },
    { id: "first-step", title: "প্রথম পদক্ষেপ", earned: overview.completedLessons >= 1, icon: Sparkles },
    { id: "ten-lessons", title: "দশ অধ্যায়", earned: overview.completedLessons >= 10, icon: BookCheck },
    { id: "halfway", title: "অর্ধেক পথ", earned: overview.completedLessons >= 30, icon: Medal },
    { id: "perfect", title: "নিখুঁত স্কোর", earned: state.attempts.some(item => item.score === item.total), icon: Award },
    {
      id: "ready",
      title: "মক টেস্ট প্রস্তুত",
      earned: state.attempts.some(item => item.kind === "mock-test" && item.score / item.total >= 0.8),
      icon: GraduationCap,
    },
    { id: "master", title: "পাঠ্যক্রম মাস্টার", earned: overview.completedLessons >= 60, icon: ShieldCheck },
  ];

  return (
    <div className="container py-10">
      {!isAuthenticated && (
        <div className="mb-7 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-5 text-sm leading-7 text-[var(--navy)]">
          <strong>এই ডিভাইসের প্রোফাইল দেখছেন।</strong> ক্লাউড সিঙ্ক ও সার্টিফিকেটের জন্য সাইন ইন করুন।{" "}
          <button onClick={() => startLogin()} className="ml-1 font-bold underline">
            সাইন ইন
          </button>
        </div>
      )}

      <div className="grid gap-7 lg:grid-cols-[.85fr_1.15fr]">
        <section className="paper-card p-7">
          <div className="mb-4 flex justify-end">
            <Button onClick={onEdit} variant="outline" className="rounded-full border-[var(--navy)]/15">
              <Pencil className="size-4" />
              {locale === "en" ? "Edit" : "সম্পাদনা"}
            </Button>
          </div>
          <AvatarPicker
            avatarUrl={profile.avatarUrl || ""}
            name={profile.fullName}
            isAuthenticated={isAuthenticated}
            onChanged={url => onAvatarChanged?.(url)}
          />
          <h2 className="mt-5 font-serif text-2xl font-bold text-[var(--navy)]">{profile.fullName || "EasyEPS Learner"}</h2>
          <p className="mt-1 text-sm text-[var(--navy)]/50">{profile.email || "—"}</p>
          {profile.isComplete ? (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--sage)]/15 px-3 py-1 text-xs font-bold text-[var(--sage-dark)]">
              <Check className="size-3.5" />
              {locale === "en" ? "Profile complete" : "প্রোফাইল সম্পূর্ণ"}
            </span>
          ) : (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-bold text-[var(--gold-dark)]">
              {locale === "en" ? "Setup incomplete" : "সেটআপ অসম্পূর্ণ"}
            </span>
          )}
          <CompletenessBar percent={completeness.percent} />

          <dl className="mt-6 space-y-3 text-sm">
            {[
              { k: locale === "en" ? "Phone" : "মোবাইল", v: profile.phone || "—" },
              { k: locale === "en" ? "Nationality" : "জাতীয়তা", v: profile.nationality || "—" },
              { k: locale === "en" ? "City" : "শহর", v: profile.city || "—" },
              { k: locale === "en" ? "Language" : "ভাষা", v: lang },
              { k: locale === "en" ? "Level" : "দক্ষতা", v: level },
              { k: locale === "en" ? "Industry" : "খাত", v: profile.targetIndustry || "—" },
              {
                k: locale === "en" ? "Exam date" : "পরীক্ষা",
                v: profile.targetExamDate
                  ? new Date(`${profile.targetExamDate}T00:00:00`).toLocaleDateString(locale === "bn" ? "bn-BD" : locale === "ko" ? "ko-KR" : "en-US")
                  : "—",
              },
            ].map(row => (
              <div key={row.k} className="flex items-start justify-between gap-4 border-b border-[var(--navy)]/6 pb-2">
                <dt className="font-semibold text-[var(--navy)]/45">{row.k}</dt>
                <dd className="text-right font-bold text-[var(--navy)]">{row.v}</dd>
              </div>
            ))}
          </dl>
          {profile.bio ? (
            <p className="mt-5 rounded-2xl bg-[var(--cream)] p-4 text-sm leading-6 text-[var(--navy)]/70">{profile.bio}</p>
          ) : null}

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[var(--cream)] p-4">
              <p className="font-serif text-2xl font-bold">{overview.completedLessons}</p>
              <p className="text-xs text-[var(--navy)]/50">অধ্যায়</p>
            </div>
            <div className="rounded-2xl bg-[var(--cream)] p-4">
              <p className="font-serif text-2xl font-bold">{overview.averageScore}%</p>
              <p className="text-xs text-[var(--navy)]/50">গড় স্কোর</p>
            </div>
          </div>
        </section>

        <section className="paper-card p-7">
          <p className="eyebrow">অর্জন</p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">আপনার ব্যাজ</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {badges.map(({ id, title, earned, icon: Icon }) => (
              <div
                key={id}
                className={`rounded-2xl border p-4 text-center ${
                  earned ? "border-[var(--gold)]/30 bg-[var(--gold)]/10" : "border-[var(--navy)]/8 bg-[var(--cream)] opacity-45 grayscale"
                }`}
              >
                <span className="mx-auto grid size-11 place-items-center rounded-full bg-white text-[var(--gold-dark)]">
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 text-sm font-bold text-[var(--navy)]">{title}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="paper-card mt-7 p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">যোগ্যতার স্বীকৃতি</p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">সার্টিফিকেট</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--navy)]/55">
              {locale === "en"
                ? "Certificates are printed with your full profile, nationality, and photo. Complete profile + photo required."
                : "সার্টিফিকেটে আপনার পূর্ণ নাম, জাতীয়তা, ছবি ও প্রোফাইল তথ্য মুদ্রিত হয়। সম্পূর্ণ প্রোফাইল ও ছবি আবশ্যক।"}
            </p>
          </div>
          {isAuthenticated && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => issue.mutate({ kind: "mock-test" })}
                variant="outline"
                className="rounded-full"
                disabled={issue.isPending}
              >
                মক টেস্ট সার্টিফিকেট
              </Button>
              <Button
                onClick={() => issue.mutate({ kind: "course-completion" })}
                className="rounded-full bg-[var(--navy)] text-white"
                disabled={issue.isPending}
              >
                কোর্স সার্টিফিকেট
              </Button>
            </div>
          )}
        </div>
        {isAuthenticated && (!profile.isComplete || !profile.avatarUrl) && (
          <div className="mt-5 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-4 text-sm leading-6 text-[var(--navy)]">
            <strong>{locale === "en" ? "Before issuing:" : "ইস্যু করার আগে:"}</strong>{" "}
            {!profile.isComplete
              ? locale === "en"
                ? "Complete your profile setup."
                : "প্রোফাইল সেটআপ সম্পূর্ণ করুন।"
              : locale === "en"
                ? "Upload a profile picture so it appears on the certificate."
                : "প্রোফাইল ছবি আপলোড করুন—সার্টিফিকেটে দেখাবে।"}{" "}
            <button type="button" onClick={onEdit} className="font-bold underline">
              {locale === "en" ? "Open setup" : "সেটআপ খুলুন"}
            </button>
          </div>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {certificates.data?.length ? (
            certificates.data.map(certificate => {
              const snap = certificate.recipientSnapshot as
                | { fullName?: string; avatarUrl?: string; nationality?: string }
                | null
                | undefined;
              const name = certificate.learnerName || snap?.fullName || profile.fullName;
              const photo = certificate.avatarUrl || snap?.avatarUrl || profile.avatarUrl || "";
              return (
                <Link
                  key={certificate.id}
                  href={`/certificate/${certificate.code}`}
                  className="group rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/8 p-5 transition hover:border-[var(--gold)]/55 hover:bg-[var(--gold)]/12"
                >
                  <div className="flex items-start gap-3">
                    {photo ? (
                      <img src={photo} alt="" className="certificate-card-thumb" />
                    ) : (
                      <span className="grid size-12 place-items-center rounded-full bg-[var(--navy)] text-[var(--gold)]">
                        <Award className="size-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[var(--navy)]">
                        {certificate.kind === "mock-test" ? "Mock Test Excellence" : "Course Completion"}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-[var(--navy)]/70">{name}</p>
                      <p className="mt-1 text-xs text-[var(--navy)]/45">
                        {certificate.code}
                        {certificate.scorePercent != null ? ` · ${certificate.scorePercent}%` : ""}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-[var(--navy)]/30 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full rounded-2xl bg-[var(--cream)] p-8 text-center text-[var(--navy)]/45">
              যোগ্যতা পূরণ করলে আপনার সার্টিফিকেট এখানে দেখা যাবে।
            </div>
          )}
        </div>
      </section>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/dashboard">
          <Button variant="outline" className="rounded-full border-[var(--navy)]/15">
            অগ্রগতি ড্যাশবোর্ড <ChevronRight className="size-4" />
          </Button>
        </Link>
        <Link href="/curriculum">
          <Button className="rounded-full bg-[var(--navy)] text-white">
            পাঠ্যক্রমে যান <ChevronRight className="size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { locale } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const local = useLocalProfile();
  const search = useSearch();
  const [location, setLocation] = useLocation();
  const wantSetup =
    location.startsWith("/profile/setup") || search.includes("setup=1") || search.includes("edit=1");

  const remote = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const mergedDefaults = useMemo((): FormValues => {
    if (isAuthenticated && remote.data) {
      return {
        fullName: remote.data.fullName || user?.name || "",
        email: remote.data.email || user?.email || "",
        phone: remote.data.phone || "",
        preferredLocale: remote.data.preferredLocale || "bn",
        nationality: remote.data.nationality || "Bangladesh",
        city: remote.data.city || "",
        learningLevel: remote.data.learningLevel || "beginner",
        targetIndustry: remote.data.targetIndustry || "",
        targetExamDate: remote.data.targetExamDate || "",
        bio: remote.data.bio || "",
        avatarUrl: remote.data.avatarUrl || "",
      };
    }
    return {
      fullName: local.fullName || user?.name || "",
      email: local.email || user?.email || "",
      phone: local.phone || "",
      preferredLocale: local.preferredLocale || "bn",
      nationality: local.nationality || "Bangladesh",
      city: local.city || "",
      learningLevel: local.learningLevel || "beginner",
      targetIndustry: local.targetIndustry || "",
      targetExamDate: local.targetExamDate || "",
      bio: local.bio || "",
      avatarUrl: local.avatarUrl || "",
    };
  }, [isAuthenticated, remote.data, local, user]);

  const profileView = useMemo(() => {
    if (isAuthenticated && remote.data) {
      return {
        ...remote.data,
        isComplete: remote.data.isComplete,
      };
    }
    return {
      ...local,
      isComplete: local.isComplete,
    };
  }, [isAuthenticated, remote.data, local]);

  const needsSetup = !profileView.isComplete;
  const [editing, setEditing] = useState(wantSetup);

  useEffect(() => {
    if (wantSetup) setEditing(true);
  }, [wantSetup]);

  // Once remote loads and is complete, leave edit mode unless user asked for setup
  useEffect(() => {
    if (!wantSetup && profileView.isComplete) setEditing(false);
  }, [profileView.isComplete, wantSetup]);

  if (isAuthenticated && remote.isLoading) {
    return (
      <div className="container py-24 text-center">
        <Loader2 className="mx-auto size-7 animate-spin text-[var(--gold-dark)]" />
        <p className="mt-4 text-sm font-semibold text-[var(--navy)]/60">প্রোফাইল লোড হচ্ছে…</p>
      </div>
    );
  }

  return (
    <>
      <PageIntro
        eyebrow={locale === "en" ? "Learner identity" : "শিক্ষার্থী পরিচিতি"}
        title={
          editing
            ? locale === "en"
              ? "Profile setup"
              : "প্রোফাইল সেটআপ"
            : profileView.fullName || (locale === "en" ? "My profile" : "আমার প্রোফাইল")
        }
        description={
          editing
            ? locale === "en"
              ? "Complete every required field with valid data. The form will not save until validation passes."
              : "প্রতিটি আবশ্যক ঘরে সঠিক তথ্য দিন। যাচাই পাস না হলে সংরক্ষণ হবে না।"
            : locale === "en"
              ? "Your achievements, badges, exam results, and certificates in one place."
              : "আপনার অর্জন, ব্যাজ, পরীক্ষার ফলাফল এবং সার্টিফিকেট এক জায়গায়।"
        }
        actions={
          !editing ? (
            <Button onClick={() => setEditing(true)} className="rounded-full bg-[var(--navy)] px-6 text-white">
              <Pencil className="size-4" />
              {locale === "en" ? "Edit profile" : "প্রোফাইল সম্পাদনা"}
            </Button>
          ) : needsSetup ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/15 px-4 py-2 text-sm font-bold text-[var(--gold-dark)]">
              <UserPlus className="size-4" />
              {locale === "en" ? "Setup can be completed later" : "সেটআপ পরে করা যাবে"}
            </span>
          ) : undefined
        }
      />

      {editing ? (
        <div className="container py-10">
          <ProfileSetupForm
            defaults={mergedDefaults}
            isAuthenticated={isAuthenticated}
            onCancel={() => {
              setEditing(false);
              if (wantSetup) setLocation("/profile");
            }}
            onSaved={() => {
              setEditing(false);
              if (wantSetup) setLocation("/profile");
            }}
          />
        </div>
      ) : (
        <ProfileDashboard
          profile={profileView}
          onEdit={() => setEditing(true)}
          isAuthenticated={isAuthenticated}
          onAvatarChanged={() => {
            if (isAuthenticated) remote.refetch();
          }}
        />
      )}
    </>
  );
}
