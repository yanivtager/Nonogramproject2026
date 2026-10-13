import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { verifyTrace } from "../src/solver/nonogram-verify";

describe("committed sample trace", () => {
  it("verifies independently", () => {
    const t = JSON.parse(readFileSync(new URL("../docs/samples/nonogram-sample-trace.json", import.meta.url), "utf8"));
    expect(verifyTrace(t).errors).toEqual([]);
    expect(t.status).toBe("SOLVED");
  });
});
