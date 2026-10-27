import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useGoogleFonts } from "./useGoogleFonts";

afterEach(cleanup);
it("initializes the font list without an effect loop or duplicate families", () => {
  let renders = 0;
  const { result, rerender } = renderHook(() => {
    renders++;
    return useGoogleFonts();
  });
  expect(result.current.loading).toBe(false);
  expect(result.current.allFonts.length).toBeGreaterThan(100);
  expect(new Set(result.current.allFonts.map((font) => font.family)).size).toBe(
    result.current.allFonts.length,
  );
  const list = result.current.allFonts;
  rerender();
  expect(result.current.allFonts).toBe(list);
  expect(renders).toBeLessThan(6);
});
