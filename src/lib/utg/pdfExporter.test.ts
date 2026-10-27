import { describe, expect, it } from "vitest";
import { buildUtgPdfDefinition } from "./pdfExporter";
import type { UtgRow } from "./types";

describe("UTG PDF export", () => {
  it("builds a landscape table containing only serial, image text and description", () => {
    const rows: UtgRow[] = [{
      id: "row-1",
      serial: 1,
      entry: "Example source entry",
      imageText: "EXAMPLE IMAGE TEXT",
      description: "Example generated description.",
      status: "needs-fix",
      promptTokens: 100,
      completionTokens: 20,
      cost: 0.00125,
      imageAttempts: 1,
      descAttempts: 2,
      imageValidationStatus: "valid",
      descValidationStatus: "needs-fix",
      descBannedHits: ["fresh"],
      error: "Banned words remain: fresh",
    }];

    const definition = buildUtgPdfDefinition(rows);
    const serialized = JSON.stringify(definition.content);

    expect(definition.pageSize).toBe("A4");
    expect(definition.pageOrientation).toBe("landscape");
    expect(serialized).toContain("Sr. No.");
    expect(serialized).toContain("EXAMPLE IMAGE TEXT");
    expect(serialized).toContain("Example generated description.");
    expect(serialized).not.toContain("Example source entry");
    expect(serialized).not.toContain("NEEDS FIX");
    expect(serialized).not.toContain("Input Tokens");
  });
});
