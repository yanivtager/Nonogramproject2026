import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const exec = promisify(execFile);

export async function extractThumbnail(videoPath: string, outDir: string): Promise<string> {
  mkdirSync(outDir, { recursive: true });
  const base = videoPath.split(/[/\\]/).pop()!.replace(/\.mp4$/, "");
  const out = join(outDir, `${base}.jpg`);
  await exec(ffmpegPath as string, [
    "-y", "-ss", "2.0", "-i", videoPath,
    "-frames:v", "1", "-q:v", "3",
    "-vf", "scale=1080:1920:force_original_aspect_ratio=cover,crop=1080:1920",
    out,
  ]);
  return out;
}
