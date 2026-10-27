import { describe, it, expect } from "vitest";
import { normalizePageProject, pageProjectDefaults } from "./facebookPageProject";
describe("Facebook page project safety", () => {
  it("accepts HAR Unix timestamps and normalizes them for sorting, filters and backdating", () => {
    const clean = normalizePageProject({ ...pageProjectDefaults("cloner"), posts: [{ id: "100_11", created_time: 1790683200 }] }, "cloner");
    expect(clean.posts[0].created_time).toBe(new Date(1790683200000).toISOString());
  });
  it("keeps text-only posts with nullable Graph fields reloadable", () => {
    const clean = normalizePageProject({ ...pageProjectDefaults("cloner"), posts: [{ id: "100_11", message: "Text", full_picture: null, attachments: null, comments: { summary: null } }] }, "cloner");
    expect(clean.posts[0].message).toBe("Text"); expect(clean.posts[0].full_picture).toBeUndefined();
  });
  it("preserves captions, logos, selections and converts interrupted actions to unknown", () => {
    const project = { ...pageProjectDefaults("cloner"), posts: [{ id: "100_11", message: "Exact caption" }], selected: ["100_11", "100_12"], caption: { mode: "append", text: "Extra", find: "Exact", replacement: "Original" }, logo: { dataUrl: "data:image/png;base64,YQ==", size: 18, opacity: 90, position: "center" }, history: [{ id: "operation", action: "clone", sourceId: "100_11", pageId: "200", pageName: "Page", time: "2026-10-07", status: "pending" }] };
    const clean = normalizePageProject(project, "cloner");
    expect(clean.caption).toEqual(project.caption); expect(clean.logo).toEqual(project.logo);
    expect(clean.selected).toEqual(["100_11"]); expect(clean.history[0].status).toBe("unknown");
  });
  it("strips unrecognized credentials and rejects corrupt or unsafe projects without resetting data", () => {
    const project = { ...pageProjectDefaults("deleter"), source: { id: "200", name: "Page", access_token: "secret" }, posts: [{ id: "200_11", access_token: "secret", message: "Caption" }] };
    expect(JSON.stringify(normalizePageProject(project, "deleter"))).not.toContain("secret");
    expect(() => normalizePageProject(project, "cloner")).toThrow("valid project");
    expect(() => normalizePageProject({ ...project, caption: { mode: "original", text: 1 } }, "deleter")).toThrow();
    expect(() => normalizePageProject({ ...project, posts: [{ id: "200_11", permalink_url: "javascript:alert(1)" }] }, "deleter")).toThrow();
  });
});
