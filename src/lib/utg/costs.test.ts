import { describe, it, expect } from "vitest";
import { calcCost, findPrice } from "./costs";

describe("costs", () => {
  it("computes input+output cost from price table", () => {
    const p = findPrice("openai", "gpt-4o-mini")!;
    expect(p).toBeTruthy();
    const c = calcCost("openai", "gpt-4o-mini", 1_000_000, 1_000_000);
    expect(c).toBeCloseTo(p.inputPer1M + p.outputPer1M, 6);
  });

  it("returns 0 for unknown models", () => {
    expect(calcCost("openai", "unknown-model-zzz", 1000, 1000)).toBe(0);
  });
});
