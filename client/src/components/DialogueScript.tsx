import { parseDialogueTurns, type DialogueSpeaker } from "@/lib/dialogueSpeech";

/**
 * Post-submit listening script rendered as speaker turns.
 * Two-speaker dialogues show 남/여 chips (like the printed EPS answer book)
 * so learners can map each line to the voice they heard.
 */

const SPEAKER_CHIP: Record<DialogueSpeaker, { label: string; className: string } | null> = {
  male: { label: "남", className: "bg-sky-100 text-sky-800 ring-1 ring-sky-200" },
  female: { label: "여", className: "bg-rose-100 text-rose-800 ring-1 ring-rose-200" },
  narrator: null,
};

export type DialogueScriptProps = {
  passage: string;
  className?: string;
};

export function DialogueScript({ passage, className = "" }: DialogueScriptProps) {
  const turns = parseDialogueTurns(passage);

  // Plain narration — keep the familiar single-block script.
  if (turns.length <= 1 && turns.every(turn => turn.speaker === "narrator")) {
    return <p className={`font-semibold text-[var(--navy)] ${className}`}>{passage}</p>;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {turns.map((turn, index) => {
        const chip = SPEAKER_CHIP[turn.speaker];
        return (
          <p key={`${turn.speaker}-${index}`} className="flex items-start gap-2 font-semibold leading-7 text-[var(--navy)]">
            {chip ? (
              <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${chip.className}`}>
                {chip.label}
              </span>
            ) : (
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--navy)]/8 text-xs font-bold text-[var(--navy)]/55">
                안내
              </span>
            )}
            <span className="min-w-0">{turn.text}</span>
          </p>
        );
      })}
    </div>
  );
}
