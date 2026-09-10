import type { EpsQuestionImage as EpsQuestionImageModel } from "@shared/lesson";
import { Check, X } from "lucide-react";
import { useState } from "react";

/**
 * Picture-choice answer grid — the real EPS-TOPIK exam's dominant item style:
 * four PICTURES labelled ① ② ③ ④ as the answer choices
 * ("그림을 보고 알맞은 것을 고르십시오").
 *
 * Accessibility: each option is a real <button> whose accessible name is the
 * Bangla image description (altBn). If an image fails to load, the description
 * renders in its place so the item stays answerable offline.
 */
export function EpsOptionImages({
  images,
  selected,
  answer,
  revealed = false,
  onSelect,
  disabled = false,
}: {
  images: EpsQuestionImageModel[];
  /** Currently selected option index ( learner answer). */
  selected?: number;
  /** Correct option index — highlighted once `revealed`. */
  answer: number;
  /** Reveal correct/wrong styling (after submission). */
  revealed?: boolean;
  onSelect?: (index: number) => void;
  disabled?: boolean;
}) {
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="ছবির উত্তর বিকল্প">
      {images.map((image, index) => {
        const isSelected = selected === index;
        const isAnswer = revealed && index === answer;
        const isWrongPick = revealed && isSelected && index !== answer;
        const description = image.altKo ? `${image.altBn} (${image.altKo})` : image.altBn;
        return (
          <button
            key={`${image.src}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect?.(index)}
            aria-pressed={isSelected}
            aria-label={`${String.fromCharCode(65 + index)}. ${description}`}
            className={`relative overflow-hidden rounded-2xl border-2 bg-white transition ${
              isAnswer
                ? "border-emerald-500 ring-2 ring-emerald-200"
                : isWrongPick
                  ? "border-red-400 ring-2 ring-red-100"
                  : isSelected
                    ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/30"
                    : "border-[var(--navy)]/12 hover:border-[var(--gold)]/60"
            } ${disabled ? "cursor-default" : "cursor-pointer"}`}
          >
            <span className="absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-[var(--navy)] text-[11px] font-bold text-white">
              {String.fromCharCode(65 + index)}
            </span>
            {isAnswer ? (
              <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-emerald-600 text-white">
                <Check className="size-3.5" />
              </span>
            ) : isWrongPick ? (
              <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-red-500 text-white">
                <X className="size-3.5" />
              </span>
            ) : null}
            {failed[index] ? (
              <span className="grid min-h-28 place-items-center p-3 text-center text-xs font-semibold leading-5 text-[var(--navy)]/70">
                {image.altBn}
              </span>
            ) : (
              <img
                src={image.src}
                alt={description}
                loading="lazy"
                decoding="async"
                onError={() => setFailed(previous => ({ ...previous, [index]: true }))}
                className="aspect-square w-full object-contain p-2"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
