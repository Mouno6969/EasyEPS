import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ speakKorean: vi.fn().mockResolvedValue(true), cancelSpeech: vi.fn() }));
vi.mock("./speakKorean", () => mocks);

import { playAudioClip, playAudioOrTts } from "./audioPlayback";
import type { AudioClipRef } from "@shared/audio";

const approved: AudioClipRef = {
  src: "/audio/dialogue-1.mp3",
  voiceId: "reviewed-female-01",
  speakerRole: "female",
  license: "owned",
  attribution: "EasyEPS recording library",
  reviewStatus: "approved",
  audioVersion: "audio-v1",
};

class MockAudio {
  static instances: MockAudio[] = [];
  src = "";
  preload = "";
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  paused = true;
  currentTime = 0;
  constructor(src: string) { this.src = src; MockAudio.instances.push(this); }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}

describe("audio playback", () => {
  beforeEach(() => {
    MockAudio.instances = [];
    mocks.speakKorean.mockClear();
    mocks.cancelSpeech.mockClear();
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    Object.defineProperty(globalThis, "HTMLAudioElement", { configurable: true, value: MockAudio });
    Object.defineProperty(globalThis, "Audio", { configurable: true, value: MockAudio });
  });
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "HTMLAudioElement");
    Reflect.deleteProperty(globalThis, "Audio");
  });

  it("plays an approved clip and preserves its playback rate", async () => {
    const promise = playAudioClip(approved, { rate: 0.6 });
    const audio = MockAudio.instances[0];
    expect(audio.src).toBe(approved.src);
    expect(audio.playbackRate).toBe(0.6);
    audio.onended?.();
    await expect(promise).resolves.toBe(true);
    expect(mocks.speakKorean).not.toHaveBeenCalled();
  });

  it("does not cancel the owning speech sequence for a queued clip", async () => {
    const promise = playAudioClip(approved, { sequence: 42 });
    const audio = MockAudio.instances[0];
    audio.onended?.();
    await expect(promise).resolves.toBe(true);
    expect(mocks.cancelSpeech).not.toHaveBeenCalled();
  });

  it("falls back to browser TTS for an unapproved clip", async () => {
    const pending = { ...approved, reviewStatus: "pending" as const };
    await expect(playAudioOrTts({ text: "안녕하세요.", audio: pending })).resolves.toEqual({ ok: true, source: "browser-tts" });
    expect(mocks.speakKorean).toHaveBeenCalledWith("안녕하세요.", expect.objectContaining({ rate: undefined }));
  });

  it("falls back to browser TTS when an approved clip fails to start", async () => {
    class FailingAudio extends MockAudio {
      override play() { return Promise.reject(new Error("blocked")); }
    }
    Object.defineProperty(globalThis, "Audio", { configurable: true, value: FailingAudio });
    await expect(playAudioOrTts({ text: "안녕하세요.", audio: approved })).resolves.toEqual({ ok: true, source: "browser-tts" });
    expect(mocks.speakKorean).toHaveBeenCalled();
  });
});
