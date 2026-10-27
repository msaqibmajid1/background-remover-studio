import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  ALL_TEXT_PROPERTIES,
  applyStudioText,
  resolvedStudioText,
  studioTextElement,
  textOverlay,
} from "./text";
import { fitOriginalSubject, studioImageReady } from "./math";
import {
  newDesign,
  normalizeStudioProject,
  newProject,
  projectAssetKeys,
  type StudioImage,
} from "./types";
import { textLayer, templateForImage } from "./templates";
import { blueprintTextLayers, CINEMA_TEMPLATES } from "./svgTemplates";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    measureText: (text: string) => ({ width: text.length * 8 }),
  } as unknown as CanvasRenderingContext2D);
});
const image = (id = "one"): StudioImage => ({
  id,
  name: `${id}.png`,
  type: "image/png",
  width: 100,
  height: 200,
  originalKey: "photo",
  thumbnailKey: "thumb",
  status: "pending",
  strokes: [],
  design: {
    ...newDesign(1080, 1350),
    templateId: "same-template",
    overlays: [textLayer("First line\nLast line", 0.1, 0.7, 0.8)],
  },
});
function pair() {
  const source = image(),
    target = image("two");
  target.design.overlays[0].templateCode =
    source.design.overlays[0].templateCode;
  target.design.overlays[0].text = "Different entry";
  return { source, target, layer: source.design.overlays[0] };
}

describe("Background Studio original photo mode", () => {
  it("requires an explicit original choice or a mask before batch export", () => {
    expect(studioImageReady(image())).toBe(false);
    expect(studioImageReady({ ...image(), useOriginal: true })).toBe(true);
    expect(studioImageReady({ ...image(), maskKey: "mask" })).toBe(true);
  });
  it("cover-fits and clips an unremoved photo inside the template photo area", () => {
    const item = image();
    item.design.photoArea = { x: 0.1, y: 0, width: 0.8, height: 0.6 };
    const placement = fitOriginalSubject(item, item.design);
    expect(placement.x).toBeCloseTo(0.5);
    expect(placement.y).toBeCloseTo(0.3);
    expect(placement.width).toBeCloseTo(0.8);
    expect(placement.clipToPhotoArea).toBe(true);
  });
});

