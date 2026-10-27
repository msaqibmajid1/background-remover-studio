import { describe, expect, it } from "vitest";
import { checkerDefaults, checkerExportRows, excelSafe, formatMetric, normalizeCheckerProject, replyPlan, visibleComments, type PageComment } from "./facebookPageChecks";
const comment: PageComment = { id: "300", message: "Question", from: { id: "400", name: "Customer" }, parentId: null, created_time: "2026-10-06", replyCount: 0, permalink_url: null };
const project = () => ({ ...checkerDefaults("replies"), pageId: "200", pages: [{ id: "200", name: "Page" }], commentsPostId: "200_11", commentsPageId: "200", comments: [comment], drafts: { "300": "Thank you." } });
describe("Facebook Page checker data", () => {
  it("strips credential and unknown fields from portable projects", () => {
    const value = normalizeCheckerProject({ ...project(), access_token: "secret", pages: [{ id: "200", name: "Page", access_token: "secret" }], comments: [{ ...comment, from: { ...comment.from, access_token: "secret" } }] }, "replies");
    expect(JSON.stringify(value)).not.toContain("secret"); expect(value.comments[0].id).toBe("300");
    expect(() => normalizeCheckerProject(value, "insights")).toThrow("different tool");
  });
  it("recovers interrupted replies as unknown and does not create a new retry", () => {
    const value = project(); const job = replyPlan(value, ["300"])[0];
    const restored = normalizeCheckerProject({ ...value, history: [job] }, "replies");
    expect(restored.history[0].status).toBe("unknown"); expect(() => replyPlan(restored, ["300"])).toThrow("previous reply");
  });
  it("validates nonempty selected drafts, Page ownership and own comments", () => {
    const value = project(); expect(replyPlan(value, ["300"])[0]).toMatchObject({ commentId: "300", postId: "200_11", message: "Thank you.", status: "pending" });
    expect(() => replyPlan({ ...value, drafts: {} }, ["300"])).toThrow("Enter a reply");
    expect(() => replyPlan({ ...value, commentsPageId: "900" }, ["300"])).toThrow("selected Page");
    expect(() => replyPlan({ ...value, comments: [{ ...comment, from: { id: "200", name: "Page" } }] }, ["300"])).toThrow("own comments");
  });
  it("unanswered filtering distinguishes unknown count and existing replies", () => {
    const rows = [comment, { ...comment, id: "301", replyCount: null }, { ...comment, id: "302", from: { id: "200", name: "Page" } }];
    expect(visibleComments(rows, "200", "", true, true, []).map(row => row.id)).toEqual(["300"]);
    expect(visibleComments(rows, "200", "Customer", false, true, []).length).toBe(2);
  });
  it("zero values are real zero, unavailable is not fabricated, Excel text is safe", () => {
    expect(formatMetric(0)).toBe("0"); expect(formatMetric(null)).toBe("Not available");
    expect(excelSafe("=HYPERLINK(\"bad\")")).toMatch(/^'/); expect(excelSafe(" +SUM(A1)")).toMatch(/^'/); expect(excelSafe(-20)).toBe(-20);
  });
  it("exports only actual reports and preserves metric errors and selected dates", () => {
    const value = checkerDefaults("insights"); value.insights["200"] = { pageId: "200", checkedAt: "2026-10-07", from: "2026-09-09", to: "2026-10-06", followers: 0, likes: null, errors: [], metrics: [{ key: "VIEW", value: null, formatted: null, change: null, changeRatio: null, comparison: null, error: "Permission denied" }] };
    expect(checkerExportRows(value)[0]).toMatchObject({ From: "2026-09-09", Value: "", Error: "Permission denied" });
  });
});
