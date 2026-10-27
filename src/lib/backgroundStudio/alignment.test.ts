import { describe, expect, it } from "vitest";
import { alignOverlayToCanvas } from "./alignment";

describe("background studio element alignment", () => {
  const layer = { width: 0.4, height: 0.25 };

  it("aligns an overlay to each canvas edge and centre", () => {
    expect(alignOverlayToCanvas(layer, "left")).toEqual({ x: 0 });
    expect(alignOverlayToCanvas(layer, "horizontal-center")).toEqual({
      x: 0.3,
    });
    expect(alignOverlayToCanvas(layer, "right")).toEqual({ x: 0.6 });
    expect(alignOverlayToCanvas(layer, "top")).toEqual({ y: 0 });
    expect(alignOverlayToCanvas(layer, "vertical-center")).toEqual({
      y: 0.375,
    });
    expect(alignOverlayToCanvas(layer, "bottom")).toEqual({ y: 0.75 });
  });
});
