import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { mkdirSync } from "node:fs";

mkdirSync("out", { recursive: true });

async function main() {
  const tts = new MsEdgeTTS(undefined, true); // logger enabled
  try {
    console.log("Calling setMetadata...");
    await tts.setMetadata("en-US-AriaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    console.log("setMetadata OK");
    console.log("Calling toFile...");
    const path = await tts.toFile("out/debug-test.mp3", "hello world");
    console.log("toFile OK ->", path);
  } catch (err) {
    console.error("ERROR:", err);
    if (err && typeof err === "object") {
      for (const k of Object.keys(err)) {
        console.error(`  ${k}:`, err[k]);
      }
    }
  } finally {
    tts.close();
  }
}

main();
