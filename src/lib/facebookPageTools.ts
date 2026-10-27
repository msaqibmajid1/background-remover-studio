import { postWithinDates } from "./facebookPosts";

export type PagePost = {
  id: string; message?: string; story?: string; created_time?: string; permalink_url?: string; full_picture?: string;
  reactions?: { summary?: { total_count?: number } }; comments?: { summary?: { total_count?: number } }; shares?: { count?: number };
  attachments?: { data?: PostAttachment[] };
};
export type PostAttachment = { media_type?: string; type?: string; url?: string; target?: { id?: string }; media?: { image?: { src?: string }; source?: string }; subattachments?: { data?: PostAttachment[] } };
export type ManagedPage = { id: string; name: string; fan_count?: number; picture?: { data?: { url?: string } }; tasks?: string[] };
export type PostKind = "photo" | "album" | "video" | "link" | "text";
export type CaptionSettings = { mode: "original" | "append" | "replace"; text: string; find: string; replacement: string };
export type LogoSettings = { dataUrl: string; position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"; size: number; opacity: number };
export type ActionRecord = { id: string; action: "clone" | "delete"; sourceId: string; pageId: string; pageName: string; status: "pending" | "success" | "failed" | "unknown" | "skipped"; time: string; postId?: string; scheduledTime?: number; error?: string };
export type CloneJob = { operationId: string; sourceId: string; pageId: string; pageName: string; message: string; scheduledTime?: number; backdatedTime?: number };
export const PAGE_TOOLS_EXTENSION_VERSION = "2.0.20";
export const PAGE_TOOLS_EXTENSION_URL = "/downloads/google-images-maker-extension-v2.0.21-facebook-feed.zip";
export const defaultCaption: CaptionSettings = { mode: "original", text: "", find: "", replacement: "" };
export const defaultLogo: LogoSettings = { dataUrl: "", position: "bottom-right", size: 15, opacity: 85 };

export function postKind(post: PagePost): PostKind {
  const items = post.attachments?.data || [];
  if (items.some(item => /video/i.test(`${item.media_type} ${item.type}`))) return "video";
  if (items.some(item => /album/i.test(`${item.media_type} ${item.type}`) || (item.subattachments?.data?.length || 0) > 1)) return "album";
  if (items.some(item => /link/i.test(`${item.media_type} ${item.type}`))) return "link";
  return items.some(item => /photo/i.test(`${item.media_type} ${item.type}`)) || post.full_picture ? "photo" : "text";
}
export function captionFor(post: PagePost, settings: CaptionSettings) {
  const original = post.message || "";
  let text = settings.mode === "replace" ? settings.text : settings.mode === "append" ? [original, settings.text].filter(Boolean).join("\n\n") : original;
  if (settings.find) text = text.split(settings.find).join(settings.replacement);
  return text;
}
export function wasCopiedTo(history: ActionRecord[], sourceId: string, pageId: string) {
  return history.some(record => record.action === "clone" && record.sourceId === sourceId && record.pageId === pageId && (record.status === "success" || record.status === "skipped"));
}
export function filterPagePosts(posts: PagePost[], query: string, kinds: PostKind[], from: string, to: string, newest: boolean) {
  const term = query.trim().toLocaleLowerCase();
  return posts.filter(post => postWithinDates(post, from, to) && kinds.includes(postKind(post)) && (!term || `${post.message || ""} ${post.story || ""} ${post.id}`.toLocaleLowerCase().includes(term)))
    .sort((a, b) => ((Date.parse(b.created_time || "") || 0) - (Date.parse(a.created_time || "") || 0)) * (newest ? 1 : -1));
}
export function cloneJobs(options: { posts: PagePost[]; pages: ManagedPage[]; caption: CaptionSettings; schedule: boolean; start: string; interval: number; keepDate: boolean; now?: number }): CloneJob[] {
  if (!options.posts.length || !options.pages.length) throw new Error("Select at least one post and one destination page.");
  const now = options.now ?? Date.now();
  const start = options.schedule ? Date.parse(options.start) : 0;
  if (options.schedule && (!Number.isFinite(start) || start < now + 600000)) throw new Error("Schedule the first post at least 10 minutes in the future.");
  if (options.schedule && (!Number.isFinite(options.interval) || options.interval < 1)) throw new Error("The schedule interval must be at least one minute.");
  return options.pages.flatMap(page => options.posts.map((post, index) => {
    const kind = postKind(post);
    if (options.keepDate && !options.schedule && kind === "video") throw new Error("Backdating video copies is not supported. Turn off Keep original post date for videos.");
    const backdated = options.keepDate && !options.schedule ? Date.parse(post.created_time || "") : 0;
    if (options.keepDate && !options.schedule && (!Number.isFinite(backdated) || backdated > now)) throw new Error("An original post has no valid past date to preserve.");
    return { operationId: crypto.randomUUID(), sourceId: post.id, pageId: page.id, pageName: page.name, message: captionFor(post, options.caption),
      ...(options.schedule ? { scheduledTime: Math.floor((start + index * options.interval * 60000) / 1000) } : {}),
      ...(backdated ? { backdatedTime: Math.floor(backdated / 1000) } : {}) };
  }));
}
export async function pageToolRequest<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error("The extension did not confirm the result. Check History and Facebook before retrying; the action may already have completed.")); }, 240000);
    const cleanup = () => { clearTimeout(timeout); window.removeEventListener("COLLAGE_RESPONSE", receive); };
    function receive(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (detail?.requestId !== requestId) return;
      cleanup();
      if (detail.response?.ok) resolve(detail.response);
      else reject(Object.assign(new Error(detail.response?.error || "Facebook request failed"), { code: detail.response?.code, uncertain: detail.response?.uncertain }));
    }
    window.addEventListener("COLLAGE_RESPONSE", receive);
    window.dispatchEvent(new CustomEvent("COLLAGE_REQUEST", { detail: { requestId, type, payload } }));
  });
}
