import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  editableTemplateArtwork,
  blueprintTextLayers,
  chooseAutomaticPhotoIndex,
  findBundledTemplateArtwork,
  sanitizeTemplateSvg,
  splitTemplateSvg,
} from "./svgTemplates";
import { bundledTemplateForName, CINEMA_TEMPLATES } from "./templateBlueprints";
afterEach(() => vi.unstubAllGlobals());
const svg = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 810 1012.5">${content}</svg>`;

describe("SVG template import safety and composition", () => {
  it("chooses an inset portrait instead of full-canvas and masked decoration images", () => {
    expect(
      chooseAutomaticPhotoIndex(
        [
          { x: 0.2, y: 0, width: 809.6, height: 1012 },
          { x: 108, y: 62, width: 597, height: 767 },
          { x: 0.2, y: 368, width: 809.6, height: 644 },
          { x: 243, y: 642, width: 334, height: 229 },
        ],
        810,
        1012.5,
      ),
    ).toBe(1);
  });
  it("preserves Emerald Portrait decorations while replacing its portrait and outlined lettering", () => {
    const source = CINEMA_TEMPLATES.find(
      (item) => item.id === "birthday-emerald-portrait",
    )!;
    const root = sanitizeTemplateSvg(
      readFileSync(
        "public/background-studio/cinema/birthday-emerald.svg",
        "utf8",
      ),
    );
    const visibleImages = Array.from(root.querySelectorAll("image")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const artwork = sanitizeTemplateSvg(
      editableTemplateArtwork(root, visibleImages[1], [], source),
    );
    const artworkImages = Array.from(artwork.querySelectorAll("image")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const artworkPaths = Array.from(artwork.querySelectorAll("path")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );

    expect(visibleImages).toHaveLength(4);
    expect(source.mainImageIndex).toBe(1);
    expect(source.preserveImageIndices).toEqual([0, 2, 3]);
    expect(artworkImages).toHaveLength(2);
    expect(artworkPaths).toHaveLength(0);
  });
  it.each([
    ["classic-british-stars-red", "Red Accent"],
    ["classic-british-stars-white", "White"],
  ])(
    "preserves the Classic British Stars artwork for the %s variant",
    (id) => {
      const source = CINEMA_TEMPLATES.find((item) => item.id === id)!;
      const root = sanitizeTemplateSvg(
        readFileSync(
          `public/background-studio/cinema/${source.file}.svg`,
          "utf8",
        ),
      );
      const visibleImages = Array.from(root.querySelectorAll("image")).filter(
        (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
      );
      const artwork = sanitizeTemplateSvg(
        editableTemplateArtwork(root, visibleImages[0], [], source),
      );
      const artworkImages = Array.from(artwork.querySelectorAll("image")).filter(
        (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
      );
      const artworkPaths = Array.from(artwork.querySelectorAll("path")).filter(
        (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
      );

      expect(visibleImages).toHaveLength(2);
      expect(source.mainImageIndex).toBe(0);
      expect(source.preserveImageIndices).toEqual([1]);
      expect(artworkImages).toHaveLength(1);
      expect(artworkPaths).toHaveLength(6);
    },
  );
  it("keeps Metal Rock masked artwork intact while replacing only its main photo", () => {
    const source = CINEMA_TEMPLATES.find((item) => item.id === "metal-rock")!;
    const root = sanitizeTemplateSvg(
      readFileSync("public/background-studio/cinema/metal-rock.svg", "utf8"),
    );
    const visibleImages = Array.from(root.querySelectorAll("image")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const artwork = sanitizeTemplateSvg(
      editableTemplateArtwork(root, visibleImages[0], [], source),
    );
    const artworkImages = Array.from(artwork.querySelectorAll("image")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const artworkPaths = Array.from(artwork.querySelectorAll("path")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );

    expect(visibleImages).toHaveLength(45);
    expect(source.mainImageIndex).toBe(0);
    expect(source.preserveImageIndices).toHaveLength(44);
    expect(artworkImages.length).toBeGreaterThan(20);
    expect(artworkPaths.length).toBeLessThan(20);
  });
  it("ships the color-updated Brokenwood artwork once and recognizes its local copy", () => {
    const source = CINEMA_TEMPLATES.find(
      (item) => item.id === "brokenwood-mysteries",
    )!;
    const artwork = readFileSync(
      `public/background-studio/cinema/${source.file}.svg`,
      "utf8",
    );
    const hash = createHash("sha256").update(artwork).digest("hex");

    expect(hash).toBe(source.hash);
    expect(source.mainImageIndex).toBe(0);
    expect(source.textPaintRanges).toEqual([
      [6, 25],
      [26, 52],
      [53, 77],
    ]);
    expect(
      bundledTemplateForName(
        "THE BROKENWOOD MYSTERIES RETURNS WITH SIX BIZARRE MURDERS AND UNEXPECTED TWISTS IN RURAL NEW ZEALAND",
      )?.id,
    ).toBe(source.id);
    expect(
      [
        "Birthday Instagram Post (1)",
        "Birthday Instagram Post",
        "Birthday post",
        "Black and Orange Modern Happy Birthday Instagram Post",
        "CLASSIC BRITISH STARS (1)",
        "CLASSIC BRITISH STARS",
        "Happy Birthday Instagram Post",
        "METAL ROCK",
        "METAL ROCK (1)",
        "Cinema Portraits",
        "cLASSIC gLAMOUR.svg",
        "EXTRA 1.svg",
        "extra 2.svg",
      ].map((name) => bundledTemplateForName(name)?.id),
    ).toEqual([
      "birthday-emerald-portrait",
      "birthday-orange-glow",
      "birthday-silver-arches",
      "birthday-portrait",
      "classic-british-stars-red",
      "classic-british-stars-white",
      "birthday-double-portrait",
      "metal-rock",
      "metal-rock-1",
      "cinema-1",
      "classic-glamour",
      "extra-1",
      "extra-2",
    ]);
  });
  it("ships the three new cinema designs with replaceable photos and word styling", () => {
    const expected = [
      ["classic-glamour", "12f13603a6c89c3ef05ac5b2fa6febcc01ee52dd72bcfdc9789c61ac6bc32588"],
      ["extra-1", "93341e0a622dc7d0cb39c29cee728af0ad5427e078719c6349325abd6924c185"],
      ["extra-2", "da121fff552749142e6589d9966a7bce93c800e1d635d365dae2ca75fe2c1e80"],
    ] as const;
    for (const [id, hash] of expected) {
      const source = CINEMA_TEMPLATES.find((item) => item.id === id)!;
      const artwork = readFileSync(
        `public/background-studio/cinema/${source.file}.svg`,
        "utf8",
      );
      expect(createHash("sha256").update(artwork).digest("hex")).toBe(hash);
      expect(source.mainImageIndex).toBe(0);
      expect(source.preserveImageIndices).toEqual([1]);
      expect(source.texts).toHaveLength(1);
      expect(source.texts[0].style?.wordStylesEnabled).toBe(true);
    }
  });
  it("makes only the Brokenwood headline editable and keeps its glass panel and corner accents", () => {
    const source = CINEMA_TEMPLATES.find(
      (item) => item.id === "brokenwood-mysteries",
    )!;
    const root = sanitizeTemplateSvg(
      readFileSync(
        `public/background-studio/cinema/${source.file}.svg`,
        "utf8",
      ),
    );
    const main = root.querySelector("image:not(defs image)")!;
    const result = sanitizeTemplateSvg(
      editableTemplateArtwork(root, main, [], source),
    );
    const paths = Array.from(result.querySelectorAll("path")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const firstHeadlinePath = root.querySelector('g[fill="#04080f"] path')!;

    expect(paths.filter((node) => node.getAttribute("fill") === "#0cc0df"))
      .toHaveLength(2);
    expect(paths.some((node) => node.getAttribute("d") === firstHeadlinePath.getAttribute("d")))
      .toBe(false);
    expect(
      paths.some((node) => node.getAttribute("d")?.startsWith("M 0.160156 0.539062")),
    ).toBe(true);
  });
  it("adds Classic Memories with a replaceable photo, editable text, and preserved fade artwork", () => {
    const source = CINEMA_TEMPLATES.find(
      (item) => item.id === "classic-memories",
    )!;
    const artwork = readFileSync(
      `public/background-studio/cinema/${source.file}.svg`,
      "utf8",
    );
    const root = sanitizeTemplateSvg(artwork);
    const visibleImages = Array.from(root.querySelectorAll("image")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const editable = sanitizeTemplateSvg(
      editableTemplateArtwork(
        root,
        visibleImages[source.mainImageIndex!],
        [],
        source,
      ),
    );
    const keptImages = Array.from(editable.querySelectorAll("image")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const keptPaths = Array.from(editable.querySelectorAll("path")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const textLayers = blueprintTextLayers(source, 1080, 1350);

    expect(createHash("sha256").update(artwork).digest("hex")).toBe(
      source.hash,
    );
    expect(source.mainImageIndex).toBe(0);
    expect(source.preserveImageIndices).toEqual([1]);
    expect(visibleImages).toHaveLength(2);
    expect(keptImages).toHaveLength(1);
    expect(keptImages[0].getAttribute("href")).toBe(
      visibleImages[1].getAttribute("href"),
    );
    expect(keptPaths).toHaveLength(3);
    expect(keptPaths.every((path) => path.getAttribute("stroke") === "#ffde59"))
      .toBe(true);
    expect(textLayers.map(({ name, text, font }) => ({ name, text, font }))).toEqual([
      {
        name: "Series Label",
        text: "CLASSIC MEMORIES",
        font: "Poppins",
      },
      {
        name: "Headline",
        text: "SIR DAVID SUCHET RECEIVES\nPROUD KNIGHTHOOD AT WINDSOR\nCASTLE INVESTITURE",
          font: "Fredoka",
      },
    ]);
    expect(bundledTemplateForName("CLASSIC MEMORIES.svg")?.id).toBe(
      source.id,
    );
  });
  it("keeps the Classic Glamour logo while removing only its outlined headline", () => {
    const source = CINEMA_TEMPLATES.find(
      (item) => item.id === "classic-glamour",
    )!;
    const root = sanitizeTemplateSvg(
      readFileSync(
        `public/background-studio/cinema/${source.file}.svg`,
        "utf8",
      ),
    );
    const visibleImages = Array.from(root.querySelectorAll("image")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const result = sanitizeTemplateSvg(
      editableTemplateArtwork(
        root,
        visibleImages[source.mainImageIndex!],
        [],
        source,
      ),
    );
    const paths = Array.from(result.querySelectorAll("path")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    expect(source.preservePaintRanges).toEqual([[4, 5]]);
    expect(paths).toHaveLength(2);
    expect(bundledTemplateForName("cLASSIC gLAMOUR.svg")?.id).toBe(
      source.id,
    );
  });
  it("removes only reviewed Blue Headline lettering and retains its decorative flag image", () => {
    const source = CINEMA_TEMPLATES.find((item) => item.id === "cinema-1")!;
    const root = sanitizeTemplateSvg(
      readFileSync("public/background-studio/cinema/1.svg", "utf8"),
    );
    const originalImages = Array.from(root.querySelectorAll("image")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const result = sanitizeTemplateSvg(
      editableTemplateArtwork(root, originalImages[0], [], source),
    );
    const artworkImages = Array.from(result.querySelectorAll("image")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    expect(artworkImages).toHaveLength(1);
    expect(artworkImages[0].getAttribute("href")).toBe(
      originalImages[1].getAttribute("href"),
    );
    expect(
      result.querySelectorAll("path:not(defs path):not(mask path)").length,
    ).toBe(0);
  });
  it("removes the Glass Caption bottom strip while retaining its glass panel and corner accents", () => {
    const source = CINEMA_TEMPLATES.find((item) => item.id === "cinema-2")!;
    const root = sanitizeTemplateSvg(
      readFileSync("public/background-studio/cinema/2.svg", "utf8"),
    );
    const main = root.querySelector("image")!;
    const originalPaths = Array.from(root.querySelectorAll("path")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const below = sanitizeTemplateSvg(splitTemplateSvg(root, main).below);
    const result = sanitizeTemplateSvg(
      editableTemplateArtwork(root, main, [], source),
    );
    const artworkPaths = Array.from(result.querySelectorAll("path")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const matrix = main
      .parentElement!.getAttribute("transform")!
      .match(/-?\d+(?:\.\d+)?/g)!
      .map(Number);

    expect(below.querySelector('path[fill="#000000"]')).toBeNull();
    expect(main.closest('[clip-path="url(#8f96a67395)"]')).toBeNull();
    expect(main.closest('[clip-path="url(#6bd63e26f3)"]')).toBeNull();
    expect(main.closest('[clip-path="url(#aca98c2488)"]')).toBeNull();
    expect(
      matrix[5] + Number(main.getAttribute("height")) * matrix[3],
    ).toBeCloseTo(1012.5, 3);
    expect(artworkPaths.map((node) => node.getAttribute("d"))).toEqual(
      originalPaths.slice(2, 5).map((node) => node.getAttribute("d")),
    );
    expect(artworkPaths.map((node) => node.getAttribute("fill"))).toEqual([
      "#ffffff",
      "#f43a44",
      "#f43a44",
    ]);
  });
  it("removes only reviewed Follow Banner lettering and retains both gradient halves and floral decorations", () => {
    const source = CINEMA_TEMPLATES.find((item) => item.id === "cinema-3")!;
    const root = sanitizeTemplateSvg(
      readFileSync("public/background-studio/cinema/3.svg", "utf8"),
    );
    const originalPaths = Array.from(root.querySelectorAll("path")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    const result = sanitizeTemplateSvg(
      editableTemplateArtwork(root, root.querySelector("image")!, [], source),
    );
    const artworkPaths = Array.from(result.querySelectorAll("path")).filter(
      (node) => !node.closest("defs,mask,clipPath,filter,pattern"),
    );
    expect(artworkPaths).toHaveLength(32);
    expect(artworkPaths.map((node) => node.getAttribute("d"))).toEqual(
      [...originalPaths.slice(2, 19), ...originalPaths.slice(101, 116)].map(
        (node) => node.getAttribute("d"),
      ),
    );
    expect(
      result.querySelector('path[fill="url(#241c18fa1e)"]'),
    ).not.toBeNull();
    expect(
      result.querySelector('path[fill="url(#3593399a98)"]'),
    ).not.toBeNull();
    expect(result.querySelector('path[fill="#d00c27"]')).not.toBeNull();
  });
  it("recognizes older ZIP-imported artwork by its original definitions rather than its random project ID", async () => {
    const root = sanitizeTemplateSvg(
      readFileSync("public/background-studio/cinema/5.svg", "utf8"),
    );
    const art = splitTemplateSvg(
      root,
      root.querySelector("image:not(defs image)") || undefined,
    ).above;
    const fetcher = vi.fn(
      async (url: string) => new Response(readFileSync(`public${url}`, "utf8")),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = await findBundledTemplateArtwork(art, "5");
    expect(result.source.id).toBe("cinema-5");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not identify unknown artwork just because its filename matches a bundled template", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (url: string) =>
          new Response(readFileSync(`public${url}`, "utf8")),
      ),
    );
    await expect(
      findBundledTemplateArtwork(
        svg(
          '<defs><clipPath id="unknown"><rect width="1" height="1"/></clipPath></defs><rect width="810" height="1012.5"/>',
        ),
        "5",
      ),
    ).rejects.toThrow(/not one of the supplied/);
  });
  it.each([
    "1",
    "2",
    "3",
    "4",
    "5",
    "birthday-emerald",
    "classic-british-stars-red",
    "classic-british-stars-white",
    "classic-memories",
    "classic-glamour",
    "extra-1",
    "extra-2",
    "metal-rock",
    "brokenwood-mysteries",
  ])(
    "accepts the actual supplied Canva design %s without flattening its vector artwork",
    (file) => {
      const source = readFileSync(
        `public/background-studio/cinema/${file}.svg`,
        "utf8",
      );
      const root = sanitizeTemplateSvg(source);
      expect(root.getAttribute("width")).toBe("1080");
      expect(root.getAttribute("height")).toBe("1350");
      expect(root.querySelectorAll("path").length).toBeGreaterThan(20);
      expect(root.querySelectorAll("text")).toHaveLength(0);
    },
  );
  it.each([
    "<script>alert(1)</script>",
    '<image href="https://example.com/private-image.png"/>',
    '<image href="data:image/svg+xml;base64,AAAA"/>',
    '<rect onclick="alert(1)"/>',
    "<foreignObject><p>Unsafe</p></foreignObject>",
    "<style>svg{background:url(https://example.com)}</style>",
    '<rect style="fill:red"/>',
    '<rect fill="url(https://example.com/image.svg#paint)"/>',
    '<use href="javascript:alert(1)"/>',
  ])("rejects active content and external resources: %s", (content) => {
    expect(() => sanitizeTemplateSvg(svg(content))).toThrow();
  });
  it("rejects malformed documents, entity declarations and oversized dimensions", () => {
    expect(() => sanitizeTemplateSvg("not SVG")).toThrow();
    expect(() =>
      sanitizeTemplateSvg(
        '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>',
      ),
    ).toThrow();
    expect(() =>
      sanitizeTemplateSvg(svg("").replace('width="1080"', 'width="20000"')),
    ).toThrow();
  });
  it("splits below/above artwork without retaining the old main photo, preserving masks and transforms", () => {
    const root = sanitizeTemplateSvg(
      svg(
        '<defs><mask id="matte"><image id="mask-image" href="data:image/png;base64,AAAA"/></mask></defs><rect id="background" width="810" height="1012.5" fill="#fff"/><g transform="translate(0 3)" clip-path="url(#crop)"><image id="main" width="810" height="810" href="data:image/jpeg;base64,AAAA"/></g><path id="lettering" d="M 0 850 L 100 850" fill="#fff"/>',
      ),
    );
    const split = splitTemplateSvg(root, root.querySelector("#main")!);
    const below = new DOMParser().parseFromString(split.below, "image/svg+xml");
    const above = new DOMParser().parseFromString(split.above, "image/svg+xml");
    expect(below.querySelector("#background")).not.toBeNull();
    expect(below.querySelector("#lettering")).toBeNull();
    expect(above.querySelector("#lettering")).not.toBeNull();
    expect(above.querySelector("#background")).toBeNull();
    expect(above.querySelector("#main")).toBeNull();
    expect(below.querySelector("#main")).toBeNull();
    expect(above.querySelector("#mask-image")).not.toBeNull();
    expect(split.hasBelow).toBe(true);
    expect(split.hasAbove).toBe(true);
  });
});
