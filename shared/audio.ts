import { z } from "zod";

export const audioSpeakerRoleSchema = z.enum(["male", "female", "narrator", "other"]);
export type AudioSpeakerRole = z.infer<typeof audioSpeakerRoleSchema>;

export const audioReviewStatusSchema = z.enum(["pending", "approved"]);
export type AudioReviewStatus = z.infer<typeof audioReviewStatusSchema>;

export const audioLicenseSchema = z.enum(["owned", "licensed", "generated"]);
export type AudioLicense = z.infer<typeof audioLicenseSchema>;

/**
 * A reviewed audio file reference. The curriculum remains valid without this
 * optional field; clients use browser Korean TTS when no approved clip exists.
 */
export const audioClipRefSchema = z.object({
  src: z.string().min(1).refine(value => /^(https?:\/\/|\/|data:audio\/)/.test(value), "audio src must be an absolute URL, a site-relative path, or an audio data URI"),
  voiceId: z.string().min(1),
  speakerRole: audioSpeakerRoleSchema.default("other"),
  durationMs: z.number().int().positive().max(120_000).optional(),
  contentHash: z.string().regex(/^[a-f0-9]{8,128}$/i).optional(),
  license: audioLicenseSchema,
  attribution: z.string().optional().default(""),
  reviewStatus: audioReviewStatusSchema.default("pending"),
  audioVersion: z.string().min(1),
}).superRefine((clip, ctx) => {
  if (clip.reviewStatus === "approved") {
    if (!clip.durationMs) ctx.addIssue({ code: "custom", message: "approved audio needs durationMs", path: ["durationMs"] });
    if (!clip.contentHash) ctx.addIssue({ code: "custom", message: "approved audio needs contentHash", path: ["contentHash"] });
  }
});

export type AudioClipRef = z.infer<typeof audioClipRefSchema>;

export const audioLibraryManifestSchema = z.object({
  libraryVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  clips: z.record(z.string(), audioClipRefSchema),
});

export type AudioLibraryManifest = z.infer<typeof audioLibraryManifestSchema>;

export function isApprovedAudioClip(clip: AudioClipRef | undefined): clip is AudioClipRef {
  return Boolean(clip && clip.reviewStatus === "approved");
}

export function audioClipIsUsable(clip: AudioClipRef | undefined) {
  return isApprovedAudioClip(clip) && Boolean(clip.src && clip.voiceId && clip.audioVersion);
}
