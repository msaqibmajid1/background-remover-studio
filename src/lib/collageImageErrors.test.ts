import { describe, expect, it } from "vitest";
import { CollageImageExportError, imageFailureReason, validImageFailures } from "./collageImageErrors";

describe("collage image error details", () => {
  it("keeps HTTP and content-type diagnoses instead of replacing them with a generic fetch error", () => {
    expect(imageFailureReason("All fetch strategies failed", { httpStatus: 403, contentType: "text/html" })).toMatchObject({ code: "http", httpStatus: 403, message: expect.stringContaining("denied access") });
    expect(imageFailureReason("No image", { httpStatus: 200, contentType: "text/html; charset=UTF-8" })).toMatchObject({ code: "not-image", message: expect.stringContaining("text/html, not an image") });
    expect(imageFailureReason(new Error("Image download failed (404)"))).toMatchObject({ code: "http", httpStatus: 404 });
  });
  it("separates expiry, rate limits, timeout, decode and connection failures", () => {
    expect(imageFailureReason("bad", { httpStatus: 429 }).message).toContain("rate-limited");
    expect(imageFailureReason(new Error("Image loading timed out")).code).toBe("timeout");
    expect(imageFailureReason(new Error("Could not load image")).code).toBe("decode");
    expect(imageFailureReason(new TypeError("Failed to fetch")).code).toBe("network");
  });
  it("reports every affected base slot and shape, including shared source images", () => {
    const failures = [{ imageId: "shared", title: "Photo", roles: [{ kind: "base" as const, slot: 2 }, { kind: "shape" as const }], ...imageFailureReason("bad", { httpStatus: 404 }) }];
    expect(new CollageImageExportError(failures).message).toContain("Base slot 2 / Shape image (Photo): HTTP 404");
    expect(validImageFailures([null, {}, ...failures])).toEqual(failures);
  });
});
