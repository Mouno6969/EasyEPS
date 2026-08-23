import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import {
  assignDialogueVoices,
  cancelDialogue,
  DIALOGUE_PITCHES,
  isDialoguePassage,
  parseDialogueTurns,
  speakDialogue,
  speakNamedDialogue,
  speakNamedTurn,
} from "./dialogueSpeech";
import type { AudioClipRef } from "@shared/audio";

class MockSpeechSynthesisUtterance {
  text: string;
  lang = "";
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: ((event: SpeechSynthesisEvent) => unknown) | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => unknown) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

class MockGeneratedAudio {
  static instances: MockGeneratedAudio[] = [];
  src: string;
  preload = "";
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  currentTime = 0;

  constructor(src: string) {
    this.src = src;
    MockGeneratedAudio.instances.push(this);
  }

  play() {
    queueMicrotask(() => this.onended?.());
    return Promise.resolve();
  }

  pause() {}
}

function makeVoice(name: string, lang = "ko-KR"): SpeechSynthesisVoice {
  return { name, lang, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice;
}

describe("parseDialogueTurns", () => {
  it("splits a canonical two-speaker dialogue into alternating turns", () => {
    const turns = parseDialogueTurns("남자: 오늘 야근 가능하세요?\n여자: 네, 가능합니다.");
    expect(turns).toEqual([
      { speaker: "male", text: "오늘 야근 가능하세요?" },
      { speaker: "female", text: "네, 가능합니다." },
    ]);
  });

  it("handles three turns with a repeated speaker", () => {
    const turns = parseDialogueTurns("남자: 기계에 손가락이 끼었어요!\n여자: 기계를 멈추고 119에 연락해요.\n남자: 제가 지금 전화할게요.");
    expect(turns.map(turn => turn.speaker)).toEqual(["male", "female", "male"]);
  });

  it("supports short 남/여 labels and inline (non-newline) separators", () => {
    const turns = parseDialogueTurns("남: 어디예요? 여: 기숙사입니다.");
    expect(turns).toEqual([
      { speaker: "male", text: "어디예요?" },
      { speaker: "female", text: "기숙사입니다." },
    ]);
  });

  it("separates a trailing exam prompt from the final labelled speaker", () => {
    expect(
      parseDialogueTurns(
        "여자: 방이 너무 더러워요.\n남자: 제가 지금 청소할게요.\n\n남자는 지금 무엇을 할 것입니까?",
      ),
    ).toEqual([
      { speaker: "female", text: "방이 너무 더러워요." },
      { speaker: "male", text: "제가 지금 청소할게요." },
      { speaker: "narrator", text: "남자는 지금 무엇을 할 것입니까?" },
    ]);
  });

  it("treats unlabeled passages as a single narrator turn (announcements, single words)", () => {
    expect(parseDialogueTurns("화재가 발생했습니다. 비상구로 대피하십시오.")).toEqual([
      { speaker: "narrator", text: "화재가 발생했습니다. 비상구로 대피하십시오." },
    ]);
    expect(parseDialogueTurns("방글라데시")).toEqual([{ speaker: "narrator", text: "방글라데시" }]);
  });

  it("never includes the speaker label in the spoken text", () => {
    const turns = parseDialogueTurns("남자: 안녕하세요.\n여자: 반갑습니다.");
    for (const turn of turns) {
      expect(turn.text).not.toMatch(/남자|여자|[:：]/);
    }
  });

  it("returns an empty list for empty passages", () => {
    expect(parseDialogueTurns("")).toEqual([]);
    expect(parseDialogueTurns("   ")).toEqual([]);
  });

  it("only classifies passages with two distinct labelled speakers as dialogues", () => {
    expect(isDialoguePassage("남자: 안녕하세요.\n여자: 반갑습니다.")).toBe(true);
    expect(isDialoguePassage("남자: 안전모를 착용하세요.")).toBe(false);
    expect(isDialoguePassage("안전모를 착용하세요.")).toBe(false);
  });
});

describe("assignDialogueVoices", () => {
  it("assigns two distinct voices when gendered names are available", () => {
    const yuna = makeVoice("Microsoft Yuna - Korean (Female)");
    const injoon = makeVoice("Microsoft InJoon - Korean (Male)");
    const result = assignDialogueVoices([yuna, injoon]);
    expect(result.female).toBe(yuna);
    expect(result.male).toBe(injoon);
    expect(result.usesPitchFallback).toBe(false);
  });

  it("still picks two different voices without gender hints", () => {
    const a = makeVoice("Korean Voice 1");
    const b = makeVoice("Korean Voice 2");
    const result = assignDialogueVoices([a, b]);
    expect(result.male).not.toBe(result.female);
    expect(result.usesPitchFallback).toBe(false);
  });

  it("falls back to pitch differentiation with a single Korean voice", () => {
    const only = makeVoice("Google 한국의");
    const result = assignDialogueVoices([only]);
    expect(result.male).toBe(only);
    expect(result.female).toBe(only);
    expect(result.usesPitchFallback).toBe(true);
  });
});

describe("speakDialogue playback", () => {
  let speak: ReturnType<typeof vi.fn>;
  let voices: SpeechSynthesisVoice[];

  beforeEach(() => {
    vi.useFakeTimers();
    voices = [
      makeVoice("Microsoft Yuna - Korean (Female)"),
      makeVoice("Microsoft InJoon - Korean (Male)"),
    ];
    speak = vi.fn((utterance: MockSpeechSynthesisUtterance) => {
      queueMicrotask(() => utterance.onend?.({} as SpeechSynthesisEvent));
    });

    const speechSynthesis = {
      cancel: vi.fn(),
      speak,
      getVoices: vi.fn(() => voices),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { speechSynthesis, setTimeout: setTimeout.bind(globalThis) },
    });
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });
    MockGeneratedAudio.instances = [];
    Object.defineProperty(globalThis, "Audio", { configurable: true, value: MockGeneratedAudio });
    Object.defineProperty(globalThis, "HTMLAudioElement", { configurable: true, value: MockGeneratedAudio });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
    Reflect.deleteProperty(globalThis, "Audio");
    Reflect.deleteProperty(globalThis, "HTMLAudioElement");
    vi.clearAllMocks();
  });

  async function run(promise: Promise<boolean>): Promise<boolean> {
    // Flush microtasks + turn-gap timers until playback settles.
    for (let i = 0; i < 20; i += 1) {
      await Promise.resolve();
      await vi.runAllTimersAsync();
    }
    return promise;
  }

  it("speaks each dialogue turn with a different voice per speaker", async () => {
    const done = await run(speakDialogue("남자: 오늘 야근 가능하세요?\n여자: 네, 가능합니다."));
    expect(done).toBe(true);
    expect(speak).toHaveBeenCalledTimes(2);

    const [first, second] = speak.mock.calls.map(call => call[0] as MockSpeechSynthesisUtterance);
    expect(first.text).toBe("오늘 야근 가능하세요?");
    expect(second.text).toBe("네, 가능합니다.");
    expect(first.voice?.name).toContain("InJoon");
    expect(second.voice?.name).toContain("Yuna");
    expect(first.voice).not.toBe(second.voice);
  });

  it("uses distinct pitches when only one Korean voice exists", async () => {
    voices = [makeVoice("Google 한국의")];
    const done = await run(speakDialogue("남자: 안녕하세요.\n여자: 반갑습니다."));
    expect(done).toBe(true);

    const [first, second] = speak.mock.calls.map(call => call[0] as MockSpeechSynthesisUtterance);
    expect(first.pitch).toBeCloseTo(DIALOGUE_PITCHES.male);
    expect(second.pitch).toBeCloseTo(DIALOGUE_PITCHES.female);
    expect(first.pitch).not.toBeCloseTo(second.pitch);
  });

  it("plays narrator-only passages as a single default-pitch utterance", async () => {
    const done = await run(speakDialogue("화재가 발생했습니다. 비상구로 대피하십시오."));
    expect(done).toBe(true);
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.pitch).toBe(1);
    expect(utterance.text).toBe("화재가 발생했습니다. 비상구로 대피하십시오.");
  });

  it("applies the requested rate to every turn", async () => {
    const done = await run(speakDialogue("남자: 안녕하세요.\n여자: 반갑습니다.", { rate: 0.82 }));
    expect(done).toBe(true);
    for (const call of speak.mock.calls) {
      expect((call[0] as MockSpeechSynthesisUtterance).rate).toBeCloseTo(0.82);
    }
  });

  it("uses the stable speaker profile for an individual line replay", async () => {
    const done = await run(speakNamedTurn("민수", "안녕하세요.", ["라힘", "민수"]));
    expect(done).toBe(true);
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.voice?.name).toContain("InJoon");
    expect(utterance.pitch).toBe(1);
  });

  it("keeps four named speakers distinguishable and stable with only two installed voices", async () => {
    const firstVoice = makeVoice("Korean Voice 1");
    const secondVoice = makeVoice("Korean Voice 2");
    voices = [firstVoice, secondVoice];

    const done = await run(
      speakNamedDialogue([
        { speaker: "작업자", text: "첫 번째 말입니다." },
        { speaker: "동료", text: "두 번째 말입니다." },
        { speaker: "관리자", text: "세 번째 말입니다." },
        { speaker: "구조대", text: "네 번째 말입니다." },
        { speaker: "작업자", text: "첫 번째 화자가 다시 말합니다." },
      ]),
    );

    expect(done).toBe(true);
    const utterances = speak.mock.calls.map(call => call[0] as MockSpeechSynthesisUtterance);
    const profiles = utterances.slice(0, 4).map(utterance => `${utterance.voice?.name}:${utterance.pitch}`);
    expect(new Set(profiles).size).toBe(4);
    expect(utterances[4].voice).toBe(utterances[0].voice);
    expect(utterances[4].pitch).toBe(utterances[0].pitch);
  });

  it("prefers a generated full-dialogue clip and applies slow speed before browser TTS", async () => {
    const generated: AudioClipRef = {
      src: "/audio/generated/full-dialogues/lesson-44-dialogue-01.wav",
      voiceId: "ko-generated-multivoice-distinct-speakers",
      speakerRole: "other",
      durationMs: 1000,
      contentHash: "0123456789abcdef0123456789abcdef",
      license: "generated",
      attribution: "AI-generated EasyEPS dialogue",
      reviewStatus: "generated",
      audioVersion: "audio-v1-generated-dialogues",
    };

    const done = await speakNamedDialogue(
      [
        { speaker: "작업자", text: "첫 번째 말입니다." },
        { speaker: "동료", text: "두 번째 말입니다." },
      ],
      { rate: 0.6, audio: generated },
    );

    expect(done).toBe(true);
    expect(MockGeneratedAudio.instances).toHaveLength(1);
    expect(MockGeneratedAudio.instances[0].playbackRate).toBe(0.6);
    expect(speak).not.toHaveBeenCalled();
  });

  it("does not resume with the next turn when cancelled during the inter-turn gap", async () => {
    const playback = speakDialogue("남자: 첫 번째 말입니다.\n여자: 두 번째 말입니다.");

    await Promise.resolve();
    await Promise.resolve();
    expect(speak).toHaveBeenCalledTimes(1);

    cancelDialogue();
    const done = await run(playback);

    expect(done).toBe(false);
    expect(speak).toHaveBeenCalledTimes(1);
  });
});
