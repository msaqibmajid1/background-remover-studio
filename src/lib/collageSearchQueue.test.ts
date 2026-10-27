import { describe, expect, it } from "vitest";
import { failedSearches, pendingSearches, restoreSearchQueue } from "./collageSearchQueue";

const entry = (term: string) => ({ term, images: [] as string[], searchStatus: "pending", id: term, edited: false });
describe("collage search queue recovery", () => {
  it("recovers entries 458 through 527 without changing any of the 457 saved entries", () => {
    const terms = Array.from({ length: 527 }, (_, index) => `Term ${index + 1}`);
    const saved = terms.slice(0, 457).map(term => ({ ...entry(term), images: ["photo"], edited: true }));
    const restored = restoreSearchQueue(saved, terms.join("\n"), entry);
    expect(restored).toHaveLength(527);
    expect(restored.slice(0, 457)).toEqual(saved);
    expect(restored[457].term).toBe("Term 458");
    expect(restored[526].term).toBe("Term 527");
    expect(pendingSearches(restored)).toHaveLength(70);
    expect(restoreSearchQueue(restored, terms.join("\n"), entry)).toEqual(restored);
  });
  it("preserves duplicate term occurrences and does not start an unprocessed draft", () => {
    expect(restoreSearchQueue([entry("Same"), entry("Other")], "Same\nSame\nOther\nLast", entry).map(item => item.term)).toEqual(["Same", "Other", "Same", "Last"]);
    expect(restoreSearchQueue([], "Not started", entry)).toEqual([]);
  });
  it("resets interrupted requests and separates pending work from failed searches", () => {
    const result = restoreSearchQueue([{ ...entry("Interrupted"), searchStatus: "loading" }, { ...entry("Failed"), searchStatus: "failed" }, { ...entry("Captcha"), error: "GOOGLE_CAPTCHA" }, { ...entry("Ready"), images: ["photo"] }], "", entry);
    expect(result[0].searchStatus).toBe("pending");
    expect(pendingSearches(result).map(item => item.term)).toEqual(["Interrupted"]);
    expect(failedSearches(result).map(item => item.term)).toEqual(["Failed", "Captcha"]);
  });
});
