import { z } from "zod";
import { facebookManagedPageSchema, facebookPagePostSchema } from "./facebookPageProject";

export const CHECKER_EXTENSION_VERSION = "2.0.21";
export type CheckerMode = "monetization" | "insights" | "replies";
export const checkerTitles: Record<CheckerMode, string> = { monetization: "Page Monetization Checker", insights: "Page Insight Checker", replies: "Page Comment Reply" };
const number = z.number().finite().nullable();
const text = z.string().nullable();
const id = z.string().regex(/^\d+(?:_\d+)?$/);
export const commentSchema = z.object({ id, message: z.string(), from: z.object({ id: text, name: text }).nullable(), parentId: text, created_time: text, replyCount: number, permalink_url: text });
export type PageComment = z.infer<typeof commentSchema>;
export const monetizationSchema = z.object({ pageId: id, checkedAt: z.string(), bucket: text, countryEligible: z.boolean().nullable(), programs: z.array(z.object({ key: z.string(), status: text, integrityPass: z.boolean().nullable(), reason: text, deferred: z.boolean() })), criteria: z.array(z.object({ key: z.string(), status: text, progress: number, count: number, goal: number })), policy: z.object({ status: text, onboardStatus: text, violations: z.array(z.object({ title: text, description: text, status: text })), violationCount: number }).nullable(), errors: z.array(z.string()) });
export type MonetizationResult = z.infer<typeof monetizationSchema>;
export const insightSchema = z.object({ pageId: id, checkedAt: z.string(), from: z.string(), to: z.string(), followers: number, likes: number, metrics: z.array(z.object({ key: z.string(), value: number, formatted: text, change: number, changeRatio: number, comparison: text, error: text })), errors: z.array(z.string()) });
export type InsightResult = z.infer<typeof insightSchema>;
const historySchema = z.object({ id: z.string(), pageId: id, postId: id, commentId: id, message: z.string(), status: z.enum(["pending", "success", "failed", "unknown", "skipped"]), replyId: z.string().optional(), error: z.string().optional(), time: z.string() });
export type ReplyRecord = z.infer<typeof historySchema>;
export const checkerProjectSchema = z.object({ schema: z.literal("facebook-page-checker-v1"), mode: z.enum(["monetization", "insights", "replies"]), pageId: z.string(), pages: facebookManagedPageSchema.array(), from: z.string(), to: z.string(), maxPosts: z.number().int().min(0), monetization: z.record(monetizationSchema), insights: z.record(insightSchema), posts: z.array(facebookPagePostSchema), comments: z.array(commentSchema), commentsPostId: z.string(), commentsPageId: z.string(), drafts: z.record(z.string().max(8000)), history: z.array(historySchema) });
export type CheckerProject = z.infer<typeof checkerProjectSchema>;
export function checkerDefaults(mode: CheckerMode): CheckerProject {
  const to = new Date(); to.setDate(to.getDate() - 1);
  const from = new Date(to); from.setDate(from.getDate() - 27);
  const local = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { schema: "facebook-page-checker-v1", mode, pageId: "", pages: [], from: local(from), to: local(to), maxPosts: 50, monetization: {}, insights: {}, posts: [], comments: [], commentsPostId: "", commentsPageId: "", drafts: {}, history: [] };
}
export function normalizeCheckerProject(value: unknown, mode: CheckerMode) {
  const project = checkerProjectSchema.parse(value);
  if (project.mode !== mode) throw new Error("This project belongs to a different tool.");
  project.history = project.history.map(row => row.status === "pending" ? { ...row, status: "unknown", error: "The previous session ended before confirmation. Check Facebook or pending results before retrying." } : row);
  return project;
}
export const metricLabels: Record<string, string> = { VIEW: "Views", THREE_SEC_VIDEO_VIEW: "3-second video views", INTERACTION: "Interactions", CREATOR_MONETIZATION_TOTAL_EARNINGS: "Total earnings" };
export const programLabels: Record<string, string> = { ad_breaks_open_program: "In-stream ads", fan_funding: "Subscriptions", stars: "Stars", reels_ads: "Ads on Reels", unification_program: "Content monetization", branded_content_fb_simple: "Branded content", brand_collab_manager: "Brand Collabs Manager", live_ad_breaks: "Live ads", rights_manager: "Rights Manager", creator_store: "Creator store", avatars_store: "Avatars store" };
export const readable = (value?: string | null) => value ? value.replace(/_/g, " ").toLowerCase().replace(/^./, char => char.toUpperCase()) : "Not available";
export const formatMetric = (value: number | null) => value === null ? "Not available" : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
export function visibleComments(comments: PageComment[], pageId: string, query: string, unanswered: boolean, hideOwn: boolean, history: ReplyRecord[]) {
  const replied = new Set(history.filter(row => row.pageId === pageId && ["success", "skipped"].includes(row.status)).map(row => row.commentId));
  const search = query.trim().toLowerCase();
  return comments.filter(comment => (!hideOwn || comment.from?.id !== pageId) && (!unanswered || (comment.replyCount === 0 && !replied.has(comment.id))) && (!search || `${comment.message} ${comment.from?.name || ""} ${comment.id}`.toLowerCase().includes(search)));
}
export function replyPlan(project: CheckerProject, selected: string[]): ReplyRecord[] {
  if (project.pageId !== project.commentsPageId || !project.commentsPostId.startsWith(`${project.pageId}_`)) throw new Error("Load comments from a post on the selected Page.");
  const ids = new Set(selected);
  const comments = project.comments.filter(comment => ids.has(comment.id));
  if (!comments.length) throw new Error("Select at least one comment.");
  return comments.map(comment => {
    const message = project.drafts[comment.id] || "";
    if (!message.trim() || message.length > 8000) throw new Error(`Enter a reply of 1-8,000 characters for comment ${comment.id}.`);
    if (comment.from?.id === project.pageId) throw new Error("Do not select the Page's own comments.");
    if (project.history.some(row => row.pageId === project.pageId && row.commentId === comment.id && ["success", "skipped", "unknown", "pending"].includes(row.status))) throw new Error(`Comment ${comment.id} has a confirmed or unconfirmed previous reply. Review History before sending.`);
    return { id: crypto.randomUUID(), pageId: project.pageId, postId: project.commentsPostId, commentId: comment.id, message, status: "pending", time: new Date().toISOString() };
  });
}
export function excelSafe(value: unknown): string | number {
  if (typeof value === "number") return value;
  const s = value == null ? "" : String(value);
  return /^[\s]*[=+@-]/.test(s) ? "'" + s : s;
}
export function checkerExportRows(project: CheckerProject) {
  const name = (pageId: string) => project.pages.find(page => page.id === pageId)?.name || pageId;
  if (project.mode === "replies") return project.history.map(row => ({ Page: name(row.pageId), "Post ID": row.postId, "Comment ID": row.commentId, Reply: row.message, Status: row.status, "Reply ID": row.replyId || "", Error: row.error || "", Time: row.time }));
  if (project.mode === "insights") return Object.values(project.insights).flatMap(result => [
    ...result.metrics.map(metric => ({ Page: name(result.pageId), "Page ID": result.pageId, From: result.from, To: result.to, Metric: metricLabels[metric.key] || metric.key, Value: metric.value ?? "", Formatted: metric.formatted || "", Change: metric.change ?? "", "Change %": metric.changeRatio === null ? "" : metric.changeRatio * 100, Comparison: metric.comparison || "", Error: metric.error || "", "Checked at": result.checkedAt })),
    ...["followers", "likes"].map(key => ({ Page: name(result.pageId), "Page ID": result.pageId, Metric: `${readable(key)} (current snapshot)`, Value: result[key as "followers" | "likes"] ?? "", Error: result.errors.join("; "), "Checked at": result.checkedAt })),
  ]);
  return Object.values(project.monetization).flatMap(result => [
    { Page: name(result.pageId), "Page ID": result.pageId, Type: "Summary", Item: "Eligibility bucket (not program approval)", Status: result.bucket || "", Detail: `Policy: ${result.policy?.status || "Not available"}; ${result.errors.join("; ")}`, "Checked at": result.checkedAt },
    ...result.programs.map(item => ({ Page: name(result.pageId), "Page ID": result.pageId, Type: "Program", Item: programLabels[item.key] || readable(item.key), Status: item.status || "", "Integrity pass": item.integrityPass ?? "", Detail: item.reason || "", "Deferred payout": item.deferred, "Checked at": result.checkedAt })),
    ...result.criteria.map(item => ({ Page: name(result.pageId), "Page ID": result.pageId, Type: "Criterion", Item: readable(item.key), Status: item.status || "", Count: item.count ?? "", Goal: item.goal ?? "", "Progress %": item.progress === null ? "" : item.progress * 100, "Checked at": result.checkedAt })),
    ...(result.policy?.violations || []).map(item => ({ Page: name(result.pageId), "Page ID": result.pageId, Type: "Policy violation", Item: item.title || "Unnamed violation", Status: item.status || "", Detail: item.description || "", "Checked at": result.checkedAt })),
  ]);
}
