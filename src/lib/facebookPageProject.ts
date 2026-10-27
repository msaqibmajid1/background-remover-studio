import { z } from "zod";
import { defaultCaption, defaultLogo, type ActionRecord, type CaptionSettings, type LogoSettings, type ManagedPage, type PagePost, type PostAttachment } from "./facebookPageTools";

export type PageToolsMode = "cloner" | "deleter";
export type PageToolsProject = {
  version: 1; mode: PageToolsMode; url: string; from: string; to: string; maxPosts: number; source: ManagedPage | null; posts: PagePost[]; selected: string[];
  destinations: string[]; caption: CaptionSettings; logo: LogoSettings; schedule: boolean; start: string; interval: number; delay: number; keepDate: boolean; skipCloned: boolean; history: ActionRecord[];
};
export const pageProjectDefaults = (mode: PageToolsMode): PageToolsProject => ({ version: 1, mode, url: "", from: "", to: "", maxPosts: 50, source: null, posts: [], selected: [], destinations: [], caption: { ...defaultCaption }, logo: { ...defaultLogo }, schedule: false, start: "", interval: 60, delay: 5, keepDate: false, skipCloned: true, history: [] });
const objectId = z.string().regex(/^\d+(?:_\d+)?$/);
const mediaUrl = z.string().url().refine(value => value.startsWith("https://"));
const linkUrl = z.string().url().refine(value => /^https?:\/\//.test(value));
const optional = <T extends z.ZodTypeAny>(type: T) => type.nullish().transform(value => value ?? undefined);
const attachment: z.ZodType<PostAttachment, z.ZodTypeDef, unknown> = z.lazy(() => z.object({ media_type: optional(z.string()), type: optional(z.string()), url: optional(linkUrl), target: optional(z.object({ id: optional(objectId) })), media: optional(z.object({ image: optional(z.object({ src: optional(mediaUrl) })), source: optional(mediaUrl) })), subattachments: optional(z.object({ data: optional(z.array(attachment)) })) }));
const counter = optional(z.object({ summary: optional(z.object({ total_count: optional(z.number().nonnegative()) })) }));
const postDate = z.union([z.string(), z.number().finite().nonnegative().max(253402300799)]).transform(value => typeof value === "number" ? new Date(value * 1000).toISOString() : value);
const post = z.object({ id: objectId, message: optional(z.string()), story: optional(z.string()), created_time: optional(postDate), permalink_url: optional(mediaUrl.refine(value => /(^|\.)facebook\.com$/.test(new URL(value).hostname))), full_picture: optional(mediaUrl), attachments: optional(z.object({ data: optional(z.array(attachment)) })), reactions: counter, comments: counter, shares: optional(z.object({ count: optional(z.number().nonnegative()) })) });
const page = z.object({ id: objectId, name: z.string(), fan_count: optional(z.number().nonnegative()), picture: optional(z.object({ data: optional(z.object({ url: optional(mediaUrl) })) })) });
export const facebookManagedPageSchema = page;
export const facebookPagePostSchema = post;
const record = z.object({ id: z.string(), action: z.enum(["clone", "delete"]), sourceId: objectId, pageId: objectId, pageName: z.string(), status: z.enum(["pending", "success", "failed", "unknown", "skipped"]), time: z.string(), postId: objectId.optional(), scheduledTime: z.number().optional(), error: z.string().optional() });
const schema = z.object({
  version: z.literal(1), mode: z.enum(["cloner", "deleter"]), url: z.string().default(""), from: z.string().default(""), to: z.string().default(""), maxPosts: z.number().int().nonnegative().default(50), source: page.nullable().default(null), posts: z.array(post), selected: z.array(objectId).default([]), destinations: z.array(objectId).default([]),
  caption: z.object({ mode: z.enum(["original", "append", "replace"]), text: z.string(), find: z.string(), replacement: z.string() }).default(defaultCaption),
  logo: z.object({ dataUrl: z.string().max(3000000).refine(value => !value || /^data:image\/png;base64,[A-Za-z0-9+/=\s]+$/.test(value)), position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]), size: z.number().min(2).max(50), opacity: z.number().min(5).max(100) }).default(defaultLogo),
  schedule: z.boolean().default(false), start: z.string().default(""), interval: z.number().min(1).default(60), delay: z.number().min(1).max(300).default(5), keepDate: z.boolean().default(false), skipCloned: z.boolean().default(true), history: z.array(record),
});
export function normalizePageProject(value: unknown, mode: PageToolsMode): PageToolsProject {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`Invalid project field: ${result.error.issues[0].path.join(".")}. The current project has not been replaced.`);
  if (result.data.mode !== mode) throw new Error("Choose a valid project saved by this tool. The current project has not been replaced.");
  const clean = result.data as PageToolsProject;
  const ids = new Set(clean.posts.map(item => item.id));
  clean.selected = [...new Set(clean.selected.filter(id => ids.has(id)))];
  clean.history = clean.history.map(item => item.status === "pending" ? { ...item, status: "unknown", error: "The browser closed before confirmation. Review Facebook before retrying." } : item);
  return clean;
}
