/**
 * Edge TTS backend that shells out to the Python `edge-tts` CLI.
 *
 * Why Python over the JS msedge-tts package:
 *   The JS package (msedge-tts@1.3.4) periodically breaks because Microsoft
 *   tightens the unofficial Edge TTS endpoint and the JS package's hardcoded
 *   trusted_client_token goes stale. The Python `edge-tts` package is actively
 *   maintained and rotates tokens reliably.
 *
 * Both backends produce the same MP3 output. The Python backend additionally
 * writes a WebVTT subtitle file with word-level timings, which we use directly
 * for burned-in caption rendering in Remotion.
 *
 * Locate the binary via env var EDGE_TTS_BIN, otherwise fall back to common paths:
 *   - Windows: %APPDATA%\Python\Python314\Scripts\edge-tts.exe
 *   - macOS/Linux: edge-tts (assumed on PATH)
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface PythonSynthesisInput {
  voiceId: string;
  text: string;
  rate: string;
  pitch: string;
  mp3OutPath: string;
  vttOutPath: string;
}

export interface PythonSynthesisOutput {
  mp3OutPath: string;
  vttOutPath: string;
  stderr: string;
}

export function resolveEdgeTtsBinary(): string {
  if (process.env.EDGE_TTS_BIN && existsSync(process.env.EDGE_TTS_BIN)) {
    return process.env.EDGE_TTS_BIN;
  }

  if (process.platform === "win32") {
    const appdata = process.env.APPDATA;
    if (appdata) {
      // Try several Python version subdirs.
      for (const ver of ["Python314", "Python313", "Python312", "Python311", "Python310"]) {
        const candidate = join(appdata, "Python", ver, "Scripts", "edge-tts.exe");
        if (existsSync(candidate)) return candidate;
      }
      // The actual install path on this machine (per `pip install --user`):
      const userAppdata = join(appdata, "..", "Roaming", "Python");
      for (const ver of ["Python314", "Python313", "Python312"]) {
        const candidate = join(appdata, "Python", ver, "Scripts", "edge-tts.exe");
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  // Fall back to PATH lookup.
  return "edge-tts";
}

export function synthesizeViaPython(input: PythonSynthesisInput): Promise<PythonSynthesisOutput> {
  return new Promise((resolve, reject) => {
    const bin = resolveEdgeTtsBinary();
    const args = [
      "--voice",
      input.voiceId,
      "--text",
      input.text,
      "--write-media",
      input.mp3OutPath,
      "--write-subtitles",
      input.vttOutPath,
      "--rate",
      input.rate,
      "--pitch",
      input.pitch,
    ];
    const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => {
      reject(new Error(`edge-tts spawn failed (bin=${bin}): ${err.message}`));
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`edge-tts exited ${code}. stderr: ${stderr}`));
        return;
      }
      if (!existsSync(input.mp3OutPath)) {
        reject(new Error(`edge-tts succeeded but ${input.mp3OutPath} missing`));
        return;
      }
      resolve({
        mp3OutPath: input.mp3OutPath,
        vttOutPath: input.vttOutPath,
        stderr,
      });
    });
  });
}
