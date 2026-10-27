import { describe, expect, it } from "vitest";
import { coverImageRect, reconcileSlots, shapeImageForEntry, collageFilename } from "./collageGeometry";

describe("collage editing", () => {
  it("covers a square with a portrait without stretching", () => {
    expect(coverImageRect({ width: 600, height: 1200 }, { x: 0, y: 0, w: 400, h: 400 }, { zoom: 100, offsetX: 0, offsetY: 0 })).toEqual({ x: 0, y: -200, w: 400, h: 800 });
  });
  it("pans to either edge while keeping the crop filled", () => {
    expect(coverImageRect({ width: 600, height: 1200 }, { x: 0, y: 0, w: 400, h: 400 }, { zoom: 100, offsetX: 0, offsetY: 100 }).y).toBe(0);
  });
  it("lets a zoomed-out image move instead of ignoring the sliders", () => {
    expect(coverImageRect({ width: 400, height: 400 }, { x: 0, y: 0, w: 400, h: 400 }, { zoom: 50, offsetX: 100, offsetY: -100 })).toEqual({ x: 200, y: 0, w: 200, h: 200 });
  });
  it("does not replace a deliberately cleared slot on restore or layout reconciliation", () => {
    expect(reconcileSlots([null, "chosen"], ["first", "second", "third"], 3)).toEqual([null, "chosen", "third"]);
  });
  it("preserves per-entry fetched shape images when applying settings to all", () => {
    expect(shapeImageForEntry("entry-one", "entry-two", [], ["entry-two"])).toBe("entry-two");
  });
  it("can share a manually uploaded shape image across entries", () => {
    expect(shapeImageForEntry("logo", "entry-two", ["logo"], ["entry-two"])).toBe("logo");
  });
  it("makes safe filenames without accidentally creating ZIP folders", () => {
    expect(collageFilename("Actors / TV: Next?", "image")).toBe("Actors---TV--Next-");
  });
});
