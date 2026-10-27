import { describe, expect, it } from "vitest";
import { TOOLS } from "./tools";

describe("tool registry", () => {
  it("contains 23 tools with the three Page checkers appended last", () => {
    const slugs = TOOLS.map((tool) => tool.slug);

    expect(slugs).toEqual(
      expect.arrayContaining([
        "editor",
        "crop-tool",
        "background-removal",
        "image-filters",
        "object-removal",
        "upscaling",
        "optimization",
        "collage",
        "quotes",
        "image-downloader",
        "text-utility",
        "rename-images",
        "simplified-image-search",
        "ai-text-generator",
        "upgraded-text-generator",
        "google-images-maker",
        "clip-merger",
        "facebook-extractor",
      ])
    );

    // Registry is the single source of truth - admin grant_all_tools must
    // send this exact list from the client.
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toHaveLength(23);
    expect(slugs.slice(-5)).toEqual(["page-post-cloner", "page-posts-delete", "page-monetization-checker", "page-insight-checker", "page-comment-reply"]);
  });
});
