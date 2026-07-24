import type { EpsQuestionImage as EpsQuestionImageModel } from "@shared/lesson";
import { useState } from "react";

const KIND_LABEL_BN: Record<EpsQuestionImageModel["kind"], string> = {
  photo: "ছবি",
  illustration: "চিত্র",
  "safety-sign": "নিরাপত্তা চিহ্ন",
  notice: "নোটিশ",
  diagram: "ডায়াগ্রাম",
};

/**
 * Accessible renderer for exam-style question images (pictures, safety signs,
 * notices) used across practice, chapter-exam, and mock-test flows.
 *
 * Accessibility contract:
 * - `altBn` is always rendered as the image alt text for screen readers.
 * - The image is wrapped in a `figure` with an optional visible caption.
 * - A graceful text fallback (the alt description) is shown if loading fails,
 *   so image questions remain answerable offline or on flaky connections.
 */
export function EpsQuestionImage({
  image,
  compact = false,
}: {
  image: EpsQuestionImageModel;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const alt = image.altKo ? `${image.altBn} (${image.altKo})` : image.altBn;

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="mt-4 rounded-2xl border border-dashed border-[var(--navy)]/25 bg-[var(--cream)] p-4 text-sm leading-6 text-[var(--navy)]/70"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--gold-dark)]">
          {KIND_LABEL_BN[image.kind]} লোড হয়নি
        </p>
        <p className="mt-1 font-semibold text-[var(--navy)]">{image.altBn}</p>
        {image.altKo ? <p className="mt-1 text-[var(--navy)]/60">{image.altKo}</p> : null}
      </div>
    );
  }

  return (
    <figure className={`mt-4 overflow-hidden rounded-2xl border border-[var(--navy)]/10 bg-white ${compact ? "max-w-sm" : "max-w-md"}`}>
      <div className="flex items-center justify-between border-b border-[var(--navy)]/8 bg-[var(--cream)] px-4 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--gold-dark)]">
          {KIND_LABEL_BN[image.kind]}
        </span>
        <span className="text-[10px] font-semibold text-[var(--navy)]/40">EPS exam image</span>
      </div>
      <img
        src={image.src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`mx-auto block w-full object-contain p-3 ${compact ? "max-h-48" : "max-h-64"}`}
      />
      {image.captionBn ? (
        <figcaption className="border-t border-[var(--navy)]/8 px-4 py-2 text-xs font-semibold leading-5 text-[var(--navy)]/55">
          {image.captionBn}
        </figcaption>
      ) : null}
    </figure>
  );
}
