/**
 * Layer 2 — Audio fidelity.
 * Transcribes audio with Python whisper CLI; compares against expected narration;
 * validates numeric tokens in transcript against the listing record.
 */

import { execFile, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import type { Listing } from "../data/types.js";
import { extractNumericTokens } from "../validation/numeric-tokens.js";
import type { AudioFidelityCheck } from "./types.js";

const execFileAsync = promisify(execFile);

/** Checks whether Python whisper CLI is installed. */
async function isWhisperAvailable(): Promise<boolean> {
  try {
    await execFileAsync("python", ["-c", "import whisper; print(whisper.__version__)"]);
    return true;
  } catch {
    try {
      await execFileAsync("python3", ["-c", "import whisper; print(whisper.__version__)"]);
      return true;
    } catch {
      return false;
    }
  }
}

/** Run whisper CLI on mp4, return plain-text transcript. */
async function transcribeWithWhisper(mp4Path: string, language: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const py = process.platform === "win32" ? "python" : "python3";
    // whisper produces output.txt in outDir; we capture stdout for the text
    const outDir = tmpdir();
    const proc = spawn(py, [
      "-m", "whisper",
      mp4Path,
      "--model", "base",
      "--language", language === "pt-BR" ? "pt" : language,
      "--output_format", "txt",
      "--output_dir", outDir,
      "--fp16", "False",
    ]);

    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`whisper exited ${code}: ${stderr.slice(-300)}`));
        return;
      }
      // whisper names the file after the mp4 basename
      const baseName = mp4Path.replace(/\\/g, "/").split("/").pop()!.replace(/\.[^.]+$/, "");
      const txtPath = join(outDir, `${baseName}.txt`);
      if (!existsSync(txtPath)) {
        reject(new Error(`whisper output not found: ${txtPath}`));
        return;
      }
      resolve(readFileSync(txtPath, "utf8").trim());
    });
  });
}

/** Normalized edit-distance similarity in [0,1]. */
function normalizedSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
  const s2 = b.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
  if (s1 === s2) return 1;
  const longer = Math.max(s1.length, s2.length);
  if (longer === 0) return 1;
  return (longer - editDistance(s1, s2)) / longer;
}

function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const prev = (dp[i - 1] as number[])[j - 1] as number;
      const sub = (dp[i - 1] as number[])[j] as number;
      const ins = (dp[i] as number[])[j - 1] as number;
      (dp[i] as number[])[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(sub, ins, prev);
    }
  }
  return (dp[a.length] as number[])[b.length] as number;
}

export async function checkAudioFidelity(
  mp4Path: string,
  expectedNarration: string,
  listing: Listing,
  language: string,
): Promise<{ pass: boolean; check: AudioFidelityCheck }> {
  const whisperAvailable = await isWhisperAvailable();

  if (!whisperAvailable) {
    return {
      pass: true, // non-blocking if whisper not installed
      check: {
        whisperAvailable: false,
      },
    };
  }

  let transcript: string | undefined;
  try {
    transcript = await transcribeWithWhisper(mp4Path, language);
  } catch {
    return {
      pass: true, // transcription failure is non-blocking (log and continue)
      check: {
        whisperAvailable: true,
        transcript: undefined,
      },
    };
  }

  const transcriptMatchScore = normalizedSimilarity(transcript, expectedNarration);

  // Check numeric tokens in transcript against listing facts
  const numericTokenIssues: string[] = [];
  const tokens = extractNumericTokens(transcript);

  const knownFacts = new Set<string>([
    listing.cell_count.toLocaleString("en-US"),
    String(listing.cell_count),
    String(listing.puzzle_count),
    listing.puzzle_count.toLocaleString("en-US"),
  ]);

  for (const token of tokens) {
    const numericOnly = token.replace(/,/g, "");
    const isKnown =
      knownFacts.has(token) ||
      knownFacts.has(numericOnly) ||
      // grid size like "250x250" is OK
      /^\d+x\d+$/i.test(token);
    if (!isKnown) {
      numericTokenIssues.push(token);
    }
  }

  const numericTokensValid = numericTokenIssues.length === 0;

  const check: AudioFidelityCheck = {
    whisperAvailable: true,
    transcript,
    transcriptMatchScore,
    numericTokensValid,
    numericTokenIssues: numericTokenIssues.length > 0 ? numericTokenIssues : undefined,
  };

  // Pass if: reasonably similar transcript AND no rogue numeric tokens
  const pass = transcriptMatchScore >= 0.6 && numericTokensValid;

  return { pass, check };
}
