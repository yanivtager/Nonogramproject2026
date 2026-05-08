import { z } from "zod";

// ── Layer 1: format / integrity ──────────────────────────────────────────────

export const IntegrityCheckSchema = z.object({
  fileExists: z.boolean(),
  isValidMp4: z.boolean(),
  durationSeconds: z.number().optional(),
  durationWithinTargetRange: z.boolean().optional(),
  targetDurationSeconds: z.number().optional(),
  resolution: z.string().optional(),    // "1080x1920"
  resolutionCorrect: z.boolean().optional(),
  audioPresent: z.boolean().optional(),
  audioPeakDb: z.number().optional(),
  audioLevelOk: z.boolean().optional(), // peak > -20 dB
  videoBitrateKbps: z.number().optional(),
  videoBitrateOk: z.boolean().optional(), // > 2000 kbps
});

export type IntegrityCheck = z.infer<typeof IntegrityCheckSchema>;

// ── Layer 2: audio / STT ─────────────────────────────────────────────────────

export const AudioFidelityCheckSchema = z.object({
  whisperAvailable: z.boolean(),
  transcript: z.string().optional(),
  transcriptMatchScore: z.number().min(0).max(1).optional(), // normalized similarity
  numericTokensValid: z.boolean().optional(),
  numericTokenIssues: z.array(z.string()).optional(),
  captionsAlignedWithinMs: z.number().optional(),
  captionsAlignmentOk: z.boolean().optional(),
});

export type AudioFidelityCheck = z.infer<typeof AudioFidelityCheckSchema>;

// ── Layer 3: visual / keyframes ───────────────────────────────────────────────

export const KeyframeCheckSchema = z.object({
  timestampSeconds: z.number(),
  framePath: z.string(),
  label: z.string(), // "hook", "mid-2.5", etc.
  pass: z.boolean(),
  issues: z.array(z.string()),
  observations: z.string().optional(),
});

export type KeyframeCheck = z.infer<typeof KeyframeCheckSchema>;

export const VisualInspectionSchema = z.object({
  keyframes: z.array(KeyframeCheckSchema),
  anyFrameFailed: z.boolean(),
  glitchesDetected: z.array(z.string()),
});

export type VisualInspection = z.infer<typeof VisualInspectionSchema>;

// ── Layer 4: effectiveness scorecard ─────────────────────────────────────────

export const EffectivenessCheckSchema = z.object({
  hookDurationOk: z.boolean(),       // hook completes within 3s
  captionsPresent: z.boolean(),      // captions file exists and is non-empty
  musicPresent: z.boolean(),         // music track wired
  totalDurationOk: z.boolean(),      // 12–25s
  ctaShownAtEnd: z.boolean(),        // CTA segment ends within 2s of video end
  voiceVarietyOk: z.boolean(),       // voice differs from previous variant on same listing
  score: z.number().min(0).max(6),
});

export type EffectivenessCheck = z.infer<typeof EffectivenessCheckSchema>;

// ── Layer 5: subjective grading ───────────────────────────────────────────────

export const SubjectiveGradeSchema = z.object({
  score: z.number().min(0).max(10),
  calibrationMode: z.boolean(), // true until 3 approvals
  reasoning: z.string(),
  preferenceProfileApplied: z.boolean(),
});

export type SubjectiveGrade = z.infer<typeof SubjectiveGradeSchema>;

// ── Top-level report ─────────────────────────────────────────────────────────

export const SelfReviewReportSchema = z.object({
  variantId: z.string(),
  mp4Path: z.string(),
  reviewedAt: z.string(), // ISO timestamp
  layers: z.object({
    integrity: z.object({ pass: z.boolean(), check: IntegrityCheckSchema }),
    audioFidelity: z.object({ pass: z.boolean(), check: AudioFidelityCheckSchema }),
    visualInspection: z.object({ pass: z.boolean(), inspection: VisualInspectionSchema }),
    effectiveness: z.object({ pass: z.boolean(), check: EffectivenessCheckSchema }),
    subjective: z.object({ pass: z.boolean(), grade: SubjectiveGradeSchema }).optional(),
  }),
  overallPass: z.boolean(),
  failedLayers: z.array(z.string()),
  recommendedAction: z.enum(["surface", "hold", "auto-fix", "needs-human"]),
  autoFixHint: z.string().optional(),
});

export type SelfReviewReport = z.infer<typeof SelfReviewReportSchema>;
