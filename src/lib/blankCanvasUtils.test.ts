import { describe, it, expect, beforeEach } from "vitest";
import {
  presetSwatchCSS,
  SOLID_PRESETS,
  GRADIENT_PRESETS,
  DEFAULT_BLANK_CANVAS_PRESET,
  savePreset,
  loadSavedPresets,
  deletePreset,
  renamePreset,
  exportPresetsJSON,
  importPresetsJSON,
} from "./blankCanvasUtils";

describe("presetSwatchCSS", () => {
  it("returns a hex color for solid presets", () => {
    expect(presetSwatchCSS(SOLID_PRESETS[0].preset)).toMatch(/^#/);
  });

  it("returns a linear-gradient() string for gradient presets", () => {
    expect(presetSwatchCSS(GRADIENT_PRESETS[0].preset)).toContain("linear-gradient");
  });
});

describe("saved palette persistence", () => {
  beforeEach(() => localStorage.clear());

  it("saves, loads, renames, and deletes palettes", () => {
    savePreset("MyTone", DEFAULT_BLANK_CANVAS_PRESET);
    expect(loadSavedPresets().some((p) => p.name === "MyTone")).toBe(true);

    renamePreset("MyTone", "Renamed");
    const after = loadSavedPresets();
    expect(after.some((p) => p.name === "Renamed")).toBe(true);
    expect(after.some((p) => p.name === "MyTone")).toBe(false);

    deletePreset("Renamed");
    expect(loadSavedPresets()).toHaveLength(0);
  });

  it("exports and imports palettes as JSON", () => {
    savePreset("A", DEFAULT_BLANK_CANVAS_PRESET);
    const json = exportPresetsJSON();
    localStorage.clear();
    const added = importPresetsJSON(json);
    expect(added).toBe(1);
    expect(loadSavedPresets().some((p) => p.name === "A")).toBe(true);
  });
});
