import { describe, it, expect } from "vitest";
import { renderPrompt, buildContext, findUnresolvedPromptVariables, migrateLegacyPromptVariables, PROMPT_VARIABLES_BY_KIND } from "./promptRender";
import { DEFAULT_SETTINGS, FLASHBACK_NO_RETRY_PROMPTS } from "./storage";

describe("renderPrompt", () => {
  const ctx = buildContext(
    { id: "x", serial: 3, entry: "Hello world", status: "idle" },
    { ...DEFAULT_SETTINGS, tone: "warm", paragraphs: 2, imageMin: 5, imageMax: 7, descParagraphMin: 10, descParagraphMax: 12 },
    ["bad1", "bad2"],
    ["Once upon", "In the"],
  );

  it("substitutes all known variables", () => {
    const tmpl = "S:{{SERIAL}} E:{{ENTRY}} T:{{TONE}} B:{{BANNED_WORDS}} P:{{ANTI_REP}} D:{{MIN_WORDS}}-{{MAX_WORDS}} N:{{PARAGRAPHS}}";
    const out = renderPrompt(tmpl, ctx, "description");
    expect(out).toContain("S:3");
    expect(out).toContain("E:Hello world");
    expect(out).toContain("T:warm");
    expect(out).toContain("B:bad1, bad2");
    expect(out).toContain("P:Once upon | In the");
    expect(out).toContain("D:10-12");
    expect(out).toContain("N:2");
    expect(out).not.toContain("ACTIVE MODULE SETTING");
  });

  it("does not repeat the banned list when the template already includes it", () => {
    const out = renderPrompt("Forbidden: {{BANNED_WORDS}}\n{{ENTRY}}", ctx, "description");
    expect(out.match(/bad1, bad2/g)).toHaveLength(1);
    expect(out).toContain("never reproduce the list itself");
  });

  it("removes source-allowed terms from the strict list and states their limit", () => {
    const allowedContext = buildContext(
      { id: "x", serial: 1, entry: "The show will return next year.", status: "idle" },
      { ...DEFAULT_SETTINGS, bannedWordsToleranceLevel: 1 },
      ["return", "production"],
      [],
    );
    const out = renderPrompt("Forbidden: {{BANNED_WORDS}}", allowedContext, "description");
    expect(out).toContain("Forbidden: production");
    expect(out).toContain("no more than 1 time(s) each: return");
  });

  it("migrates variables used by legacy description prompts", () => {
    const tmpl = [
      "{{ENTRY}}",
      "{{PARAGRAPHS}} paragraphs",
      "{{MIN_WORDS}}-{{MAX_WORDS}} words",
      "Avoid: {{ANTI_REP}} / {{REPEATED_TERMS}}",
    ].join("\n");
    const out = renderPrompt(tmpl, ctx, "description");

    expect(out).toContain("Hello world");
    expect(out).toContain("2 paragraphs");
    expect(out).toContain("10-12 words");
    expect(out).toContain("Once upon | In the");
    expect(findUnresolvedPromptVariables(out)).toEqual([]);
  });

  it("migrates legacy total-description wording to per-paragraph semantics", () => {
    const migrated = migrateLegacyPromptVariables(
      "Keep the complete description between {{MIN_WORDS}} and {{MAX_WORDS}} words inclusive.",
      "description",
    );
    expect(migrated).toBe("Keep each paragraph between {{MIN_WORDS}} and {{MAX_WORDS}} words inclusive.");
  });

  it("uses image limits for generic word variables in image prompts", () => {
    const out = renderPrompt("{{ min_words }}-{{MAX_WORDS}}: {{ENTRY}}", ctx, "image");
    expect(out).toContain("5-7: Hello world");
    expect(out).not.toContain("ACTIVE MODULE SETTING");
  });

  it("exposes only variables relevant to each prompt", () => {
    expect(PROMPT_VARIABLES_BY_KIND.image).toEqual([
      "{{ENTRY}}", "{{SERIAL}}", "{{TONE}}", "{{BANNED_WORDS}}", "{{ANTI_REP}}",
      "{{MIN_WORDS}}", "{{MAX_WORDS}}",
    ]);
    expect(PROMPT_VARIABLES_BY_KIND.description).toEqual([
      "{{ENTRY}}", "{{SERIAL}}", "{{TONE}}", "{{BANNED_WORDS}}", "{{ANTI_REP}}",
      "{{MIN_WORDS}}", "{{MAX_WORDS}}", "{{PARAGRAPHS}}",
    ]);
  });

  it("rewrites duplicate aliases to the canonical variables", () => {
    expect(migrateLegacyPromptVariables("{{FACT_AUTHORITY}} {{DESC_WORD_RANGE}} {{PARAGRAPH_COUNT}} {{REPEATED_TERMS}}", "description"))
      .toBe("{{ENTRY}} {{MIN_WORDS}}-{{MAX_WORDS}} words {{PARAGRAPHS}} {{ANTI_REP}}");
  });

  it("removes legacy module lines without injecting a replacement", () => {
    const migrated = migrateLegacyPromptVariables("Module: {{MODULE}}\nEntry: {{ENTRY}}", "description");
    expect(migrated).toBe("Entry: {{ENTRY}}");
    expect(renderPrompt(migrated, ctx, "description")).not.toContain("ACTIVE MODULE SETTING");
  });

  it("appends the row entry when a custom prompt omits its entry variable", () => {
    const out = renderPrompt("Use only the supplied entry.", ctx, "description");
    expect(out).toContain("FACT AUTHORITY (supplied entry):\nHello world");
  });

  it("reports unsupported variables before generation", () => {
    const out = renderPrompt("Entry: {{ENTRY}} Unknown: {{NOT_SUPPORTED}}", ctx, "description");
    expect(findUnresolvedPromptVariables(out)).toEqual(["{{NOT_SUPPORTED}}"]);
  });
});

describe("Flashback no-retry prompts", () => {
  it("use only supported variables and render without placeholders", () => {
    const settings = { ...DEFAULT_SETTINGS, imageMin: 18, imageMax: 22, descParagraphMin: 40, descParagraphMax: 47, paragraphs: 3 };
    const context = buildContext({ id: "1", serial: 1, entry: "Example Show returns to BBC in 2026.", status: "idle" }, settings, ["fresh"], []);

    expect(findUnresolvedPromptVariables(renderPrompt(FLASHBACK_NO_RETRY_PROMPTS.image, context, "image"))).toEqual([]);
    expect(findUnresolvedPromptVariables(renderPrompt(FLASHBACK_NO_RETRY_PROMPTS.description, context, "description"))).toEqual([]);
  });
});

describe("final validation contract", () => {
  it("is appended after the custom prompt with runtime rules", () => {
    const settings = { ...DEFAULT_SETTINGS, imageMin: 10, imageMax: 13 };
    const context = buildContext({ id: "1", serial: 1, entry: "Show returns.", status: "idle" }, settings, ["production"], []);
    const output = renderPrompt("Write from {{ENTRY}}", context, "image");
    expect(output).toContain("NON-NEGOTIABLE FINAL VALIDATION CONTRACT");
    expect(output).toContain("10-13 Unicode words");
    expect(output).toContain("production");
    expect(findUnresolvedPromptVariables(output)).toEqual([]);
  });
});
