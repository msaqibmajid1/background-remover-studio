import { describe, expect, it, beforeEach } from "vitest";
import { loadModelCatalog, mergeModelCatalog } from "./modelCatalog";

describe("modelCatalog", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps known prices while adding live provider models", () => {
    const merged = mergeModelCatalog("openai", [
      { modelId: "gpt-5.4-nano", label: "gpt-5.4-nano" },
      { modelId: "new-provider-model", label: "new-provider-model" },
    ]);

    const known = merged.find(m => m.modelId === "gpt-5.4-nano");
    const live = merged.find(m => m.modelId === "new-provider-model");

    expect(known?.inputPer1M).toBe(0.2);
    expect(known?.outputPer1M).toBe(1.25);
    expect(live?.inputPer1M).toBe(0);
    expect(live?.source).toBe("live");
  });

  it("loads the expanded OpenAI fallback catalog", () => {
    const catalog = loadModelCatalog("openai").map(m => m.modelId);

    expect(catalog).toContain("gpt-4.1-nano");
    expect(catalog).toContain("gpt-5.4-nano");
    expect(catalog).toContain("gpt-5.5");
    expect(catalog).toContain("gpt-5.5-pro");
  });
});
