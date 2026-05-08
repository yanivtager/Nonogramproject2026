import { ALL_SCRIPTS } from "./index.js";
import { assertNoHardcodedNumbers } from "../schema.js";

let pass = 0;
let fail = 0;
for (const [templateId, langs] of Object.entries(ALL_SCRIPTS)) {
  for (const [lang, script] of Object.entries(langs as Record<string, unknown>)) {
    try {
      assertNoHardcodedNumbers(script as Parameters<typeof assertNoHardcodedNumbers>[0]);
      console.log(`PASS  ${templateId}/${lang}`);
      pass++;
    } catch (e) {
      console.error(`FAIL  ${templateId}/${lang}: ${e instanceof Error ? e.message : e}`);
      fail++;
    }
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
