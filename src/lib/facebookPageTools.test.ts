import { describe, it, expect } from "vitest";
import { captionFor, cloneJobs, defaultCaption, filterPagePosts, postKind, wasCopiedTo } from "./facebookPageTools";

describe("Facebook page tools", () => {
  it("keeps original caption whitespace and never turns Facebook's generated story into a caption", () => {
    expect(captionFor({ id: "1", message: "  Original\n\n" }, defaultCaption)).toBe("  Original\n\n");
    expect(captionFor({ id: "2", story: "Source shared a link" }, defaultCaption)).toBe("");
  });
  it("uses only confirmed clone history for the exact source and destination", () => {
    const record = { id: "operation", action: "clone" as const, sourceId: "100_11", pageId: "200", pageName: "Target", time: "2026-10-07", status: "success" as const };
    expect(wasCopiedTo([record], "100_11", "200")).toBe(true);
    expect(wasCopiedTo([record], "100_11", "300")).toBe(false);
    expect(wasCopiedTo([{ ...record, status: "unknown" }], "100_11", "200")).toBe(false);
  });
  it("classifies actual HAR attachment variants without treating a video thumbnail as a photo", () => {
    expect(postKind({ id: "1", full_picture: "thumb", attachments: { data: [{ media_type: "video", type: "video_autoplay" }] } })).toBe("video");
    expect(postKind({ id: "2", attachments: { data: [{ media_type: "album", subattachments: { data: [{}, {}] } }] } })).toBe("album");
    expect(postKind({ id: "3" })).toBe("text");
  });
  it("preserves original captions and applies literal find/replace to appended or replaced text", () => {
    const post = { id: "1", message: "A $5 post. A $5 offer." };
    expect(captionFor(post, defaultCaption)).toBe(post.message);
    expect(captionFor(post, { mode: "append", text: "More", find: "$5", replacement: "$10" })).toBe("A $10 post. A $10 offer.\n\nMore");
    expect(captionFor(post, { mode: "replace", text: "New", find: "", replacement: "" })).toBe("New");
  });
  it("filters dates, type and search without changing the loaded array", () => {
    const posts = [{ id: "1", created_time: "2026-10-01T12:00:00Z", message: "One" }, { id: "2", created_time: "2026-10-03T12:00:00Z", message: "Two" }];
    expect(filterPagePosts(posts, "two", ["text"], "2026-10-02", "2026-10-04", true).map(post => post.id)).toEqual(["2"]);
    expect(posts[0].id).toBe("1");
  });
  it("schedules the same selected order independently on each destination page", () => {
    const jobs = cloneJobs({ posts: [{ id: "s1" }, { id: "s2" }], pages: [{ id: "p1", name: "One" }, { id: "p2", name: "Two" }], caption: defaultCaption, schedule: true, start: "2026-10-08T12:00:00Z", interval: 60, keepDate: true, now: Date.parse("2026-10-07T12:00:00Z") });
    expect(jobs.map(job => job.sourceId)).toEqual(["s1", "s2", "s1", "s2"]);
    expect(jobs[1].scheduledTime - jobs[0].scheduledTime).toBe(3600);
    expect(jobs[2].scheduledTime).toBe(jobs[0].scheduledTime);
    expect(jobs.every(job => !job.backdatedTime)).toBe(true);
    expect(new Set(jobs.map(job => job.operationId)).size).toBe(4);
  });
  it("rejects unsafe schedule times and unavailable backdating instead of silently ignoring settings", () => {
    const options = { posts: [{ id: "1" }], pages: [{ id: "2", name: "Page" }], caption: defaultCaption, schedule: true, start: "invalid", interval: 60, keepDate: false };
    expect(() => cloneJobs(options)).toThrow("10 minutes");
    expect(() => cloneJobs({ ...options, schedule: false, keepDate: true })).toThrow("original post");
  });
});
