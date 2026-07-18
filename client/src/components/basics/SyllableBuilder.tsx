import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { composeHangul, V1_BATCHIM, V1_CONSONANTS, V1_VOWELS } from "@shared/hangul";
import { Check, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";

export type BuilderPrompt = {
  id: string;
  initial: string;
  vowel: string;
  final?: string;
  answer: string;
  bn?: string;
  en?: string;
};

type SyllableBuilderProps = {
  prompts: BuilderPrompt[];
  doneIds?: string[];
  onPromptCorrect: (promptId: string) => void;
};

/**
 * Compose initial + vowel (+ final) with jamo buttons; validate via composeHangul.
 */
export function SyllableBuilder({ prompts, doneIds = [], onPromptCorrect }: SyllableBuilderProps) {
  const { locale } = useLocale();
  const [index, setIndex] = useState(0);
  const [initial, setInitial] = useState<string | null>(null);
  const [vowel, setVowel] = useState<string | null>(null);
  const [finalJamo, setFinalJamo] = useState<string>("");
  const [feedback, setFeedback] = useState<"ok" | "bad" | null>(null);

  const prompt = prompts[index];
  const needsFinal = Boolean(prompt?.final);

  const composed = useMemo(() => {
    if (!initial || !vowel) return "";
    try {
      return composeHangul(initial, vowel, finalJamo || "");
    } catch {
      return "";
    }
  }, [initial, vowel, finalJamo]);

  if (!prompt) {
    return <p className="text-sm text-[var(--navy)]/55">No builder prompts.</p>;
  }

  const alreadyDone = doneIds.includes(prompt.id);

  const reset = () => {
    setInitial(null);
    setVowel(null);
    setFinalJamo("");
    setFeedback(null);
  };

  const check = () => {
    if (!composed) {
      setFeedback("bad");
      return;
    }
    if (composed === prompt.answer) {
      setFeedback("ok");
      if (!alreadyDone) onPromptCorrect(prompt.id);
    } else {
      setFeedback("bad");
    }
  };

  const next = () => {
    reset();
    setIndex(i => Math.min(prompts.length - 1, i + 1));
  };

  const prev = () => {
    reset();
    setIndex(i => Math.max(0, i - 1));
  };

  const hint =
    locale === "en" ? prompt.en || prompt.bn : locale === "ko" ? prompt.answer : prompt.bn || prompt.en;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">
            {index + 1}/{prompts.length}
          </p>
          <h3 className="mt-1 font-serif text-2xl font-bold text-[var(--navy)]">
            {locale === "en" ? "Build the syllable" : locale === "ko" ? "음절 만들기" : "অক্ষর গঠন করুন"}
          </h3>
          {hint && <p className="mt-1 text-sm text-[var(--navy)]/55">{hint}</p>}
        </div>
        {alreadyDone && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--sage)]/15 px-3 py-1 text-xs font-bold text-[var(--sage-dark)]">
            <Check className="size-3.5" /> Done
          </span>
        )}
      </div>

      <div className="grid place-items-center rounded-[2rem] border border-[var(--gold)]/25 bg-[radial-gradient(circle_at_top,rgba(204,166,92,.15),transparent_50%)] py-10">
        <p className="font-serif text-6xl font-bold text-[var(--navy)]">{composed || "·"}</p>
        <p className="mt-3 text-sm font-semibold text-[var(--navy)]/45">
          {[initial, vowel, finalJamo || null].filter(Boolean).join(" + ") || "—"}
        </p>
      </div>

      <JamoRow
        label={locale === "en" ? "Initial" : locale === "ko" ? "초성" : "প্রাথমিক"}
        options={[...V1_CONSONANTS]}
        selected={initial}
        onSelect={setInitial}
      />
      <JamoRow
        label={locale === "en" ? "Vowel" : locale === "ko" ? "중성" : "স্বর"}
        options={[...V1_VOWELS]}
        selected={vowel}
        onSelect={setVowel}
      />
      {needsFinal && (
        <JamoRow
          label={locale === "en" ? "Final (batchim)" : locale === "ko" ? "받침" : "ব্যাচিম"}
          options={["", ...V1_BATCHIM]}
          selected={finalJamo}
          onSelect={setFinalJamo}
          emptyLabel="∅"
        />
      )}

      {feedback === "ok" && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Check className="size-4" /> {prompt.answer} ✓
        </div>
      )}
      {feedback === "bad" && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          <X className="size-4" /> {locale === "en" ? "Try again" : "আবার চেষ্টা করুন"}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="rounded-full" onClick={reset}>
          <RotateCcw className="size-4" /> Reset
        </Button>
        <Button type="button" className="rounded-full bg-[var(--navy)] text-white" onClick={check}>
          Check
        </Button>
        <Button type="button" variant="outline" className="rounded-full" onClick={prev} disabled={index === 0}>
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={next}
          disabled={index >= prompts.length - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function JamoRow({
  label,
  options,
  selected,
  onSelect,
  emptyLabel,
}: {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  emptyLabel?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--navy)]/45">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(jamo => {
          const isSelected = selected === jamo;
          return (
            <button
              key={jamo || "empty"}
              type="button"
              onClick={() => onSelect(jamo)}
              className={`grid size-11 place-items-center rounded-xl border text-lg font-bold transition ${
                isSelected
                  ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                  : "border-[var(--navy)]/12 bg-[var(--cream)] text-[var(--navy)] hover:border-[var(--gold)]/40"
              }`}
            >
              {jamo || emptyLabel || "·"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
