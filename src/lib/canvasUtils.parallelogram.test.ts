import { describe, it, expect, vi } from "vitest";
import { buildParallelogramPath } from "./canvasUtils";

const makeCtx = () => {
  const points: Array<[number, number]> = [];
  const ctx = {
    beginPath: vi.fn(),
    moveTo: vi.fn((x: number, y: number) => points.push([x, y])),
    lineTo: vi.fn((x: number, y: number) => points.push([x, y])),
    closePath: vi.fn(),
  } as any;
  return { ctx, points };
};

describe("buildParallelogramPath", () => {
  it("produces a rectangle when slant is 0", () => {
    const { ctx, points } = makeCtx();
    buildParallelogramPath(ctx, 0, 0, 100, 50, 0);
    expect(points).toEqual([
      [0, 0], [100, 0], [100, 50], [0, 50],
    ]);
    expect(ctx.closePath).toHaveBeenCalled();
  });

  it("slants top edge right for positive slant", () => {
    const { ctx, points } = makeCtx();
    buildParallelogramPath(ctx, 0, 0, 200, 100, 15);
    // dx > 0 → top shifted right, bottom shifted to 0
    expect(points[0][0]).toBeGreaterThan(0);
    expect(points[1][0]).toBe(200);
    expect(points[2][0]).toBeLessThan(200);
    expect(points[3][0]).toBe(0);
  });

  it("slants top edge left for negative slant", () => {
    const { ctx, points } = makeCtx();
    buildParallelogramPath(ctx, 0, 0, 200, 100, -15);
    expect(points[0][0]).toBe(0);
    expect(points[1][0]).toBeLessThan(200);
    expect(points[2][0]).toBe(200);
    expect(points[3][0]).toBeGreaterThan(0);
  });

  it("clamps extreme slant within the bounding box", () => {
    const { ctx, points } = makeCtx();
    buildParallelogramPath(ctx, 0, 0, 100, 1000, 89);
    points.forEach(([x]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
    });
  });
});