describe("Background Studio shared text settings", () => {
  it("round-trips advanced typography, effects, paths and Word Styler through project validation", () => {
    const item = image(),
      old = item.design.overlays[0];
    const element = {
      ...studioTextElement(old, item.design),
      fontFamily: "Uploaded Font",
      textAlign: "justify" as const,
      verticalAlign: "middle" as const,
      wordSpacing: 4,
      letterSpacing: 2,
      colorType: "gradient" as const,
      gradientStartColor: "#ff0000",
      gradientEndColor: "#ffff00",
      strokeWidth: 3,
      outlineGlow: true,
      shadow: true,
      backgroundColor: "#000000",
      backgroundOpacity: 0.8,
      textBoxBorder: true,
      textBoxBorderStyle: "dashed" as const,
      textPath: "arc" as const,
      skewX: 8,
      flipVertical: true,
      wordStylesEnabled: true,
      wordStyles: [{ wordIndex: 0, color: "#ffffff", bold: true }],
      wordStyleRules: {
        mode: "manual" as const,
        slots: [{ id: 1, color: "#ffffff", bold: true, italic: false }],
      },
    };
    const typedElement = { ...element, textPath: "arc-up" as const };
    item.design.overlays[0] = textOverlay(typedElement, old, item.design);
    const restored = normalizeStudioProject(
      JSON.parse(
        JSON.stringify({
          ...newProject(),
          images: [item],
          fonts: [{ family: "Uploaded Font", assetKey: "font-data" }],
        }),
      ),
    );
    expect(
      studioTextElement(
        restored.images[0].design.overlays[0],
        restored.images[0].design,
      ),
    ).toMatchObject(typedElement);
    expect(projectAssetKeys(restored)).toContain("font-data");
  });
  it("copies only requested settings to the matching template text without changing photos, content or other layers", () => {
    const { source, target, layer } = pair();
    layer.color = "#ff0000";
    target.useOriginal = true;
    target.maskKey = "preserved-mask";
    const other = textLayer("Do not change", 0, 0, 1);
    target.design.overlays.push(other);
    const result = applyStudioText(target, source, layer, ["color"]);
    expect(result.design.overlays[0].color).toBe("#ff0000");
    expect(result.design.overlays[0].text).toBe("Different entry");
    expect(result.design.overlays[1]).toEqual(other);
    expect(result.useOriginal).toBe(true);
    expect(result.maskKey).toBe("preserved-mask");
    expect(result.design.subject).toEqual(target.design.subject);
  });
  it("does not create text for style-only apply or modify locked matches", () => {
    const { source, target, layer } = pair();
    target.design.overlays[0].locked = true;
    expect(applyStudioText(target, source, layer, ["color"])).toBe(target);
    target.design.overlays = [];
    expect(applyStudioText(target, source, layer, ["color"])).toBe(target);
  });
  it("copies content and normalized geometry when the full element is requested", () => {
    const { source, target, layer } = pair();
    target.design.width = 2160;
    target.design.height = 2700;
    target.design.overlays = [];
    const result = applyStudioText(target, source, layer, ALL_TEXT_PROPERTIES);
    expect(result.design.overlays[0]).toMatchObject({
      text: layer.text,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
    });
    expect(result.design.overlays[0].id).not.toBe(layer.id);
  });
  it("keeps stable text matching codes across template clones", () => {
    const item = image(),
      template = {
        id: "saved",
        name: "Saved",
        category: "Saved" as const,
        design: item.design,
      };
    const a = templateForImage(template, newDesign(), true),
      b = templateForImage(template, newDesign(), true);
    expect(a.overlays[0].id).not.toBe(b.overlays[0].id);
    expect(a.overlays[0].templateCode).toBe(b.overlays[0].templateCode);
  });
  it("preserves persisted random word colors during preview and export", () => {
    const item = image(),
      element = studioTextElement(item.design.overlays[0], item.design);
    element.autoFitText = false;
    element.wordStylesEnabled = true;
    element.wordStyles = [{ wordIndex: 0, color: "#ff0000" }];
    element.wordStyleRules = {
      mode: "random",
      randomPercent: 50,
      slots: [{ id: 1, color: "#ff0000", bold: false, italic: false }],
    };
    expect(resolvedStudioText(element).wordStyles).toEqual(element.wordStyles);
    expect(resolvedStudioText(element).wordStyles).toEqual(element.wordStyles);
  });
  it("drops stale word indices after content changes", () => {
    const item = image(),
      old = item.design.overlays[0],
      element = studioTextElement(old, item.design);
    element.content = "One";
    element.wordStyles = [
      { wordIndex: 0, color: "#ff0000" },
      { wordIndex: 8, color: "#00ff00" },
    ];
    expect(
      textOverlay(element, old, item.design).textStyle?.wordStyles,
    ).toHaveLength(1);
  });
});

describe("Supplied Canva template editable blueprints", () => {
  it.each(CINEMA_TEMPLATES)(
    "recognizes only the exact supplied $name source",
    (source) => {
      const svg = readFileSync(
        `public/background-studio/cinema/${source.file}.svg`,
      );
      expect(createHash("sha256").update(svg).digest("hex")).toBe(source.hash);
      expect(
        blueprintTextLayers(source, 1080, 1350).every(
          (layer) =>
            layer.type === "text" && !layer.locked && layer.templateCode,
        ),
      ).toBe(true);
    },
  );
  it("keeps birthday photo, background and fade distinct and exposes five editable text layers", () => {
    const source = CINEMA_TEMPLATES.find(
      (item) => item.id === "birthday-portrait",
    )!;
    expect(source.mainImageIndex).toBe(1);
    expect(source.preserveImageIndices).toEqual([0, 2]);
    expect(
      blueprintTextLayers(source, 1080, 1350).map((layer) => layer.text),
    ).toEqual(["HAPPY", "46TH", "BIRTHDAY", "Zac Posen", "OCTOBER 22, 1980"]);
  });
});
