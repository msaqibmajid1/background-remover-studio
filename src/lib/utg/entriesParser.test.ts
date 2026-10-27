import { describe, it, expect } from "vitest";
import { parseEntries, appendEntries, serializeEntries } from "./entriesParser";

describe("entriesParser", () => {
  it("parses numbered lines", () => {
    const rows = parseEntries("1. Alpha\n2. Beta\n3. Gamma");
    expect(rows.map(r => r.serial)).toEqual([1, 2, 3]);
    expect(rows.map(r => r.entry)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("handles unnumbered lines with auto serials", () => {
    const rows = parseEntries("Foo\nBar");
    expect(rows.map(r => r.serial)).toEqual([1, 2]);
  });

  it("appends with continued serial numbers", () => {
    const existing = parseEntries("1. A\n2. B");
    const out = appendEntries(existing, "X\nY");
    expect(out.map(r => r.serial)).toEqual([1, 2, 3, 4]);
  });

  it("roundtrips via serializeEntries", () => {
    const rows = parseEntries("1. A\n2. B");
    expect(serializeEntries(rows)).toBe("1. A\n2. B");
  });
});
