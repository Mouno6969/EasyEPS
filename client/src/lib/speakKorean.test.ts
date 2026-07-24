import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import { KOREAN_SPEECH_RATES, speakKorean } from "./speakKorean";

class MockSpeechSynthesisUtterance {
  text: string;
  lang = "";
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: ((event: SpeechSynthesisEvent) => unknown) | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => unknown) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

describe("Korean speech playback rates", () => {
  let speak: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    speak = vi.fn((utterance: MockSpeechSynthesisUtterance) => {
      queueMicrotask(() => utterance.onend?.({} as SpeechSynthesisEvent));
    });

    const speechSynthesis = {
      cancel: vi.fn(),
      speak,
      getVoices: vi.fn(() => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { speechSynthesis },
    });
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
    vi.clearAllMocks();
  });

  it("keeps slow mode perceptibly below normal mode", () => {
    expect(KOREAN_SPEECH_RATES.normal).toBe(1);
    expect(KOREAN_SPEECH_RATES.slow).toBe(0.6);
    expect(KOREAN_SPEECH_RATES.normal - KOREAN_SPEECH_RATES.slow).toBeGreaterThanOrEqual(0.35);
  });

  it("passes the selected slow rate to SpeechSynthesisUtterance", async () => {
    await expect(speakKorean("안녕하세요", { rate: KOREAN_SPEECH_RATES.slow })).resolves.toBe(true);

    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.lang).toBe("ko-KR");
    expect(utterance.rate).toBeCloseTo(0.6);
  });

  it("uses normal 1× speed by default", async () => {
    await expect(speakKorean("안녕하세요")).resolves.toBe(true);

    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.rate).toBe(1);
  });
});
