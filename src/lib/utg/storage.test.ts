import { describe, expect, it } from "vitest";
import { FLASHBACK_NO_RETRY_PROMPTS, FLASHBACK_V4_PROMPTS, normalizeSettings, upgradePrompts } from "./storage";

describe("UTG settings normalization", () => {
  it("does not impose an upper limit on automatic rewrites", () => {
    expect(normalizeSettings({ qualityMaxRewrites: 25 }).qualityMaxRewrites).toBe(25);
  });

  it("normalizes retries to a non-negative integer", () => {
    expect(normalizeSettings({ qualityMaxRewrites: 2.9 }).qualityMaxRewrites).toBe(2);
    expect(normalizeSettings({ qualityMaxRewrites: -4 }).qualityMaxRewrites).toBe(0);
  });

  it("normalizes the global banned-word tolerance", () => {
    expect(normalizeSettings({ bannedWordsToleranceLevel: 2.9 }).bannedWordsToleranceLevel).toBe(2);
    expect(normalizeSettings({ bannedWordsToleranceLevel: -3 }).bannedWordsToleranceLevel).toBe(0);
  });

  it("migrates legacy banned control settings to unified quality control", () => {
    const migrated = normalizeSettings({ bannedControlEnabled: true, bannedMaxRewrites: 7, bannedInvalidOutput: "discard" });
    expect(migrated.qualityControlEnabled).toBe(true);
    expect(migrated.qualityMaxRewrites).toBe(7);
    expect(migrated.qualityInvalidOutput).toBe("save");
  });

  it("migrates legacy total description ranges into per-paragraph limits", () => {
    const migrated = normalizeSettings({ descMin: 110, descMax: 140, paragraphs: 3 });
    expect(migrated.descParagraphMin).toBe(36);
    expect(migrated.descParagraphMax).toBe(47);
    expect(migrated.descMin).toBe(108);
    expect(migrated.descMax).toBe(141);
  });

  it("keeps V4 word and paragraph limits variable-driven", () => {
    expect(FLASHBACK_NO_RETRY_PROMPTS.image).toContain("{{MIN_WORDS}}");
    expect(FLASHBACK_NO_RETRY_PROMPTS.image).toContain("{{MAX_WORDS}}");
    expect(FLASHBACK_NO_RETRY_PROMPTS.description).toContain("{{MIN_WORDS}}");
    expect(FLASHBACK_NO_RETRY_PROMPTS.description).toContain("{{MAX_WORDS}}");
    expect(FLASHBACK_NO_RETRY_PROMPTS.description).toContain("{{PARAGRAPHS}}");
    expect(`${FLASHBACK_NO_RETRY_PROMPTS.image}\n${FLASHBACK_NO_RETRY_PROMPTS.description}`).not.toMatch(/\b\d+\s*(?:-|to)\s*\d+\s+words?/i);
  });

  it("upgrades the known V3.3 Flashback prompt without replacing custom prompts", () => {
    const old = {
      image: "Write one factual TV or film news image headline from the supplied entry.\n{{ENTRY}}",
      description: "Write one factual TV or film news description from the supplied entry.\nForbidden-list procedure:\n{{ENTRY}}",
    };
    expect(upgradePrompts(old)).toEqual(FLASHBACK_V4_PROMPTS);

    const custom = { image: "Custom {{ENTRY}}", description: "Another custom {{ENTRY}}" };
    expect(upgradePrompts(custom)).toEqual(custom);
  });

  it("upgrades the prior V4 Flashback prompt to the strengthened version", () => {
    const prior = {
      image: "Create one factual TV or film news headline using only the source entry",
      description: "Give each paragraph a different opening structure.",
    };
    expect(upgradePrompts(prior)).toEqual(FLASHBACK_V4_PROMPTS);
  });
});
