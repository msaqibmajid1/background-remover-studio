import { describe, it, expect } from "vitest";
import { buildProject, parseProject } from "./projectIO";
import { DEFAULT_SETTINGS, DEFAULT_PROMPTS } from "./storage";

describe("UTG project IO", () => {
  it("round-trips rows + settings without leaking keys", () => {
    const project = buildProject({
      rows: [{ id: "1", serial: 1, entry: "hello", status: "idle" }],
      settings: DEFAULT_SETTINGS,
      prompts: DEFAULT_PROMPTS,
      bannedWords: ["very"],
      presets: [],
      activePresetId: null,
    });
    const json = JSON.stringify(project);
    expect(json).not.toMatch(/apiKey|sk-/i);
    const parsed = parseProject(json);
    expect(parsed.version).toBe(1);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.settings.provider).toBe(DEFAULT_SETTINGS.provider);
    expect(parsed.bannedWords).toEqual(["very"]);
  });

  it("rejects an unsupported version", () => {
    expect(() => parseProject(JSON.stringify({ version: 99, rows: [] }))).toThrow();
  });

  it("rejects missing rows", () => {
    expect(() => parseProject(JSON.stringify({ version: 1 }))).toThrow();
  });
});
