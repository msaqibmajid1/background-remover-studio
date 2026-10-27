import { describe, expect, it } from "vitest";
import { normalizeModelOutput } from "./outputNormalization";

describe("UTG output normalization", () => {
  it("strips fences, wrapping quotes, repeated spaces and uppercases image text", () => {
    expect(normalizeModelOutput("```text\n\"Mixed   Ramón headline\"\n```", "image")).toBe("MIXED RAMÓN HEADLINE");
  });

  it("normalizes description whitespace and blank paragraph separators", () => {
    expect(normalizeModelOutput(" First   paragraph. \r\n\r\n\r\n Second   paragraph. ", "desc"))
      .toBe("First paragraph.\n\nSecond paragraph.");
  });
});
