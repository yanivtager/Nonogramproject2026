/**
 * Layer 1 — Format & integrity.
 * ffprobe the rendered MP4; check duration, resolution, audio, bitrate.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import ffprobeStatic from "ffprobe-static";
import type { IntegrityCheck } from "./types.js";

const execFileAsync = promisify(execFile);

interface FfprobeStream {
  codec_type: string;
  width?: number;
  height?: number;
  bit_rate?: string;
}

interface FfprobeFormat {
  duration?: string;
  size?: string;
  bit_rate?: string;
}

interface FfprobeOutput {
  streams: FfprobeStream[];
  format: FfprobeFormat;
}

export async function checkIntegrity(
  mp4Path: string,
  targetDurationSeconds = 15,
  durationToleranceSeconds = 0.5,
): Promise<{ pass: boolean; check: IntegrityCheck }> {
  if (!existsSync(mp4Path)) {
    return {
      pass: false,
      check: { fileExists: false, isValidMp4: false },
    };
  }

  let probe: FfprobeOutput;
  try {
    const { stdout } = await execFileAsync(ffprobeStatic.path, [
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      "-show_format",
      mp4Path,
    ]);
    probe = JSON.parse(stdout) as FfprobeOutput;
  } catch {
    return {
      pass: false,
      check: { fileExists: true, isValidMp4: false },
    };
  }

  const videoStream = probe.streams.find((s) => s.codec_type === "video");
  const audioStream = probe.streams.find((s) => s.codec_type === "audio");

  const durationSeconds = probe.format.duration ? parseFloat(probe.format.duration) : undefined;
  const durationWithinTargetRange =
    durationSeconds !== undefined
      ? Math.abs(durationSeconds - targetDurationSeconds) <= durationToleranceSeconds
      : undefined;

  const width = videoStream?.width;
  const height = videoStream?.height;
  const resolution = width && height ? `${width}x${height}` : undefined;
  const resolutionCorrect = resolution === "1080x1920";

  // Bitrate from format or video stream (bps → kbps)
  const bitrateStr = probe.format.bit_rate ?? videoStream?.bit_rate;
  const videoBitrateKbps = bitrateStr ? Math.round(parseInt(bitrateStr, 10) / 1000) : undefined;
  const videoBitrateOk = videoBitrateKbps !== undefined ? videoBitrateKbps > 2000 : undefined;

  const audioPresent = !!audioStream;

  // Measure audio peak with ffprobe volumedetect (quick FFmpeg pass)
  let audioPeakDb: number | undefined;
  let audioLevelOk: boolean | undefined;
  if (audioPresent) {
    try {
      const ffmpegBin = ffprobeStatic.path
        .replace(/ffprobe(\.exe)?$/, (_, ext: string | undefined) => `ffmpeg${ext ?? ""}`)
        .replace("ffprobe-static", "ffmpeg-static");
      const { stderr } = await execFileAsync(
        ffmpegBin,
        [
          "-i", mp4Path,
          "-af", "volumedetect",
          "-f", "null", "-",
        ],
        { maxBuffer: 1024 * 1024 },
      );
      const match = /max_volume:\s*([-\d.]+)\s*dB/.exec(stderr);
      if (match?.[1]) {
        audioPeakDb = parseFloat(match[1]);
        audioLevelOk = audioPeakDb > -20;
      }
    } catch {
      // volumedetect failure is non-fatal; audio is still present
    }
  }

  const check: IntegrityCheck = {
    fileExists: true,
    isValidMp4: true,
    durationSeconds,
    durationWithinTargetRange,
    targetDurationSeconds,
    resolution,
    resolutionCorrect,
    audioPresent,
    audioPeakDb,
    audioLevelOk,
    videoBitrateKbps,
    videoBitrateOk,
  };

  const pass =
    check.isValidMp4 &&
    (durationWithinTargetRange ?? true) &&
    (resolutionCorrect ?? true) &&
    audioPresent &&
    (audioLevelOk ?? true) &&
    (videoBitrateOk ?? true);

  return { pass, check };
}
