import { describe, expect, it } from "vitest";
import { audioClipRefSchema, audioLibraryManifestSchema, audioClipIsUsable } from "@shared/audio";

const base = {
  src: "/audio/lesson-01-line-01.mp3",
  voiceId: "ko-workplace-male-01",
  speakerRole: "male" as const,
  license: "owned" as const,
  attribution: "EasyEPS recording library",
  audioVersion: "audio-v1",
};

describe("audio metadata contract", () => {
  it("allows pending preparation metadata without exposing it as usable audio", () => {
    const clip = audioClipRefSchema.parse({ ...base, reviewStatus: "pending" });
    expect(audioClipIsUsable(clip)).toBe(false);
  });

  it("rejects approved clips without duration and content hash", () => {
    const result = audioClipRefSchema.safeParse({ ...base, reviewStatus: "approved" });
    expect(result.success).toBe(false);
  });

  it("accepts a complete generated clip as usable without treating it as approved", () => {
    const clip = audioClipRefSchema.parse({
      ...base,
      license: "generated",
      attribution: "AI-generated EasyEPS dialogue",
      durationMs: 2400,
      contentHash: "0123456789abcdef0123456789abcdef",
      reviewStatus: "generated",
    });
    expect(audioClipIsUsable(clip)).toBe(true);
    expect(clip.reviewStatus).toBe("generated");
  });

  it("accepts a complete approved clip and manifest", () => {
    const clip = audioClipRefSchema.parse({
      ...base,
      durationMs: 2400,
      contentHash: "0123456789abcdef0123456789abcdef",
      reviewStatus: "approved",
    });
    expect(audioClipIsUsable(clip)).toBe(true);
    const manifest = audioLibraryManifestSchema.parse({ libraryVersion: "audio-v1", generatedAt: "2026-08-23T00:00:00.000Z", clips: { "lesson-01-line-01": clip } });
    expect(Object.keys(manifest.clips)).toEqual(["lesson-01-line-01"]);
  });
});
